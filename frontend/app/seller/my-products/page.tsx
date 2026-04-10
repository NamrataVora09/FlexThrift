import { Metadata } from 'next';
import MyProductsView from '@/components/shared/MyProductsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'My Products — Seller — FlexMarket',
  description: 'View and manage all your listed products on FlexMarket.',
};

export default async function SellerMyProductsPage() {
  return <MyProductsView role="seller" apiPath="/seller/my-products" uploadPath="/seller/upload-product" />;
}
