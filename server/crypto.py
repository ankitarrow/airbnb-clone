import hashlib
import secrets


def generate_secure_hash(raw_input: str) -> str:
    hex_salt = secrets.token_hex(16)
    raw_digest = hashlib.pbkdf2_hmac("sha256", raw_input.encode(), hex_salt.encode(), 100_000)
    return f"{hex_salt}${raw_digest.hex()}"


def validate_password_hash(raw_input: str, saved_hash: str) -> bool:
    try:
        extracted_salt, extracted_digest = saved_hash.split("$", 1)
    except ValueError:
        return False
    computed_digest = hashlib.pbkdf2_hmac("sha256", raw_input.encode(), extracted_salt.encode(), 100_000)
    return secrets.compare_digest(computed_digest.hex(), extracted_digest)
