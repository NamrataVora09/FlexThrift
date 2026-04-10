import { Metadata } from 'next';
import ReportsClient from './ReportsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Reports — SuperAdmin — FlexMarket',
  description: 'Generate and view business reports on FlexMarket.',
};

export default async function ReportsPage() {
  return <ReportsClient />;
}
