from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Department, User, AuditLog
from app.schemas import DepartmentCreate, DepartmentResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/departments", tags=["Departments"])

DEFAULT_DEPARTMENTS = ["Engineering", "Human Resources", "Marketing", "Sales", "Operations", "Finance"]

@router.get("", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).order_by(Department.name.asc()).all()
    if not depts:
        for name in DEFAULT_DEPARTMENTS:
            db.add(Department(name=name))
        db.commit()
        depts = db.query(Department).order_by(Department.name.asc()).all()
    return depts

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Department name cannot be empty")
    
    existing = db.query(Department).filter(Department.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department '{name}' already exists")
    
    dept = Department(name=name)
    db.add(dept)
    
    audit = AuditLog(
        actor=current_admin.username,
        actor_role="ADMIN",
        action="DEPARTMENT_CREATED",
        entity_type="DEPARTMENT",
        entity_id=name,
        after_values=f'{{"name": "{name}"}}',
        reason=f"Created department {name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)
    return dept
