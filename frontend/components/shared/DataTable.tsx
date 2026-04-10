'use client';

import { useState } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: string;
  emptyText?: string;
  keyField?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, loading, emptyIcon = 'fa fa-inbox', emptyText = 'No data found', keyField = 'id',
}: Props<T>) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-5">
        <i className={emptyIcon} style={{ fontSize: 48, color: '#ddd' }}></i>
        <p className="normal_label_font mt-3">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row[keyField])}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
