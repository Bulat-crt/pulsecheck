from pydantic import BaseModel, HttpUrl, ConfigDict
from datetime import datetime

class URLCreate(BaseModel):
    url: HttpUrl

class URLResponse(BaseModel):
    id: int
    url: HttpUrl
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class URLCheckResponse(BaseModel):
    id: int
    url_id: int
    status_code: int | None
    response_time: float
    success: bool
    checked_at: datetime

    model_config = ConfigDict(from_attributes=True)