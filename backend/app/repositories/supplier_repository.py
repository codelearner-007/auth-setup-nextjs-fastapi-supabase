"""Supplier repository — data access layer for the suppliers table."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier
from app.repositories.base_repository import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    """Repository for Supplier CRUD and query operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Supplier, session)

    async def list_by_business(self, business_id: str) -> list[Supplier]:
        """Return all suppliers for the given business, ordered by created_at asc."""
        result = await self.session.execute(
            select(Supplier)
            .where(Supplier.business_id == business_id)
            .order_by(Supplier.created_at.asc())
        )
        return list(result.scalars().all())

    async def get(self, business_id: str, supplier_id: str) -> Supplier | None:
        """Return a single supplier matching both business_id and supplier_id."""
        result = await self.session.execute(
            select(Supplier).where(
                Supplier.business_id == business_id,
                Supplier.id == supplier_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        business_id: str,
        name: str,
        code: str | None,
        billing_address: str | None,
        delivery_address: str | None,
        email: str | None,
    ) -> Supplier:
        """Insert a new supplier and return the persisted instance."""
        supplier = Supplier(
            business_id=business_id,
            name=name,
            code=code,
            billing_address=billing_address,
            delivery_address=delivery_address,
            email=email,
        )
        self.session.add(supplier)
        await self.session.flush()
        await self.session.refresh(supplier)
        return supplier

    async def update(
        self,
        business_id: str,
        supplier_id: str,
        **fields: object,
    ) -> Supplier | None:
        """Update mutable fields on a supplier. Returns None if not found.

        Only fields present in `fields` are applied. Passing a key with
        value None explicitly clears that field.
        """
        supplier = await self.get(business_id, supplier_id)
        if supplier is None:
            return None
        for key, value in fields.items():
            setattr(supplier, key, value)
        await self.session.flush()
        await self.session.refresh(supplier)
        return supplier

    async def delete(self, business_id: str, supplier_id: str) -> bool:
        """Delete a supplier. Returns True if deleted, False if not found."""
        supplier = await self.get(business_id, supplier_id)
        if supplier is None:
            return False
        await self.session.delete(supplier)
        await self.session.flush()
        return True
