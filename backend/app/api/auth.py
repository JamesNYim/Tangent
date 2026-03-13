import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class RegisterResponse(BaseModel):
    id: int
    email: EmailStr


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def hash_password(password: str) -> str:
    truncated = password[:72]
    return pwd_context.hash(truncated)


def verify_password(given_password: str, true_password_hash: str) -> bool:
    return pwd_context.verify(given_password[:72], true_password_hash)


def check_email_exists(db: Session, email: EmailStr) -> bool:
    result = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": str(email)},
    )
    return result.fetchone() is not None


def check_username_exists(db: Session, username: str) -> bool:
    result = db.execute(
        text("SELECT id FROM users WHERE username = :username"),
        {"username": username},
    )
    return result.fetchone() is not None


def create_access_token(user_id: int) -> dict:
    jwt_secret = os.getenv("JWT_SECRET")
    jwt_algorithm = os.getenv("JWT_ALGORITHM")
    jwt_expire_mins = int(os.getenv("JWT_EXPIRE_MIN", "60"))

    if not jwt_secret or not jwt_algorithm:
        raise HTTPException(status_code=500, detail="JWT config missing")

    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=jwt_expire_mins),
    }

    token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)
    return {"access_token": token, "token_type": "bearer"}


def decode_access_token(token: str) -> dict:
    jwt_secret = os.getenv("JWT_SECRET")
    jwt_algorithm = os.getenv("JWT_ALGORITHM")

    if not jwt_secret or not jwt_algorithm:
        raise HTTPException(status_code=500, detail="JWT config missing")

    try:
        return jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> dict:
    payload = decode_access_token(token)

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Token missing sub field")

    try:
        user_id = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token has invalid sub field")

    result = db.execute(
        text(
            """
            SELECT id, username, email
            FROM users
            WHERE id = :user_id
            """
        ),
        {"user_id": user_id},
    )
    row = result.fetchone()

    if row is None:
        raise HTTPException(status_code=401, detail="User not found")

    return {"id": row[0], "username": row[1], "email": row[2]}


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    if check_email_exists(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    if check_username_exists(db, payload.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    password_hash = hash_password(payload.password)

    try:
        result = db.execute(
            text(
                """
                INSERT INTO users (email, username, password_hash)
                VALUES (:email, :username, :password_hash)
                RETURNING id, email
                """
            ),
            {
                "email": str(payload.email),
                "username": payload.username,
                "password_hash": password_hash,
            },
        )
        user = result.fetchone()
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create user")

    if user is None:
        raise HTTPException(status_code=500, detail="User not found after insert")

    return {"id": user[0], "email": user[1]}


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text(
                """
                SELECT id, username, password_hash
                FROM users
                WHERE username = :username
                """
            ),
            {"username": payload.username},
        )
        user = result.fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to get user from database")

    if user is None:
        raise HTTPException(status_code=401, detail="Bad login")

    user_id = user[0]
    true_password_hash = user[2]

    if not verify_password(payload.password, true_password_hash):
        raise HTTPException(status_code=401, detail="Bad login")

    return create_access_token(user_id)


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
