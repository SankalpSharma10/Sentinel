from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api import incidents, triage, similar, playbook, greenwave

app = FastAPI(
    title="First15 — Incident Triage Copilot",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "product": "First15", "version": "2.0.0"}

app.include_router(incidents.router, prefix=settings.API_V1_STR, tags=["Incidents"])
app.include_router(triage.router,    prefix=settings.API_V1_STR, tags=["Triage"])
app.include_router(similar.router,   prefix=settings.API_V1_STR, tags=["Similar Cases"])
app.include_router(playbook.router,  prefix=settings.API_V1_STR, tags=["Playbook"])
app.include_router(greenwave.router, prefix=settings.API_V1_STR, tags=["Diversion"])
