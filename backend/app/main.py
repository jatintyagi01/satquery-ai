"""SatQuery AI backend entrypoint."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core_config import CORS_ORIGINS
from .api.routes import router

app = FastAPI(
    title="SatQuery AI",
    description="Agentic vision-language assistant for multimodal remote-sensing image analysis.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Internal error: {str(exc)}"})


@app.get("/")
async def root():
    return {"name": "SatQuery AI", "status": "running", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
