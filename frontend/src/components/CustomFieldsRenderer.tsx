'use client';

import { CustomField } from '@/lib/api';

interface CustomFieldsRendererProps {
  fields: CustomField[];
  values: Record<number, string>;
  onChange: (fieldId: number, value: string) => void;
  errors?: Record<number, string>;
}

export default function CustomFieldsRenderer({
  fields,
  values,
  onChange,
  errors = {},
}: CustomFieldsRendererProps) {
  if (fields.length === 0) return null;

  const renderField = (field: CustomField) => {
    const value = values[field.id] || '';
    const error = errors[field.id];

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.is_required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.is_required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.is_required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        );

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.is_required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          >
            <option value="">Select an option</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center mt-1">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => onChange(field.id, e.target.checked ? 'true' : 'false')}
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              {field.is_required && '(Required)'}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Additional Fields
      </h3>
      {fields.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.name}
            {field.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field)}
          {errors[field.id] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[field.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

