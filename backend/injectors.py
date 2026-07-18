from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from backend.storage import acquire_db_session
from backend.entities import DBUser

def fetch_authenticated_user(
    user_header_id: int | None = Header(None, alias="X-User-Id"),
    db_session: Session = Depends(acquire_db_session),
) -> DBUser:
    if user_header_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    matching_user = db_session.query(DBUser).filter(DBUser.id == user_header_id).first()
    if not matching_user:
        raise HTTPException(status_code=401, detail="User not found")
    return matching_user


def fetch_optional_user(
    user_header_id: int | None = Header(None, alias="X-User-Id"),
    db_session: Session = Depends(acquire_db_session),
) -> DBUser | None:
    if user_header_id is None:
        return None
    return db_session.query(DBUser).filter(DBUser.id == user_header_id).first()
