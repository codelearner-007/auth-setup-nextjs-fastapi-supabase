"""Response schemas for tab column visibility/ordering operations."""

from pydantic import BaseModel, ConfigDict


class TabColumnItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    col_key: str
    visible: bool
    order_index: int


class TabColumnsResponse(BaseModel):
    tab_key: str
    columns: list[TabColumnItem]
