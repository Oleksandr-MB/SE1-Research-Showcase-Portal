from src.backend.db.db import engine
from src.backend.db.models import Base

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
