"""Baseline schema alignment with safe, idempotent token_version and date_of_exit.

Revision ID: 0001_baseline_token_version
Revises: 
Create Date: 2026-10-24 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '0001_baseline_token_version'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # 1. Handle departments table if missing
    if "departments" not in existing_tables:
        op.create_table(
            "departments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("name", sa.String(length=100), unique=True, nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )

    # 2. Check and safely add users.token_version idempotently
    if "users" in existing_tables:
        user_columns = {c["name"] for c in inspector.get_columns("users")}
        if "token_version" not in user_columns:
            op.add_column(
                "users",
                sa.Column("token_version", sa.Integer(), server_default="1", nullable=False)
            )

    # 3. Check and safely add employees.date_of_exit idempotently
    if "employees" in existing_tables:
        employee_columns = {c["name"] for c in inspector.get_columns("employees")}
        if "date_of_exit" not in employee_columns:
            op.add_column(
                "employees",
                sa.Column("date_of_exit", sa.Date(), nullable=True)
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "users" in existing_tables:
        user_columns = {c["name"] for c in inspector.get_columns("users")}
        if "token_version" in user_columns:
            op.drop_column("users", "token_version")

    if "employees" in existing_tables:
        employee_columns = {c["name"] for c in inspector.get_columns("employees")}
        if "date_of_exit" in employee_columns:
            op.drop_column("employees", "date_of_exit")
