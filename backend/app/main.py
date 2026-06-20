from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api import incidents, triage, similar, playbook, greenwave, events, analytics, cascade, chat, economic, simulate, morning_clearance, penalty_zones

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

# New Sentinel / ParkGuard Routers
app.include_router(events.router, prefix=settings.API_V1_STR, tags=["Events"])
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["Analytics"])
app.include_router(cascade.router, prefix=settings.API_V1_STR, tags=["Cascade"])
app.include_router(chat.router, prefix=settings.API_V1_STR, tags=["Chat"])
app.include_router(economic.router, prefix=settings.API_V1_STR, tags=["Economic"])
app.include_router(simulate.router, prefix=settings.API_V1_STR, tags=["Simulate"])

# Research-Driven Intelligence Routers
app.include_router(morning_clearance.router, prefix=settings.API_V1_STR, tags=["Ghost Fleet"])
app.include_router(penalty_zones.router, prefix=settings.API_V1_STR, tags=["Penalty Zones"])
