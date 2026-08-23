import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from .database import SessionLocal
from . import models

logger = logging.getLogger("email")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER or "support@example.com")
FROM_NAME = os.getenv("FROM_NAME", "Support CRM")


def _log_system_note(ticket_id: str, text: str) -> None:
    # Background tasks run after the request's DB session is already closed,
    # so this opens its own short-lived session just to write the note.
    db = SessionLocal()
    try:
        db.add(models.Note(ticket_id=ticket_id, note_text=text))
        db.commit()
    finally:
        db.close()


def send_ticket_resolved_email(customer_email: str, customer_name: str, ticket_id: str, subject: str) -> None:
    """Notify the customer their ticket is resolved. Never raises — a missing or
    broken SMTP config just gets logged and noted on the ticket, it never blocks
    the status update itself."""

    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping resolution email for ticket %s", ticket_id)
        _log_system_note(ticket_id, "Resolution email not sent: SMTP is not configured.")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Your ticket {ticket_id} has been resolved"
    message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    message["To"] = customer_email

    text_body = (
        f"Hi {customer_name},\n\n"
        f"Your support ticket {ticket_id} (\"{subject}\") has been marked as resolved.\n\n"
        f"If the issue comes back or you have more questions, just reply to this email "
        f"and we'll reopen it.\n\n"
        f"— {FROM_NAME}"
    )
    html_body = f"""
    <div style="font-family: sans-serif; color: #1a1a1a; line-height: 1.6;">
      <p>Hi {customer_name},</p>
      <p>Your support ticket <strong>{ticket_id}</strong> ("{subject}") has been marked as resolved.</p>
      <p>If the issue comes back or you have more questions, just reply to this email and we'll reopen it.</p>
      <p>— {FROM_NAME}</p>
    </div>
    """
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [customer_email], message.as_string())
        logger.info("Resolution email sent to %s for ticket %s", customer_email, ticket_id)
        _log_system_note(ticket_id, f"Resolution email sent to {customer_email}.")
    except Exception as exc:
        logger.error("Failed to send resolution email for ticket %s: %s", ticket_id, exc)
        _log_system_note(ticket_id, f"Resolution email failed to send: {exc}")
        
def send_password_reset_email(to_email: str, username: str, reset_link: str) -> None:
    """Send a password reset link. Never raises — logs and returns silently
    on any SMTP failure, same pattern as send_ticket_resolved_email."""

    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping password reset email for %s", to_email)
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset your Support CRM password"
    message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    message["To"] = to_email

    text_body = (
        f"Hi {username},\n\n"
        f"We received a request to reset your Support CRM password.\n\n"
        f"Reset it here: {reset_link}\n\n"
        f"If you didn't request this, you can safely ignore this email — "
        f"your password won't be changed.\n\n"
        f"— {FROM_NAME}"
    )
    html_body = f"""
    <div style="font-family: sans-serif; color: #1a1a1a; line-height: 1.6;">
      <p>Hi {username},</p>
      <p>We received a request to reset your Support CRM password.</p>
      <p><a href="{reset_link}" style="color: #35519E;">Click here to reset your password</a></p>
      <p style="color: #667085; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      <p>— {FROM_NAME}</p>
    </div>
    """
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [to_email], message.as_string())
        logger.info("Password reset email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", to_email, exc)