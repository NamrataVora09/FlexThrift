import { Metadata } from 'next';
import MyProductsView from '@/components/shared/MyProductsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'My Products — Admin — FlexMarket',
  description: 'Manage admin-created products on FlexMarket.',
};

export default async function AdminMyProductsPage() {
  return <MyProductsView role="admin" apiPath="/seller/my-products" uploadPath="/admin/upload-product" />;
}
