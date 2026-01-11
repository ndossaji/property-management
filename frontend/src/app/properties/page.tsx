'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { propertiesApi, ownersApi, customFieldsApi, Owner, Property, PropertyType, PropertyStatus, CustomField } from '@/lib/api';
import CustomFieldsManager from '@/components/CustomFieldsManager';
import CustomFieldsRenderer from '@/components/CustomFieldsRenderer';

const propertySchema = z.object({
  street_address: z.string().min(1, 'Street address is required'),
  unit_number: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip_code: z.string().min(1, 'ZIP code is required'),
  country: z.string().default('USA'),
  nickname: z.string().optional().nullable(),
  property_type: z.enum(['single_family', 'multi_family', 'condo', 'townhouse', 'apartment', 'commercial', 'land', 'other']),
  status: z.enum(['active', 'inactive', 'maintenance', 'sold']),
  notes: z.string().optional().nullable(),
  owner_id: z.number().optional().nullable(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'sold', label: 'Sold' },
];

function PropertiesContent() {
  const router = useRouter();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCustomizeForm, setShowCustomizeForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      property_type: 'single_family',
      status: 'active',
      country: 'USA',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ownersData, propertiesData, customFieldsData] = await Promise.all([
        ownersApi.list(),
        propertiesApi.list(),
        customFieldsApi.list('property'),
      ]);
      setOwners(ownersData);
      setProperties(propertiesData);
      setCustomFields(customFieldsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const propertyData = {
        ...data,
        owner_id: data.owner_id || null,
        custom_fields: customFieldValues,
      };

      if (editingProperty) {
        await propertiesApi.update(editingProperty.id, propertyData as any);
      } else {
        await propertiesApi.create(propertyData as any);
      }
      reset();
      setCustomFieldValues({});
      setShowForm(false);
      setEditingProperty(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    reset({
      street_address: property.street_address,
      unit_number: property.unit_number,
      city: property.city,
      state: property.state,
      zip_code: property.zip_code,
      country: property.country,
      nickname: property.nickname,
      property_type: property.property_type,
      status: property.status,
      notes: property.notes,
      owner_id: property.owner_id,
    });
    // Load custom field values
    setCustomFieldValues(property.custom_fields || {});
    setShowForm(true);
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Properties</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCustomizeForm(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Customize Form
              </button>
              <button
                onClick={() => { setEditingProperty(null); reset({ property_type: 'single_family', status: 'active', country: 'USA' }); setCustomFieldValues({}); setShowForm(true); }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Property
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

        {/* Customize Form Modal */}
        {showCustomizeForm && (
          <CustomFieldsManager
            entityType="property"
            onClose={() => setShowCustomizeForm(false)}
            onSave={() => {
              setShowCustomizeForm(false);
              loadData();
            }}
          />
        )}

        {/* Property Form Modal */}
        {showForm && (
          <PropertyForm
            editingProperty={editingProperty}
            owners={owners}
            customFields={customFields}
            customFieldValues={customFieldValues}
            onCustomFieldChange={(fieldId, value) => {
              setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
            }}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={() => {
              setShowForm(false);
              setEditingProperty(null);
              reset();
              setCustomFieldValues({});
            }}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Properties List */}
        <PropertyList properties={properties} onEdit={handleEdit} onRefresh={loadData} />
      </main>
    </div>
  );
}

// Property Form Component
interface PropertyFormProps {
  editingProperty: Property | null;
  owners: Owner[];
  customFields: CustomField[];
  customFieldValues: Record<number, string>;
  onCustomFieldChange: (fieldId: number, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
}

function PropertyForm({ editingProperty, owners, customFields, customFieldValues, onCustomFieldChange, onSubmit, onCancel, register, errors, isSubmitting }: PropertyFormProps) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingProperty ? 'Edit Property' : 'Add New Property'}</h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Owner Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Owner</label>
              <select {...register('owner_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white">
                <option value="">No Owner</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.name}</option>
                ))}
              </select>
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nickname (Optional)</label>
              <input type="text" {...register('nickname')} placeholder="e.g., Beach House, Main Street Rental" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Street Address *</label>
                <input type="text" {...register('street_address')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
                {errors.street_address && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.street_address.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Number</label>
                <input type="text" {...register('unit_number')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City *</label>
                <input type="text" {...register('city')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
                {errors.city && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State *</label>
                <input type="text" {...register('state')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
                {errors.state && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.state.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ZIP Code *</label>
                <input type="text" {...register('zip_code')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
                {errors.zip_code && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.zip_code.message}</p>}
              </div>
            </div>

            {/* Property Type and Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Property Type</label>
                <select {...register('property_type')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white">
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select {...register('status')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white">
                  {PROPERTY_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea {...register('notes')} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white" />
            </div>

            {/* Custom Fields */}
            <CustomFieldsRenderer
              fields={customFields}
              values={customFieldValues}
              onChange={onCustomFieldChange}
            />
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : editingProperty ? 'Update Property' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Property List Component
interface PropertyListProps {
  properties: Property[];
  onEdit: (property: Property) => void;
  onRefresh: () => void;
}

function PropertyList({ properties, onEdit, onRefresh }: PropertyListProps) {
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      await propertiesApi.delete(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete property');
    }
  };

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No properties</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new property.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Property</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Owner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {properties.map((property) => (
            <tr key={property.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{property.nickname || property.street_address}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{property.full_address}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {property.owner?.name || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {PROPERTY_TYPES.find(t => t.value === property.property_type)?.label || property.property_type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  property.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                  property.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                  property.status === 'sold' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                  {PROPERTY_STATUSES.find(s => s.value === property.status)?.label || property.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                <button type="button" onClick={() => onEdit(property)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</button>
                <button type="button" onClick={() => handleDelete(property.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <ProtectedRoute>
      <PropertiesContent />
    </ProtectedRoute>
  );
}

