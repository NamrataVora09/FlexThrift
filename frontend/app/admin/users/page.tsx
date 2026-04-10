import { Metadata } from 'next';
import UsersView from '@/components/shared/UsersView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Users — Admin — FlexMarket',
  description: 'Manage platform users on FlexMarket.',
};

export default async function AdminUsersPage() {
  return <UsersView role="admin" apiPath="/admin/users" />;
}
