import httpx
import time
from datetime import datetime
from sqlalchemy.orm import Session
from app.repositories.url_repository import get_by_id
from app.models import URLcheck
from app.repositories.url_check_repository import create_check, get_checks_by_url_id

def check_url(
    session: Session,
    url_id: int,
) -> URLcheck:
    url_obj = get_by_id(session, url_id)
    if url_obj is None:
        return False
    url = str(url_obj.url)
    status_code = None
    success = False
    
    start = time.perf_counter()

    try:
        response = httpx.get(url,timeout=10.0)
        status_code = response.status_code
        success = 200 <= status_code < 400
    except httpx.RequestError:
        pass

    end = time.perf_counter()

    response_time = (end - start) * 1000

    checked_at = datetime.now()

    check = create_check(session, url_id=url_id, status_code=status_code, response_time=response_time, success=success, checked_at=checked_at)

    return check

def get_all_checks_by_id(
    session: Session,
    url_id: int
):
    url = get_by_id(session, url_id)
    if url is None:
        return None
    all_checks = get_checks_by_url_id(session, url_id)
    return all_checks