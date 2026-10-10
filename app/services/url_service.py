from app.repositories.url_repository import get_all, delete_url, get_by_id, create_url, get_by_url
from sqlalchemy.orm import Session
from app.models import URL
from app.schemas import URLCreate

def add_url(
    session: Session,
    data: URLCreate
) -> URL:
    url = str(data.url)
    already_created = get_by_url(session, url)
    if already_created is not None:
        return None
    created_url = create_url(session, url)

    return created_url


def get_url(
    session: Session,
    url_id: int,
) -> URL | None:
    url = get_by_id(session, url_id)
    if url is None:
        return None
    return url

def get_urls(
    session:Session
) -> list[URL]:
    urls = get_all(session)

    return urls

def delete_url_by_id(
    session: Session,
    url_id: int
) -> bool:
    url = get_by_id(session, url_id)
    if url is None:
        return False
    deleted = delete_url(session, url_id)

    return deleted