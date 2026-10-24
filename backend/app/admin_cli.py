import sys
import getpass
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User, AuditLog
from app.auth import get_password_hash

def validate_password_complexity(password: str) -> None:
    if len(password) < 9:
        raise ValueError("Password must be at least 9 characters long.")
    if not any(c.isalpha() for c in password):
        raise ValueError("Password must contain at least one letter (a-z, A-Z).")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one digit (0-9).")
    if not any(not c.isalnum() for c in password):
        raise ValueError("Password must contain at least one special character (!@#$%^&*...).")

def create_admin():
    print("=== Secure Administrator Account Creation ===")
    username = input("Enter admin username: ").strip()
    if not username:
        print("Error: Username cannot be blank.")
        sys.exit(1)
        
    email = input("Enter admin email address: ").strip().lower()
    if not email or "@" not in email:
        print("Error: Valid email address is required.")
        sys.exit(1)

    password = getpass.getpass("Enter secure password (hidden): ")
    try:
        validate_password_complexity(password)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    confirm_password = getpass.getpass("Confirm secure password (hidden): ")
    if password != confirm_password:
        print("Error: Passwords do not match.")
        sys.exit(1)

    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing:
            print(f"Error: A user with username '{username}' or email '{email}' already exists.")
            sys.exit(1)

        new_admin = User(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
            role="ADMIN",
            account_status="ACTIVE",
            token_version=1
        )
        db.add(new_admin)
        db.flush()

        # Audit log creation
        db.add(AuditLog(
            actor="CLI_OPERATOR",
            actor_role="SYSTEM_ADMIN",
            action="ADMIN_CREATED_CLI",
            entity_type="USER",
            entity_id=str(new_admin.id),
            reason=f"Administrator '{username}' created via interactive CLI",
            ip_address="127.0.0.1"
        ))
        db.commit()
        print(f"\n[SUCCESS] Administrator '{username}' created successfully.")
    except Exception as e:
        db.rollback()
        print(f"Database error during admin creation: {e}")
        sys.exit(1)
    finally:
        db.close()

def reset_admin_password():
    print("=== Secure Administrator Password Reset ===")
    username = input("Enter username or email of administrator to reset: ").strip()
    if not username:
        print("Error: Username or email required.")
        sys.exit(1)

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter((User.username == username) | (User.email == username)).first()
        if not user or user.role != "ADMIN":
            print("Error: Administrator account not found.")
            sys.exit(1)

        print(f"Target account: {user.username} ({user.email})")
        confirmation = input("Type 'CONFIRM' to authorize password reset: ").strip()
        if confirmation != "CONFIRM":
            print("Password reset aborted by operator.")
            sys.exit(0)

        new_password = getpass.getpass("Enter new secure password (hidden): ")
        try:
            validate_password_complexity(new_password)
        except ValueError as e:
            print(f"Error: {e}")
            sys.exit(1)

        confirm_password = getpass.getpass("Confirm new password (hidden): ")
        if new_password != confirm_password:
            print("Error: Passwords do not match.")
            sys.exit(1)

        user.password_hash = get_password_hash(new_password)
        user.token_version = (getattr(user, "token_version", 1) or 1) + 1

        db.add(AuditLog(
            actor="CLI_OPERATOR",
            actor_role="SYSTEM_ADMIN",
            action="ADMIN_PASSWORD_RESET_CLI",
            entity_type="USER",
            entity_id=str(user.id),
            reason=f"Administrator '{user.username}' password reset via authorized CLI; all active sessions revoked",
            ip_address="127.0.0.1"
        ))
        db.commit()
        print(f"\n[SUCCESS] Password for administrator '{user.username}' updated. All active sessions have been revoked.")
    except Exception as e:
        db.rollback()
        print(f"Database error during password reset: {e}")
        sys.exit(1)
    finally:
        db.close()

def list_admins():
    print("=== Registered Administrators ===")
    db: Session = SessionLocal()
    try:
        admins = db.query(User).filter(User.role == "ADMIN").all()
        if not admins:
            print("No administrators found in database.")
            return

        print(f"{'ID':<6} {'Username':<20} {'Email':<30} {'Status':<12} {'Created At'}")
        print("-" * 80)
        for a in admins:
            print(f"{a.id:<6} {a.username:<20} {a.email:<30} {a.account_status:<12} {a.created_at}")
    finally:
        db.close()

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.admin_cli <command>")
        print("Commands:")
        print("  create-admin    Interactively create a new administrator")
        print("  reset-password  Interactively reset an administrator's password")
        print("  list-admins     List registered administrators (no secrets revealed)")
        sys.exit(1)

    cmd = sys.argv[1].lower().strip()
    if cmd == "create-admin":
        create_admin()
    elif cmd == "reset-password":
        reset_admin_password()
    elif cmd == "list-admins":
        list_admins()
    else:
        print(f"Unknown command: '{cmd}'. Available: create-admin, reset-password, list-admins")
        sys.exit(1)

if __name__ == "__main__":
    main()
