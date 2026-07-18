from datetime import datetime, date
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.storage import OrmBase


class DBUser(OrmBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), default="guest")  # "guest" | "host"
    is_host = Column(Boolean, default=False)
    identity_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    listings = relationship("DBListing", back_populates="host")
    bookings = relationship("DBBooking", back_populates="guest")
    reviews = relationship("DBReview", back_populates="guest")
    favorites = relationship("DBFavorite", back_populates="user")
    sent_messages = relationship("DBMessage", back_populates="sender", foreign_keys="DBMessage.sender_id")
    guest_conversations = relationship(
        "DBConversation", back_populates="guest", foreign_keys="DBConversation.guest_id"
    )
    host_conversations = relationship(
        "DBConversation", back_populates="host", foreign_keys="DBConversation.host_id"
    )
    review_likes = relationship("DBReviewLike", back_populates="user")


class DBListing(OrmBase):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    location_city = Column(String(100), nullable=False, index=True)
    location_area = Column(String(100), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    price_per_night = Column(Float, nullable=False)
    property_type = Column(String(50), nullable=False, index=True)
    vibe = Column(String(50), nullable=False, default="Trending", index=True)
    max_guests = Column(Integer, nullable=False)
    bedrooms = Column(Integer, nullable=False)
    beds = Column(Integer, nullable=False)
    bathrooms = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    host = relationship("DBUser", back_populates="listings")
    photos = relationship(
        "DBListingPhoto", back_populates="listing", cascade="all, delete-orphan"
    )
    amenities = relationship(
        "DBListingAmenity", back_populates="listing", cascade="all, delete-orphan"
    )
    bookings = relationship("DBBooking", back_populates="listing")
    reviews = relationship("DBReview", back_populates="listing")
    favorites = relationship("DBFavorite", back_populates="listing")
    conversations = relationship("DBConversation", back_populates="listing")


class DBConversation(OrmBase):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("guest_id", "host_id", "listing_id", name="uq_conversation"),)

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    guest = relationship("DBUser", back_populates="guest_conversations", foreign_keys=[guest_id])
    host = relationship("DBUser", back_populates="host_conversations", foreign_keys=[host_id])
    listing = relationship("DBListing", back_populates="conversations")
    messages = relationship(
        "DBMessage", back_populates="conversation", cascade="all, delete-orphan"
    )


class DBMessage(OrmBase):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    conversation = relationship("DBConversation", back_populates="messages")
    sender = relationship("DBUser", back_populates="sent_messages")


class DBListingPhoto(OrmBase):
    __tablename__ = "listing_photos"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    url = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)

    listing = relationship("DBListing", back_populates="photos")


class DBAmenity(OrmBase):
    __tablename__ = "amenities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


class DBListingAmenity(OrmBase):
    __tablename__ = "listing_amenities"

    listing_id = Column(Integer, ForeignKey("listings.id"), primary_key=True)
    amenity_id = Column(Integer, ForeignKey("amenities.id"), primary_key=True)

    listing = relationship("DBListing", back_populates="amenities")
    amenity = relationship("DBAmenity")


class DBBooking(OrmBase):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    guests_count = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    refund_amount = Column(Float, nullable=True)
    status = Column(String(20), default="confirmed")  # confirmed | cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    listing = relationship("DBListing", back_populates="bookings")
    guest = relationship("DBUser", back_populates="bookings")
    review = relationship("DBReview", back_populates="booking", uselist=False)


class DBReview(OrmBase):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=False)
    host_reply = Column(Text, nullable=True)
    host_reply_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    listing = relationship("DBListing", back_populates="reviews")
    guest = relationship("DBUser", back_populates="reviews")
    booking = relationship("DBBooking", back_populates="review")
    likes = relationship("DBReviewLike", back_populates="review", cascade="all, delete-orphan")


class DBReviewLike(OrmBase):
    __tablename__ = "review_likes"

    review_id = Column(Integer, ForeignKey("reviews.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    review = relationship("DBReview", back_populates="likes")
    user = relationship("DBUser", back_populates="review_likes")


class DBFavorite(OrmBase):
    __tablename__ = "favorites"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), primary_key=True)

    user = relationship("DBUser", back_populates="favorites")
    listing = relationship("DBListing", back_populates="favorites")
