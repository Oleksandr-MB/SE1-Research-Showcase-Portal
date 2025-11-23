from src.backend.db.db import engine
from src.backend.db.models import Base
import logging

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logging.info("🔄 Trying to create database schema...")

    try:
        Base.metadata.drop_all(bind=engine)
        logging.info("🗑️ Existing tables dropped successfully.")
    except Exception as e:
        if "no such table" in str(e).lower():
            logging.info("ℹ️ No existing tables to drop.")
        else:
            logging.error(f"❌ Failed to drop existing tables: {e}")

    Base.metadata.create_all(bind=engine)
