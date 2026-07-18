from datetime import date
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from backend.storage import acquire_db_session
from backend.injectors import fetch_authenticated_user, fetch_optional_user
from backend.entities import DBAmenity, DBBooking, DBConversation, DBFavorite, DBListing, DBListingAmenity, DBListingPhoto, DBMessage, DBReview, DBUser
from backend.helpers import format_review_output
from backend.payloads import (
    PayloadAvailabilityRange,
    PayloadListingCardOut,
    PayloadListingCreate,
    PayloadListingDetailOut,
    PayloadListingListResponse,
    PayloadListingUpdate,
    PayloadPhotoOut,
    PayloadAmenityOut,
    PayloadHostOut,
    PayloadReviewOut,
)

property_router = APIRouter(prefix="/listings", tags=["listings"])
DEFAULT_PAGE_SIZE = 20


def format_listing_card(listing_obj: DBListing, db_session: Session) -> PayloadListingCardOut:
    listing_photo = (
        db_session.query(DBListingPhoto)
        .filter(DBListingPhoto.listing_id == listing_obj.id)
        .order_by(DBListingPhoto.sort_order)
        .first()
    )
    rating_stats = (
        db_session.query(func.avg(DBReview.rating), func.count(DBReview.id))
        .filter(DBReview.listing_id == listing_obj.id)
        .first()
    )
    average_rating = round(float(rating_stats[0]), 1) if rating_stats[0] else None
    total_reviews = rating_stats[1] or 0
    guest_favorite_flag = average_rating is not None and average_rating >= 4.7 and total_reviews >= 3
    return PayloadListingCardOut(
        id=listing_obj.id,
        title=listing_obj.title,
        location_city=listing_obj.location_city,
        location_area=listing_obj.location_area,
        lat=listing_obj.lat,
        lng=listing_obj.lng,
        price_per_night=listing_obj.price_per_night,
        property_type=listing_obj.property_type,
        vibe=listing_obj.vibe,
        max_guests=listing_obj.max_guests,
        photo_url=listing_photo.url if listing_photo else None,
        avg_rating=average_rating,
        review_count=total_reviews,
        is_guest_favourite=guest_favorite_flag,
    )


def _resolve_amenities(db_session: Session, amenity_names: list[str]) -> list[DBAmenity]:
    amenity_instances: list[DBAmenity] = []
    unique_names: set[str] = set()
    for raw_name in amenity_names:
        clean_name = raw_name.strip()
        if not clean_name or clean_name.lower() in unique_names:
            continue
        unique_names.add(clean_name.lower())
        amenity_record = db_session.query(DBAmenity).filter(func.lower(DBAmenity.name) == clean_name.lower()).first()
        if not amenity_record:
            amenity_record = DBAmenity(name=clean_name)
            db_session.add(amenity_record)
            db_session.flush()
        amenity_instances.append(amenity_record)
    return amenity_instances


def _apply_amenity_filter(base_query, db_session: Session, amenities_csv: str):
    parsed_names = [n.strip().lower() for n in amenities_csv.split(",") if n.strip()]
    if not parsed_names:
        return base_query
    matching_ids = (
        db_session.query(DBListingAmenity.listing_id)
        .join(DBAmenity, DBAmenity.id == DBListingAmenity.amenity_id)
        .filter(func.lower(DBAmenity.name).in_(parsed_names))
        .group_by(DBListingAmenity.listing_id)
        .having(func.count(func.distinct(func.lower(DBAmenity.name))) == len(parsed_names))
    )
    return base_query.filter(DBListing.id.in_(matching_ids))


