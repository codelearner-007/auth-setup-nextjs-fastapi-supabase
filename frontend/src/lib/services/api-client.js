import { toErrorMessage } from '@/lib/utils/api-errors';
import { createSPAClient } from '@/lib/supabase/client';

let _tokenCache = null;
let _tokenCacheExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (_tokenCache && now < _tokenCacheExpiry) return _tokenCache;
  try {
    const supabase = createSPAClient();
    const { data: { session } } = await supabase.auth.getSession();
    _tokenCache = session?.access_token ?? null;
    _tokenCacheExpiry = now + 30_000;
    return _tokenCache;
  } catch {
    return null;
  }
}

class APIClient {
  baseUrl = '/api';

  async request(path, options) {
    const token = await getAccessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      let errorMessage;
      if (typeof error?.error === 'string') {
        errorMessage = error.error;
      } else if (typeof error?.message === 'string') {
        errorMessage = error.message;
      } else {
        errorMessage = toErrorMessage(error?.error ?? error);
      }
      const errorObj = new Error(errorMessage);

      // Pass through requiresMFA flag if present
      if (error.requiresMFA) {
        errorObj.requiresMFA = true;
      }

      throw errorObj;
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }
    return response.json();
  }

  async get(path) {
    return this.request(path, { method: 'GET' });
  }

  async post(path, data) {
    return this.request(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(path, data) {
    return this.request(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(path, data) {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
