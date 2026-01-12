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
  owners: Owner[];  // Many-to-many relationship
  full_address: string;
  custom_fields?: Record<number, string>;
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

export type ExpensePaidBy = 'unpaid' | 'property_management' | 'owner';

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  vendor: string | null;
  notes: string | null;
  paid_by: ExpensePaidBy;
  property_id: number;
  property: Property | null;
  receipts: ExpenseReceipt[];
  custom_fields?: Record<number, string>;
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
  paid_by?: ExpensePaidBy;
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
    owner_id?: number;
    category?: ExpenseCategory;
    start_date?: string;
    end_date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.property_id) searchParams.set('property_id', params.property_id.toString());
    if (params?.owner_id) searchParams.set('owner_id', params.owner_id.toString());
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

  // CSV export
  exportCsv: async (params?: {
    property_id?: number;
    category?: ExpenseCategory;
    start_date?: string;
    end_date?: string;
  }): Promise<void> => {
    const token = (await import('./auth')).getAuthToken();
    const baseUrl = (await import('./auth')).getApiUrl();

    const searchParams = new URLSearchParams();
    if (params?.property_id) searchParams.set('property_id', params.property_id.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    const query = searchParams.toString();

    const response = await fetch(`${baseUrl}/api/expenses/export/csv${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { message: errorData.detail || 'Failed to export CSV', status: response.status };
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
    const filename = filenameMatch ? filenameMatch[1] : `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// ============================================================================
// Custom Fields API
// ============================================================================

export type CustomFieldType = 'text' | 'number' | 'dropdown' | 'date' | 'checkbox';

export interface CustomFieldOption {
  id?: number;
  value: string;
  label: string;
  display_order: number;
}

export interface CustomField {
  id: number;
  name: string;
  field_type: CustomFieldType;
  entity_type: 'expense' | 'property';
  is_required: boolean;
  display_order: number;
  options: CustomFieldOption[];
  created_at: string;
  updated_at: string;
}

export interface CustomFieldCreate {
  name: string;
  field_type: CustomFieldType;
  entity_type: 'expense' | 'property';
  is_required?: boolean;
  display_order?: number;
  options?: Omit<CustomFieldOption, 'id'>[];
}

export interface CustomFieldUpdate {
  name?: string;
  is_required?: boolean;
  display_order?: number;
  options?: Omit<CustomFieldOption, 'id'>[];
}

export const customFieldsApi = {
  list: (entityType?: 'expense' | 'property') =>
    apiRequest<CustomField[]>(`/api/custom-fields${entityType ? `?entity_type=${entityType}` : ''}`),

  get: (id: number) => apiRequest<CustomField>(`/api/custom-fields/${id}`),

  create: (data: CustomFieldCreate) =>
    apiRequest<CustomField>('/api/custom-fields', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: CustomFieldUpdate) =>
    apiRequest<CustomField>(`/api/custom-fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/custom-fields/${id}`, { method: 'DELETE' }),
};


// ============================================================================
// Tenant API
// ============================================================================

export interface Tenant {
  id: number;
  property_id: number | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  address: string | null;
  ssn_last_four: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  employer: string | null;
  employer_phone: string | null;
  monthly_income: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CHAVoucherStatus = 'pending' | 'active' | 'suspended' | 'terminated' | 'expired';

export interface CHAVoucher {
  id: number;
  tenant_id: number;
  voucher_number: string;
  status: CHAVoucherStatus;
  issue_date: string | null;
  expiration_date: string | null;
  portability_date: string | null;
  payment_standard: number | null;
  hap_amount: number | null;
  tenant_portion: number | null;
  cha_case_worker: string | null;
  cha_case_worker_phone: string | null;
  cha_case_worker_email: string | null;
  bedroom_size: number | null;
  is_portable: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantWithVoucher extends Tenant {
  property: Property | null;
  cha_voucher: CHAVoucher | null;
}

export interface TenantCreate {
  property_id?: number | null;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  ssn_last_four?: string | null;
  date_of_birth?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  employer?: string | null;
  employer_phone?: string | null;
  monthly_income?: number | null;
  notes?: string | null;
}

export interface CHAVoucherCreate {
  voucher_number: string;
  status?: CHAVoucherStatus;
  issue_date?: string | null;
  expiration_date?: string | null;
  portability_date?: string | null;
  payment_standard?: number | null;
  hap_amount?: number | null;
  tenant_portion?: number | null;
  cha_case_worker?: string | null;
  cha_case_worker_phone?: string | null;
  cha_case_worker_email?: string | null;
  bedroom_size?: number | null;
  is_portable?: boolean;
  notes?: string | null;
}

export const tenantsApi = {
  list: (params?: { search?: string; is_active?: boolean; has_voucher?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString());
    if (params?.has_voucher !== undefined) searchParams.set('has_voucher', params.has_voucher.toString());
    const query = searchParams.toString();
    return apiRequest<TenantWithVoucher[]>(`/api/tenants${query ? `?${query}` : ''}`);
  },

  get: (id: number) => apiRequest<TenantWithVoucher>(`/api/tenants/${id}`),

  create: (data: TenantCreate) =>
    apiRequest<Tenant>('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<TenantCreate>) =>
    apiRequest<Tenant>(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/tenants/${id}`, { method: 'DELETE' }),

  // Voucher operations
  getVoucher: (tenantId: number) =>
    apiRequest<CHAVoucher>(`/api/tenants/${tenantId}/voucher`),

  createVoucher: (tenantId: number, data: CHAVoucherCreate) =>
    apiRequest<CHAVoucher>(`/api/tenants/${tenantId}/voucher`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateVoucher: (tenantId: number, data: Partial<CHAVoucherCreate>) =>
    apiRequest<CHAVoucher>(`/api/tenants/${tenantId}/voucher`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteVoucher: (tenantId: number) =>
    apiRequest<void>(`/api/tenants/${tenantId}/voucher`, { method: 'DELETE' }),
};


// ============================================================================
// Lease API
// ============================================================================

export type LeaseStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';

export interface Lease {
  id: number;
  tenant_id: number;
  property_id: number;
  start_date: string;
  end_date: string;
  move_in_date: string | null;
  move_out_date: string | null;
  monthly_rent: number;
  security_deposit: number | null;
  rent_due_day: number;
  grace_period_days: number;
  late_fee_amount: number | null;
  late_fee_percentage: number | null;
  daily_late_fee: number | null;
  is_section_8: boolean;
  cha_portion: number | null;
  tenant_portion: number | null;
  status: LeaseStatus;
  lease_document_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseWithRelations extends Lease {
  tenant: TenantWithVoucher;
  property: Property;
}

export interface LeaseCreate {
  tenant_id: number;
  property_id: number;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  move_in_date?: string | null;
  security_deposit?: number | null;
  rent_due_day?: number;
  grace_period_days?: number;
  late_fee_amount?: number | null;
  late_fee_percentage?: number | null;
  daily_late_fee?: number | null;
  is_section_8?: boolean;
  cha_portion?: number | null;
  tenant_portion?: number | null;
  status?: LeaseStatus;
  notes?: string | null;
}

export const leasesApi = {
  list: (params?: { tenant_id?: number; property_id?: number; status?: LeaseStatus; is_section_8?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.tenant_id) searchParams.set('tenant_id', params.tenant_id.toString());
    if (params?.property_id) searchParams.set('property_id', params.property_id.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.is_section_8 !== undefined) searchParams.set('is_section_8', params.is_section_8.toString());
    const query = searchParams.toString();
    return apiRequest<LeaseWithRelations[]>(`/api/leases${query ? `?${query}` : ''}`);
  },

  get: (id: number) => apiRequest<LeaseWithRelations>(`/api/leases/${id}`),

  create: (data: LeaseCreate) =>
    apiRequest<Lease>('/api/leases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<LeaseCreate>) =>
    apiRequest<Lease>(`/api/leases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/leases/${id}`, { method: 'DELETE' }),

  // Workflow operations
  activate: (id: number) =>
    apiRequest<Lease>(`/api/leases/${id}/activate`, { method: 'POST' }),

  terminate: (id: number) =>
    apiRequest<Lease>(`/api/leases/${id}/terminate`, { method: 'POST' }),

  renew: (id: number, data: { new_end_date: string; new_monthly_rent?: number }) =>
    apiRequest<Lease>(`/api/leases/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};


// ============================================================================
// Rent Payment API
// ============================================================================

export type PaymentStatus = 'pending' | 'completed' | 'partial' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'check' | 'money_order' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'cha_voucher' | 'other';
export type PaidBy = 'property_management' | 'owner';

export interface RentPayment {
  id: number;
  lease_id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  reference_number: string | null;
  is_cha_payment: boolean;
  cha_payment_reference: string | null;
  notes: string | null;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentPaymentWithLease extends RentPayment {
  lease: LeaseWithRelations;
}

export interface RentPaymentCreate {
  lease_id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  status?: PaymentStatus;
  reference_number?: string | null;
  is_cha_payment?: boolean;
  cha_payment_reference?: string | null;
  notes?: string | null;
}

export interface PaymentSummary {
  total_expected: number;
  total_paid: number;
  total_outstanding: number;
  total_late_fees: number;
  total_late_fees_paid: number;
  total_late_fees_outstanding: number;
  payments_count: number;
  late_fees_count: number;
}

export const paymentsApi = {
  list: (params?: {
    lease_id?: number;
    status?: PaymentStatus;
    payment_method?: PaymentMethod;
    start_date?: string;
    end_date?: string;
    is_cha_payment?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.lease_id) searchParams.set('lease_id', params.lease_id.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.payment_method) searchParams.set('payment_method', params.payment_method);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.is_cha_payment !== undefined) searchParams.set('is_cha_payment', params.is_cha_payment.toString());
    const query = searchParams.toString();
    return apiRequest<RentPaymentWithLease[]>(`/api/payments${query ? `?${query}` : ''}`);
  },

  get: (id: number) => apiRequest<RentPaymentWithLease>(`/api/payments/${id}`),

  create: (data: RentPaymentCreate) =>
    apiRequest<RentPayment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<RentPaymentCreate>) =>
    apiRequest<RentPayment>(`/api/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/payments/${id}`, { method: 'DELETE' }),

  getSummary: (leaseId: number) =>
    apiRequest<PaymentSummary>(`/api/payments/summary/${leaseId}`),
};


// ============================================================================
// Late Fees API
// ============================================================================

export interface LateFee {
  id: number;
  lease_id: number;
  amount: number;
  fee_date: string;
  for_period_start: string;
  for_period_end: string;
  is_paid: boolean;
  paid_date: string | null;
  is_waived: boolean;
  waived_date: string | null;
  waived_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LateFeeWithLease extends LateFee {
  lease: LeaseWithRelations;
}

export interface LateFeeCreate {
  lease_id: number;
  amount: number;
  fee_date: string;
  for_period_start: string;
  for_period_end: string;
  notes?: string | null;
}

export const lateFeesApi = {
  list: (params?: { lease_id?: number; is_paid?: boolean; is_waived?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.lease_id) searchParams.set('lease_id', params.lease_id.toString());
    if (params?.is_paid !== undefined) searchParams.set('is_paid', params.is_paid.toString());
    if (params?.is_waived !== undefined) searchParams.set('is_waived', params.is_waived.toString());
    const query = searchParams.toString();
    return apiRequest<LateFeeWithLease[]>(`/api/late-fees${query ? `?${query}` : ''}`);
  },

  get: (id: number) => apiRequest<LateFeeWithLease>(`/api/late-fees/${id}`),

  create: (data: LateFeeCreate) =>
    apiRequest<LateFee>('/api/late-fees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<LateFeeCreate>) =>
    apiRequest<LateFee>(`/api/late-fees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/late-fees/${id}`, { method: 'DELETE' }),

  markPaid: (id: number) =>
    apiRequest<LateFee>(`/api/late-fees/${id}/pay`, { method: 'POST' }),

  waive: (id: number, reason: string) =>
    apiRequest<LateFee>(`/api/late-fees/${id}/waive?reason=${encodeURIComponent(reason)}`, { method: 'POST' }),
};


// ============================================================================
// Owner Payment API
// ============================================================================

export interface OwnerPaymentAttachment {
  id: number;
  payment_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  content_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface OwnerPayment {
  id: number;
  owner_id: number;
  property_id: number | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  attachments: OwnerPaymentAttachment[];
}

export interface OwnerPaymentWithDetails extends OwnerPayment {
  owner: Owner;
  property: Property | null;
  attachments: OwnerPaymentAttachment[];
}

export interface OwnerPaymentCreate {
  owner_id: number;
  property_id?: number | null;
  amount: number;
  payment_date: string;
  payment_method?: PaymentMethod;
  reference_number?: string | null;
  description?: string | null;
  notes?: string | null;
}

export interface OwnerPaymentSummary {
  total_payments: number;
  payments_count: number;
  by_owner: Record<number, number>;
  by_property: Record<number, number>;
}

export const ownerPaymentsApi = {
  list: (params?: {
    owner_id?: number;
    property_id?: number;
    payment_method?: PaymentMethod;
    start_date?: string;
    end_date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.owner_id) searchParams.set('owner_id', params.owner_id.toString());
    if (params?.property_id) searchParams.set('property_id', params.property_id.toString());
    if (params?.payment_method) searchParams.set('payment_method', params.payment_method);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    const query = searchParams.toString();
    return apiRequest<OwnerPaymentWithDetails[]>(`/api/owner-payments${query ? `?${query}` : ''}`);
  },

  get: (id: number) => apiRequest<OwnerPaymentWithDetails>(`/api/owner-payments/${id}`),

  create: (data: OwnerPaymentCreate) =>
    apiRequest<OwnerPayment>('/api/owner-payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<OwnerPaymentCreate>) =>
    apiRequest<OwnerPayment>(`/api/owner-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/owner-payments/${id}`, { method: 'DELETE' }),

  getSummary: (params?: {
    owner_id?: number;
    property_id?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.owner_id) searchParams.set('owner_id', params.owner_id.toString());
    if (params?.property_id) searchParams.set('property_id', params.property_id.toString());
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    const query = searchParams.toString();
    return apiRequest<OwnerPaymentSummary>(`/api/owner-payments/summary${query ? `?${query}` : ''}`);
  },

  getPropertyBalances: () =>
    apiRequest<PropertyBalancesSummary>('/api/owner-payments/property-balances'),

  // Attachment operations
  uploadAttachment: async (paymentId: number, file: File): Promise<OwnerPaymentAttachment> => {
    const token = (await import('./auth')).getAuthToken();
    const baseUrl = (await import('./auth')).getApiUrl();

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${baseUrl}/api/owner-payments/${paymentId}/attachments`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { message: errorData.detail || 'Failed to upload attachment', status: response.status };
    }

    return response.json();
  },

  getAttachmentUrl: (paymentId: number, attachmentId: number): string => {
    const baseUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
      : 'http://localhost:8000';
    return `${baseUrl}/api/owner-payments/${paymentId}/attachments/${attachmentId}/download`;
  },

  deleteAttachment: (paymentId: number, attachmentId: number) =>
    apiRequest<void>(`/api/owner-payments/${paymentId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};

// Property Balance types
export interface PropertyBalanceResponse {
  property_id: number;
  property_address: string;
  property_nickname: string | null;
  pm_expenses: number;  // Expenses paid by Property Management
  owner_expenses: number;  // Expenses paid by Owner
  unpaid_expenses: number;  // Expenses not yet paid
  payments_to_pm: number;  // Payments from owner to PM
  balance_owed: number;  // PM Expenses - Payments to PM
  owner_names: string[];
}

export interface PropertyBalancesSummary {
  properties: PropertyBalanceResponse[];
  total_pm_expenses: number;
  total_owner_expenses: number;
  total_unpaid_expenses: number;
  total_payments_to_pm: number;
  total_balance_owed: number;
}
