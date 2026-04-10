import { Metadata } from 'next';
import SuperAdminDashboardClient from './SuperAdminDashboardClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'SuperAdmin Dashboard — FlexMarket',
  description: 'Comprehensive platform analytics and management dashboard for FlexMarket.',
};

export default async function SuperAdminDashboardPage() {
  return <SuperAdminDashboardClient />;
}
