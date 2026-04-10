import { Metadata } from 'next';
import UsersView from '@/components/shared/UsersView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Users — SuperAdmin — FlexMarket',
  description: 'Manage all platform users on FlexMarket.',
};

export default async function SuperAdminUsersPage() {
  return <UsersView role="super_admin" apiPath="/superadmin/users" searchable />;
}
