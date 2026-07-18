from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.entities import DBReview, DBReviewLike, DBUser
from backend.payloads import PayloadHostReviewOut, PayloadReviewOut


def compute_review_likes(db_session: Session, target_review_id: int) -> int:
    return (
        db_session.query(func.count(DBReviewLike.user_id))
        .filter(DBReviewLike.review_id == target_review_id)
        .scalar()
        or 0
    )


def check_if_liked_by_user(db_session: Session, target_review_id: int, target_user_id: int | None) -> bool:
    if target_user_id is None:
        return False
    return (
        db_session.query(DBReviewLike)
        .filter(DBReviewLike.review_id == target_review_id, DBReviewLike.user_id == target_user_id)
        .first()
        is not None
    )


def format_review_output(
    review_obj: DBReview,
    guest_display_name: str,
    db_session: Session,
    active_user_id: int | None = None,
) -> PayloadReviewOut:
    return PayloadReviewOut(
        id=review_obj.id,
        guest_id=review_obj.guest_id,
        rating=review_obj.rating,
        comment=review_obj.comment,
        guest_name=guest_display_name,
        created_at=review_obj.created_at,
        like_count=compute_review_likes(db_session, review_obj.id),
        liked_by_me=check_if_liked_by_user(db_session, review_obj.id, active_user_id),
        host_reply=review_obj.host_reply,
        host_reply_at=review_obj.host_reply_at,
    )


def format_host_review_output(
    review_obj: DBReview,
    guest_display_name: str,
    target_listing_id: int,
    target_listing_title: str,
    db_session: Session,
    active_user_id: int | None = None,
) -> PayloadHostReviewOut:
    base_payload = format_review_output(review_obj, guest_display_name, db_session, active_user_id)
    return PayloadHostReviewOut(
        **base_payload.model_dump(),
        listing_id=target_listing_id,
        listing_title=target_listing_title,
    )
