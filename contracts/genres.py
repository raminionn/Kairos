"""The allowed genre labels. The team has not agreed the final list yet: add, remove or rename
here only, and every contract that uses genre picks the change up."""

GENRES = (
    "talk",
    "lecture",
    "vlog",
    "gaming",
    "cooking",
    "other",
    "unknown",
)

UNKNOWN_GENRE = "unknown"


def check_genre(value: str) -> str:
    if value not in GENRES:
        raise ValueError(f"unknown genre {value!r}, allowed: {', '.join(GENRES)}")
    return value
