/**
 * API Utilities
 * Helper functions for making authenticated API requests
 */

import { getApiUrl, getAuthToken } from './auth';

export interface ApiError {
  message: string;
  detail?: string;
  status?: number;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const baseUrl = getApiUrl();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      message: errorData.detail || `Request failed with status ${response.status}`,
      detail: errorData.detail,
      status: response.status,
    };
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================================
// Owner API
// ============================================================================

export interface Owner {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export const ownersApi = {
  list: (search?: string) =>
    apiRequest<Owner[]>(`/api/owners${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  get: (id: number) => apiRequest<Owner>(`/api/owners/${id}`),

  create: (data: OwnerCreate) =>
    apiRequest<Owner>('/api/owners', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<OwnerCreate>) =>
    apiRequest<Owner>(`/api/owners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/owners/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// Property API
// ============================================================================

export type PropertyStatus = 'active' | 'inactive' | 'maintenance' | 'sold';
export type PropertyType =
  | 'single_family'
  | 'multi_family'
  | 'condo'
  | 'townhouse'
  | 'apartment'
  | 'commercial'
  | 'land'
  | 'other';

export interface Property {
  id: number;
  street_address: string;
  unit_number: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  nickname: string | null;
  property_type: PropertyType;
  status: PropertyStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  year_built: number | null;
  notes: string | null;
  owner_id: number | null;
  owner: Owner | null;
  full_address: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyCreate {
  street_address: string;
  unit_number?: string | null;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
  nickname?: string | null;
  property_type?: PropertyType;
  status?: PropertyStatus;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  year_built?: number | null;
  notes?: string | null;
  owner_id?: number | null;
}

export const propertiesApi = {
  list: (params?: { search?: string; owner_id?: number; status?: PropertyStatus }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.owner_id) searchParams.set('owner_id', params.owner_id.toString());
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return apiRequest<Property[]>(`/api/properties${query ? `?${query}` : ''}`);
  },

  get: (id: number) => apiRequest<Property>(`/api/properties/${id}`),

  create: (data: PropertyCreate) =>
    apiRequest<Property>('/api/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<PropertyCreate>) =>
    apiRequest<Property>(`/api/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/properties/${id}`, { method: 'DELETE' }),
};

