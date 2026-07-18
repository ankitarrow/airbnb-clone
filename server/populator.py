"""Seed database with Indian sample listings."""

import random

from datetime import date, timedelta

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from server.storage import db_engine
from server.entities import (
    DBAmenity,
    DBBooking,
    DBConversation,
    DBFavorite,
    DBListing,
    DBListingAmenity,
    DBListingPhoto,
    DBMessage,
    DBReview,
    DBUser,
)

AMENITIES = [
    "WiFi",
    "Kitchen",
    "Free parking",
    "Air conditioning",
    "Washer",
    "Pool",
    "Breakfast",
    "Workspace",
    "Pet friendly",
    "Geyser",
    "Power backup",
    "Housekeeping",
]

HOSTS = [
    {"name": "Priya Sharma", "email": "priya@example.com"},
    {"name": "Aarav Patel", "email": "aarav@example.com"},
]

GUESTS = [
    {"name": "Rohan Mehta", "email": "rohan@example.com"},
    {"name": "Ananya Iyer", "email": "ananya@example.com"},
]

# Verified working Unsplash direct URLs (images.unsplash.com)
IMG = {
    "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    "houseboat": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    "goa_villa": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    "pool_villa": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
    "cabin": "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
    "mountain": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "hill": "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
    "haveli": "https://images.unsplash.com/photo-1598977123418-45f04b01fe1e?auto=format&fit=crop&w=800&q=80",
    "palace": "https://images.unsplash.com/photo-1585983224974-084a8e065e76?auto=format&fit=crop&w=800&q=80",
    "desert": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80",
    "apartment": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    "loft": "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80",
    "city_view": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    "riverside": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    "heritage": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
    "coastal": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=800&q=80",
    "interior": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
    "modern": "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=800&q=80",
    "house": "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=800&q=80",
    "estate": "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80",
}

