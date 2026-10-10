from sqlalchemy import ForeignKey, String, DateTime, func, Enum
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class URL(Base):
    __tablename__ = 'urls'

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    check: Mapped['URLcheck'] = relationship(back_populates='url')

class URLcheck(Base):
    __tablename__ = "url_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    url_id: Mapped[int | None] = mapped_column(ForeignKey('urls.id'), nullable=False)
    status_code: Mapped[int] = mapped_column(nullable=True)
    response_time: Mapped[float] = mapped_column(nullable=False)
    success: Mapped[bool] = mapped_column(nullable=False, default=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    url: Mapped['URL'] = relationship(back_populates='check')