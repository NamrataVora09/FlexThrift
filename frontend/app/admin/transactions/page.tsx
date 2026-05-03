import { Metadata } from 'next';
import TransactionsReportsView from '@/components/shared/TransactionsReportsView';

export const metadata: Metadata = {
  title: 'Transactions & Reports — Admin — FlexMarket',
  description: 'View transaction reports and history on FlexMarket.',
};

export default function AdminTransactionsPage() {
  return <TransactionsReportsView role="admin" />;
}