LISTINGS_DATA = [
    {
        "host_idx": 0,
        "title": "Traditional Munnar Mountain Resort & Spa",
        "description": "Experience luxury amid tea gardens of Munnar. Enjoy private balconies with mist-shrouded valley views, walking trails, and fresh locally grown cardamom tea.",
        "city": "Munnar",
        "area": "Mattupetty",
        "lat": 10.0889,
        "lng": 77.0595,
        "price": 7500,
        "property_type": "Entire home",
        "vibe": "Beachfront",
        "guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["estate"], IMG["riverside"]],
        "amenities": ["Breakfast", "Kitchen", "Housekeeping"],
    },
    {
        "host_idx": 1,
        "title": "Sea-view Luxury Villa in Varkala",
        "description": "Clifftop Varkala villa with private access to Black Beach. Plunge pool overlooking the Arabian Sea, yoga deck, and fresh organic local cuisine.",
        "city": "Varkala",
        "area": "Cliff Beach",
        "lat": 8.7324,
        "lng": 76.7061,
        "price": 6200,
        "property_type": "Villa",
        "vibe": "Beachfront",
        "guests": 6,
        "bedrooms": 3,
        "beds": 3,
        "baths": 2,
        "photos": [IMG["goa_villa"], IMG["pool_villa"]],
        "amenities": ["WiFi", "Pool", "Kitchen", "Free parking", "Air conditioning"],
    },
    {
        "host_idx": 1,
        "title": "Gokarna Beachfront Palm Cottage",
        "description": "Rustic cottage steps from Gokarna's pristine Kudle Beach. Sunset view porch, hammocks, fresh catch of the day, and peaceful temple walks.",
        "city": "Gokarna",
        "area": "Kudle Beach",
        "lat": 14.5422,
        "lng": 74.3160,
        "price": 3800,
        "property_type": "Entire home",
        "vibe": "Beachfront",
        "guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["beach"], IMG["coastal"]],
        "amenities": ["WiFi", "Kitchen", "Pet friendly"],
    },
    {
        "host_idx": 2,
        "title": "Dharamshala Cedar Mountain Cabin",
        "description": "Cozy wooden lodge in upper Mcleodganj surrounded by pine forests. Panoramic snow peaks, fireplace, and hot chai on the balcony.",
        "city": "Dharamshala",
        "area": "Mcleodganj",
        "lat": 32.2190,
        "lng": 76.3234,
        "price": 4200,
        "property_type": "Entire home",
        "vibe": "Cabins",
        "guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["cabin"], IMG["mountain"]],
        "amenities": ["WiFi", "Kitchen", "Geyser", "Free parking"],
    },
    {
        "host_idx": 2,
        "title": "Mussoorie Hillside Sanctuary",
        "description": "Historic cedar cottage in peaceful Landour. Mountain views, cozy fireplaces, and quiet trails surrounded by oak and rhododendron forest.",
        "city": "Mussoorie",
        "area": "Landour",
        "lat": 30.4598,
        "lng": 78.0798,
        "price": 5100,
        "property_type": "Entire home",
        "vibe": "Cabins",
        "guests": 5,
        "bedrooms": 2,
        "beds": 3,
        "baths": 2,
        "photos": [IMG["mountain"], IMG["cabin"]],
        "amenities": ["WiFi", "Kitchen", "Geyser", "Workspace"],
    },
    {
        "host_idx": 3,
        "title": "Wayanad Rainforest Eco Cabin",
        "description": "Charming log cabin perched inside Wayanad's lush forest. Mist-capped peak views, organic tea gardens, and private waterfall streams nearby.",
        "city": "Wayanad",
        "area": "Vythiri",
        "lat": 11.5583,
        "lng": 76.0425,
        "price": 4500,
        "property_type": "Entire home",
        "vibe": "Cabins",
        "guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["hill"], IMG["cabin"]],
        "amenities": ["Breakfast", "Kitchen", "Free parking", "Pet friendly"],
    },

    {
        "host_idx": 3,
        "title": "White Rann of Kutch Desert Glamp",
        "description": "Luxury tented camp on the edge of the White Salt Desert. Enjoy starry skies, local Kutchi embroidery workshops, and traditional music.",
        "city": "Bhuj",
        "area": "Sam Sand Dunes",
        "lat": 23.8333,
        "lng": 69.5000,
        "price": 11200,
        "property_type": "Entire home",
        "vibe": "Luxury",
        "guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1,
        "photos": [IMG["desert"], IMG["haveli"]],
        "amenities": ["Breakfast", "Housekeeping", "Free parking"],
    },
    {
        "host_idx": 1,
        "title": "Alibaug Seaside Estate Apartment",
        "description": "Modern coastal retreat minutes from Varsoli Beach. Spacious deck, coconut groves, fresh seafood, and swimming pool access.",
        "city": "Alibaug",
        "area": "Varsoli",
        "lat": 18.6584,
        "lng": 72.9037,
        "price": 5500,
        "property_type": "Apartment",
        "vibe": "City",
        "guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 2,
        "photos": [IMG["apartment"], IMG["city_view"]],
        "amenities": ["WiFi", "Kitchen", "Air conditioning", "Workspace", "Power backup"],
    },
    {
        "host_idx": 2,
        "title": "Mysore Royal Palace Loft",
        "description": "Artisan loft near Chamundi Hills. High ceilings, yoga workspace, traditional silk weaving views, and famous Mysore filter coffee.",
        "city": "Mysore",
        "area": "Gokulam",
        "lat": 12.2958,
        "lng": 76.6394,
        "price": 3200,
        "property_type": "Apartment",
        "vibe": "City",
        "guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["loft"], IMG["modern"]],
        "amenities": ["WiFi", "Workspace", "Kitchen", "Air conditioning"],
    },
    {
        "host_idx": 1,
        "title": "Gurgaon Premium Business Suite",
        "description": "Sleek apartment in Gurgaon's Cyber City hub. Floor-to-ceiling glass, ultra-fast WiFi, and quick access to major business parks and rapid metro.",
        "city": "Gurgaon",
        "area": "DLF Phase 3",
        "lat": 28.4900,
        "lng": 77.0800,
        "price": 4800,
        "property_type": "Apartment",
        "vibe": "City",
        "guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["apartment"], IMG["interior"]],
        "amenities": ["WiFi", "Kitchen", "Air conditioning", "Power backup"],
    },
    {
        "host_idx": 3,
        "title": "Mysore Heritage Bungalow Suite",
        "description": "Charming colonial bungalow suite with private veranda, antique furniture, and lush organic garden walks near Karanji Lake.",
        "city": "Mysore",
        "area": "Jayalakshmipuram",
        "lat": 12.3168,
        "lng": 76.6275,
        "price": 3400,
        "property_type": "Apartment",
        "vibe": "City",
        "guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["loft"], IMG["modern"]],
        "amenities": ["WiFi", "Workspace", "Kitchen", "Air conditioning"],
    },
    {
        "host_idx": 0,
        "title": "Mysore Palace View Penthouse",
        "description": "Stunning rooftop penthouse with direct views of Mysore Palace. Glass lounge, private terrace, and traditional South Indian breakfast.",
        "city": "Mysore",
        "area": "Saraswathipuram",
        "lat": 12.3025,
        "lng": 76.6210,
        "price": 3100,
        "property_type": "Apartment",
        "vibe": "City",
        "guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1,
        "photos": [IMG["modern"], IMG["apartment"]],
        "amenities": ["WiFi", "Pool", "Workspace", "Air conditioning"],
    },
    {
        "host_idx": 2,
        "title": "Mysore Chamundi Hills Retreat",
        "description": "Quiet homestay at the foothills of Chamundi, close to the temple path. Organic garden, yoga studio, and sandalwood incense.",
        "city": "Mysore",
        "area": "Chamundi Hill",
        "lat": 12.2748,
        "lng": 76.6703,
        "price": 2800,
        "property_type": "Private room",
        "vibe": "Trending",
        "guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1,
        "photos": [IMG["interior"], IMG["heritage"]],
        "amenities": ["WiFi", "Breakfast", "Kitchen"],
    },
    {
        "host_idx": 3,
        "title": "Mysore Yoga Shala Studio",
        "description": "Compact studio near Gokulam's famous yoga centers. Dedicated meditation corner, high-speed WiFi, and organic juice bar access.",
        "city": "Mysore",
        "area": "Gokulam",
        "lat": 12.2965,
        "lng": 76.6380,
        "price": 3000,
        "property_type": "Apartment",
        "vibe": "Trending",
        "guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1,
        "photos": [IMG["loft"], IMG["city_view"]],
        "amenities": ["WiFi", "Workspace", "Air conditioning", "Power backup"],
    },
    {
        "host_idx": 2,
        "title": "Mysore Silk Handloom Villa",
        "description": "Charming garden villa close to traditional silk weaving looms. Sandalwood carvings, courtyard fountain, and home-cooked heritage meals.",
        "city": "Mysore",
        "area": "Vidyaranyapuram",
        "lat": 12.2850,
        "lng": 76.6430,
        "price": 2600,
        "property_type": "Private room",
        "vibe": "Trending",
        "guests": 2,
        "bedrooms": 1,
        "beds": 1,
        "baths": 1,
        "photos": [IMG["heritage"], IMG["interior"]],
        "amenities": ["WiFi", "Breakfast", "Housekeeping"],
    },
    {
        "host_idx": 3,
        "title": "Badami Cave Eco Heritage Cottage",
        "description": "Eco cottage nestled among red sandstone cliffs of Badami. Direct views of ancient caves, custom rock climbing, and local history walks.",
        "city": "Badami",
        "area": "Cave Temples",
        "lat": 15.9184,
        "lng": 75.6795,
        "price": 2600,
        "property_type": "Entire home",
        "vibe": "Trending",
        "guests": 3,
        "bedrooms": 1,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["hill"], IMG["desert"]],
        "amenities": ["WiFi", "Kitchen", "Pet friendly"],
    },
    {
        "host_idx": 2,
        "title": "Kodaikanal Lake-view Cottage",
        "description": "Charming lakeside stone lodge with fireplace, eucalyptus woods walks, and homemade chocolates. Perfect cool mountain escape.",
        "city": "Kodaikanal",
        "area": "Coaker's Walk",
        "lat": 10.2305,
        "lng": 77.4950,
        "price": 3600,
        "property_type": "Entire home",
        "vibe": "Cabins",
        "guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 1,
        "photos": [IMG["hill"], IMG["cabin"]],
        "amenities": ["WiFi", "Kitchen", "Geyser", "Free parking"],
    },
    {
        "host_idx": 1,
        "title": "Vizag Rishikonda Beach Penthouse",
        "description": "Modern panoramic ocean suite overlooking Rishikonda Beach. Skyline waves, private hot tub, and coastal Andhra seafood kitchen.",
        "city": "Vizag",
        "area": "Rishikonda",
        "lat": 17.7818,
        "lng": 83.3820,
        "price": 5200,
        "property_type": "Apartment",
        "vibe": "City",
        "guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "baths": 2,
        "photos": [IMG["modern"], IMG["city_view"]],
        "amenities": ["WiFi", "Pool", "Kitchen", "Air conditioning", "Workspace"],
    },
]

