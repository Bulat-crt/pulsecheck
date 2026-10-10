"""add default checked_at

Revision ID: aa21ff0d66dd
Revises: 08f50ea842e0
Create Date: 2026-10-07 16:30:48.136835

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa21ff0d66dd'
down_revision: Union[str, Sequence[str], None] = '08f50ea842e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
