"""Receipt repository — data access layer for the receipts table."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.receipt import Receipt
from app.repositories.base_repository import BaseRepository


class ReceiptRepository(BaseRepository[Receipt]):
    """Repository for Receipt CRUD and query operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Receipt, session)

    async def list_by_business(self, business_id: str) -> list[Receipt]:
        """Return all receipts for the given business, ordered by date DESC then created_at DESC."""
        result = await self.session.execute(
            select(Receipt)
            .where(Receipt.business_id == business_id)
            .order_by(Receipt.date.desc(), Receipt.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, business_id: str, receipt_id: str) -> Receipt | None:
        """Return a single receipt matching both business_id and receipt_id."""
        result = await self.session.execute(
            select(Receipt).where(
                Receipt.business_id == business_id,
                Receipt.id == receipt_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, business_id: str, **fields: object) -> Receipt:
        """Insert a new receipt and return the persisted instance."""
        receipt = Receipt(business_id=business_id, **fields)
        self.session.add(receipt)
        await self.session.flush()
        await self.session.refresh(receipt)
        return receipt

    async def update(
        self,
        business_id: str,
        receipt_id: str,
        **fields: object,
    ) -> Receipt | None:
        """Update mutable fields on a receipt. Returns None if not found.

        Only fields present in `fields` are applied. Passing a key with
        value None explicitly clears that field.
        """
        receipt = await self.get(business_id, receipt_id)
        if receipt is None:
            return None
        for key, value in fields.items():
            setattr(receipt, key, value)
        await self.session.flush()
        await self.session.refresh(receipt)
        return receipt

    async def delete(self, business_id: str, receipt_id: str) -> bool:
        """Delete a receipt. Returns True if deleted, False if not found."""
        receipt = await self.get(business_id, receipt_id)
        if receipt is None:
            return False
        await self.session.delete(receipt)
        await self.session.flush()
        return True
