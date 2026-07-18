from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from server.storage import acquire_db_session
from server.injectors import fetch_authenticated_user
from server.entities import DBUser
from server.payloads import PayloadDemoLoginRequest, PayloadLoginRequest, PayloadRegisterRequest, PayloadUserOut
from server.crypto import generate_secure_hash, validate_password_hash

session_router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_DEMO_EMAILS = {
    "alex@example.com",
    "emma@example.com",
    "liam@example.com",
    "noah@example.com",
    "olivia@example.com",
    "priya@example.com",
    "sarah@example.com",
    "marcus@example.com",
    "james@example.com",
    "david@example.com",
}


@session_router.post("/register", response_model=PayloadUserOut, status_code=201)
def perform_user_registration(payload: PayloadRegisterRequest, db_session: Session = Depends(acquire_db_session)):
    normalized_email = payload.email.strip().lower()
    if db_session.query(DBUser).filter(DBUser.email == normalized_email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    new_user_entity = DBUser(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=generate_secure_hash(payload.password),
        role="host" if payload.is_host else "guest",
        is_host=payload.is_host,
    )
    db_session.add(new_user_entity)
    db_session.commit()
    db_session.refresh(new_user_entity)
    return new_user_entity


@session_router.post("/login", response_model=PayloadUserOut)
def perform_user_login(payload: PayloadLoginRequest, db_session: Session = Depends(acquire_db_session)):
    normalized_email = payload.email.strip().lower()
    existing_user_entity = db_session.query(DBUser).filter(DBUser.email == normalized_email).first()
    if not existing_user_entity or not existing_user_entity.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not validate_password_hash(payload.password, existing_user_entity.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return existing_user_entity


@session_router.post("/demo-login", response_model=PayloadUserOut)
def perform_demo_login(payload: PayloadDemoLoginRequest, db_session: Session = Depends(acquire_db_session)):
    normalized_email = payload.email.strip().lower()
    matching_user_entity = db_session.query(DBUser).filter(DBUser.email == normalized_email).first()
    if not matching_user_entity:
        raise HTTPException(status_code=404, detail="Demo user not found")
    if normalized_email not in ALLOWED_DEMO_EMAILS and matching_user_entity.password_hash:
        raise HTTPException(status_code=403, detail="Use email and password to sign in")
    return matching_user_entity


@session_router.get("/me", response_model=PayloadUserOut)
def get_authenticated_user_profile(auth_user: DBUser = Depends(fetch_authenticated_user)):
    return auth_user


@session_router.post("/verify-identity", response_model=PayloadUserOut)
def simulate_identity_verification(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    """Mock identity verification — marks the user as verified after a simulated review."""
    if auth_user.identity_verified:
        return auth_user
    auth_user.identity_verified = True
    db_session.commit()
    db_session.refresh(auth_user)
    return auth_user
