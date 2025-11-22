from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from src.backend.db.db import get_db
from src.backend.db import models
from src.backend.services.schemas import UserCreate, UserRead, Token, TokenData

#okay, just make a config class and loader later, k?
SECRET_KEY = "guys-this-is-secure-i-swear"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
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

    existing_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    existing_email = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_user = models.User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=models.UserRole.USER,
        email = user_in.email,
        is_email_verified = False,
    )
    db.add(db_user)
    db.commit()

    # Build response
    return UserRead(
        id=db_user.id,
        username=db_user.username,
        role=db_user.role,
        email=db_user.email,
    )

@router.post("/login", response_model=Token)
def login(
    form_data : OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)):

    user = get_user_by_username(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserRead)
async def read_current_user(
    current_user: models.User = Depends(get_current_user)):

    return UserRead(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        email=current_user.email,
    )
