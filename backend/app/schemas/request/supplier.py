"""Supplier request schemas for input validation."""

from pydantic import BaseModel, Field


class SupplierCreate(BaseModel):
    """Request body for creating a new supplier."""

    name: str = Field(..., min_length=1)
    code: str | None = None
    billing_address: str | None = None
    delivery_address: str | None = None
    email: str | None = None


class SupplierUpdate(BaseModel):
    """Request body for updating a supplier's fields."""

    name: str | None = Field(None, min_length=1)
    code: str | None = None
    billing_address: str | None = None
    delivery_address: str | None = None
    email: str | None = None
