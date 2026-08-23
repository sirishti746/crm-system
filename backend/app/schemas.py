from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

        
class AttachmentOut(BaseModel):
    id: int
    original_name: str
    url: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    subject: str
    description: str


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    note: Optional[str] = None


class NoteOut(BaseModel):
    id: int
    note_text: str
    created_at: datetime

    class Config:
        from_attributes = True

class TicketListItem(BaseModel):
    ticket_id: str
    customer_name: str
    subject: str
    status: str
    created_at: datetime    
    escalated: bool = False

    class Config:
        from_attributes = True


class TicketDetail(BaseModel):
    ticket_id: str
    customer_name: str
    customer_email: str
    subject: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    notes: list[NoteOut] = []
    attachments: list[AttachmentOut] = []
    escalated: bool = False
    escalation_note: Optional[str] = None
  

    class Config:
        from_attributes = True
        
class TicketImportRow(BaseModel):
    customer_name: str
    customer_email: str
    subject: str
    description: str
    status: Optional[str] = None


class TicketImport(BaseModel):
    tickets: list[TicketImportRow]


class ImportRowError(BaseModel):
    row: int
    error: str


class ImportResult(BaseModel):
    created_count: int
    skipped_count: int
    error_count: int
    created_ids: list[str]
    errors: list[ImportRowError]


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    note: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None    
    escalated: Optional[bool] = None
    escalation_note: Optional[str] = None