from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from server.storage import acquire_db_session
from server.injectors import fetch_authenticated_user
from server.entities import DBFavorite, DBListing, DBUser
from server.payloads import PayloadListingCardOut
from server.endpoints.properties import format_listing_card

bookmark_router = APIRouter(prefix="/favorites", tags=["favorites"])


@bookmark_router.post("/{listing_id}", status_code=201)
def add_listing_to_bookmarks(
    listing_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    listing_entity = db_session.query(DBListing).filter(DBListing.id == listing_id).first()
    if not listing_entity:
        raise HTTPException(status_code=404, detail="Listing not found")

    existing_bookmark = (
        db_session.query(DBFavorite)
        .filter(DBFavorite.user_id == auth_user.id, DBFavorite.listing_id == listing_id)
        .first()
    )
    if existing_bookmark:
        return {"message": "Already favorited"}

    db_session.add(DBFavorite(user_id=auth_user.id, listing_id=listing_id))
    db_session.commit()
    return {"message": "Added to favorites"}


@bookmark_router.delete("/{listing_id}", status_code=204)
def remove_listing_from_bookmarks(
    listing_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    bookmark_record = (
        db_session.query(DBFavorite)
        .filter(DBFavorite.user_id == auth_user.id, DBFavorite.listing_id == listing_id)
        .first()
    )
    if bookmark_record:
        db_session.delete(bookmark_record)
        db_session.commit()


@bookmark_router.get("/me", response_model=list[PayloadListingCardOut])
def get_my_bookmarks(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    favorited_listings = (
        db_session.query(DBListing)
        .join(DBFavorite, DBFavorite.listing_id == DBListing.id)
        .filter(DBFavorite.user_id == auth_user.id)
        .all()
    )
    return [format_listing_card(l, db_session) for l in favorited_listings]
