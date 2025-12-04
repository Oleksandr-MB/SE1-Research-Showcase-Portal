from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ATTACHMENTS_DIR = BACKEND_DIR / "uploads"
ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
