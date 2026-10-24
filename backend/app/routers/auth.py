import json
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AuditLog
from app.schemas import Token, UserResponse, ChangePasswordRequest
from app.auth import verify_password, create_access_token, get_current_user, get_password_hash
from app.rate_limiter import check_login_rate_limit, record_login_failure, record_login_success

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)
    
    # 1. Enforce rate limiting / brute-force protection
    check_login_rate_limit(client_ip, form_data.username)

    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        record_login_failure(client_ip, form_data.username)
        # Audit log failed login
        db.add(AuditLog(
            actor=form_data.username or "anonymous",
            actor_role="UNKNOWN",
            action="LOGIN_FAILED",
            entity_type="AUTH",
            entity_id=form_data.username or "unknown",
            reason="Invalid credentials supplied",
            ip_address=client_ip
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.account_status != "ACTIVE":
        record_login_failure(client_ip, form_data.username)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated"
        )

    # Login successful: reset rate limiter
    record_login_success(client_ip, form_data.username)

    # Audit log successful login
    db.add(AuditLog(
        actor=user.username,
        actor_role=user.role,
        action="LOGIN_SUCCESS",
        entity_type="AUTH",
        entity_id=str(user.id),
        reason="Successful administrator login",
        ip_address=client_ip
    ))
    db.commit()

    token_version = getattr(user, "token_version", 1) or 1
    token = create_access_token(data={
        "sub": user.username, 
        "role": user.role,
        "token_version": token_version
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)

    if not verify_password(payload.old_password, current_user.password_hash):
        db.add(AuditLog(
            actor=current_user.username,
            actor_role=current_user.role,
            action="PASSWORD_CHANGE_FAILED",
            entity_type="USER",
            entity_id=str(current_user.id),
            reason="Incorrect current password provided",
            ip_address=client_ip
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    new_pwd = payload.new_password
    if len(new_pwd) < 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 9 characters long"
        )
    if not any(c.isalpha() for c in new_pwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must contain at least one letter (a-z, A-Z)"
        )
    if not any(c.isdigit() for c in new_pwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must contain at least one number (0-9)"
        )
    if not any(not c.isalnum() for c in new_pwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must contain at least one special character (!@#$%^&*...)"
        )

    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found"
        )
        
    user.password_hash = get_password_hash(new_pwd)
    # Increment token_version to invalidate all active JWT sessions
    user.token_version = (getattr(user, "token_version", 1) or 1) + 1

    # Log password change audit entry
    db.add(AuditLog(
        actor=user.username,
        actor_role=user.role,
        action="PASSWORD_CHANGED",
        entity_type="USER",
        entity_id=str(user.id),
        reason="Password changed by user; all active sessions revoked",
        ip_address=client_ip
    ))

    db.commit()
    db.refresh(user)
    return {"message": "Password changed successfully. All active sessions have been invalidated."}
