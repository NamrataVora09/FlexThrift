import { Metadata } from 'next';
import AdminOffersClient from './AdminOffersClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Offers — Admin — FlexMarket',
  description: 'Manage offers on your products on FlexMarket.',
};

export default async function AdminOffersPage() {
  return <AdminOffersClient />;
}

