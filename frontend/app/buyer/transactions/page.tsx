import { Metadata } from 'next';
import TransactionsReportsView from '@/components/shared/TransactionsReportsView';

export const metadata: Metadata = {
  title: 'Transactions & Reports — Buyer — FlexMarket',
  description: 'View your transaction reports and history on FlexMarket.',
};

export default function BuyerTransactionsPage() {
  return <TransactionsReportsView role="buyer" />;
}
