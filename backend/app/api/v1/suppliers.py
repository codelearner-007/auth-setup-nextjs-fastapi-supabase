"""Suppliers endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_role
from app.schemas.request.supplier import SupplierCreate, SupplierUpdate
from app.schemas.response.supplier import SupplierListResponse, SupplierResponse
from app.services.supplier_service import SupplierService

router = APIRouter(
    prefix="/businesses/{business_id}/suppliers",
    tags=["Suppliers"],
)

_ROLE_DEP = [Depends(require_role("admin", "super_admin"))]


@router.get("", response_model=SupplierListResponse, dependencies=_ROLE_DEP)
async def list_suppliers(
    business_id: str,
    db: AsyncSession = Depends(get_db),
) -> SupplierListResponse:
    return await SupplierService(db).list_suppliers(business_id)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED, dependencies=_ROLE_DEP)
async def create_supplier(
    business_id: str,
    body: SupplierCreate,
    db: AsyncSession = Depends(get_db),
) -> SupplierResponse:
    return await SupplierService(db).create_supplier(
        business_id=business_id,
        name=body.name,
        code=body.code,
        billing_address=body.billing_address,
        delivery_address=body.delivery_address,
        email=body.email,
    )


@router.get("/{supplier_id}", response_model=SupplierResponse, dependencies=_ROLE_DEP)
async def get_supplier(
    business_id: str,
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
) -> SupplierResponse:
    return await SupplierService(db).get_supplier(business_id, supplier_id)


@router.put("/{supplier_id}", response_model=SupplierResponse, dependencies=_ROLE_DEP)
async def update_supplier(
    business_id: str,
    supplier_id: str,
    body: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
) -> SupplierResponse:
    fields = {k: v for k, v in body.model_dump().items() if k in body.model_fields_set}
    return await SupplierService(db).update_supplier(
        business_id=business_id,
        supplier_id=supplier_id,
        fields=fields,
    )


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_ROLE_DEP)
async def delete_supplier(
    business_id: str,
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    await SupplierService(db).delete_supplier(business_id, supplier_id)
