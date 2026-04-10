import { Metadata } from 'next';
import AdminDashboardClient from './AdminDashboardClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Admin Dashboard — FlexMarket',
  description: 'Platform administration dashboard for FlexMarket.',
};

export default async function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
