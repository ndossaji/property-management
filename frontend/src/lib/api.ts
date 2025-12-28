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


// ============================================================================
// Expense API
// ============================================================================

export type ExpenseCategory =
  | 'maintenance'
  | 'repairs'
  | 'utilities'
  | 'insurance'
  | 'taxes'
  | 'mortgage'
  | 'hoa'
  | 'landscaping'
  | 'cleaning'
  | 'supplies'
  | 'legal'
  | 'accounting'
  | 'advertising'
  | 'travel'
  | 'other';

export interface ExpenseReceipt {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  content_type: string | null;
  file_size: number | null;
  expense_id: number;
  created_at: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  vendor: string | null;
  notes: string | null;
  property_id: number;
  property: Property | null;
  receipts: ExpenseReceipt[];
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreate {
  description: string;
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  vendor?: string | null;
  notes?: string | null;
  property_id: number;
}

export interface BulkExpenseResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

export const expensesApi = {
  list: (params?: {
    property_id?: number;
    category?: ExpenseCategory;
    start_date?: string;
    end_date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.property_id) searchParams.set('property_id', params.property_id.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    const query = searchParams.toString();
    return apiRequest<Expense[]>(`/api/expenses${query ? `?${query}` : ''}`);
  },

  get: (id: number) => apiRequest<Expense>(`/api/expenses/${id}`),

  create: (data: ExpenseCreate) =>
    apiRequest<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<ExpenseCreate>) =>
    apiRequest<Expense>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/expenses/${id}`, { method: 'DELETE' }),

  // Receipt operations
  uploadReceipt: async (expenseId: number, file: File): Promise<ExpenseReceipt> => {
    const token = (await import('./auth')).getAuthToken();
    const baseUrl = (await import('./auth')).getApiUrl();

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${baseUrl}/api/expenses/${expenseId}/receipts`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { message: errorData.detail || 'Failed to upload receipt', status: response.status };
    }

    return response.json();
  },

  getReceiptUrl: (expenseId: number, receiptId: number): string => {
    const baseUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
      : 'http://localhost:8000';
    return `${baseUrl}/api/expenses/${expenseId}/receipts/${receiptId}/download`;
  },

  deleteReceipt: (expenseId: number, receiptId: number) =>
    apiRequest<void>(`/api/expenses/${expenseId}/receipts/${receiptId}`, { method: 'DELETE' }),

  // CSV bulk import
  bulkImportCsv: async (file: File): Promise<BulkExpenseResult> => {
    const token = (await import('./auth')).getAuthToken();
    const baseUrl = (await import('./auth')).getApiUrl();

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${baseUrl}/api/expenses/bulk/csv`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { message: errorData.detail || 'Failed to import CSV', status: response.status };
    }

    return response.json();
  },

  getCategories: () => apiRequest<{ value: string; label: string }[]>('/api/expenses/categories/list'),
};
