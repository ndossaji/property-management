'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { expensesApi, propertiesApi, Property, Expense, ExpenseCategory } from '@/lib/api';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.enum(['maintenance', 'repairs', 'utilities', 'insurance', 'taxes', 'mortgage', 'hoa', 'landscaping', 'cleaning', 'supplies', 'legal', 'accounting', 'advertising', 'travel', 'other']),
  expense_date: z.string().min(1, 'Date is required'),
  vendor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  property_id: z.number().min(1, 'Property is required'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'hoa', label: 'HOA' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'legal', label: 'Legal' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

function ExpensesContent() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [filterPropertyId, setFilterPropertyId] = useState<number | undefined>();

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'other',
      expense_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    loadData();
  }, [filterPropertyId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [propertiesData, expensesData] = await Promise.all([
        propertiesApi.list(),
        expensesApi.list({ property_id: filterPropertyId }),
      ]);
      setProperties(propertiesData);
      setExpenses(expensesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await expensesApi.create(data);
      reset();
      setShowForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expensesApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
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
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button onClick={() => router.push('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCsvImport(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import CSV
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Property</label>
          <select
            value={filterPropertyId || ''}
            onChange={(e) => setFilterPropertyId(e.target.value ? parseInt(e.target.value) : undefined)}
            className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white"
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.nickname || property.street_address}
              </option>
            ))}
          </select>
        </div>

        {/* Add Expense Form Modal */}
        {showForm && (
          <ExpenseForm
            properties={properties}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={() => { setShowForm(false); reset(); }}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
            setValue={setValue}
          />
        )}

        {/* CSV Import Modal */}
        {showCsvImport && (
          <CsvImportModal
            onClose={() => setShowCsvImport(false)}
            onSuccess={() => { setShowCsvImport(false); loadData(); }}
          />
        )}

        {/* Receipt View Modal */}
        {selectedExpense && (
          <ReceiptModal
            expense={selectedExpense}
            onClose={() => setSelectedExpense(null)}
            onRefresh={loadData}
          />
        )}

        {/* Expenses List */}
        <ExpenseList
          expenses={expenses}
          properties={properties}
          onDelete={handleDelete}
          onViewReceipts={(expense) => setSelectedExpense(expense)}
        />
      </main>
    </div>
  );
}

// Expense Form Component
interface ExpenseFormProps {
  properties: Property[];
  onSubmit: () => void;
  onCancel: () => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
  setValue: any;
}

function ExpenseForm({ properties, onSubmit, onCancel, register, errors, isSubmitting, setValue }: ExpenseFormProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add New Expense</h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Property Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Property *</label>
              <select {...register('property_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white">
                <option value="">Select a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.nickname || property.street_address} - {property.city}
                  </option>
                ))}
              </select>
              {errors.property_id && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.property_id.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description *</label>
              <input type="text" {...register('description')} placeholder="e.g., Plumbing repair" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
              {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>}
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
                </div>
                {errors.amount && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                <input type="date" {...register('expense_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
                {errors.expense_date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.expense_date.message}</p>}
              </div>
            </div>

            {/* Category and Vendor */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select {...register('category')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor</label>
                <input type="text" {...register('vendor')} placeholder="e.g., ABC Plumbing" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea {...register('notes')} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Expense List Component
interface ExpenseListProps {
  expenses: Expense[];
  properties: Property[];
  onDelete: (id: number) => void;
  onViewReceipts: (expense: Expense) => void;
}

function ExpenseList({ expenses, properties, onDelete, onViewReceipts }: ExpenseListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No expenses</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new expense.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(expense.expense_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.description}</div>
                {expense.vendor && <div className="text-sm text-gray-500 dark:text-gray-400">{expense.vendor}</div>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {expense.property?.nickname || expense.property?.street_address || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(expense.amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button onClick={() => onViewReceipts(expense)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                  Receipts ({expense.receipts?.length || 0})
                </button>
                <button onClick={() => onDelete(expense.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// CSV Import Modal
interface CsvImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CsvImportModal({ onClose, onSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success_count: number; error_count: number; errors: string[] } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await expensesApi.bulkImportCsv(file);
      setResult(res);
      if (res.success_count > 0 && res.error_count === 0) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      setResult({ success_count: 0, error_count: 1, errors: [err.message || 'Failed to import CSV'] });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full m-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import Expenses from CSV</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload a CSV file with the following columns: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">description</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">amount</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">category</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">expense_date</code> (YYYY-MM-DD), <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">property_id</code>, and optionally <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">vendor</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">notes</code>.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {result && (
            <div className={`mt-4 p-3 rounded ${result.error_count > 0 ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-green-50 dark:bg-green-900/30'}`}>
              <p className="font-medium text-sm">{result.success_count} expenses imported successfully.</p>
              {result.error_count > 0 && (
                <>
                  <p className="text-sm text-red-600 dark:text-red-400">{result.error_count} errors occurred:</p>
                  <ul className="text-xs mt-1 max-h-32 overflow-y-auto">
                    {result.errors.slice(0, 10).map((err, i) => <li key={i} className="text-red-600 dark:text-red-400">{err}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">Close</button>
          <button onClick={handleUpload} disabled={!file || isUploading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isUploading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Receipt Modal
interface ReceiptModalProps {
  expense: Expense;
  onClose: () => void;
  onRefresh: () => void;
}

function ReceiptModal({ expense, onClose, onRefresh }: ReceiptModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await expensesApi.uploadReceipt(expense.id, file);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (receiptId: number) => {
    if (!confirm('Delete this receipt?')) return;
    try {
      await expensesApi.deleteReceipt(expense.id, receiptId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete receipt');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Receipts for: {expense.description}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">
          {/* Upload Button */}
          <div className="mb-4">
            <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isUploading ? 'Uploading...' : 'Upload Receipt'}
            </button>
          </div>

          {/* Receipt List */}
          {expense.receipts && expense.receipts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {expense.receipts.map((receipt) => (
                <div key={receipt.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {receipt.content_type?.startsWith('image/') ? (
                    <img src={expensesApi.getReceiptUrl(expense.id, receipt.id)} alt={receipt.original_filename} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-2 text-xs text-gray-500 dark:text-gray-400 truncate">{receipt.original_filename}</div>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <a href={expensesApi.getReceiptUrl(expense.id, receipt.id)} target="_blank" rel="noopener noreferrer" className="p-1 bg-white dark:bg-gray-800 rounded shadow">
                      <svg className="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button onClick={() => handleDelete(receipt.id)} className="p-1 bg-white dark:bg-gray-800 rounded shadow">
                      <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No receipts uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <ExpensesContent />
    </ProtectedRoute>
  );
}

