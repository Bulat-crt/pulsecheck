from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from sqlalchemy.orm import Session
from app.schemas import URLCreate, URLResponse, URLCheckResponse
from app.services.url_service import add_url, get_url, get_urls, delete_url
from app.services.url_check_service import check_url, get_all_checks_by_id

router = APIRouter()

@router.post("/urls", response_model=URLResponse)
def create_url(
    data: URLCreate,
    session: Session = Depends(get_db)
):  
    created_url = add_url(session, data)
    if created_url is None:
        raise HTTPException(
            status_code=409,
            detail='Уже есть такой URL'
            )
    return created_url
    

@router.get("/urls/{url_id}", response_model=URLResponse)
def get_url_by_id(
    url_id: int,
    session: Session = Depends(get_db)
):
    url = get_url(session, url_id)
    if url is None:
        raise HTTPException(
            status_code=404,
            detail='Нет такого URL'
        )
    return url
    

@router.get("/urls", response_model=list[URLResponse])
def get_all_urls(
    session: Session = Depends(get_db)
):
    return get_urls(session)


@router.delete("/urls/{url_id}")
def delete_current_url(
    url_id: int,
    session: Session = Depends(get_db)
):
    deleted = delete_url(session, url_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail='Нет такого URL'
        )
    return deleted

@router.post("/urls/{url_id}/check")
def get_pulse_url(
    url_id: int,
    session: Session = Depends(get_db)
):
    checked = check_url(session, url_id)
    if checked is None:
        raise HTTPException(
            status_code=404,
            detail='Нет такого URL'
        )
    return checked

@router.get(
    "/urls/{url_id}/checks",
    response_model=list[URLCheckResponse],
)
def get_url_checks(
    url_id: int,
    session: Session = Depends(get_db),
):
    checks = get_all_checks_by_id(session, url_id)
    if checks is None:
        raise HTTPException(
            status_code=404,
            detail='Нет такого URL'
        )
    return checks