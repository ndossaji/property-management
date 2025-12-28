"""
FastAPI Main Application Entry Point
This is a sample/starter file to demonstrate the Docker setup.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

# Create FastAPI application
app = FastAPI(
    title="Property Management API",
    description="API for Property Management Application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Property Management API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker healthcheck"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "environment": os.getenv("APP_ENV", "production"),
        },
    )


@app.get("/api/status")
async def api_status():
    """API status endpoint"""
    return {
        "api": "online",
        "database": "connected",  # TODO: Add actual DB check
        "redis": "connected",  # TODO: Add actual Redis check
        "environment": os.getenv("APP_ENV", "production"),
    }


# Include authentication routes
from app.routes_auth import router as auth_router
app.include_router(auth_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("APP_ENV") == "development" else False,
    )

