import { Metadata } from 'next';
import UploadProductView from '@/components/shared/UploadProductView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Upload Product — Seller — FlexMarket',
  description: 'List a new product for sale or rent on FlexMarket.',
};

export default async function SellerUploadProductPage() {
  return <UploadProductView role="seller" apiBasePath="/seller" redirectPath="/seller/my-products" />;
}
