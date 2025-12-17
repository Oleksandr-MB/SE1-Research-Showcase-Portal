from src.database.db import engine
from src.database.models import Base, User, UserRole
from src.backend.services.user_service import get_password_hash
import logging
from sqlalchemy.orm import sessionmaker

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
    logging.info("✅ Database schema created successfully.")

    # SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    #
    # with SessionLocal() as db:
    #     password_hash, password_salt = get_password_hash("test")
    #     user = User(
    #         username="test",
    #         email="test@gmail.com",
    #         password_hash=password_hash,
    #         password_salt=password_salt,
    #         role=UserRole.USER,
    #         is_email_verified=True
    #     )
    #     db.add(user)
    #     db.commit()
    #     print(f"✅ Created test user: {user.username} ({user.email})")