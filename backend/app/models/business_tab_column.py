"""BusinessTabColumn model — per-business, per-tab column visibility and ordering."""

from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class BusinessTabColumn(Base):
    """Stores column visibility and order for a tab, scoped to a business."""

    __tablename__ = "business_tab_columns"

    __table_args__ = (
        UniqueConstraint("business_id", "tab_key", "col_key", name="uq_btc_business_tab_col"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=text("uuid_generate_v7()"),
    )
    business_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tab_key: Mapped[str] = mapped_column(Text, nullable=False)
    col_key: Mapped[str] = mapped_column(Text, nullable=False)
    visible: Mapped[bool] = mapped_column(nullable=False, default=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<BusinessTabColumn(business_id={self.business_id}, tab_key={self.tab_key}, col_key={self.col_key})>"
