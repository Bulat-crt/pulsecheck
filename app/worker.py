import logging
import os
import time
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from app.database import SessionLocal
from app.models import URL
from app.services.url_check_service import check_url


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

logger = logging.getLogger(__name__)


def check_active_urls() -> None:
    with SessionLocal() as session:
        url_ids = session.scalars(
            select(URL.id).where(URL.is_active.is_(True))
        ).all()

    if not url_ids:
        logger.info("No active URLs to check")
        return

    for url_id in url_ids:
        with SessionLocal() as session:
            try:
                result = check_url(session, url_id)

                logger.info(
                    "URL id=%s | status=%s | success=%s | response_time=%.2f ms",
                    result.url_id,
                    result.status_code,
                    result.success,
                    result.response_time,
                )

            except Exception:
                session.rollback()
                logger.exception("Failed to check URL id=%s", url_id)


def main() -> None:
    interval = int(os.getenv("WORKER_INTERVAL_SECONDS", "60"))

    logger.info("Worker started. Interval: %s seconds", interval)

    while True:
        started_at = time.monotonic()

        try:
            check_active_urls()
        except SQLAlchemyError:
            logger.exception("Database error during worker cycle")

        elapsed = time.monotonic() - started_at
        time.sleep(max(0, interval - elapsed))


if __name__ == "__main__":
    main()