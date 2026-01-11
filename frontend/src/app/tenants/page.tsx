'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { tenantsApi, propertiesApi, TenantWithVoucher, TenantCreate, CHAVoucherCreate, CHAVoucherStatus, Property } from '@/lib/api';

const tenantSchema = z.object({
  property_id: z.coerce.number().optional().nullable(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  alternate_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  ssn_last_four: z.string().max(4).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  employer: z.string().optional().nullable(),
  employer_phone: z.string().optional().nullable(),
  monthly_income: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type TenantFormData = z.infer<typeof tenantSchema>;

const VOUCHER_STATUSES: { value: CHAVoucherStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'expired', label: 'Expired' },
];

function TenantsContent() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantWithVoucher[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithVoucher | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState<TenantWithVoucher | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
  });

  useEffect(() => {
    loadData();
  }, [searchTerm, filterActive]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tenantsData, propertiesData] = await Promise.all([
        tenantsApi.list({
          search: searchTerm || undefined,
          is_active: filterActive,
        }),
        propertiesApi.list(),
      ]);
      setTenants(tenantsData);
      setProperties(propertiesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: TenantFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const tenantData: TenantCreate = {
        ...data,
        email: data.email || null,
      };

      if (editingTenant) {
        await tenantsApi.update(editingTenant.id, tenantData);
      } else {
        await tenantsApi.create(tenantData);
      }
      reset();
      setShowForm(false);
      setEditingTenant(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tenant: TenantWithVoucher) => {
    setEditingTenant(tenant);
    reset({
      property_id: tenant.property_id,
      first_name: tenant.first_name,
      last_name: tenant.last_name,
      email: tenant.email,
      phone: tenant.phone,
      alternate_phone: tenant.alternate_phone,
      address: tenant.address,
      ssn_last_four: tenant.ssn_last_four,
      date_of_birth: tenant.date_of_birth,
      emergency_contact_name: tenant.emergency_contact_name,
      emergency_contact_phone: tenant.emergency_contact_phone,
      emergency_contact_relationship: tenant.emergency_contact_relationship,
      employer: tenant.employer,
      employer_phone: tenant.employer_phone,
      monthly_income: tenant.monthly_income,
      notes: tenant.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    try {
      await tenantsApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete tenant');
    }
  };

  if (isLoading && tenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button onClick={() => router.push('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tenants</h1>
            </div>
            <button
              onClick={() => { setEditingTenant(null); reset({}); setShowForm(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Tenant
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
            <button onClick={() => setError(null)} className="float-right">&times;</button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <select
            value={filterActive === undefined ? '' : filterActive.toString()}
            onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">All Tenants</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        {/* Form Modal */}
        {showForm && (
          <TenantFormModal
            editingTenant={editingTenant}
            properties={properties}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={() => { setShowForm(false); setEditingTenant(null); reset({}); }}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Voucher Modal */}
        {showVoucherModal && (
          <VoucherModal
            tenant={showVoucherModal}
            onClose={() => setShowVoucherModal(null)}
            onSave={() => { setShowVoucherModal(null); loadData(); }}
          />
        )}

        {/* Tenants List */}
        <TenantsList
          tenants={tenants}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onManageVoucher={(t) => setShowVoucherModal(t)}
        />
      </main>
    </div>
  );
}

// TenantFormModal Component
interface TenantFormModalProps {
  editingTenant: TenantWithVoucher | null;
  properties: Property[];
  onSubmit: () => void;
  onCancel: () => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
}

function TenantFormModal({ editingTenant, properties, onSubmit, onCancel, register, errors, isSubmitting }: TenantFormModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
            </h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            {/* Property Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Property</label>
              <select {...register('property_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="">Select Property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.full_address}</option>)}
              </select>
            </div>
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name *</label>
                <input type="text" {...register('first_name')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name *</label>
                <input type="text" {...register('last_name')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" {...register('email')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input type="text" {...register('phone')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            {/* Employment */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employer</label>
                <input type="text" {...register('employer')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Income</label>
                <input type="number" step="0.01" {...register('monthly_income')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            {/* Emergency Contact */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact</label>
                <input type="text" {...register('emergency_contact_name')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Phone</label>
                <input type="text" {...register('emergency_contact_phone')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Relationship</label>
                <input type="text" {...register('emergency_contact_relationship')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea {...register('notes')} rows={3} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : editingTenant ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// TenantsList Component
interface TenantsListProps {
  tenants: TenantWithVoucher[];
  onEdit: (tenant: TenantWithVoucher) => void;
  onDelete: (id: number) => void;
  onManageVoucher: (tenant: TenantWithVoucher) => void;
}

function TenantsList({ tenants, onEdit, onDelete, onManageVoucher }: TenantsListProps) {
  if (tenants.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No tenants</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new tenant.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Voucher</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tenant.full_name}</div>
                {tenant.property && <div className="text-sm text-gray-500 dark:text-gray-400">{tenant.property.full_address}</div>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-100">{tenant.email || '-'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{tenant.phone || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tenant.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {tenant.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {tenant.cha_voucher ? (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tenant.cha_voucher.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                    {tenant.cha_voucher.voucher_number}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">No voucher</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => onManageVoucher(tenant)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-3">Voucher</button>
                <button onClick={() => onEdit(tenant)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 mr-3">Edit</button>
                <button onClick={() => onDelete(tenant.id)} className="text-red-600 hover:text-red-900 dark:text-red-400">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// VoucherModal Component
interface VoucherModalProps {
  tenant: TenantWithVoucher;
  onClose: () => void;
  onSave: () => void;
}

function VoucherModal({ tenant, onClose, onSave }: VoucherModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voucherData, setVoucherData] = useState<CHAVoucherCreate>({
    voucher_number: tenant.cha_voucher?.voucher_number || '',
    status: tenant.cha_voucher?.status || 'pending',
    issue_date: tenant.cha_voucher?.issue_date || null,
    expiration_date: tenant.cha_voucher?.expiration_date || null,
    payment_standard: tenant.cha_voucher?.payment_standard || null,
    hap_amount: tenant.cha_voucher?.hap_amount || null,
    tenant_portion: tenant.cha_voucher?.tenant_portion || null,
    cha_case_worker: tenant.cha_voucher?.cha_case_worker || null,
    cha_case_worker_phone: tenant.cha_voucher?.cha_case_worker_phone || null,
    cha_case_worker_email: tenant.cha_voucher?.cha_case_worker_email || null,
    bedroom_size: tenant.cha_voucher?.bedroom_size || null,
    is_portable: tenant.cha_voucher?.is_portable || false,
    notes: tenant.cha_voucher?.notes || null,
  });

  const handleSave = async () => {
    if (!voucherData.voucher_number) {
      setError('Voucher number is required');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      if (tenant.cha_voucher) {
        await tenantsApi.updateVoucher(tenant.id, voucherData);
      } else {
        await tenantsApi.createVoucher(tenant.id, voucherData);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;
    try {
      setIsSubmitting(true);
      await tenantsApi.deleteVoucher(tenant.id);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to delete voucher');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {tenant.cha_voucher ? 'Edit CHA Voucher' : 'Add CHA Voucher'} - {tenant.full_name}
          </h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Voucher Number *</label>
              <input type="text" value={voucherData.voucher_number} onChange={(e) => setVoucherData({ ...voucherData, voucher_number: e.target.value })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={voucherData.status} onChange={(e) => setVoucherData({ ...voucherData, status: e.target.value as CHAVoucherStatus })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                {VOUCHER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Issue Date</label>
              <input type="date" value={voucherData.issue_date || ''} onChange={(e) => setVoucherData({ ...voucherData, issue_date: e.target.value || null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiration Date</label>
              <input type="date" value={voucherData.expiration_date || ''} onChange={(e) => setVoucherData({ ...voucherData, expiration_date: e.target.value || null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Standard</label>
              <input type="number" step="0.01" value={voucherData.payment_standard || ''} onChange={(e) => setVoucherData({ ...voucherData, payment_standard: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">HAP Amount</label>
              <input type="number" step="0.01" value={voucherData.hap_amount || ''} onChange={(e) => setVoucherData({ ...voucherData, hap_amount: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tenant Portion</label>
              <input type="number" step="0.01" value={voucherData.tenant_portion || ''} onChange={(e) => setVoucherData({ ...voucherData, tenant_portion: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bedroom Size</label>
              <input type="number" value={voucherData.bedroom_size || ''} onChange={(e) => setVoucherData({ ...voucherData, bedroom_size: e.target.value ? parseInt(e.target.value) : null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Case Worker</label>
              <input type="text" value={voucherData.cha_case_worker || ''} onChange={(e) => setVoucherData({ ...voucherData, cha_case_worker: e.target.value || null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Case Worker Phone</label>
              <input type="text" value={voucherData.cha_case_worker_phone || ''} onChange={(e) => setVoucherData({ ...voucherData, cha_case_worker_phone: e.target.value || null })} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="is_portable" checked={voucherData.is_portable} onChange={(e) => setVoucherData({ ...voucherData, is_portable: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="is_portable" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Portable Voucher</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea value={voucherData.notes || ''} onChange={(e) => setVoucherData({ ...voucherData, notes: e.target.value || null })} rows={2} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <div>
            {tenant.cha_voucher && (
              <button type="button" onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800">Delete Voucher</button>
            )}
          </div>
          <div className="flex space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  return (
    <ProtectedRoute>
      <TenantsContent />
    </ProtectedRoute>
  );
}

