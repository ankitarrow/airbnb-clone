from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from backend.storage import acquire_db_session
from backend.injectors import fetch_authenticated_user
from backend.entities import DBBooking, DBListing, DBListingPhoto, DBReview, DBUser
from backend.helpers import format_host_review_output
from backend.payloads import PayloadBookingOut, PayloadHostReviewOut, PayloadListingCardOut
from backend.endpoints.reservations import _format_booking_output
from backend.endpoints.properties import format_listing_card

provider_router = APIRouter(prefix="/hosts", tags=["hosts"])


@provider_router.get("/me/listings", response_model=list[PayloadListingCardOut])
def get_host_listings(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    host_listings = (
        db_session.query(DBListing)
        .filter(DBListing.host_id == auth_user.id)
        .order_by(DBListing.created_at.desc())
        .all()
    )
    return [format_listing_card(l, db_session) for l in host_listings]


@provider_router.get("/me/bookings", response_model=list[PayloadBookingOut])
def get_host_bookings(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    host_reservations = (
        db_session.query(DBBooking)
        .join(DBListing, DBListing.id == DBBooking.listing_id)
        .options(joinedload(DBBooking.listing), joinedload(DBBooking.guest))
        .filter(DBListing.host_id == auth_user.id)
        .order_by(DBBooking.created_at.desc())
        .all()
    )
    trips_payload = []
    for booking in host_reservations:
        booking_photo = (
            db_session.query(DBListingPhoto)
            .filter(DBListingPhoto.listing_id == booking.listing_id)
            .order_by(DBListingPhoto.sort_order)
            .first()
        )
        trips_payload.append(
            _format_booking_output(booking, booking.listing, booking_photo.url if booking_photo else None, db_session)
        )
    return trips_payload


@provider_router.get("/me/reviews", response_model=list[PayloadHostReviewOut])
def get_host_reviews(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    review_records = (
        db_session.query(DBReview, DBUser.name, DBListing.id, DBListing.title)
        .join(DBListing, DBReview.listing_id == DBListing.id)
        .join(DBUser, DBReview.guest_id == DBUser.id)
        .filter(DBListing.host_id == auth_user.id)
        .order_by(DBReview.created_at.desc())
        .all()
    )
    return [
        format_host_review_output(review, guest_name, listing_id, listing_title, db_session, auth_user.id)
        for review, guest_name, listing_id, listing_title in review_records
    ]
