import re

# Indian mobile: starts with 6-9, 10 digits
PHONE_RE = re.compile(r'\b[6-9]\d{9}\b')
EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')


def scan_for_contact(text: str) -> bool:
    """Return True if the text contains a phone number or email address."""
    if not text:
        return False
    return bool(PHONE_RE.search(text) or EMAIL_RE.search(text))


def assert_no_contact(text: str, field_name: str = "text"):
    """Raise ValueError if contact info is detected."""
    if scan_for_contact(text):
        raise ValueError(f"{field_name} must not contain phone numbers or email addresses")
