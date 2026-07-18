from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.storage import acquire_db_session
from backend.injectors import fetch_authenticated_user
from backend.entities import DBBooking, DBListing, DBListingPhoto, DBReview, DBUser
from backend.payloads import PayloadBookingCreate, PayloadBookingOut

reservation_router = APIRouter(prefix="/bookings", tags=["bookings"])

BASE_CLEANING_FEE = 50.0
PCT_SERVICE_FEE_RATE = 0.12
THRESHOLD_LATE_CANCEL_HOURS = 24


def _detect_booking_overlap(
    db_session: Session,
    target_listing_id: int,
    check_in_date: date,
    check_out_date: date,
    exclude_booking_id: int | None = None,
) -> bool:
    overlap_query = db_session.query(DBBooking).filter(
        DBBooking.listing_id == target_listing_id,
        DBBooking.status == "confirmed",
        DBBooking.check_in < check_out_date,
        DBBooking.check_out > check_in_date,
    )
    if exclude_booking_id:
        overlap_query = overlap_query.filter(DBBooking.id != exclude_booking_id)
    return overlap_query.first() is not None


def _calculate_total_price(rate_per_night: float, check_in_date: date, check_out_date: date) -> float:
    num_nights = (check_out_date - check_in_date).days
    if num_nights <= 0:
        raise HTTPException(status_code=400, detail="Invalid date range")
    raw_subtotal = rate_per_night * num_nights
    raw_service_fee = raw_subtotal * PCT_SERVICE_FEE_RATE
    return round(raw_subtotal + BASE_CLEANING_FEE + raw_service_fee, 2)


def _compute_refund_amount(booking_obj: DBBooking, current_time: datetime | None = None) -> tuple[float, int]:
    """Return (refund_amount, refund_percent). 50% if cancelling within 24h of check-in."""
    current_time = current_time or datetime.utcnow()
    booking_start_datetime = datetime.combine(booking_obj.check_in, datetime.min.time())
    hours_remaining = (booking_start_datetime - current_time).total_seconds() / 3600
    refund_percentage = 50 if hours_remaining < THRESHOLD_LATE_CANCEL_HOURS else 100
    calculated_amount = round(booking_obj.total_price * (refund_percentage / 100), 2)
    return calculated_amount, refund_percentage


def _format_booking_output(
    booking_obj: DBBooking,
    listing_obj: DBListing,
    photo_address: str | None,
    db_session: Session,
    current_date: date | None = None,
) -> PayloadBookingOut:
    current_date = current_date or date.today()
    review_record = db_session.query(DBReview).filter(DBReview.booking_id == booking_obj.id).first()
    is_reviewed = review_record is not None
    is_eligible_for_review = (
        booking_obj.status == "confirmed"
        and booking_obj.check_out < current_date
        and not is_reviewed
    )
    reimbursement_value = booking_obj.refund_amount
    reimbursement_percent = None
    if booking_obj.status == "cancelled" and reimbursement_value is not None:
        reimbursement_percent = (
            round((reimbursement_value / booking_obj.total_price) * 100) if booking_obj.total_price else 100
        )
    elif booking_obj.status == "confirmed":
        _, reimbursement_percent = _compute_refund_amount(booking_obj)

    return PayloadBookingOut(
        id=booking_obj.id,
        listing_id=listing_obj.id,
        listing_title=listing_obj.title,
        listing_photo=photo_address,
        location_city=listing_obj.location_city,
        host_id=listing_obj.host_id,
        guest_id=booking_obj.guest_id,
        guest_name=booking_obj.guest.name if booking_obj.guest else "Guest",
        check_in=booking_obj.check_in,
        check_out=booking_obj.check_out,
        guests_count=booking_obj.guests_count,
        total_price=booking_obj.total_price,
        refund_amount=reimbursement_value,
        refund_percent=reimbursement_percent,
        status=booking_obj.status,
        created_at=booking_obj.created_at,
        has_review=is_reviewed,
        can_review=is_eligible_for_review,
        review_id=review_record.id if review_record else None,
        host_reply=review_record.host_reply if review_record else None,
        host_reply_at=review_record.host_reply_at if review_record else None,
    )


