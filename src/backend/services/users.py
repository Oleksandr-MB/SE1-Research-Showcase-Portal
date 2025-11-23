import re
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Annotated

from fastapi import Depends, HTTPException, status, APIRouter, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from src.backend.db.db import get_db
from src.backend.db import models
from src.backend.services.schemas import UserCreate, UserRead, Token, TokenData
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from src.backend.config.config_utils import read_config

private_config = read_config("private")
public_config = read_config("public")

ACCESS_TOKEN_EXPIRE_MINUTES = public_config["token_cfg"]["access_token_expire_minutes"]
EMAIL_TOKEN_EXPIRE_MINUTES = public_config["token_cfg"]["email_token_expire_minutes"]

DELETE_EXPIRED_USERS_INTERVAL_MINUTES = public_config[
    "scheduler_cfg"]["delete_expired_users_interval_minutes"]

SECRET_KEY = public_config["crypto_cfg"]["key"]
ALGORITHM = public_config["crypto_cfg"]["algorithm"]

EMAIL_SENDER = private_config["smtp_cfg"]["sender"]
EMAIL_PASSWORD = private_config["smtp_cfg"]["password"]
EMAIL_SMTP_SERVER = private_config["smtp_cfg"]["smtp_server"]
EMAIL_SMTP_PORT = private_config["smtp_cfg"]["smtp_port"]

EMAIL_LINK_BASE = public_config["email_cfg"]["link_base"]

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter()
scheduler = BackgroundScheduler()


def _extract_argon_salt(hashed_password: str) -> str:
    parts = hashed_password.split("$")
    if len(parts) < 6:
        raise RuntimeError("Unexpected password hash format")
    return parts[4]


def get_password_hash(password: str) -> tuple[str, str]:
    hashed = pwd_context.hash(password)
    return hashed, _extract_argon_salt(hashed)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(
        timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.query(models.User).filter(models.User.username == username).first()


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_lost_exception = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Credentials valid but user not found",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    if token_data.username is None:
        raise credentials_exception
    user = get_user_by_username(db, token_data.username)
    if user is None:
        raise user_lost_exception
    return user


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    print(
        f"📝 Registration attempt: username={user_in.username}, email={user_in.email}")

    existing_user = db.query(models.User).filter(
        models.User.username == user_in.username).first()
    if existing_user:
        print(f"❌ Username '{user_in.username}' already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    existing_email = db.query(models.User).filter(
        models.User.email == user_in.email).first()
    if existing_email:
        print(f"❌ Email '{user_in.email}' already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    print("✅ Validation passed, creating user...")

    email_token = create_token(
        data={"sub": user_in.email},
        expires_delta=timedelta(minutes=EMAIL_TOKEN_EXPIRE_MINUTES),
    )
    verification_link = EMAIL_LINK_BASE + email_token

    password_hash, password_salt = get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        password_hash=password_hash,
        password_salt=password_salt,
        role=models.UserRole.USER,
        email=user_in.email,
        is_email_verified=False,
    )
    db.add(db_user)
    db.commit()

    send_verification_email(user_in.email, verification_link)

    return UserRead(
        id=db_user.id,
        username=db_user.username,
        role=db_user.role,
        email=db_user.email,
    )


def send_verification_email(recipient_email: str, verification_link: str):

    msg = EmailMessage()
    msg['Subject'] = 'Verify your email for Research Showcase Portal'
    msg['From'] = EMAIL_SENDER
    msg['To'] = recipient_email
    msg.set_content(
        f'Hello!\n\n'
        f'Please verify your email address by clicking the link below:\n\n'
        f'{verification_link}\n\n'
        f'This link will expire in {int(EMAIL_TOKEN_EXPIRE_MINUTES)} minutes.\n\n'
        f'If you did not create an account, please ignore this email.\n\n'
        f'Note that your account will be deleted if not verified within this period.\n\n'
        f'Best regards,\n'
        f'Research Showcase Portal Team'
    )

    try:
        with smtplib.SMTP(EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
            print(f"✅ Verification email sent to {recipient_email}")
    except Exception as e:
        raise RuntimeError(f"❌ Failed to send email: {e}")


@router.get("/verify-email")
def verify_email(token: Annotated[str, Query(...)], db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token",
        )

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_email_verified:
        return {"message": "Email already verified"}

    user.is_email_verified = True
    db.commit()

    return {"message": "Email successfully verified"}


def delete_expired_users(db: Session):
    expiration_threshold = datetime.now(
        timezone.utc) - timedelta(minutes=EMAIL_TOKEN_EXPIRE_MINUTES)
    expired_users = db.query(models.User).filter(
        models.User.is_email_verified == False,
        models.User.created_at < expiration_threshold
    ).all()

    for user in expired_users:
        db.delete(user)
    db.commit()


def start_cleanup_scheduler():

    def cleanup_job():
        db = next(get_db())
        try:
            delete_expired_users(db)
        finally:
            db.close()

    scheduler.add_job(
        cleanup_job,
        trigger=IntervalTrigger(minutes=DELETE_EXPIRED_USERS_INTERVAL_MINUTES),
        id='delete_expired_users',
        name='Delete expired unverified users',
        replace_existing=True
    )
    scheduler.start()


@router.post("/login", response_model=Token)
def login(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db)):

    user = get_user_by_username(db, form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: models.User = Depends(get_current_user)):

    return UserRead(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        email=current_user.email,
    )
