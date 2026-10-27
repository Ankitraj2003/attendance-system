from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Department, User, AuditLog, Employee
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/departments", tags=["Departments"])

DEFAULT_DEPARTMENTS = ["Engineering", "Human Resources", "Marketing", "Sales", "Operations", "Finance"]

@router.get("", response_model=List[DepartmentResponse])
@router.get("/", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).order_by(Department.name.asc()).all()
    if not depts:
        for name in DEFAULT_DEPARTMENTS:
            db.add(Department(name=name))
        db.commit()
        depts = db.query(Department).order_by(Department.name.asc()).all()
    return depts

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
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

def _perform_update_department(
    identifier: str,
    payload: DepartmentUpdate,
    current_admin: User,
    db: Session
):
    clean_id = identifier.strip()
    dept = None
    if clean_id.isdigit():
        dept = db.query(Department).filter(Department.id == int(clean_id)).first()
    if not dept:
        dept = db.query(Department).filter(Department.name.ilike(clean_id)).first()

    if not dept:
        raise HTTPException(status_code=404, detail=f"Department '{clean_id}' not found")

    new_name = payload.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Department name cannot be empty")

    old_name = dept.name
    if new_name.lower() != old_name.lower():
        existing = db.query(Department).filter(Department.name.ilike(new_name)).first()
        if existing and existing.id != dept.id:
            raise HTTPException(status_code=400, detail=f"Department '{new_name}' already exists")

    dept.name = new_name

    # Cascade department rename to all employees currently assigned to this department
    db.query(Employee).filter(Employee.department == old_name).update(
        {Employee.department: new_name}, synchronize_session=False
    )

    audit = AuditLog(
        actor=current_admin.username,
        actor_role="ADMIN",
        action="DEPARTMENT_UPDATED",
        entity_type="DEPARTMENT",
        entity_id=str(dept.id),
        before_values=f'{{"name": "{old_name}"}}',
        after_values=f'{{"name": "{new_name}"}}',
        reason=f"Renamed department from '{old_name}' to '{new_name}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)
    return dept

@router.put("/{department_identifier}", response_model=DepartmentResponse)
@router.put("/{department_identifier}/", response_model=DepartmentResponse)
@router.patch("/{department_identifier}", response_model=DepartmentResponse)
@router.patch("/{department_identifier}/", response_model=DepartmentResponse)
@router.post("/{department_identifier}/update", response_model=DepartmentResponse)
@router.post("/{department_identifier}/update/", response_model=DepartmentResponse)
def update_department(
    department_identifier: str,
    payload: DepartmentUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return _perform_update_department(department_identifier, payload, current_admin, db)

def _perform_delete_department(
    identifier: str,
    current_admin: User,
    db: Session
):
    clean_id = identifier.strip()
    dept = None
    if clean_id.isdigit():
        dept = db.query(Department).filter(Department.id == int(clean_id)).first()
    if not dept:
        dept = db.query(Department).filter(Department.name.ilike(clean_id)).first()

    if not dept:
        raise HTTPException(status_code=404, detail=f"Department '{clean_id}' not found")

    assigned_count = db.query(Employee).filter(Employee.department == dept.name).count()
    if assigned_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot remove department '{dept.name}' because {assigned_count} employee(s) are currently assigned to it. Please reassign them first."
        )

    dept_name = dept.name
    dept_id = dept.id
    db.delete(dept)

    audit = AuditLog(
        actor=current_admin.username,
        actor_role="ADMIN",
        action="DEPARTMENT_DELETED",
        entity_type="DEPARTMENT",
        entity_id=str(dept_id),
        before_values=f'{{"name": "{dept_name}"}}',
        reason=f"Deleted department {dept_name}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Department '{dept_name}' deleted successfully", "id": dept_id}

@router.delete("/{department_identifier}", status_code=status.HTTP_200_OK)
@router.delete("/{department_identifier}/", status_code=status.HTTP_200_OK)
@router.post("/{department_identifier}/delete", status_code=status.HTTP_200_OK)
@router.post("/{department_identifier}/delete/", status_code=status.HTTP_200_OK)
def delete_department(
    department_identifier: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return _perform_delete_department(department_identifier, current_admin, db)

@router.delete("", status_code=status.HTTP_200_OK)
@router.delete("/", status_code=status.HTTP_200_OK)
def delete_department_query(
    id: Optional[int] = Query(None),
    name: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    target = str(id) if id is not None else name
    if not target:
        raise HTTPException(status_code=400, detail="Department id or name is required for deletion")
    return _perform_delete_department(target, current_admin, db)
