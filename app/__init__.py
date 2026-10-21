"""Compatibility package for hosts configured at repository root.

The actual FastAPI package lives in backend/app. This package redirects Python's
module search path to that existing package so a root-level start command such
as `uvicorn app.main:app` can load it without copying the backend source.
"""
from pathlib import Path

_backend_app = Path(__file__).resolve().parent.parent / "backend" / "app"
if not _backend_app.is_dir():
    raise RuntimeError(f"Backend package not found at {_backend_app}")

__path__ = [str(_backend_app)]
