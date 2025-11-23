from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from src.backend.config.config_utils import read_config

public_config = read_config("public")
prefix = public_config['db_cfg']['base']
user = public_config['db_cfg']['user']
password = public_config['db_cfg']['password']
host = public_config['db_cfg']['host']
port = public_config['db_cfg']['port']
database = public_config['db_cfg']['database']
DATABASE_URL = f"{prefix}://{user}:{password}@{host}:{port}/{database}"


def _ensure_database_exists() -> None:
    if not prefix.startswith("postgresql"):
        return

    admin_url = f"{prefix}://{user}:{password}@{host}:{port}/postgres"
    admin_engine = create_engine(
        admin_url,
        isolation_level="AUTOCOMMIT",
        echo=False,
        future=True,
    )

    try:
        with admin_engine.connect() as connection:
            exists = connection.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": database},
            ).scalar()

            if not exists:
                safe_db_name = database.replace('"', '""')
                connection.execute(text(f'CREATE DATABASE "{safe_db_name}"'))
    except OperationalError as exc:
        raise RuntimeError(
            f"Unable to ensure database '{database}' exists: {exc}"
        ) from exc
    finally:
        admin_engine.dispose()


_ensure_database_exists()

engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()