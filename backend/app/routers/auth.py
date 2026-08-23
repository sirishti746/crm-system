from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from .. import models
from ..database import get_db
from ..auth import hash_password, verify_password, generate_token, get_current_user
from ..email_utils import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/register", status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = (
        db.query(models.User)
        .filter((models.User.username == payload.username) | (models.User.email == payload.email))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = generate_token()
    db.add(models.Session(token=token, user_id=user.id))
    db.commit()

    return {"token": token, "username": user.username}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = generate_token()
    db.add(models.Session(token=token, user_id=user.id))
    db.commit()

    return {"token": token, "username": user.username}


@router.post("/logout")
def logout(x_app_token: str = Header(None), db: Session = Depends(get_db)):
    if x_app_token:
        db.query(models.Session).filter(models.Session.token == x_app_token).delete()
        db.commit()
    return {"message": "Logged out"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Always return the same message whether or not the email exists —
    # this prevents someone from using this endpoint to discover registered emails.
    if user:
        token = generate_token()
        db.add(models.PasswordReset(token=token, user_id=user.id))
        db.commit()
        reset_link = f"http://localhost:5173/reset-password?token={token}"
        background_tasks.add_task(send_password_reset_email, user.email, user.username, reset_link)

    return {"message": "If that email is registered, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset = (
        db.query(models.PasswordReset)
        .filter(models.PasswordReset.token == payload.token, models.PasswordReset.used == False)
        .first()
    )
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = db.query(models.User).filter(models.User.id == reset.user_id).first()
    user.hashed_password = hash_password(payload.new_password)
    reset.used = True
    db.commit()

    return {"message": "Password updated successfully."}


@router.get("/me")
def get_me(user: models.User = Depends(get_current_user)):
    return {"username": user.username, "email": user.email}
