"""Split merged property_type into property_type + vibe in seed data."""
import re
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
populator_path = WORKSPACE_ROOT / "server" / "populator.py"
populator_file_content = populator_path.read_text(encoding="utf-8")

PROPERTY_VIBE_MAP = [
    ("Traditional Kerala", "Entire home", "Beachfront"),
    ("Sea-view Villa", "Villa", "Beachfront"),
    ("Palolem Beach", "Entire home", "Beachfront"),
    ("Manali Pine", "Entire home", "Cabins"),
    ("Shimla Hillside", "Entire home", "Cabins"),
    ("Coorg Coffee", "Entire home", "Cabins"),
    ("Udaipur Lake", "Entire home", "Luxury"),
    ("Jaipur Pink", "Private room", "Luxury"),
    ("Jaisalmer Desert", "Entire home", "Luxury"),
    ("Bandra West", "Apartment", "City"),
    ("Koramangala", "Apartment", "City"),
    ("Connaught Place", "Apartment", "City"),
    ("Rishikesh Ganges", "Private room", "Trending"),
    ("Varanasi Ghats", "Private room", "Trending"),
    ("Pondicherry French", "Villa", "Trending"),
    ("Hampi Boulder", "Entire home", "Trending"),
    ("Ooty Nilgiri", "Entire home", "Cabins"),
    ("Hyderabad Banjara", "Apartment", "City"),
]

for title_segment, prop_type, vibe_type in PROPERTY_VIBE_MAP:
    regex_pattern = (
        rf'("title": "{re.escape(title_segment)}[^"]*",.*?'
        rf'"price": \d+,)\s*"property_type": "[^"]+",'
    )
    replacement_string = rf'\1\n        "property_type": "{prop_type}",\n        "vibe": "{vibe_type}",'
    populator_file_content = re.sub(regex_pattern, replacement_string, populator_file_content, flags=re.DOTALL)

populator_file_content = populator_file_content.replace(
    'property_type=data["property_type"],\n            max_guests=data["guests"],',
    'property_type=data["property_type"],\n            vibe=data["vibe"],\n            max_guests=data["guests"],',
)

VALID_VIBES = '{"Beachfront", "Cabins", "Trending", "City", "Luxury"}'

populator_file_content = populator_file_content.replace(
    """    if db_session.query(DBListing).filter(DBListing.property_type == "Beachfront").count() == 0:
        return True""",
    f"""    if db_session.query(DBListing).filter(DBListing.vibe == "Beachfront").count() == 0:
        return True
    listing = db_session.query(DBListing).first()
    if listing and listing.property_type in {VALID_VIBES}:
        return True""",
)

verify_table_columns_code = '''
from sqlalchemy import inspect, text

from backend.storage import db_engine


def verify_table_columns() -> None:
    db_inspector = inspect(db_engine)
    if "listings" not in db_inspector.get_table_names():
        return
    cols_set = {c["name"] for c in db_inspector.get_columns("listings")}
    if "vibe" not in cols_set:
        with db_engine.begin() as conn:
            conn.execute(text("ALTER TABLE listings ADD COLUMN vibe VARCHAR(50) DEFAULT 'Trending'"))


'''

if "def verify_table_columns" not in populator_file_content:
    populator_file_content = populator_file_content.replace(
        "from sqlalchemy.orm import Session\n\nfrom backend.entities import",
        "from sqlalchemy import inspect, text\nfrom sqlalchemy.orm import Session\n\nfrom backend.storage import db_engine\nfrom backend.entities import",
    )
    populator_file_content = populator_file_content.replace(
        "def build_listings_catalog()",
        verify_table_columns_code + "def build_listings_catalog()",
    )
    populator_file_content = populator_file_content.replace(
        "def fill_sample_records(db_session: Session) -> None:\n    if db_session.query(DBUser).count()",
        "def fill_sample_records(db_session: Session) -> None:\n    verify_table_columns()\n\n    if db_session.query(DBUser).count()",
    )

populator_path.write_text(populator_file_content, encoding="utf-8")
print("Updated populator.py")
