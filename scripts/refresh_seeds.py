"""One-off script to update populator.py property types and images."""
import re
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
populator_path = WORKSPACE_ROOT / "server" / "populator.py"
img_path = WORKSPACE_ROOT / "server" / "seed_images.py"

populator_text = populator_path.read_text(encoding="utf-8")
if img_path.exists():
    loaded_image_data = img_path.read_text(encoding="utf-8").strip()
    populator_text = re.sub(r"# Stable direct Unsplash URLs.*?\n\}", loaded_image_data, populator_text, flags=re.DOTALL)

PROPERTY_MAPPING = [
    ("Traditional Kerala", "Beachfront"),
    ("Sea-view Villa", "Beachfront"),
    ("Palolem Beach", "Beachfront"),
    ("Manali Pine", "Cabins"),
    ("Shimla Hillside", "Cabins"),
    ("Coorg Coffee", "Cabins"),
    ("Udaipur Lake", "Luxury"),
    ("Jaipur Pink", "Private room"),
    ("Jaisalmer Desert", "Luxury"),
    ("Bandra West", "Apartment"),
    ("Koramangala", "Apartment"),
    ("Connaught Place", "Apartment"),
    ("Rishikesh Ganges", "Trending"),
    ("Varanasi Ghats", "Trending"),
    ("Pondicherry French", "Villa"),
    ("Hampi Boulder", "Trending"),
    ("Ooty Nilgiri", "Cabins"),
    ("Hyderabad Banjara", "City"),
]

for title_segment, prop_type in PROPERTY_MAPPING:
    regex_pattern = (
        rf'("title": "{re.escape(title_segment)}[^"]*",.*?'
        rf'"price": \d+,)\s*"type": "[^"]+",\s*"category": "[^"]+",'
    )
    replacement_string = rf'\1\n        "property_type": "{prop_type}",'
    populator_text = re.sub(regex_pattern, replacement_string, populator_text, flags=re.DOTALL)

populator_text = populator_text.replace('property_type=data["type"],\n            category=data["category"],', 'property_type=data["property_type"],')

# Update legacy detection
populator_text = populator_text.replace(
    """    if not getattr(listing, "category", None):
        return True""",
    """    if db_session.query(DBListing).filter(DBListing.property_type == "Beachfront").count() == 0:
        return True""",
)

populator_text = populator_text.replace(
    """def verify_table_columns() -> None:
    db_inspector = inspect(db_engine)
    if "listings" not in db_inspector.get_table_names():
        return
    cols_set = {c["name"] for c in db_inspector.get_columns("listings")}
    if "category" not in cols_set:
        with db_engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE listings ADD COLUMN category VARCHAR(50) DEFAULT 'trending'")
            )


""",
    "",
)

populator_text = populator_text.replace("    verify_table_columns()\n\n    if db_session.query(DBUser).count()", "    if db_session.query(DBUser).count()")

# Add dead photo check
populator_text = populator_text.replace(
    """    bad_photo = (
        db_session.query(DBListingPhoto)
        .filter(DBListingPhoto.url.ilike("%muscache%"))
        .first()
    )
    return bad_photo is not None""",
    """    dead_photos = (
        "photo-1583422409516",
        "photo-1602216056096",
        "photo-1449158743715",
        "muscache",
    )
    for fragment in dead_photos:
        if db_session.query(DBListingPhoto).filter(DBListingPhoto.url.ilike(f"%{fragment}%")).first():
            return True
    return False""",
)

populator_path.write_text(populator_text, encoding="utf-8")
print("Updated", populator_path)