@property_router.get("", response_model=PayloadListingListResponse)
def search_and_list_properties(
    q: str | None = None,
    city: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    property_type: str | None = None,
    vibe: str | None = None,
    amenities: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100),
    db_session: Session = Depends(acquire_db_session),
):
    listings_query = db_session.query(DBListing)
    clean_search = (q or city or "").strip()
    if clean_search:
        search_pattern = f"%{clean_search}%"
        listings_query = listings_query.filter(
            or_(
                DBListing.title.ilike(search_pattern),
                DBListing.location_city.ilike(search_pattern),
                DBListing.location_area.ilike(search_pattern),
                DBListing.description.ilike(search_pattern),
                DBListing.vibe.ilike(search_pattern),
                DBListing.property_type.ilike(search_pattern),
            )
        )
    if guests:
        listings_query = listings_query.filter(DBListing.max_guests >= guests)
    if min_price is not None:
        listings_query = listings_query.filter(DBListing.price_per_night >= min_price)
    if max_price is not None:
        listings_query = listings_query.filter(DBListing.price_per_night <= max_price)
    if property_type:
        listings_query = listings_query.filter(DBListing.property_type == property_type)
    if vibe:
        listings_query = listings_query.filter(DBListing.vibe == vibe)
    if amenities:
        listings_query = _apply_amenity_filter(listings_query, db_session, amenities)
    if check_in and check_out:
        if check_out <= check_in:
            raise HTTPException(status_code=400, detail="check_out must be after check_in")
        booked_listing_ids = (
            db_session.query(DBBooking.listing_id)
            .filter(
                DBBooking.status == "confirmed",
                DBBooking.check_in < check_out,
                DBBooking.check_out > check_in,
            )
            .distinct()
        )
        listings_query = listings_query.filter(~DBListing.id.in_(booked_listing_ids))
    total_records = listings_query.count()
    listings_page = (
        listings_query.order_by(DBListing.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PayloadListingListResponse(
        items=[format_listing_card(l, db_session) for l in listings_page],
        total=total_records,
        page=page,
        page_size=page_size,
        total_pages=max(1, ceil(total_records / page_size)),
    )


@property_router.get("/{listing_id}", response_model=PayloadListingDetailOut)
def retrieve_single_property(listing_id: int, db_session: Session = Depends(acquire_db_session)):
    listing_entity = (
        db_session.query(DBListing)
        .options(joinedload(DBListing.host), joinedload(DBListing.photos))
        .filter(DBListing.id == listing_id)
        .first()
    )
    if not listing_entity:
        raise HTTPException(status_code=404, detail="Listing not found")
    amenities_list = (
        db_session.query(DBAmenity)
        .join(DBListingAmenity, DBListingAmenity.amenity_id == DBAmenity.id)
        .filter(DBListingAmenity.listing_id == listing_id)
        .all()
    )
    listing_stats = (
        db_session.query(func.avg(DBReview.rating), func.count(DBReview.id))
        .filter(DBReview.listing_id == listing_id)
        .first()
    )
    return PayloadListingDetailOut(
        id=listing_entity.id,
        title=listing_entity.title,
        description=listing_entity.description,
        location_city=listing_entity.location_city,
        location_area=listing_entity.location_area,
        lat=listing_entity.lat,
        lng=listing_entity.lng,
        price_per_night=listing_entity.price_per_night,
        property_type=listing_entity.property_type,
        vibe=listing_entity.vibe,
        max_guests=listing_entity.max_guests,
        bedrooms=listing_entity.bedrooms,
        beds=listing_entity.beds,
        bathrooms=listing_entity.bathrooms,
        photos=[PayloadPhotoOut.model_validate(p) for p in sorted(listing_entity.photos, key=lambda x: x.sort_order)],
        amenities=[PayloadAmenityOut.model_validate(a) for a in amenities_list],
        host=PayloadHostOut.model_validate(listing_entity.host),
        avg_rating=round(float(listing_stats[0]), 1) if listing_stats[0] else None,
        review_count=listing_stats[1] or 0,
        created_at=listing_entity.created_at,
    )


@property_router.post("", response_model=PayloadListingDetailOut, status_code=201)
def register_new_property(
    payload: PayloadListingCreate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    if not auth_user.is_host:
        raise HTTPException(status_code=403, detail="Only hosts can create listings")
    new_listing = DBListing(
        host_id=auth_user.id,
        title=payload.title,
        description=payload.description,
        location_city=payload.location_city,
        location_area=payload.location_area,
        lat=payload.lat,
        lng=payload.lng,
        price_per_night=payload.price_per_night,
        property_type=payload.property_type,
        vibe=payload.vibe,
        max_guests=payload.max_guests,
        bedrooms=payload.bedrooms,
        beds=payload.beds,
        bathrooms=payload.bathrooms,
    )
    db_session.add(new_listing)
    db_session.flush()
    for idx, photo_url in enumerate(payload.photo_urls):
        db_session.add(DBListingPhoto(listing_id=new_listing.id, url=photo_url, sort_order=idx))
    for amenity_obj in _resolve_amenities(db_session, payload.amenity_names):
        db_session.add(DBListingAmenity(listing_id=new_listing.id, amenity_id=amenity_obj.id))
    db_session.commit()
    return retrieve_single_property(new_listing.id, db_session)


@property_router.put("/{listing_id}", response_model=PayloadListingDetailOut)
def modify_property_details(
    listing_id: int,
    payload: PayloadListingUpdate,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    existing_listing = db_session.query(DBListing).filter(DBListing.id == listing_id).first()
    if not existing_listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if existing_listing.host_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    for field_key, field_val in payload.model_dump(exclude_unset=True).items():
        if field_key == "photo_urls" and field_val is not None:
            db_session.query(DBListingPhoto).filter(DBListingPhoto.listing_id == listing_id).delete()
            for idx, photo_url in enumerate(field_val):
                db_session.add(DBListingPhoto(listing_id=listing_id, url=photo_url, sort_order=idx))
        elif field_key == "amenity_names" and field_val is not None:
            db_session.query(DBListingAmenity).filter(DBListingAmenity.listing_id == listing_id).delete()
            for amenity_obj in _resolve_amenities(db_session, field_val):
                db_session.add(DBListingAmenity(listing_id=listing_id, amenity_id=amenity_obj.id))
        elif field_key not in ("photo_urls", "amenity_names"):
            setattr(existing_listing, field_key, field_val)
    db_session.commit()
    return retrieve_single_property(listing_id, db_session)


@property_router.delete("/{listing_id}", status_code=204)
def remove_property_record(
    listing_id: int,
    auth_user: DBUser = Depends(fetch_authenticated_user),
    db_session: Session = Depends(acquire_db_session),
):
    listing_entity = db_session.query(DBListing).filter(DBListing.id == listing_id).first()
    if not listing_entity:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing_entity.host_id != auth_user.id:
        raise HTTPException(status_code=403, detail="Not your listing")

    associated_conversations = [
        c.id for c in db_session.query(DBConversation).filter(DBConversation.listing_id == listing_id).all()
    ]
    if associated_conversations:
        db_session.query(DBMessage).filter(DBMessage.conversation_id.in_(associated_conversations)).delete(synchronize_session=False)
        db_session.query(DBConversation).filter(DBConversation.listing_id == listing_id).delete(synchronize_session=False)

    db_session.query(DBFavorite).filter(DBFavorite.listing_id == listing_id).delete(synchronize_session=False)
    db_session.query(DBReview).filter(DBReview.listing_id == listing_id).delete(synchronize_session=False)
    db_session.query(DBBooking).filter(DBBooking.listing_id == listing_id).delete(synchronize_session=False)
    db_session.delete(listing_entity)
    db_session.commit()


@property_router.get("/{listing_id}/availability", response_model=list[PayloadAvailabilityRange])
def check_property_availability_ranges(listing_id: int, db_session: Session = Depends(acquire_db_session)):
    if not db_session.query(DBListing).filter(DBListing.id == listing_id).first():
        raise HTTPException(status_code=404, detail="Listing not found")
    confirmed_bookings = db_session.query(DBBooking).filter(DBBooking.listing_id == listing_id, DBBooking.status == "confirmed").all()
    return [PayloadAvailabilityRange(check_in=b.check_in, check_out=b.check_out) for b in confirmed_bookings]


@property_router.get("/{listing_id}/reviews", response_model=list[PayloadReviewOut])
def get_property_reviews(
    listing_id: int,
    db_session: Session = Depends(acquire_db_session),
    auth_user: DBUser | None = Depends(fetch_optional_user),
):
    review_records = (
        db_session.query(DBReview, DBUser.name)
        .join(DBUser, DBUser.id == DBReview.guest_id)
        .filter(DBReview.listing_id == listing_id)
        .order_by(DBReview.created_at.desc())
        .all()
    )
    active_user_id = auth_user.id if auth_user else None
    return [format_review_output(review_obj, guest_name, db_session, active_user_id) for review_obj, guest_name in review_records]
