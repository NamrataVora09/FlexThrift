import { Metadata } from 'next';
import FeeManagementClient from './FeeManagementClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Fee Management — SuperAdmin — FlexMarket',
  description: 'Configure platform charges and fees on FlexMarket.',
};

export default async function FeeManagementPage() {
  return <FeeManagementClient />;
}
