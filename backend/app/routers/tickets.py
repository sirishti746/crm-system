import os
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..auth import get_current_user

from .. import models, schemas
from ..database import get_db
from ..email_utils import send_ticket_resolved_email

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
VALID_STATUSES = {"Open", "In Progress", "Closed"}

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
router = APIRouter(prefix="/api/tickets", tags=["tickets"],dependencies=[Depends(get_current_user)])


def generate_ticket_id(db: Session) -> str:
    all_ids = db.query(models.Ticket.ticket_id).all()
    max_num = 0
    for (tid,) in all_ids:
        try:
            num = int(tid.split("-")[1])
            max_num = max(max_num, num)
        except (IndexError, ValueError):
            continue
    return f"TKT-{max_num + 1:03d}"


def get_attachments(db: Session, ticket_id: str):
    rows = db.query(models.Attachment).filter(models.Attachment.ticket_id == ticket_id).order_by(models.Attachment.created_at.asc()).all()
    return [
        schemas.AttachmentOut(
            id=r.id,
            original_name=r.original_name,
            url=f"/uploads/{r.filename}",
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/{ticket_id}/attachments", response_model=schemas.AttachmentOut, status_code=201)
def upload_attachment(ticket_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only image files (PNG, JPG, GIF, WEBP) are allowed")

    ext = os.path.splitext(file.filename)[1]
    safe_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    attachment = models.Attachment(ticket_id=ticket_id, filename=safe_name, original_name=file.filename)
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return schemas.AttachmentOut(
        id=attachment.id,
        original_name=attachment.original_name,
        url=f"/uploads/{safe_name}",
        created_at=attachment.created_at,
    )


@router.delete("/{ticket_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(ticket_id: str, attachment_id: int, db: Session = Depends(get_db)):
    attachment = (
        db.query(models.Attachment)
        .filter(models.Attachment.id == attachment_id, models.Attachment.ticket_id == ticket_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    filepath = os.path.join(UPLOAD_DIR, attachment.filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.delete(attachment)
    db.commit()
    return None


@router.post("", response_model=schemas.TicketDetail, status_code=201)
def create_ticket(payload: schemas.TicketCreate, db: Session = Depends(get_db)):
    ticket = models.Ticket(
        ticket_id=generate_ticket_id(db),
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        subject=payload.subject,
        description=payload.description,
        status="Open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    result = schemas.TicketDetail.model_validate(ticket)
    return result


@router.post("/import", response_model=schemas.ImportResult)
def import_tickets(payload: schemas.TicketImport, db: Session = Depends(get_db)):
    created_ids = []
    errors = []
    skipped = 0

    for i, row in enumerate(payload.tickets, start=1):
        name = (row.customer_name or "").strip()
        email = (row.customer_email or "").strip()
        subject = (row.subject or "").strip()
        description = (row.description or "").strip()

        if not name or not email or not subject or not description:
            errors.append(schemas.ImportRowError(row=i, error="Missing required field"))
            continue
        if not EMAIL_RE.match(email):
            errors.append(schemas.ImportRowError(row=i, error=f"Invalid email: {email}"))
            continue

        existing = (
            db.query(models.Ticket)
            .filter(
                models.Ticket.customer_email == email,
                models.Ticket.subject == subject,
            )
            .first()
        )
        if existing:
            skipped += 1
            continue

        status = row.status.strip() if row.status and row.status.strip() in VALID_STATUSES else "Open"

        ticket = models.Ticket(
            ticket_id=generate_ticket_id(db),
            customer_name=name,
            customer_email=email,
            subject=subject,
            description=description,
            status=status,
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        created_ids.append(ticket.ticket_id)

    return schemas.ImportResult(
        created_count=len(created_ids),
        skipped_count=skipped,
        error_count=len(errors),
        created_ids=created_ids,
        errors=errors,
    )


@router.get("", response_model=list[schemas.TicketListItem])
def list_tickets(status: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Ticket)

    if status:
        query = query.filter(models.Ticket.status == status)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.Ticket.customer_name.ilike(like),
                models.Ticket.customer_email.ilike(like),
                models.Ticket.ticket_id.ilike(like),
                models.Ticket.subject.ilike(like),
                models.Ticket.description.ilike(like),
            )
        )

    return query.order_by(models.Ticket.created_at.desc()).all()


@router.get("/stats/summary")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(models.Ticket).count()
    by_status = {
        s: db.query(models.Ticket).filter(models.Ticket.status == s).count()
        for s in ["Open", "In Progress", "Closed"]
    }
    return {"total": total, "by_status": by_status}


@router.get("/{ticket_id}", response_model=schemas.TicketDetail)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    notes = db.query(models.Note).filter(models.Note.ticket_id == ticket_id).order_by(models.Note.created_at.asc()).all()

    result = schemas.TicketDetail.model_validate(ticket)
    result.notes = notes
    result.attachments = get_attachments(db, ticket_id)
    return result


@router.put("/{ticket_id}", response_model=schemas.TicketDetail)
def update_ticket(
    ticket_id: str,
    payload: schemas.TicketUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    previous_status = ticket.status

    if payload.status and payload.status != ticket.status:
        ticket.status = payload.status
    if payload.escalated is not None and payload.escalated != ticket.escalated:
        ticket.escalated = payload.escalated
        if payload.escalated:
            ticket.escalation_note = (payload.escalation_note or "").strip() or None
            note_text = "Escalated to Level 2 support"
            if ticket.escalation_note:
                note_text += f": {ticket.escalation_note}"
        else:
            ticket.escalation_note = None
            note_text = "De-escalated back to Level 1"
        db.add(models.Note(ticket_id=ticket_id, note_text=note_text))
    if payload.customer_name is not None and payload.customer_name.strip():
        ticket.customer_name = payload.customer_name.strip()
    if payload.customer_email is not None and payload.customer_email.strip():
        ticket.customer_email = payload.customer_email.strip()
    if payload.subject is not None and payload.subject.strip():
        ticket.subject = payload.subject.strip()
    if payload.description is not None and payload.description.strip():
        ticket.description = payload.description.strip()

    if payload.note:
        db.add(models.Note(ticket_id=ticket_id, note_text=payload.note))

    db.commit()
    db.refresh(ticket)

    if previous_status != "Closed" and ticket.status == "Closed" and not ticket.escalated:
        background_tasks.add_task(
            send_ticket_resolved_email,
            ticket.customer_email,
            ticket.customer_name,
            ticket.ticket_id,
            ticket.subject,
        )

    notes = db.query(models.Note).filter(models.Note.ticket_id == ticket_id).order_by(models.Note.created_at.asc()).all()

    result = schemas.TicketDetail.model_validate(ticket)
    result.notes = notes
    result.attachments = get_attachments(db, ticket_id)
    return result


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    db.query(models.Note).filter(models.Note.ticket_id == ticket_id).delete()
    db.query(models.Attachment).filter(models.Attachment.ticket_id == ticket_id).delete()
    db.delete(ticket)
    db.commit()
    return None