# Spread duplicate template coords so map pins don't stack (variant 0–4).
COORD_OFFSETS = [
    (0.0, 0.0),
    (0.014, 0.011),
    (-0.011, 0.016),
    (0.017, -0.013),
    (-0.016, -0.014),
]
LEGACY_CITIES = {"Austin", "New York", "Chicago", "Los Angeles"}
NUM_HOSTS = 2
NUM_GUESTS = 2
LISTINGS_PER_HOST = 50
TARGET_LISTINGS = NUM_HOSTS * LISTINGS_PER_HOST

AREA_SUFFIXES = ["Heights", "Gardens", "Enclave", "Residency", "Nagar", "Colony", "Park", "View"]

REVIEW_TEMPLATES_5STAR = [
    (5, "Absolutely wonderful stay — exceeded every expectation. Would book again."),
    (5, "Perfect location, spotless rooms, and the host was incredibly responsive."),
    (5, "One of the best stays we've had in India. Highly recommend."),
    (5, "Stunning views and authentic local hospitality. Memorable experience."),
    (5, "Felt right at home. The little touches made all the difference."),
    (5, "Flawless from check-in to checkout. Already planning our return."),
]

REVIEW_TEMPLATES = [
    (5, "Absolutely wonderful stay — exceeded every expectation. Would book again."),
    (5, "Perfect location, spotless rooms, and the host was incredibly responsive."),
    (4, "Great value for money. Minor noise one evening but overall a lovely trip."),
    (4, "Comfortable beds and thoughtful amenities. Check-in was seamless."),
    (5, "One of the best stays we've had in India. Highly recommend."),
    (3, "Good stay overall. WiFi could be faster but the space was charming."),
    (5, "Stunning views and authentic local hospitality. Memorable experience."),
    (4, "Clean, well-equipped, and walking distance to everything we needed."),
    (5, "Felt right at home. The little touches made all the difference."),
    (4, "Lovely property with character. Would stay here on our next visit."),
]

