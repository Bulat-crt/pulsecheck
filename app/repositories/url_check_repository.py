from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import URLcheck
from datetime import datetime

def create_check(
    session: Session,
    url_id: int,
    status_code: int,
    response_time: float,
    success: bool,
    checked_at: datetime
) -> URLcheck:
    check = URLcheck(
        url_id = url_id,
        status_code = status_code,
        response_time = response_time,
        success = success,
        checked_at=checked_at
    )

    session.add(check)

    session.commit()

    session.refresh(check)

    return check

def get_checks_by_url_id(
    session: Session,
    url_id: int
) -> list[URLcheck]:
    statement = select(URLcheck).where(URLcheck.url_id == url_id)

    checks = session.scalars(statement).all()

    return checks