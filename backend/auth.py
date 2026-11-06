from fastapi import APIRouter, HTTPException, Response, Cookie
from pydantic import BaseModel, Field
import bcrypt, jwt, os, re, uuid, datetime
from db import users_collection
from store import IN_MEMORY_USERS

router = APIRouter()
SECRET = os.getenv("JWT_SECRET")
if not SECRET:
    raise RuntimeError("JWT_SECRET must be set in the environment")
TOKEN_TTL_HOURS = 8
MAX_PASSWORD_BYTES = 72
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _validate_email(email: str) -> None:
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address")


def _hash_password(password: str) -> str:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise HTTPException(status_code=400, detail="Password is too long")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        return False
    try:
        return bcrypt.checkpw(encoded, password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _find_user(email: str) -> dict | None:
    try:
        user = users_collection.find_one({"email": email})
        if user:
            return user
    except Exception as err:
        print("MongoDB user lookup error, falling back to memory:", str(err))
    return IN_MEMORY_USERS.get(email)


def _create_user(user: dict) -> None:
    try:
        users_collection.insert_one(user)
        return
    except Exception as err:
        print("MongoDB user insert error, falling back to memory:", str(err))
    IN_MEMORY_USERS[user["email"]] = user


def _issue_session(email: str, response: Response) -> None:
    token = jwt.encode(
        {"sub": email, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_TTL_HOURS)},
        SECRET,
        algorithm="HS256",
    )
    response.set_cookie(
        "session",
        token,
        httponly=True,
        samesite="lax",
        max_age=TOKEN_TTL_HOURS * 3600,
    )


def _public_user(user: dict) -> dict:
    return {"name": user.get("name", ""), "email": user.get("email", "")}


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str
    password: str = Field(..., min_length=1)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/signup")
def signup(body: SignupRequest, response: Response):
    email = _normalize_email(body.email)
    _validate_email(email)

    if _find_user(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": _hash_password(body.password),
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    _create_user(user)
    _issue_session(email, response)
    return _public_user(user)


@router.post("/auth/login")
def login(body: LoginRequest, response: Response):
    email = _normalize_email(body.email)
    _validate_email(email)

    user = _find_user(email)
    if not user or not _verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _issue_session(email, response)
    return _public_user(user)


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"status": "logged_out"}


@router.get("/auth/me")
def me(session: str | None = Cookie(default=None)):
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(session, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = _find_user(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return _public_user(user)
