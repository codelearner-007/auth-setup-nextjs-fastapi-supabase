"""Tab columns repository — data access layer for business_tab_columns table."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_tab_column import BusinessTabColumn
from app.schemas.request.tab_columns import TabColumnItem


class TabColumnsRepository:
    """Repository for business_tab_columns CRUD operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, business_id: str, tab_key: str) -> list[BusinessTabColumn]:
        """Return all column rows for the given business and tab, ordered by order_index ASC."""
        result = await self.session.execute(
            text(
                "SELECT id::text, business_id::text, tab_key, col_key, visible, order_index "
                "FROM business_tab_columns "
                "WHERE business_id = :business_id AND tab_key = :tab_key "
                "ORDER BY order_index ASC"
            ),
            {"business_id": business_id, "tab_key": tab_key},
        )
        rows = result.mappings().all()
        return [
            BusinessTabColumn(
                id=r["id"],
                business_id=r["business_id"],
                tab_key=r["tab_key"],
                col_key=r["col_key"],
                visible=r["visible"],
                order_index=r["order_index"],
            )
            for r in rows
        ]

    async def upsert_all(
        self,
        business_id: str,
        tab_key: str,
        columns: list[TabColumnItem],
    ) -> list[BusinessTabColumn]:
        """Replace all column rows for this business+tab in one operation.

        Deletes existing rows then inserts the new set.
        Returns the inserted rows ordered by order_index.
        """
        await self.session.execute(
            text(
                "DELETE FROM business_tab_columns "
                "WHERE business_id = :business_id AND tab_key = :tab_key"
            ),
            {"business_id": business_id, "tab_key": tab_key},
        )

        if not columns:
            return []

        for col in columns:
            await self.session.execute(
                text(
                    "INSERT INTO business_tab_columns "
                    "(business_id, tab_key, col_key, visible, order_index) "
                    "VALUES (:business_id, :tab_key, :col_key, :visible, :order_index)"
                ),
                {
                    "business_id": business_id,
                    "tab_key": tab_key,
                    "col_key": col.col_key,
                    "visible": col.visible,
                    "order_index": col.order_index,
                },
            )

        return await self.get(business_id, tab_key)
