import { apiClient } from './api-client';

const base = (businessId) => `/v1/businesses/${businessId}/suppliers`;

export async function listSuppliers(businessId) {
  return apiClient.get(base(businessId));
}

export async function createSupplier(businessId, data) {
  return apiClient.post(base(businessId), data);
}

export async function getSupplier(businessId, supplierId) {
  return apiClient.get(`${base(businessId)}/${supplierId}`);
}

export async function updateSupplier(businessId, supplierId, data) {
  return apiClient.put(`${base(businessId)}/${supplierId}`, data);
}

export async function deleteSupplier(businessId, supplierId) {
  return apiClient.delete(`${base(businessId)}/${supplierId}`);
}

export async function listSupplierReceipts(businessId, supplierId) {
  return apiClient.get(`/v1/businesses/${businessId}/suppliers/${supplierId}/receipts`);
}
