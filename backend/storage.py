from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DB_CONN_STR = "sqlite:///./airbnb.db"

db_engine = create_engine(
    DB_CONN_STR,
    connect_args={"check_same_thread": False},
)
DB_SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


class OrmBase(DeclarativeBase):
    pass


def update_db_schema() -> None:
    db_inspector = inspect(db_engine)
    if "bookings" in db_inspector.get_table_names():
        column_set = {c["name"] for c in db_inspector.get_columns("bookings")}
        if "refund_amount" not in column_set:
            with db_engine.begin() as db_conn:
                db_conn.execute(text("ALTER TABLE bookings ADD COLUMN refund_amount FLOAT"))
    if "users" in db_inspector.get_table_names():
        column_set = {c["name"] for c in db_inspector.get_columns("users")}
        if "password_hash" not in column_set:
            with db_engine.begin() as db_conn:
                db_conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
        if "identity_verified" not in column_set:
            with db_engine.begin() as db_conn:
                db_conn.execute(text("ALTER TABLE users ADD COLUMN identity_verified BOOLEAN DEFAULT 0"))
                db_conn.execute(text("UPDATE users SET identity_verified = 0 WHERE identity_verified IS NULL"))
    if "reviews" in db_inspector.get_table_names():
        column_set = {c["name"] for c in db_inspector.get_columns("reviews")}
        with db_engine.begin() as db_conn:
            if "host_reply" not in column_set:
                db_conn.execute(text("ALTER TABLE reviews ADD COLUMN host_reply TEXT"))
            if "host_reply_at" not in column_set:
                db_conn.execute(text("ALTER TABLE reviews ADD COLUMN host_reply_at DATETIME"))


def acquire_db_session():
    session = DB_SessionFactory()
    try:
        yield session
    finally:
        session.close()
