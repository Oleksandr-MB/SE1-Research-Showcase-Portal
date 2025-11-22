from backend.db.db import engine
from backend.db.models import Base

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
