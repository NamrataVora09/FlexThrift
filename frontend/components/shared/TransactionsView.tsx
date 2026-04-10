'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column } from './DataTable';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface Transaction { id: number; type: string; amount: string; description: string; status: string; created_at: string; }

interface Props {
  role: string;
  apiPath: string;
}

const columns: Column<Transaction>[] = [
  { key: 'id', label: '#', render: (r) => <span className="normal_label_font">#{r.id}</span> },
  { key: 'type', label: 'Type', render: (r) => <span className="type-badge sell">{r.type}</span> },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', render: (r) => <span className="fw-bold">₹{r.amount}</span> },
  { key: 'status', label: 'Status', render: (r) => <span className={`status-badge ${r.status}`}>{r.status}</span> },
  { key: 'created_at', label: 'Date', render: (r) => <span className="normal_label_font">{new Date(r.created_at).toLocaleDateString('en-IN')}</span> },
];

export default function TransactionsView({ role, apiPath }: Props) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Transaction[]>(apiPath).then((r) => {
      if (r.success && r.data) setItems(r.data);
      setLoading(false);
    });
  }, [apiPath]);

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title="Transactions" />
        <div className="card">
          <div className="card-body">
            <DataTable columns={columns} data={items} loading={loading} emptyIcon="fa fa-receipt" emptyText="No transactions yet" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
