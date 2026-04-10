import { Metadata } from 'next';
import AdminAllOffersClient from './AdminAllOffersClient';

export const metadata: Metadata = {
  title: 'All Offers On Platform — Admin — FlexMarket',
  description: 'View every offer made across the entire platform.',
};

export default function AdminAllOffersPage() {
  return <AdminAllOffersClient />;
}
