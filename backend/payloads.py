from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Auth ---
class PayloadLoginRequest(BaseModel):
    email: str
    password: str


class PayloadDemoLoginRequest(BaseModel):
    email: str


class PayloadRegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=6)
    is_host: bool = False


class PayloadUserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_host: bool
    identity_verified: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class PayloadPhotoOut(BaseModel):
    id: int
    url: str
    sort_order: int

    model_config = {"from_attributes": True}


class PayloadAmenityOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class PayloadHostOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class PayloadListingCardOut(BaseModel):
    id: int
    title: str
    location_city: str
    location_area: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    price_per_night: float
    property_type: str
    vibe: str
    max_guests: int
    photo_url: Optional[str] = None
    avg_rating: Optional[float] = None
    review_count: int = 0
    is_guest_favourite: bool = False


class PayloadListingListResponse(BaseModel):
    items: list[PayloadListingCardOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PayloadReviewOut(BaseModel):
    id: int
    guest_id: int
    rating: int
    comment: str
    guest_name: str
    created_at: datetime
    like_count: int = 0
    liked_by_me: bool = False
    host_reply: Optional[str] = None
    host_reply_at: Optional[datetime] = None


class PayloadHostReviewOut(PayloadReviewOut):
    listing_id: int
    listing_title: str


class PayloadGuestReviewOut(PayloadReviewOut):
    listing_id: int
    listing_title: str


class PayloadReviewWatchOut(BaseModel):
    id: int
    listing_id: int
    listing_title: str
    guest_id: int
    guest_name: str
    host_id: int
    rating: int
    comment: str
    like_count: int = 0
    host_reply: Optional[str] = None
    host_reply_at: Optional[datetime] = None
    created_at: datetime


class PayloadReviewReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class PayloadReviewUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=2000)


class PayloadListingDetailOut(BaseModel):
    id: int
    title: str
    description: str
    location_city: str
    location_area: str
    lat: Optional[float]
    lng: Optional[float]
    price_per_night: float
    property_type: str
    vibe: str
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    photos: list[PayloadPhotoOut]
    amenities: list[PayloadAmenityOut]
    host: PayloadHostOut
    avg_rating: Optional[float] = None
    review_count: int = 0
    created_at: datetime


class PayloadListingCreate(BaseModel):
    title: str
    description: str
    location_city: str
    location_area: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    price_per_night: float
    property_type: str = "Entire home"
    vibe: str = "Trending"
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    photo_urls: list[str] = []
    amenity_names: list[str] = []


class PayloadListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location_city: Optional[str] = None
    location_area: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    price_per_night: Optional[float] = None
    property_type: Optional[str] = None
    vibe: Optional[str] = None
    max_guests: Optional[int] = None
    bedrooms: Optional[int] = None
    beds: Optional[int] = None
    bathrooms: Optional[int] = None
    photo_urls: Optional[list[str]] = None
    amenity_names: Optional[list[str]] = None


class PayloadAvailabilityRange(BaseModel):
    check_in: date
    check_out: date


# --- Bookings ---
class PayloadBookingCreate(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests_count: int = Field(ge=1)


class PayloadBookingOut(BaseModel):
    id: int
    listing_id: int
    listing_title: str
    listing_photo: Optional[str] = None
    location_city: str
    host_id: int
    guest_id: int
    guest_name: str
    check_in: date
    check_out: date
    guests_count: int
    total_price: float
    refund_amount: Optional[float] = None
    refund_percent: Optional[int] = None
    status: str
    created_at: datetime
    has_review: bool = False
    can_review: bool = False
    review_id: Optional[int] = None
    host_reply: Optional[str] = None
    host_reply_at: Optional[datetime] = None


# --- Reviews ---
class PayloadReviewCreate(BaseModel):
    listing_id: int
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str


# --- Favorites ---
class PayloadFavoriteOut(BaseModel):
    listing: PayloadListingCardOut


# --- Messages ---
class PayloadConversationCreate(BaseModel):
    listing_id: int


class PayloadHostConversationCreate(BaseModel):
    listing_id: int
    guest_id: int


class PayloadConversationOut(BaseModel):
    id: int
    listing_id: int
    listing_title: str
    listing_photo: Optional[str] = None
    other_user_name: str
    other_user_id: int
    last_message: Optional[str] = None
    last_message_at: datetime
    unread_count: int = 0


class PayloadMessageCreate(BaseModel):
    body: str


class PayloadMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    body: str
    created_at: datetime
    is_mine: bool = False