@reservation_router.post("", response_model=PayloadBookingOut, status_code=201)
def submit_new_booking(
    payload: PayloadBookingCreate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    listing_entity = db_session.query(DBListing).filter(DBListing.id == payload.listing_id).first()
    if not listing_entity:
        raise HTTPException(status_code=404, detail="Listing not found")
    if payload.check_out <= payload.check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    if payload.guests_count > listing_entity.max_guests:
        raise HTTPException(status_code=400, detail="Too many guests for this listing")
    if _detect_booking_overlap(db_session, listing_entity.id, payload.check_in, payload.check_out):
        raise HTTPException(status_code=409, detail="Dates are not available")

    computed_total = _calculate_total_price(listing_entity.price_per_night, payload.check_in, payload.check_out)
    new_booking_entity = DBBooking(
        listing_id=listing_entity.id,
        guest_id=auth_user.id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests_count=payload.guests_count,
        total_price=computed_total,
        status="confirmed",
    )
    db_session.add(new_booking_entity)
    db_session.commit()
    db_session.refresh(new_booking_entity)

    first_photo_record = (
        db_session.query(DBListingPhoto)
        .filter(DBListingPhoto.listing_id == listing_entity.id)
        .order_by(DBListingPhoto.sort_order)
        .first()
    )
    return _format_booking_output(
        new_booking_entity,
        listing_entity,
        first_photo_record.url if first_photo_record else None,
        db_session,
    )


@reservation_router.get("/me", response_model=list[PayloadBookingOut])
def get_my_trips(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    user_bookings = (
        db_session.query(DBBooking)
        .options(joinedload(DBBooking.listing), joinedload(DBBooking.guest))
        .filter(DBBooking.guest_id == auth_user.id)
        .order_by(DBBooking.created_at.desc())
        .all()
    )
    trips_list = []
    for booking_obj in user_bookings:
        trip_photo = (
            db_session.query(DBListingPhoto)
            .filter(DBListingPhoto.listing_id == booking_obj.listing_id)
            .order_by(DBListingPhoto.sort_order)
            .first()
        )
        trips_list.append(
            _format_booking_output(
                booking_obj,
                booking_obj.listing,
                trip_photo.url if trip_photo else None,
                db_session,
            )
        )
    return trips_list


@reservation_router.get("/{booking_id}/refund-preview")
def preview_cancellation_refund(
    booking_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    booking_entity = db_session.query(DBBooking).filter(DBBooking.id == booking_id).first()
    if not booking_entity:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking_entity.guest_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking_entity.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking already cancelled")

    refund_amt, refund_pct = _compute_refund_amount(booking_entity)
    return {
        "refund_amount": refund_amt,
        "refund_percent": refund_pct,
        "total_price": booking_entity.total_price,
        "late_cancel": refund_pct == 50,
    }


@reservation_router.patch("/{booking_id}/cancel", response_model=PayloadBookingOut)
def request_booking_cancellation(
    booking_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    booking_entity = (
        db_session.query(DBBooking)
        .options(joinedload(DBBooking.listing), joinedload(DBBooking.guest))
        .filter(DBBooking.id == booking_id)
        .first()
    )
    if not booking_entity:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking_entity.guest_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking_entity.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking already cancelled")

    computed_refund, _ = _compute_refund_amount(booking_entity)
    booking_entity.refund_amount = computed_refund
    booking_entity.status = "cancelled"
    db_session.commit()
    db_session.refresh(booking_entity)

    listing_photo_record = (
        db_session.query(DBListingPhoto)
        .filter(DBListingPhoto.listing_id == booking_entity.listing_id)
        .order_by(DBListingPhoto.sort_order)
        .first()
    )
    return _format_booking_output(
        booking_entity,
        booking_entity.listing,
        listing_photo_record.url if listing_photo_record else None,
        db_session,
    )
