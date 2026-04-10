import { Metadata } from 'next';
import SuperAdminPersonalOffersClient from './SuperAdminPersonalOffersClient';

export const metadata: Metadata = {
  title: 'My Offers — SuperAdmin — FlexMarket',
  description: 'Manage your personal sent and received offers.',
};

export default function SuperAdminPersonalOffersPage() {
  return <SuperAdminPersonalOffersClient />;
}
