import { Metadata } from 'next';
import UploadProductView from '@/components/shared/UploadProductView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Upload Product — Admin — FlexMarket',
  description: 'Upload a new product to the FlexMarket platform.',
};

export default async function AdminUploadProductPage() {
  return <UploadProductView role="admin" apiBasePath="/seller" redirectPath="/admin/my-products" />;
}
