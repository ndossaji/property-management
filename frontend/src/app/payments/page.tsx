'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  paymentsApi, leasesApi, lateFeesApi,
  RentPaymentWithLease, RentPaymentCreate, PaymentMethod, PaymentStatus,
  LeaseWithRelations, LateFeeWithLease
} from '@/lib/api';

const paymentSchema = z.object({
  lease_id: z.coerce.number().min(1, 'Lease is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference_number: z.string().optional().nullable(),
  is_cha_payment: z.boolean().optional(),
  cha_payment_reference: z.string().optional().nullable(),
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
  { value: 'cha_voucher', label: 'CHA Voucher' },
  { value: 'other', label: 'Other' },
];



function PaymentsContent() {
  const router = useRouter();
  const [payments, setPayments] = useState<RentPaymentWithLease[]>([]);
  const [lateFees, setLateFees] = useState<LateFeeWithLease[]>([]);
  const [leases, setLeases] = useState<LeaseWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RentPaymentWithLease | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'late-fees'>('payments');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { is_cha_payment: false },
  });

  const isChaPayment = watch('is_cha_payment');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [paymentsData, lateFeesData, leasesData] = await Promise.all([
        paymentsApi.list(),
        lateFeesApi.list({ is_paid: false }),
        leasesApi.list({ status: 'active' }),
      ]);
      setPayments(paymentsData);
      setLateFees(lateFeesData);
      setLeases(leasesData);
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
      const paymentData: RentPaymentCreate = {
        ...data,
        payment_method: data.payment_method as PaymentMethod,
        status: 'completed' as PaymentStatus,
        reference_number: data.reference_number || null,
        cha_payment_reference: data.is_cha_payment ? data.cha_payment_reference : null,
      };
      if (editingPayment) {
        await paymentsApi.update(editingPayment.id, paymentData);
      } else {
        await paymentsApi.create(paymentData);
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

  const handleEdit = (payment: RentPaymentWithLease) => {
    setEditingPayment(payment);
    reset({
      lease_id: payment.lease_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      is_cha_payment: payment.is_cha_payment,
      cha_payment_reference: payment.cha_payment_reference,
      notes: payment.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      await paymentsApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment');
    }
  };

  const handlePayLateFee = async (id: number) => {
    try {
      await lateFeesApi.markPaid(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark late fee as paid');
    }
  };

  const handleWaiveLateFee = async (id: number) => {
    const reason = prompt('Enter reason for waiving this late fee:');
    if (!reason) return;
    try {
      await lateFeesApi.waive(id, reason);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to waive late fee');
    }
  };

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
              <button onClick={() => router.push('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
            </div>
            <button onClick={() => { setEditingPayment(null); reset({ is_cha_payment: false }); setShowForm(true); }}
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

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('payments')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              Payments
            </button>
            <button onClick={() => setActiveTab('late-fees')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'late-fees' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              Outstanding Late Fees ({lateFees.length})
            </button>
          </nav>
        </div>

        {activeTab === 'payments' && (
          <PaymentsList payments={payments} onEdit={handleEdit} onDelete={handleDelete} />
        )}

        {activeTab === 'late-fees' && (
          <LateFeesList lateFees={lateFees} onPay={handlePayLateFee} onWaive={handleWaiveLateFee} />
        )}

        {showForm && (
          <PaymentFormModal
            editingPayment={editingPayment}
            leases={leases}
            isChaPayment={isChaPayment || false}
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
  editingPayment: RentPaymentWithLease | null;
  leases: LeaseWithRelations[];
  isChaPayment: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
}

function PaymentFormModal({ editingPayment, leases, isChaPayment, onSubmit, onCancel, register, errors, isSubmitting }: PaymentFormModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingPayment ? 'Edit Payment' : 'Record Payment'}</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lease *</label>
                <select {...register('lease_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Lease</option>
                  {leases.map((l) => <option key={l.id} value={l.id}>{l.tenant?.full_name} - {l.property?.full_address} (${l.monthly_rent}/mo)</option>)}
                </select>
                {errors.lease_id && <p className="mt-1 text-sm text-red-600">{errors.lease_id.message}</p>}
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference #</label>
                <input type="text" {...register('reference_number')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            <div className="flex items-center">
              <input type="checkbox" {...register('is_cha_payment')} className="h-4 w-4 text-indigo-600 rounded" />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">CHA / Section 8 Payment</label>
            </div>
            {isChaPayment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CHA Reference #</label>
                <input type="text" {...register('cha_payment_reference')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
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
              {isSubmitting ? 'Saving...' : editingPayment ? 'Update' : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentsList({ payments, onEdit, onDelete }: { payments: RentPaymentWithLease[]; onEdit: (p: RentPaymentWithLease) => void; onDelete: (id: number) => void }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No payments</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Record a payment to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tenant / Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Method</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.lease?.tenant?.full_name || 'Unknown'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{payment.lease?.property?.full_address || 'Unknown'}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{payment.payment_date}</td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">${payment.amount.toLocaleString()}</div>
                {payment.is_cha_payment && <span className="text-xs text-blue-600 dark:text-blue-400">CHA</span>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{payment.payment_method}</td>
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

function LateFeesList({ lateFees, onPay, onWaive }: { lateFees: LateFeeWithLease[]; onPay: (id: number) => void; onWaive: (id: number) => void }) {
  if (lateFees.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No outstanding late fees</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">All late fees have been paid or waived.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tenant / Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fee Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">For Period</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {lateFees.map((fee) => (
            <tr key={fee.id}>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{fee.lease?.tenant?.full_name || 'Unknown'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{fee.lease?.property?.full_address || 'Unknown'}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{fee.fee_date}</td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{fee.for_period_start} to {fee.for_period_end}</td>
              <td className="px-6 py-4 text-sm font-medium text-red-600 dark:text-red-400">${fee.amount.toLocaleString()}</td>
              <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                <button onClick={() => onPay(fee.id)} className="text-green-600 hover:text-green-900 dark:text-green-400">Mark Paid</button>
                <button onClick={() => onWaive(fee.id)} className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400">Waive</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <ProtectedRoute>
      <PaymentsContent />
    </ProtectedRoute>
  );
}

