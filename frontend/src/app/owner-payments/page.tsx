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
  Owner, Property, PropertyBalancesSummary, PropertyBalanceResponse
} from '@/lib/api';

const paymentSchema = z.object({
  owner_id: z.coerce.number().min(1, 'Owner is required'),
  property_id: z.coerce.number().min(1, 'Property is required'),
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

function PropertyBalancesContent() {
  const router = useRouter();
  const [balances, setBalances] = useState<PropertyBalancesSummary | null>(null);
  const [allBalances, setAllBalances] = useState<PropertyBalancesSummary | null>(null);
  const [payments, setPayments] = useState<OwnerPaymentWithDetails[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<OwnerPaymentWithDetails | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'balances' | 'payments'>('balances');
  const [filterPropertyIds, setFilterPropertyIds] = useState<number[]>([]);
  const [filterOwnerIds, setFilterOwnerIds] = useState<number[]>([]);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  // Filter balances client-side based on selected filters
  useEffect(() => {
    if (!allBalances) return;

    let filteredProperties = allBalances.properties;

    if (filterPropertyIds.length > 0) {
      filteredProperties = filteredProperties.filter(b => filterPropertyIds.includes(b.property_id));
    }

    if (filterOwnerIds.length > 0) {
      // Get property IDs for selected owners
      const ownerPropertyIds = properties
        .filter(p => p.owners?.some(o => filterOwnerIds.includes(o.id)))
        .map(p => p.id);
      filteredProperties = filteredProperties.filter(b => ownerPropertyIds.includes(b.property_id));
    }

    // Recalculate totals based on filtered properties
    const total_expenses = filteredProperties.reduce((sum, p) => sum + p.total_expenses, 0);
    const total_payments = filteredProperties.reduce((sum, p) => sum + p.total_payments, 0);
    const total_balance_owed = filteredProperties.reduce((sum, p) => sum + p.balance_owed, 0);

    setBalances({
      properties: filteredProperties,
      total_expenses,
      total_payments,
      total_balance_owed,
    });
  }, [filterPropertyIds, filterOwnerIds, allBalances, properties]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [balancesData, paymentsData, ownersData, propertiesData] = await Promise.all([
        ownerPaymentsApi.getPropertyBalances(),
        ownerPaymentsApi.list(),
        ownersApi.list(),
        propertiesApi.list(),
      ]);
      setAllBalances(balancesData);
      setBalances(balancesData);
      setPayments(paymentsData);
      setOwners(ownersData);
      setProperties(propertiesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePropertyFilter = (propertyId: number) => {
    setFilterPropertyIds(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleOwnerFilter = (ownerId: number) => {
    setFilterOwnerIds(prev =>
      prev.includes(ownerId)
        ? prev.filter(id => id !== ownerId)
        : [...prev, ownerId]
    );
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const paymentData: OwnerPaymentCreate = {
        ...data,
        payment_method: data.payment_method as PaymentMethod,
        property_id: data.property_id,
        reference_number: data.reference_number || null,
        description: data.description || null,
        notes: data.notes || null,
      };
      if (editingPayment) {
        await ownerPaymentsApi.update(editingPayment.id, paymentData);
      } else {
        await ownerPaymentsApi.create(paymentData);
      }
      reset({ payment_date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      setEditingPayment(null);
      setSelectedPropertyId(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPaymentForProperty = (propertyId: number) => {
    setEditingPayment(null);
    const property = properties.find(p => p.id === propertyId);
    const propertyOwners = property?.owners || [];
    reset({
      property_id: propertyId,
      owner_id: propertyOwners.length === 1 ? propertyOwners[0].id : undefined,
      payment_date: new Date().toISOString().split('T')[0],
    });
    setSelectedPropertyId(propertyId);
    setShowForm(true);
  };

  const handleEdit = (payment: OwnerPaymentWithDetails) => {
    setEditingPayment(payment);
    reset({
      owner_id: payment.owner_id,
      property_id: payment.property_id || undefined,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      description: payment.description,
      notes: payment.notes,
    });
    setSelectedPropertyId(payment.property_id);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (isLoading) {
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
              <button onClick={() => router.push('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Property Balances</h1>
            </div>
            <button onClick={() => { setEditingPayment(null); setSelectedPropertyId(null); reset({ payment_date: new Date().toISOString().split('T')[0] }); setShowForm(true); }}
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

        {/* Summary Cards */}
        {balances && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(balances.total_expenses)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments Received</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(balances.total_payments)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Balance Owed</p>
              <p className={`text-2xl font-bold ${balances.total_balance_owed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(balances.total_balance_owed)}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('balances')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'balances' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Property Balances
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Payment History
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Property {filterPropertyIds.length > 0 && `(${filterPropertyIds.length})`}
            </label>
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto w-64">
              {properties.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No properties</p>
              ) : (
                <div className="space-y-2">
                  {properties.map((property) => (
                    <label key={property.id} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterPropertyIds.includes(property.id)}
                        onChange={() => togglePropertyFilter(property.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                        {property.nickname || property.street_address}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {filterPropertyIds.length > 0 && (
              <button
                onClick={() => setFilterPropertyIds([])}
                className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Owner {filterOwnerIds.length > 0 && `(${filterOwnerIds.length})`}
            </label>
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto w-64">
              {owners.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No owners</p>
              ) : (
                <div className="space-y-2">
                  {owners.map((owner) => (
                    <label key={owner.id} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterOwnerIds.includes(owner.id)}
                        onChange={() => toggleOwnerFilter(owner.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                        {owner.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {filterOwnerIds.length > 0 && (
              <button
                onClick={() => setFilterOwnerIds([])}
                className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'balances' && balances && (
          <PropertyBalancesList
            balances={balances.properties}
            onAddPayment={handleAddPaymentForProperty}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsList payments={payments} onEdit={handleEdit} onDelete={handleDelete} />
        )}

        {/* Form Modal */}
        {showForm && (
          <PaymentFormModal
            editingPayment={editingPayment}
            owners={owners}
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={() => { setShowForm(false); setEditingPayment(null); setSelectedPropertyId(null); }}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
    </div>
  );
}

interface PropertyBalancesListProps {
  balances: PropertyBalanceResponse[];
  onAddPayment: (propertyId: number) => void;
  formatCurrency: (amount: number) => string;
}

function PropertyBalancesList({ balances, onAddPayment, formatCurrency }: PropertyBalancesListProps) {
  if (balances.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No properties found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add properties to start tracking balances.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Owner(s)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Expenses</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payments</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Balance Owed</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {balances.map((balance) => (
            <tr key={balance.property_id} className={balance.balance_owed > 0 ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {balance.property_nickname || balance.property_address}
                </div>
                {balance.property_nickname && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{balance.property_address}</div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {balance.owner_names.length > 0 ? balance.owner_names.join(', ') : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(balance.total_expenses)}</td>
              <td className="px-6 py-4 text-sm text-right text-green-600 dark:text-green-400">{formatCurrency(balance.total_payments)}</td>
              <td className={`px-6 py-4 text-sm text-right font-semibold ${balance.balance_owed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(balance.balance_owed)}
              </td>
              <td className="px-6 py-4 text-right">
                {balance.balance_owed > 0 && (
                  <button
                    onClick={() => onAddPayment(balance.property_id)}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Payment
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaymentFormModalProps {
  editingPayment: OwnerPaymentWithDetails | null;
  owners: Owner[];
  properties: Property[];
  selectedPropertyId: number | null;
  onSubmit: () => void;
  onCancel: () => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
}

function PaymentFormModal({ editingPayment, owners, properties, selectedPropertyId, onSubmit, onCancel, register, errors, isSubmitting }: PaymentFormModalProps) {
  const selectedProperty = selectedPropertyId ? properties.find(p => p.id === selectedPropertyId) : null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingPayment ? 'Edit Payment' : 'Record Owner Payment'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedProperty
                ? `Recording payment for: ${selectedProperty.nickname || selectedProperty.full_address}`
                : 'Log a payment received from an owner'}
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Property *</label>
                <select {...register('property_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Property</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.nickname || p.full_address}</option>)}
                </select>
                {errors.property_id && <p className="mt-1 text-sm text-red-600">{errors.property_id.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Owner *</label>
                <select {...register('owner_id')} className="mt-1 block w-full rounded-md border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Owner</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {errors.owner_id && <p className="mt-1 text-sm text-red-600">{errors.owner_id.message}</p>}
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
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No payments recorded</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Record a payment to track what owners have paid.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Owner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Method</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{payment.property?.nickname || payment.property?.full_address || '-'}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.owner?.name || 'Unknown'}</td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{payment.payment_date}</td>
              <td className="px-6 py-4 text-sm text-right font-medium text-green-600 dark:text-green-400">${payment.amount.toLocaleString()}</td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{payment.payment_method.replace('_', ' ')}</td>
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

export default function PropertyBalancesPage() {
  return (
    <ProtectedRoute>
      <PropertyBalancesContent />
    </ProtectedRoute>
  );
}

