"""COA request schemas for input validation."""

from typing import Literal

from pydantic import BaseModel, Field

_AccountType = Literal["balance_sheet", "pl"]
_CashFlow = Literal["operating", "investing", "financing", "cash_equivalent"] | None


class CoaGroupCreate(BaseModel):
    """Request body for creating a new COA group."""

    name: str = Field(..., min_length=1)
    type: _AccountType
    parent_group_id: str | None = None


class CoaGroupUpdate(BaseModel):
    """Request body for updating an existing COA group."""

    name: str | None = Field(None, min_length=1)
    parent_group_id: str | None = None


class CoaAccountCreate(BaseModel):
    """Request body for creating a new COA account."""

    name: str = Field(..., min_length=1)
    code: str | None = None
    group_id: str | None = None
    cash_flow_category: _CashFlow = None
    type: _AccountType = "pl"
    is_total: bool = False
    is_fixed: bool = False


class CoaAccountUpdate(BaseModel):
    """Request body for updating an existing COA account."""

    name: str | None = Field(None, min_length=1)
    code: str | None = None
    group_id: str | None = None
    cash_flow_category: _CashFlow = None
    type: _AccountType | None = None
    is_total: bool | None = None
    is_fixed: bool | None = None


class CoaGroupsOrderUpdate(BaseModel):
    """Request body for reordering COA groups within a type/parent bucket."""

    type: _AccountType
    parent_group_id: str | None = None
    items: list[str]


class CoaAccountsOrderUpdate(BaseModel):
    """Request body for reordering COA accounts within a group."""

    group_id: str | None = None
    items: list[str]
