import { Metadata } from 'next';
import UploadProductView from '@/components/shared/UploadProductView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Upload Product — SuperAdmin — FlexMarket',
  description: 'Upload a new product to the FlexMarket platform.',
};

export default async function SuperAdminUploadProductPage() {
  return <UploadProductView role="super_admin" apiBasePath="/seller" redirectPath="/superadmin/my-products" />;
}
