'use client';

import { useState, useEffect } from 'react';
import { customFieldsApi, CustomField, CustomFieldType, CustomFieldOption } from '@/lib/api';

interface CustomFieldsManagerProps {
  entityType: 'expense' | 'property';
  onClose: () => void;
  onSave: () => void;
}

export default function CustomFieldsManager({ entityType, onClose, onSave }: CustomFieldsManagerProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadFields();
  }, [entityType]);

  const loadFields = async () => {
    try {
      setIsLoading(true);
      const data = await customFieldsApi.list(entityType);
      setFields(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load custom fields');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom field?')) return;
    try {
      await customFieldsApi.delete(id);
      loadFields();
    } catch (err: any) {
      alert(err.message || 'Failed to delete custom field');
    }
  };

  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Customize {entityType === 'expense' ? 'Expense' : 'Property'} Form
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Custom Field
                </button>
              </div>

              {showAddForm && (
                <CustomFieldForm
                  entityType={entityType}
                  onCancel={() => setShowAddForm(false)}
                  onSave={() => {
                    setShowAddForm(false);
                    loadFields();
                  }}
                />
              )}

              {editingField && (
                <CustomFieldForm
                  entityType={entityType}
                  field={editingField}
                  onCancel={() => setEditingField(null)}
                  onSave={() => {
                    setEditingField(null);
                    loadFields();
                  }}
                />
              )}

              <div className="space-y-2">
                {fields.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No custom fields yet. Add one to get started.
                  </p>
                ) : (
                  fields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {field.name}
                          {field.is_required && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Type: {field.field_type}
                          {field.options.length > 0 && ` (${field.options.length} options)`}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingField(field)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(field.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom Field Form Component
interface CustomFieldFormProps {
  entityType: 'expense' | 'property';
  field?: CustomField;
  onCancel: () => void;
  onSave: () => void;
}

function CustomFieldForm({ entityType, field, onCancel, onSave }: CustomFieldFormProps) {
  const [name, setName] = useState(field?.name || '');
  const [fieldType, setFieldType] = useState<CustomFieldType>(field?.field_type || 'text');
  const [isRequired, setIsRequired] = useState(field?.is_required || false);
  const [options, setOptions] = useState<Omit<CustomFieldOption, 'id'>[]>(
    field?.options || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    setOptions([...options, { value: '', label: '', display_order: options.length }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, key: 'value' | 'label', value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [key]: value };
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        name,
        field_type: fieldType,
        entity_type: entityType,
        is_required: isRequired,
        display_order: field?.display_order || 0,
        options: fieldType === 'dropdown' ? options : [],
      };

      if (field) {
        await customFieldsApi.update(field.id, data);
      } else {
        await customFieldsApi.create(data);
      }

      onSave();
    } catch (err: any) {
      alert(err.message || 'Failed to save custom field');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
      <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {field ? 'Edit' : 'Add'} Custom Field
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Field Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            placeholder="e.g., Project Code, Building Name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Field Type *
            </label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              disabled={!!field}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="dropdown">Dropdown</option>
              <option value="date">Date</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required field</span>
            </label>
          </div>
        </div>

        {fieldType === 'dropdown' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dropdown Options
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option.value}
                    onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    placeholder="Label"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                + Add Option
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Field'}
          </button>
        </div>
      </form>
    </div>
  );
}

