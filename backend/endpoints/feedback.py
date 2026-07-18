from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.storage import acquire_db_session
from backend.injectors import fetch_authenticated_user, fetch_optional_user
from backend.entities import DBBooking, DBListing, DBReview, DBReviewLike, DBUser
from backend.helpers import format_host_review_output, compute_review_likes, format_review_output
from backend.payloads import (
    PayloadGuestReviewOut,
    PayloadHostReviewOut,
    PayloadReviewCreate,
    PayloadReviewOut,
    PayloadReviewReplyCreate,
    PayloadReviewUpdate,
    PayloadReviewWatchOut,
)

feedback_router = APIRouter(prefix="/reviews", tags=["reviews"])


@feedback_router.post("", response_model=PayloadReviewOut, status_code=201)
def submit_review(
    payload: PayloadReviewCreate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    booking_record = db_session.query(DBBooking).filter(DBBooking.id == payload.booking_id).first()
    if not booking_record:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking_record.guest_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking_record.listing_id != payload.listing_id:
        raise HTTPException(status_code=400, detail="Listing mismatch")
    if booking_record.status != "confirmed":
        raise HTTPException(status_code=400, detail="Cannot review cancelled booking")
    if booking_record.check_out >= date.today():
        raise HTTPException(
            status_code=400,
            detail="Reviews are only allowed after checkout",
        )

    existing_review = db_session.query(DBReview).filter(DBReview.booking_id == payload.booking_id).first()
    if existing_review:
        raise HTTPException(status_code=409, detail="Review already exists")

    new_review = DBReview(
        listing_id=payload.listing_id,
        guest_id=auth_user.id,
        booking_id=payload.booking_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db_session.add(new_review)
    db_session.commit()
    db_session.refresh(new_review)

    return format_review_output(new_review, auth_user.name, db_session, auth_user.id)


@feedback_router.post("/{review_id}/like", response_model=PayloadReviewOut)
def toggle_like_status(
    review_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    target_review = (
        db_session.query(DBReview)
        .options(joinedload(DBReview.guest))
        .filter(DBReview.id == review_id)
        .first()
    )
    if not target_review:
        raise HTTPException(status_code=404, detail="Review not found")

    existing_like = (
        db_session.query(DBReviewLike)
        .filter(DBReviewLike.review_id == review_id, DBReviewLike.user_id == auth_user.id)
        .first()
    )
    if existing_like:
        db_session.delete(existing_like)
    else:
        db_session.add(DBReviewLike(review_id=review_id, user_id=auth_user.id))
    db_session.commit()

    return format_review_output(target_review, target_review.guest.name, db_session, auth_user.id)


@feedback_router.post("/{review_id}/reply", response_model=PayloadHostReviewOut)
def submit_host_reply(
    review_id: int,
    payload: PayloadReviewReplyCreate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    target_review = (
        db_session.query(DBReview)
        .options(joinedload(DBReview.guest), joinedload(DBReview.listing))
        .filter(DBReview.id == review_id)
        .first()
    )
    if not target_review:
        raise HTTPException(status_code=404, detail="Review not found")
    if target_review.listing.host_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Only the listing host can reply")

    sanitized_reply = payload.body.strip()
    if not sanitized_reply:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")

    target_review.host_reply = sanitized_reply
    target_review.host_reply_at = datetime.utcnow()
    db_session.commit()
    db_session.refresh(target_review)

    return format_host_review_output(
        target_review,
        target_review.guest.name,
        target_review.listing_id,
        target_review.listing.title,
        db_session,
        auth_user.id,
    )


@feedback_router.patch("/{review_id}", response_model=PayloadReviewOut)
def edit_review(
    review_id: int,
    payload: PayloadReviewUpdate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    target_review = (
        db_session.query(DBReview)
        .options(joinedload(DBReview.guest))
        .filter(DBReview.id == review_id)
        .first()
    )
    if not target_review:
        raise HTTPException(status_code=404, detail="Review not found")
    if target_review.guest_id != auth_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own review")

    sanitized_comment = payload.comment.strip()
    if not sanitized_comment:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    target_review.rating = payload.rating
    target_review.comment = sanitized_comment
    db_session.commit()
    db_session.refresh(target_review)

    return format_review_output(target_review, target_review.guest.name, db_session, auth_user.id)


@feedback_router.delete("/{review_id}", status_code=204)
def remove_review(
    review_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    target_review = db_session.query(DBReview).filter(DBReview.id == review_id).first()
    if not target_review:
        raise HTTPException(status_code=404, detail="Review not found")
    if target_review.guest_id != auth_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own review")

    db_session.delete(target_review)
    db_session.commit()


@feedback_router.delete("/{review_id}/reply", response_model=PayloadHostReviewOut)
def remove_host_reply(
    review_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    target_review = (
        db_session.query(DBReview)
        .options(joinedload(DBReview.guest), joinedload(DBReview.listing))
        .filter(DBReview.id == review_id)
        .first()
    )
    if not target_review:
        raise HTTPException(status_code=404, detail="Review not found")
    if target_review.listing.host_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Only the listing host can delete a reply")
    if not target_review.host_reply:
        raise HTTPException(status_code=400, detail="No reply to delete")

    target_review.host_reply = None
    target_review.host_reply_at = None
    db_session.commit()
    db_session.refresh(target_review)

    return format_host_review_output(
        target_review,
        target_review.guest.name,
        target_review.listing_id,
        target_review.listing.title,
        db_session,
        auth_user.id,
    )


@feedback_router.get("/me/tracked", response_model=list[PayloadReviewWatchOut])
def get_tracked_notifications(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    """Reviews the user hosts or wrote — used for notification sync."""
    review_records = (
        db_session.query(DBReview, DBUser.name, DBListing.id, DBListing.title, DBListing.host_id)
        .join(DBListing, DBReview.listing_id == DBListing.id)
        .join(DBUser, DBReview.guest_id == DBUser.id)
        .filter(
            or_(
                DBListing.host_id == auth_user.id,
                DBReview.guest_id == auth_user.id,
            )
        )
        .order_by(DBReview.created_at.desc())
        .all()
    )
    return [
        PayloadReviewWatchOut(
            id=review.id,
            listing_id=listing_id,
            listing_title=listing_title,
            guest_id=review.guest_id,
            guest_name=guest_name,
            host_id=host_id,
            rating=review.rating,
            comment=review.comment,
            like_count=compute_review_likes(db_session, review.id),
            host_reply=review.host_reply,
            host_reply_at=review.host_reply_at,
            created_at=review.created_at,
        )
        for review, guest_name, listing_id, listing_title, host_id in review_records
    ]


@feedback_router.get("/me/written", response_model=list[PayloadGuestReviewOut])
def get_my_written_reviews(
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    """Reviews the current user wrote as a guest."""
    review_records = (
        db_session.query(DBReview, DBUser.name, DBListing.id, DBListing.title)
        .join(DBListing, DBReview.listing_id == DBListing.id)
        .join(DBUser, DBReview.guest_id == DBUser.id)
        .filter(DBReview.guest_id == auth_user.id)
        .order_by(DBReview.created_at.desc())
        .all()
    )
    return [
        PayloadGuestReviewOut(
            **format_review_output(review, guest_name, db_session, auth_user.id).model_dump(),
            listing_id=listing_id,
            listing_title=listing_title,
        )
        for review, guest_name, listing_id, listing_title in review_records
    ]
