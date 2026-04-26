import re
import string


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"@\w+|#\w+", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text).strip()
    return text


TOXIC_TERMS = {
    "stupid",
    "idiot",
    "ugly",
    "hate",
    "kill",
    "die",
    "loser",
    "worthless",
    "disgusting",
    "fat",
    "freak",
    "moron",
    "dumb",
    "pathetic",
    "trash",
    "garbage",
    "useless",
    "horrible",
    "retarded",
    "awful",
    "terrible",
}


def flagged_words(text: str) -> list[str]:
    words = set(clean_text(text).split())
    return sorted(TOXIC_TERMS.intersection(words))
