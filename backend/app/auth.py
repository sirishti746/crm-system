import secrets
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session as DBSession
from passlib.context import CryptContext

from . import models
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def generate_token() -> str:
    return secrets.token_hex(32)


def get_current_user(x_app_token: str = Header(None), db: DBSession = Depends(get_db)):
    if not x_app_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = db.query(models.Session).filter(models.Session.token == x_app_token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user