import os
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from app.db.session import get_connection
from psycopg2.extensions import cursor
import jwt
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

class RegisterResponse(BaseModel):
    id: int
    email:EmailStr

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    access_type: str = "bearer"

# Password / Username DB Checks
def hash_password(password: str) -> str:
    truncated = password[:72]
    return pwd_context.hash(truncated.encode("utf-8"))

def verify_password(given_password: str, true_password_hash: str) -> bool:
    return pwd_context.verify(given_password[:72], true_password_hash)

def check_email_exists(cur: cursor, email: EmailStr) -> bool:
    cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
    row = cur.fetchone()
    if row:
        return True
    return False

def check_username_exists(cur: cursor, username: str) -> bool:
    cur.execute("SELECT id FROM users WHERE username = %s;", (username,))
    row = cur.fetchone()
    if row:
        return True
    return False

# JWT helpers
def create_access_token(user_id: int) -> str:
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
    JWT_EXPIRE_MINS = int(os.getenv("JWT_EXPIRE_MIN"))
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINS)
    }

    token = jwt.encode(payload, JWT_SECRET, JWT_ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

def decode_access_token(token: str) -> dict:
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
    return jwt.decode(token, JWT_SECRET, JWT_ALGORITHM)
    
# Auth Dependencies
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_access_token(token)

    sub = payload.get("sub")
    if sub is None:
        raiseHTTPEXception(status_code=401, detail="Token missing sub field")

    try:
        user_id = int(sub)
    except ValueError:
        raiseHTTPEXception(status_code=401, detail="Token has invalid sub field")

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id, username, email
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )
        row = cur.fetchone()
        if row is None:
            raiseHTTPException(status_code=401, detail="User Not Found")

        return {"id": row[0], "username": row[1], "email": row[2]}

    finally:
        conn.close()
        cur.close()

# Register Route
@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)

def register_user(payload: RegisterRequest):
    conn = get_connection()
    cur = conn.cursor()

    if check_email_exists(cur, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    if check_username_exists(cur, payload.username):
        raise HTTPException(status_code=400, detail="Username already exists")


    # Creating new user in db
    user = None
    password_hash = hash_password(payload.password)
    try:
        cur.execute(
            """
            INSERT INTO users (email, username, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id, email;
            """,
            (payload.email, payload.username, password_hash)
        )

        user = cur.fetchone()
    except:
        raise HTTPException(status_code=500, detail="Failed to get user from database")
    finally:
        conn.commit()
        cur.close()
        conn.close()

    if user is None:
        raise HTTPException(status_code=500, detail="User not found")

    return {"id": user[0], "email":user[1]}
    
# Login Route
@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)

def login_user(payload: LoginRequest):
    conn = get_connection()
    cur = conn.cursor()
    user = None

    try:
        # Getting user info
        cur.execute(
            """
            SELECT id, username, password_hash
            FROM users
            WHERE username = %s
            """,
            (payload.username,)
        )
        user = cur.fetchone()
    except:
        raise HTTPException(status_code=500, detail="Failed to get user from database")
    finally:
        cur.close()
        conn.close()

        if user is None:
            raise HTTPException(status_code=401, detail="Bad Login")
        id = user[0]
        username = user[1]
        true_password_hash = user[2]

        if not verify_password(payload.password, true_password_hash):
            raise HTTPException(status_code=401, detail="Bad Login")

    return create_access_token(id)

# Test Route
@router.get("/me")
def me(user=Depends(get_current_user)):
    return user

