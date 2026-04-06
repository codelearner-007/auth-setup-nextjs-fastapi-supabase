"""Business request schemas for input validation."""

from pydantic import BaseModel, Field


class CreateBusinessRequest(BaseModel):
    """Request body for creating a new business."""

    name: str = Field(..., min_length=1, description="Business name")
    country: str | None = Field(None, description="Country where the business operates")


class UpdateBusinessRequest(BaseModel):
    """Request body for updating business core fields and details."""

    name: str = Field(..., min_length=1, description="Business name")
    country: str | None = Field(None, description="Country where the business operates")
    address: str | None = Field(None, description="Business address")


class ResetBusinessRequest(BaseModel):
    """Request body for resetting business details to null."""
