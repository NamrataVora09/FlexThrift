import { Metadata } from 'next';
import FinancialReportsView from '@/components/shared/FinancialReportsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Transactions — SuperAdmin — FlexMarket',
  description: 'View financial reports and transaction history.',
};

export default async function TransactionsPage() {
  return <FinancialReportsView />;
}
