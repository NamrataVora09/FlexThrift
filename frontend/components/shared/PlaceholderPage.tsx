'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from './PageHeader';

interface Props {
  title: string;
  role: string;
  icon?: string;
}

export default function PlaceholderPage({ title, role, icon = 'bi bi-gear' }: Props) {
  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title={title} />
        <div className="card">
          <div className="card-body text-center py-5">
            <i className={icon} style={{ fontSize: 48, color: '#ddd' }}></i>
            <p className="normal_label_font mt-3">This section is under development</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
