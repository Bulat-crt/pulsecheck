from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import URL

def create_url(
    session: Session,
    url: str,
) -> URL:
    new_url = URL(url=url)

    session.add(new_url)

    session.commit()

    session.refresh(new_url)

    return new_url

def get_by_id(
    session: Session,
    url_id: int
) -> URL | None:
    statement = select(URL).where(URL.id == url_id)

    need_url = session.scalars(statement).first()

    return need_url

def get_all(
    session: Session,
) -> list[URL]:
    statement = select(URL)
    all_urls = session.scalars(statement).all()

    return all_urls

def delete_url(
    session: Session,
    url_id: int
):
    statement = select(URL).where(URL.id == url_id)

    need_delete = session.scalars(statement).first()

    if not need_delete:
        return False

    session.delete(need_delete)
    session.commit()

    return True

def get_by_url(
    session: Session,
    url: str
) -> URL | None:
    statement = select(URL).where(URL.url == url)

    need_url = session.scalars(statement).first()

    return need_url