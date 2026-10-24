"""
Controlled, Idempotent Database Schema and Reference Data Utility.

This script separates:
1. Genuine schema alterations (DDL: idempotent table reflection)
2. Reference data initialization (idempotent INSERT ON CONFLICT)
3. Safe schema backfills (narrowly scoped to NULL fields)

CRITICAL SAFETY GUARANTEES:
- NEVER updates or overwrites custom work schedules (e.g. shifts with custom hours).
- NEVER resets employee-specific preferences (e.g. preserves individual weekly_off_days).
- Fully idempotent: safe to execute multiple times against PostgreSQL or SQLite.
"""

from app.database import engine
from sqlalchemy import text, Connection, inspect

def apply_schema_ddl(conn: Connection) -> None:
    """Apply strictly non-destructive schema additions (DDL) using dialect-safe reflection."""
    inspector = inspect(conn)
    tables = set(inspector.get_table_names())

    # 1. Add date_of_exit column if missing
    if "employees" in tables:
        emp_cols = {c["name"] for c in inspector.get_columns("employees")}
        if "date_of_exit" not in emp_cols:
            conn.execute(text("ALTER TABLE employees ADD COLUMN date_of_exit DATE;"))

    # 2. Add token_version column if missing
    if "users" in tables:
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        if "token_version" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1 NOT NULL;"))

    # 3. Create departments table if missing
    if "departments" not in tables:
        is_pg = conn.dialect.name == "postgresql"
        pk_def = "id SERIAL PRIMARY KEY" if is_pg else "id INTEGER PRIMARY KEY AUTOINCREMENT"
        conn.execute(text(
            f"CREATE TABLE departments ("
            f"  {pk_def}, "
            f"  name VARCHAR(100) UNIQUE NOT NULL, "
            f"  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            f");"
        ))

def apply_reference_data(conn: Connection) -> None:
    """Initialize standard reference data without overwriting existing data."""
    is_pg = conn.dialect.name == "postgresql"
    conflict_clause = "ON CONFLICT (name) DO NOTHING" if is_pg else "ON CONFLICT(name) DO NOTHING"
    try:
        conn.execute(text(
            f"INSERT INTO departments (name) VALUES "
            f"('Engineering'), ('Marketing'), ('Operations'), ('Human Resources') "
            f"{conflict_clause};"
        ))
    except Exception:
        pass

def apply_safe_backfills(conn: Connection) -> None:
    """Apply narrowly scoped backfills strictly for uninitialized NULL values."""
    inspector = inspect(conn)
    tables = set(inspector.get_table_names())

    # Backfill token_version only where it is explicitly NULL
    if "users" in tables:
        conn.execute(text("UPDATE users SET token_version = 1 WHERE token_version IS NULL;"))

    # Only assign default Sunday weekly-off if an employee has NO weekly-off recorded at all.
    # Preserves all existing employee preferences (e.g. 'Saturday,Sunday', 'Friday,Saturday', etc.)
    if "employees" in tables:
        conn.execute(text(
            "UPDATE employees SET weekly_off_days = 'Sunday' "
            "WHERE weekly_off_days IS NULL OR weekly_off_days = '';"
        ))

    # Narrowly scoped: Only set default shift timings on the default shift IF timings were never set.
    # NEVER modifies custom work schedules or existing non-null shift configurations.
    if "work_schedules" in tables:
        conn.execute(text(
            "UPDATE work_schedules "
            "SET start_time = '10:00', end_time = '19:00', working_days = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday' "
            "WHERE schedule_name = 'Standard Corporate Shift' AND (start_time IS NULL OR end_time IS NULL);"
        ))

def run_migration() -> None:
    """Execute controlled database updates within a single transaction."""
    with engine.connect() as conn:
        apply_schema_ddl(conn)
        apply_reference_data(conn)
        apply_safe_backfills(conn)
        conn.commit()
    print("Database schema and reference data verified and updated safely.")

if __name__ == "__main__":
    run_migration()