MESSAGE_THREADS = [
    [
        "Hi! Is this place available for next weekend?",
        "Yes, it's available! We'd love to host you.",
        "Great — is early check-in possible on Saturday?",
        "Absolutely, we can arrange a 1 PM check-in for you.",
    ],
    [
        "Hello! Does the listing have reliable WiFi for remote work?",
        "Yes, we have 100 Mbps fiber and a dedicated workspace.",
        "Perfect. I'll book for three nights starting Friday.",
        "Wonderful — looking forward to welcoming you!",
    ],
    [
        "We're travelling with a toddler — is the place child-friendly?",
        "Yes, we have a crib and safety gates available on request.",
        "That's helpful. Are there restaurants within walking distance?",
        "Several family-friendly cafés are just a 5-minute walk away.",
    ],
]


def verify_table_columns() -> None:
    db_inspector = inspect(db_engine)
    if "listings" not in db_inspector.get_table_names():
        return
    cols_set = {c["name"] for c in db_inspector.get_columns("listings")}
    if "vibe" not in cols_set:
        with db_engine.begin() as conn:
            conn.execute(text("ALTER TABLE listings ADD COLUMN vibe VARCHAR(50) DEFAULT 'Trending'"))


def build_listings_catalog() -> list[dict]:
    catalog: list[dict] = []
    idx = 0
    while len(catalog) < TARGET_LISTINGS:
        base = LISTINGS_DATA[idx % len(LISTINGS_DATA)]
        variant = idx // len(LISTINGS_DATA)
        title = base["title"] if variant == 0 else f"{base['title']} · Unit {variant + 1}"
        area = (
            base["area"]
            if variant == 0
            else f"{base['area']} {AREA_SUFFIXES[variant % len(AREA_SUFFIXES)]}"
        )
        price = base["price"] + (variant * 173) % 1800
        round_idx = idx % len(LISTINGS_DATA)
        lat_off, lng_off = COORD_OFFSETS[variant % len(COORD_OFFSETS)]
        catalog.append({
            **base,
            "title": title,
            "area": area,
            "price": price,
            "lat": round(base["lat"] + lat_off, 6),
            "lng": round(base["lng"] + lng_off, 6),
        })
        idx += 1
    return catalog


