from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .routers import tickets
from fastapi.staticfiles import StaticFiles
import os
import logging
from .routers import tickets, auth



logging.basicConfig(level=logging.INFO)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Support CRM API")
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(auth.router)
app.include_router(tickets.router)


@app.get("/")
def root():
    return {"message": "Support CRM backend is alive"}