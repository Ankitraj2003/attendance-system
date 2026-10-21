from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_exit DATE;"))
        conn.execute(text("UPDATE work_schedules SET start_time='10:00', end_time='19:00' WHERE schedule_name='Standard Corporate Shift' OR schedule_name IS NOT NULL;"))
        conn.execute(text("UPDATE employees SET weekly_off_days='Saturday,Sunday' WHERE weekly_off_days IS NULL OR weekly_off_days = '';"))
        conn.commit()
    print("Database updated successfully.")

if __name__ == "__main__":
    run_migration()
