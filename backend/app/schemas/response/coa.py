"""COA response schemas for API output serialization."""

from pydantic import BaseModel, ConfigDict


class CoaGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    name: str
    type: str
    parent_group_id: str | None
    is_fixed: bool
    order_index: int


class CoaGroupListResponse(BaseModel):
    items: list[CoaGroupResponse]
    total: int


class CoaAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    name: str
    code: str | None
    group_id: str | None
    cash_flow_category: str | None
    type: str
    is_total: bool
    is_fixed: bool
    order_index: int


class CoaAccountListResponse(BaseModel):
    items: list[CoaAccountResponse]
    total: int