def _needs_reseed(db_session: Session) -> bool:
    if db_session.query(DBUser).filter(DBUser.is_host.is_(True)).count() != NUM_HOSTS:
        return True
    if db_session.query(DBUser).filter(DBUser.is_host.is_(False)).count() != NUM_GUESTS:
        return True
    if db_session.query(DBListing).count() != TARGET_LISTINGS:
        return True
    hosts = db_session.query(DBUser).filter(DBUser.is_host.is_(True)).all()
    for host in hosts:
        if db_session.query(DBListing).filter(DBListing.host_id == host.id).count() != LISTINGS_PER_HOST:
            return True
    listing = db_session.query(DBListing).first()
    if listing and listing.location_city in LEGACY_CITIES:
        return True
    dead_photos = (
        "photo-1583422409516",
        "photo-1602216056096",
        "photo-1449158743715",
        "photo-1477587450883",
        "photo-1518780664697",
        "photo-1524492412937",
        "muscache",
    )
    for fragment in dead_photos:
        if db_session.query(DBListingPhoto).filter(DBListingPhoto.url.ilike(f"%{fragment}%")).first():
            return True
    if db_session.query(DBListing).filter(DBListing.location_city == "Bangalore").count() < 30:
        return True
    dup_coords = (
        db_session.query(DBListing.lat, DBListing.lng, DBListing.location_city)
        .filter(DBListing.location_city.in_(["Mumbai", "Bangalore"]))
        .all()
    )
    coord_keys = [(r[0], r[1], r[2]) for r in dup_coords]
    if len(coord_keys) != len(set(coord_keys)):
        return True
    return False


def _clear_all(db_session: Session) -> None:
    db_session.query(DBMessage).delete()
    db_session.query(DBConversation).delete()
    db_session.query(DBReview).delete()
    db_session.query(DBBooking).delete()
    db_session.query(DBFavorite).delete()
    db_session.query(DBListingAmenity).delete()
    db_session.query(DBListingPhoto).delete()
    db_session.query(DBListing).delete()
    db_session.query(DBUser).delete()
    db_session.query(DBAmenity).delete()
    db_session.commit()


