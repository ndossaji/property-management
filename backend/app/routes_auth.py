"""
Authentication Routes
Provides login, logout, and user info endpoints
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from app.auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    LoginRequest,
    Token,
    User,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    """
    Login endpoint
    
    Demo credentials:
    - Username: admin, Password: admin123
    - Username: demo, Password: demo123
    """
    user = authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "email": user.email, "role": user.role},
        expires_delta=access_token_expires,
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout endpoint
    Note: With JWT, logout is handled client-side by removing the token
    This endpoint is here for consistency and can be used for logging/analytics
    """
    return JSONResponse(
        status_code=200,
        content={
            "message": "Successfully logged out",
            "username": current_user.username,
        },
    )


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information
    Requires authentication
    """
    return current_user


@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """
    Verify if the current token is valid
    Returns user info if valid, 401 if invalid
    """
    return {
        "valid": True,
        "user": {
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
        },
    }

