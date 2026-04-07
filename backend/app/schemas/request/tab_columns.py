"""Request schemas for tab column visibility/ordering operations."""

from pydantic import BaseModel


class TabColumnItem(BaseModel):
    col_key: str
    visible: bool
    order_index: int


class TabColumnsUpdate(BaseModel):
    columns: list[TabColumnItem]
