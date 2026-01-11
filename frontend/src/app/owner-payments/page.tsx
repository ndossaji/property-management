'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  ownerPaymentsApi, ownersApi, propertiesApi,
  OwnerPaymentWithDetails, OwnerPaymentCreate, PaymentMethod,
  Owner, Property
} from '@/lib/api';

const paymentSchema = z.object({
  owner_id: z.coerce.number().min(1, 'Owner is required'),
  property_id: z.coerce.number().optional().nullable(),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference_number: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'money_order', label: 'Money Order' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'other', label: 'Other' },
];

function OwnerPaymentsContent() {
  const router = useRouter();
  const [payments, setPayments] = useState<OwnerPaymentWithDetails[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<OwnerPaymentWithDetails | null>(null);
  const [filterOwner, setFilterOwner] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  useEffect(() => {
    loadData();
  }, [filterOwner]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [paymentsData, ownersData, propertiesData] = await Promise.all([
        ownerPaymentsApi.list(filterOwner ? { owner_id: filterOwner } : undefined),
        ownersApi.list(),
        propertiesApi.list(),
      ]);
      setPayments(paymentsData);
      setOwners(ownersData);
      setProperties(propertiesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const paymentData: OwnerPaymentCreate = {
        ...data,
        payment_method: data.payment_method as PaymentMethod,
        property_id: data.property_id || null,
        reference_number: data.reference_number || null,
        description: data.description || null,
        notes: data.notes || null,
      };
      if (editingPayment) {
        await ownerPaymentsApi.update(editingPayment.id, paymentData);
      } else {
        await ownerPaymentsApi.create(paymentData);
      }
      reset();
      setShowForm(false);
      setEditingPayment(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (payment: OwnerPaymentWithDetails) => {
    setEditingPayment(payment);
    reset({
      owner_id: payment.owner_id,
      property_id: payment.property_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      description: payment.description,
      notes: payment.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      await ownerPaymentsApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment');
    }
  };

  // Calculate totals
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  if (isLoading && payments.length === 0) {
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
              <button onClick={() => router.push('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-700">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Owner Payments</h1>
            </div>
            <button onClick={() => { setEditingPayment(null); reset({}); setShowForm(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record Payment
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

        {/* Summary Card */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments Received from Owners</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={filterOwner || ''}
                onChange={(e) => setFilterOwner(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Owners</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <PaymentsList payments={payments} onEdit={handleEdit} onDelete={handleDelete} />

        {/* Form Modal */}
        {showForm && (
          <PaymentFormModal
            editingPayment={editingPayment}
            owners={owners}
            properties={properties}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={() => { setShowForm(false); setEditingPayment(null); }}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
    </div>
  );
}

interface PaymentFormModalProps {
  editingPayment: OwnerPaymentWithDetails | null;
  owners: Owner[];
  properties: Property[];
  onSubmit: () => void;
  onCancel: () => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
}

function PaymentFormModal({ editingPayment, owners, properties, onSubmit, onCancel, register, errors, isSubmitting }: PaymentFormModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingPayment ? 'Edit Payment' : 'Record Owner Payment'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Log a payment received from an owner to reimburse expenses</p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Owner *</label>
                <select {...register('owner_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Owner</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {errors.owner_id && <p className="mt-1 text-sm text-red-600">{errors.owner_id.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Property (Optional)</label>
                <select {...register('property_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">No specific property</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.full_address}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount *</label>
                <input type="number" step="0.01" {...register('amount')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date *</label>
                <input type="date" {...register('payment_date')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {errors.payment_date && <p className="mt-1 text-sm text-red-600">{errors.payment_date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method *</label>
                <select {...register('payment_method')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Method</option>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {errors.payment_method && <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference #</label>
                <input type="text" {...register('reference_number')} placeholder="Check number, transaction ID" className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <input type="text" {...register('description')} placeholder="What is this payment for?" className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea {...register('notes')} rows={2} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : editingPayment ? 'Update' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentsList({ payments, onEdit, onDelete }: { payments: OwnerPaymentWithDetails[]; onEdit: (p: OwnerPaymentWithDetails) => void; onDelete: (id: number) => void }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No owner payments</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Record a payment to track reimbursements from owners.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Owner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Method</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{payment.owner?.name || 'Unknown'}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.property?.full_address || '-'}</td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{payment.payment_date}</td>
              <td className="px-6 py-4 text-sm font-medium text-green-600 dark:text-green-400">${payment.amount.toLocaleString()}</td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{payment.payment_method}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{payment.description || '-'}</td>
              <td className="px-6 py-4 text-right text-sm font-medium">
                <button onClick={() => onEdit(payment)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 mr-3">Edit</button>
                <button onClick={() => onDelete(payment.id)} className="text-red-600 hover:text-red-900 dark:text-red-400">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OwnerPaymentsPage() {
  return (
    <ProtectedRoute>
      <OwnerPaymentsContent />
    </ProtectedRoute>
  );
}

