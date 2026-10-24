from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_exit DATE;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;"))
        conn.execute(text("UPDATE users SET token_version = 1 WHERE token_version IS NULL;"))
        conn.execute(text("UPDATE work_schedules SET start_time='10:00', end_time='19:00', working_days='Monday,Tuesday,Wednesday,Thursday,Friday,Saturday' WHERE schedule_name='Standard Corporate Shift' OR schedule_name IS NOT NULL;"))
        conn.execute(text("UPDATE employees SET weekly_off_days='Sunday' WHERE weekly_off_days IS NULL OR weekly_off_days = '' OR weekly_off_days = 'Saturday,Sunday';"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);"))
        conn.execute(text("INSERT INTO departments (name) VALUES ('Engineering'), ('Marketing'), ('Operations'), ('Human Resources') ON CONFLICT (name) DO NOTHING;"))
        conn.commit()
    print("Database updated successfully.")

if __name__ == "__main__":
    run_migration()
