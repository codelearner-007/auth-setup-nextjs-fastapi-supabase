"""Supplier response schemas for API output serialization."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    name: str
    code: str | None
    billing_address: str | None
    delivery_address: str | None
    email: str | None
    created_at: datetime
    updated_at: datetime


class SupplierListResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
