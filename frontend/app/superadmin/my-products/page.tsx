import { Metadata } from 'next';
import MyProductsView from '@/components/shared/MyProductsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'My Products — SuperAdmin — FlexMarket',
  description: 'Manage superadmin-created products on FlexMarket.',
};

export default async function SuperAdminMyProductsPage() {
  return <MyProductsView role="super_admin" apiPath="/seller/my-products" uploadPath="/superadmin/upload-product" />;
}
