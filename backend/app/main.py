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


# Initialize database tables
from app.database import create_tables
create_tables()

# Include authentication routes
from app.routes_auth import router as auth_router
app.include_router(auth_router)

# Include owner routes
from app.routes_owners import router as owners_router
app.include_router(owners_router)

# Include property routes
from app.routes_properties import router as properties_router
app.include_router(properties_router)

# Include expense routes
from app.routes_expenses import router as expenses_router
app.include_router(expenses_router)

# Include custom field routes
from app.routes_custom_fields import router as custom_fields_router
app.include_router(custom_fields_router)

# Include tenant routes
from app.routes_tenants import router as tenants_router
from app.routes_tenants import voucher_router as vouchers_router
app.include_router(tenants_router)
app.include_router(vouchers_router)

# Include lease routes
from app.routes_leases import router as leases_router
app.include_router(leases_router)

# Include payment and late fee routes
from app.routes_payments import router as payments_router
from app.routes_payments import late_fee_router
app.include_router(payments_router)
app.include_router(late_fee_router)

# Include owner payment routes
from app.routes_owner_payments import router as owner_payments_router
app.include_router(owner_payments_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("APP_ENV") == "development" else False,
    )

