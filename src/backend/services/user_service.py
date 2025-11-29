import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Annotated
from threading import Lock

from fastapi import Depends, HTTPException, status, APIRouter, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.database import models
from src.backend.services.schemas import UserCreate, UserRead, Token, TokenData
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from src.backend.config.config_utils import read_config

import logging

logging.basicConfig(level=logging.INFO)

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

router = APIRouter()
scheduler = BackgroundScheduler()
_revoked_tokens: set[str] = set()
_revoked_tokens_lock = Lock()


def revoke_token(token: str) -> None:
    with _revoked_tokens_lock:
        _revoked_tokens.add(token)


def is_token_revoked(token: str) -> bool:
    with _revoked_tokens_lock:
        return token in _revoked_tokens


def _extract_argon_salt(hashed_password: str) -> str:
    parts = hashed_password.split("$")
    if len(parts) < 6:
        logging.error("Unexpected password hash format")
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

    token_revoked_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token has been revoked",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_lost_exception = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Credentials valid but user not found",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if is_token_revoked(token):
        logging.warning("Attempt to use revoked token")
        raise token_revoked_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            logging.error("Token payload does not contain 'sub'")
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    if token_data.username is None:
        logging.error("Token data does not contain 'username'")
        raise credentials_exception
    user = get_user_by_username(db, token_data.username)
    if user is None:
        logging.error(f"User not found for username: {token_data.username}")
        raise user_lost_exception
    return user


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    logging.info(
        f"📝 Registration attempt: username={user_in.username}, email={user_in.email}")

    existing_user = db.query(models.User).filter(
        models.User.username == user_in.username).first()
    if existing_user:
        logging.error(f"❌ Username '{user_in.username}' already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    existing_email = db.query(models.User).filter(
        models.User.email == user_in.email).first()
    if existing_email:
        logging.error(f"❌ Email '{user_in.email}' already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    logging.info("✅ Validation passed, creating user...")

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
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_user)
    db.commit()

    send_verification_email(user_in.email, verification_link)
    logging.info("✅ User created successfully.")

    return UserRead(
        id=db_user.id,
        username=db_user.username,
        role=db_user.role,
        created_at=db_user.created_at,
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
            logging.info(f"✅ Verification email sent to {recipient_email}")
    except Exception as e:
        logging.error(f"❌ Failed to send email: {e}")
        raise RuntimeError(f"❌ Failed to send email: {e}")


@router.get("/verify-email")
def verify_email(token: Annotated[str, Query(...)], db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            logging.error("Token payload does not contain 'sub'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token",
            )
    except JWTError:
        logging.error("Invalid token error during email verification")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token",
        )

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        logging.error(f"User not found for email: {email}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_email_verified:
        logging.info(f"Email already verified for user: {email}")
        return {"message": "Email already verified"}

    user.is_email_verified = True
    db.commit()
    logging.info(f"✅ Email successfully verified for user: {email}")

    return {"message": "Email successfully verified"}


def delete_expired_users(db: Session):
    expiration_threshold = datetime.now(
        timezone.utc) - timedelta(minutes=EMAIL_TOKEN_EXPIRE_MINUTES)
    expired_users = db.query(models.User).filter(
        models.User.is_email_verified == False,
        models.User.created_at < expiration_threshold
    ).all()

    for user in expired_users:
        logging.info(f"Deleting expired unverified user: {user.username}")
        db.delete(user)
    db.commit()


def start_cleanup_scheduler():

    def cleanup_job():
        logging.info("Running cleanup job to delete expired unverified users")
        db = next(get_db())
        try:
            delete_expired_users(db)
        finally:
            logging.info("Cleanup job finished")
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
        logging.error(f"Login failed: User '{form_data.username}' not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        logging.error(
            f"Login failed: Incorrect password for user '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_email_verified:
        logging.error(
            f"Login failed: Email not verified for user '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
        token: str = Depends(oauth2_scheme),
        current_user: models.User = Depends(get_current_user)):
    revoke_token(token)
    logging.info(f"User '{current_user.username}' logged out")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: models.User = Depends(get_current_user)):

    return UserRead(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        created_at=current_user.created_at,
    )


@router.get("/count", response_model=int)
async def get_user_count(
    db: Session = Depends(get_db)
):
    return int(db.query(models.User).count())


@router.get("/latest", response_model=list[UserRead])
async def get_latest_users(
    db: Session = Depends(get_db),
    n: Annotated[int, Query(gt=0, le=50)] = 10,
):
    return db.query(models.User) \
        .order_by(models.User.created_at.desc()) \
        .limit(n).all()


@router.get("/{username}", response_model=UserRead)
async def get_user_profile(
    username: str,
    db: Session = Depends(get_db),
):

    user = get_user_by_username(db, username)
    if not user:
        logging.error(f"User '{username}' not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserRead(
        id=user.id,
        username=user.username,
        role=user.role,
        created_at=user.created_at,
    )


def promote_user(username: str, db: Session):
    user = get_user_by_username(db, username)
    if not user:
        logging.error(
            f"User '{username}' not found for promotion to RESEARCHER")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.role = models.UserRole.RESEARCHER
    logging.info(f"User '{username}' promoted to RESEARCHER")
    db.commit()


def make_moderator(username: str, db: Session):
    user = get_user_by_username(db, username)
    if not user:
        logging.error(
            f"User '{username}' not found for promotion to MODERATOR")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.role = models.UserRole.MODERATOR
    logging.info(f"User '{username}' promoted to MODERATOR")
    db.commit()


@router.get("/{username}/post_count", response_model=int)
async def get_user_post_count(
    username: str,
    db: Session = Depends(get_db),
):
    user = get_user_by_username(db, username)
    if not user:
        logging.error(f"User '{username}' not found for post count retrieval")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return int(db.query(models.Post)
               .filter(models.Post.poster_id == user.id)
               .count())


@router.get("/{username}/score", response_model=int)
async def get_user_score(
    username: str,
    db: Session = Depends(get_db),
):
    user = get_user_by_username(db, username)
    if not user:
        logging.error(f"User '{username}' not found for score retrieval")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    post_score = db.query(models.PostVote) \
        .join(models.Post, models.PostVote.post_id == models.Post.id) \
        .filter(models.Post.poster_id == user.id) \
        .with_entities(models.PostVote.value) \
        .all()

    comment_score = db.query(models.CommentVote) \
        .join(models.Comment, models.CommentVote.comment_id == models.Comment.id) \
        .filter(models.Comment.commenter_id == user.id) \
        .with_entities(models.CommentVote.value) \
        .all()

    return sum(vote.value for vote in post_score) + sum(vote.value for vote in comment_score)
