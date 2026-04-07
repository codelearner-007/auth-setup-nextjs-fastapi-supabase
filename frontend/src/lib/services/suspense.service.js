import { apiClient } from './api-client';

const base = (businessId) => `/v1/businesses/${businessId}/suspense`;

export async function getSuspenseBalance(businessId) {
  return apiClient.get(`${base(businessId)}/balance`);
}

export async function getSuspenseEntries(businessId) {
  return apiClient.get(`${base(businessId)}/entries`);
}