def fill_sample_records(db_session: Session) -> None:
    verify_table_columns()

    if db_session.query(DBUser).count() > 0 and not _needs_reseed(db_session):
        return

    if db_session.query(DBUser).count() > 0:
        _clear_all(db_session)

    amenity_map: dict[str, DBAmenity] = {}
    for name in AMENITIES:
        a = DBAmenity(name=name)
        db_session.add(a)
        amenity_map[name] = a
    db_session.flush()

    hosts: list[DBUser] = []
    for h in HOSTS:
        user = DBUser(name=h["name"], email=h["email"], role="host", is_host=True)
        db_session.add(user)
        hosts.append(user)
    db_session.flush()

    guests: list[DBUser] = []
    for g in GUESTS:
        user = DBUser(name=g["name"], email=g["email"], role="guest", is_host=False)
        db_session.add(user)
        guests.append(user)
    db_session.flush()

    listings: list[DBListing] = []
    catalog = build_listings_catalog()
    for idx, data in enumerate(catalog):
        host_idx = idx // LISTINGS_PER_HOST
        listing = DBListing(
            host_id=hosts[host_idx].id,
            title=data["title"],
            description=data["description"],
            location_city=data["city"],
            location_area=data["area"],
            lat=data["lat"],
            lng=data["lng"],
            price_per_night=data["price"],
            property_type=data["property_type"],
            vibe=data["vibe"],
            max_guests=data["guests"],
            bedrooms=data["bedrooms"],
            beds=data["beds"],
            bathrooms=data["baths"],
        )
        db_session.add(listing)
        db_session.flush()
        listings.append(listing)

        for i, url in enumerate(data["photos"]):
            db_session.add(DBListingPhoto(listing_id=listing.id, url=url, sort_order=i))

        for amenity_name in data["amenities"]:
            amenity = amenity_map.get(amenity_name)
            if not amenity:
                amenity = DBAmenity(name=amenity_name)
                db_session.add(amenity)
                db_session.flush()
                amenity_map[amenity_name] = amenity
            db_session.add(DBListingAmenity(listing_id=listing.id, amenity_id=amenity.id))

    today = date.today()
    rng = random.Random(42)

    # Future bookings — each guest gets 2 upcoming trips
    booking_specs = [
        (0, 0, today + timedelta(days=5), today + timedelta(days=8), 2),
        (3, 0, today + timedelta(days=15), today + timedelta(days=18), 2),
        (21, 1, today + timedelta(days=10), today + timedelta(days=14), 4),
        (25, 1, today + timedelta(days=20), today + timedelta(days=25), 3),
        (42, 0, today + timedelta(days=3), today + timedelta(days=6), 2),
        (48, 0, today + timedelta(days=12), today + timedelta(days=16), 2),
        (63, 1, today + timedelta(days=7), today + timedelta(days=10), 2),
        (70, 1, today + timedelta(days=18), today + timedelta(days=22), 3),
        (85, 0, today + timedelta(days=9), today + timedelta(days=13), 2),
        (92, 1, today + timedelta(days=25), today + timedelta(days=28), 2),
    ]

    for listing_idx, guest_idx, check_in, check_out, guests_count in booking_specs:
        listing = listings[listing_idx]
        nights = (check_out - check_in).days
        total = round(listing.price_per_night * nights * 1.12 + 500, 2)
        db_session.add(
            DBBooking(
                listing_id=listing.id,
                guest_id=guests[guest_idx].id,
                check_in=check_in,
                check_out=check_out,
                guests_count=guests_count,
                total_price=total,
                status="confirmed",
            )
        )

    # Past bookings + reviews per listing (every other listing gets 5-star reviews for Guest favourite badges)
    for i, listing in enumerate(listings):
        templates = REVIEW_TEMPLATES_5STAR if i % 2 == 0 else REVIEW_TEMPLATES
        num_reviews = rng.randint(4, 6) if i % 2 == 0 else rng.randint(3, 4)
        for j in range(num_reviews):
            guest = guests[j % len(guests)]
            nights = rng.randint(2, 6)
            check_out_past = today - timedelta(days=rng.randint(5, 90))
            check_in_past = check_out_past - timedelta(days=nights)
            total = round(listing.price_per_night * nights * 1.12 + 500, 2)
            booking = DBBooking(
                listing_id=listing.id,
                guest_id=guest.id,
                check_in=check_in_past,
                check_out=check_out_past,
                guests_count=rng.randint(1, min(4, listing.max_guests)),
                total_price=total,
                status="confirmed",
            )
            db_session.add(booking)
            db_session.flush()

            rating, comment = templates[(listing.id + j) % len(templates)]
            db_session.add(
                DBReview(
                    listing_id=listing.id,
                    guest_id=guest.id,
                    booking_id=booking.id,
                    rating=rating,
                    comment=comment,
                )
            )

    # Alex gets one past trip without a review (leave-review demo on Trips)
    past_listing = listings[4]
    db_session.add(
        DBBooking(
            listing_id=past_listing.id,
            guest_id=guests[0].id,
            check_in=today - timedelta(days=14),
            check_out=today - timedelta(days=10),
            guests_count=2,
            total_price=round(past_listing.price_per_night * 4 * 1.12 + 500, 2),
            status="confirmed",
        )
    )

    # Wishlists — 4 favorites per guest across different hosts' listings
    for guest_idx, guest in enumerate(guests):
        fav_indices = [
            guest_idx * 7 + 1,
            guest_idx * 7 + 3,
            guest_idx * 7 + 5,
            guest_idx * 7 + 8,
        ]
        for li in fav_indices:
            if li < len(listings):
                db_session.add(DBFavorite(user_id=guest.id, listing_id=listings[li].id))

    # Sample conversations with alternating guest/host messages
    for thread_idx, thread in enumerate(MESSAGE_THREADS):
        listing = listings[thread_idx * 5]
        guest = guests[thread_idx % len(guests)]
        host_user = next(h for h in hosts if h.id == listing.host_id)
        conv = DBConversation(
            guest_id=guest.id,
            host_id=host_user.id,
            listing_id=listing.id,
        )
        db_session.add(conv)
        db_session.flush()
        for msg_idx, body in enumerate(thread):
            sender = guest if msg_idx % 2 == 0 else host_user
            db_session.add(DBMessage(conversation_id=conv.id, sender_id=sender.id, body=body))

    db_session.commit()
