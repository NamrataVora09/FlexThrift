import { Metadata } from 'next';
import OffersView from '@/components/shared/OffersView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Offers — Seller — FlexMarket',
  description: 'Manage incoming offers from buyers on FlexMarket.',
};

export default async function SellerOffersPage() {
  return <OffersView role="seller" apiPath="/seller/offers" perspective="seller" />;
}
