import { Metadata } from 'next';
import OffersClient from './OffersClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'All Offers — SuperAdmin — FlexMarket',
  description: 'View and manage all platform offers on FlexMarket.',
};

export default async function AllOffersPage() {
  return <OffersClient />;
}
