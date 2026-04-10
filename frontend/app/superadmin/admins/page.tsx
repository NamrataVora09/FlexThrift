import { Metadata } from 'next';
import AdminsClient from './AdminsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Manage Admins — SuperAdmin — FlexMarket',
  description: 'Manage admin accounts, permissions, and roles on FlexMarket.',
};

export default async function AdminsPage() {
  return <AdminsClient />;
}
