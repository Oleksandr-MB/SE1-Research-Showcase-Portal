# from src.database.db import engine
# from src.database.models import Base
# import logging

# if __name__ == "__main__":
#     logging.basicConfig(level=logging.INFO)
#     logging.info("🔄 Trying to create database schema...")

#     try:
#         Base.metadata.drop_all(bind=engine)
#         logging.info("🗑️ Existing tables dropped successfully.")
#     except Exception as e:
#         if "no such table" in str(e).lower():
#             logging.info("ℹ️ No existing tables to drop.")
#         else:
#             logging.error(f"❌ Failed to drop existing tables: {e}")

#     Base.metadata.create_all(bind=engine)
#     logging.info("✅ Database schema created successfully.")


from src.database.db import engine
from src.database.models import Base
import logging

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Debug: Show connection URL (without password)
    logging.info(f"🔗 Database URL: {engine.url}")
    
    # Debug: Show all tables that will be created
    logging.info(f"📋 Tables to create: {list(Base.metadata.tables.keys())}")
    logging.info(f"📊 Number of tables: {len(Base.metadata.tables)}")
    
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
    
    # Verify tables were created
    from sqlalchemy import inspect
    inspector = inspect(engine)
    created_tables = inspector.get_table_names()
    logging.info(f"✔️ Verified tables in database: {created_tables}")