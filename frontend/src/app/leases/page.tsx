'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  leasesApi, tenantsApi, propertiesApi,
  LeaseWithRelations, LeaseCreate, LeaseStatus,
  TenantWithVoucher, Property
} from '@/lib/api';

const leaseSchema = z.object({
  tenant_id: z.coerce.number().min(1, 'Tenant is required'),
  property_id: z.coerce.number().min(1, 'Property is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  monthly_rent: z.coerce.number().min(0, 'Monthly rent must be positive'),
  move_in_date: z.string().optional().nullable(),
  security_deposit: z.coerce.number().optional().nullable(),
  rent_due_day: z.coerce.number().min(1).max(31).optional(),
  grace_period_days: z.coerce.number().min(0).optional(),
  late_fee_amount: z.coerce.number().optional().nullable(),
  is_section_8: z.boolean().optional(),
  cha_portion: z.coerce.number().optional().nullable(),
  tenant_portion: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type LeaseFormData = z.infer<typeof leaseSchema>;

const STATUS_OPTIONS: { value: LeaseStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'expired', label: 'Expired', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'terminated', label: 'Terminated', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'renewed', label: 'Renewed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
];

function LeasesContent() {
  const router = useRouter();
  const [leases, setLeases] = useState<LeaseWithRelations[]>([]);
  const [tenants, setTenants] = useState<TenantWithVoucher[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseWithRelations | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeaseStatus | ''>('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: { rent_due_day: 1, grace_period_days: 5, is_section_8: false },
  });

  const isSection8 = watch('is_section_8');

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [leasesData, tenantsData, propertiesData] = await Promise.all([
        leasesApi.list({ status: filterStatus || undefined }),
        tenantsApi.list({ is_active: true }),
        propertiesApi.list(),
      ]);
      setLeases(leasesData);
      setTenants(tenantsData);
      setProperties(propertiesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LeaseFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const leaseData: LeaseCreate = {
        ...data,
        move_in_date: data.move_in_date || null,
        security_deposit: data.security_deposit || null,
        late_fee_amount: data.late_fee_amount || null,
        cha_portion: data.is_section_8 ? data.cha_portion : null,
        tenant_portion: data.is_section_8 ? data.tenant_portion : null,
      };
      if (editingLease) {
        await leasesApi.update(editingLease.id, leaseData);
      } else {
        await leasesApi.create(leaseData);
      }
      reset();
      setShowForm(false);
      setEditingLease(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save lease');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (lease: LeaseWithRelations) => {
    setEditingLease(lease);
    reset({
      tenant_id: lease.tenant_id,
      property_id: lease.property_id,
      start_date: lease.start_date,
      end_date: lease.end_date,
      monthly_rent: lease.monthly_rent,
      move_in_date: lease.move_in_date,
      security_deposit: lease.security_deposit,
      rent_due_day: lease.rent_due_day,
      grace_period_days: lease.grace_period_days,
      late_fee_amount: lease.late_fee_amount,
      is_section_8: lease.is_section_8,
      cha_portion: lease.cha_portion,
      tenant_portion: lease.tenant_portion,
      notes: lease.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lease?')) return;
    try {
      await leasesApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lease');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await leasesApi.activate(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to activate lease');
    }
  };

  const handleTerminate = async (id: number) => {
    if (!confirm('Are you sure you want to terminate this lease?')) return;
    try {
      await leasesApi.terminate(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate lease');
    }
  };

  if (isLoading && leases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button onClick={() => router.push('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Leases</h1>
            </div>
            <button onClick={() => { setEditingLease(null); reset({ rent_due_day: 1, grace_period_days: 5, is_section_8: false }); setShowForm(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Lease
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

        <div className="mb-6">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LeaseStatus | '')}
            className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {showForm && (
          <LeaseFormModal
            editingLease={editingLease}
            tenants={tenants}
            properties={properties}
            isSection8={isSection8 || false}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={() => { setShowForm(false); setEditingLease(null); }}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
          />
        )}

        <LeasesList
          leases={leases}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onActivate={handleActivate}
          onTerminate={handleTerminate}
        />
      </main>
    </div>
  );
}

interface LeaseFormModalProps {
  editingLease: LeaseWithRelations | null;
  tenants: TenantWithVoucher[];
  properties: Property[];
  isSection8: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
}

function LeaseFormModal({ editingLease, tenants, properties, isSection8, onSubmit, onCancel, register, errors, isSubmitting }: LeaseFormModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingLease ? 'Edit Lease' : 'Add New Lease'}</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tenant *</label>
                <select {...register('tenant_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Tenant</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                {errors.tenant_id && <p className="mt-1 text-sm text-red-600">{errors.tenant_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Property *</label>
                <select {...register('property_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Property</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.full_address}</option>)}
                </select>
                {errors.property_id && <p className="mt-1 text-sm text-red-600">{errors.property_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date *</label>
                <input type="date" {...register('start_date')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date *</label>
                <input type="date" {...register('end_date')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Rent *</label>
                <input type="number" step="0.01" {...register('monthly_rent')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {errors.monthly_rent && <p className="mt-1 text-sm text-red-600">{errors.monthly_rent.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Security Deposit</label>
                <input type="number" step="0.01" {...register('security_deposit')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rent Due Day</label>
                <input type="number" min="1" max="31" {...register('rent_due_day')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grace Period (days)</label>
                <input type="number" min="0" {...register('grace_period_days')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            <div className="flex items-center">
              <input type="checkbox" {...register('is_section_8')} className="h-4 w-4 text-indigo-600 rounded" />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">Section 8 / CHA Lease</label>
            </div>
            {isSection8 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CHA Portion</label>
                  <input type="number" step="0.01" {...register('cha_portion')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tenant Portion</label>
                  <input type="number" step="0.01" {...register('tenant_portion')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea {...register('notes')} rows={2} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : editingLease ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LeasesListProps {
  leases: LeaseWithRelations[];
  onEdit: (lease: LeaseWithRelations) => void;
  onDelete: (id: number) => void;
  onActivate: (id: number) => void;
  onTerminate: (id: number) => void;
}

function LeasesList({ leases, onEdit, onDelete, onActivate, onTerminate }: LeasesListProps) {
  if (leases.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No leases</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new lease.</p>
      </div>
    );
  }

  const getStatusStyle = (status: LeaseStatus) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return opt?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tenant / Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Term</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rent</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {leases.map((lease) => (
            <tr key={lease.id}>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{lease.tenant?.full_name || 'Unknown'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{lease.property?.full_address || 'Unknown'}</div>
                {lease.is_section_8 && <span className="text-xs text-blue-600 dark:text-blue-400">Section 8</span>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-100">{lease.start_date} to {lease.end_date}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-100">${lease.monthly_rent.toLocaleString()}/mo</div>
                {lease.is_section_8 && lease.cha_portion && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">CHA: ${lease.cha_portion} / Tenant: ${lease.tenant_portion}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(lease.status)}`}>
                  {lease.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                {lease.status === 'draft' && (
                  <button onClick={() => onActivate(lease.id)} className="text-green-600 hover:text-green-900 dark:text-green-400">Activate</button>
                )}
                {lease.status === 'active' && (
                  <button onClick={() => onTerminate(lease.id)} className="text-orange-600 hover:text-orange-900 dark:text-orange-400">Terminate</button>
                )}
                <button onClick={() => onEdit(lease)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">Edit</button>
                <button onClick={() => onDelete(lease.id)} className="text-red-600 hover:text-red-900 dark:text-red-400">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeasesPage() {
  return (
    <ProtectedRoute>
      <LeasesContent />
    </ProtectedRoute>
  );
}

