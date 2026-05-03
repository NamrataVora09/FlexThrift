import { Metadata } from 'next';
import TransactionsReportsView from '@/components/shared/TransactionsReportsView';

export const metadata: Metadata = {
  title: 'Transactions & Reports — Seller — FlexMarket',
  description: 'View your transaction reports and history on FlexMarket.',
};

export default function SellerTransactionsPage() {
  return <TransactionsReportsView role="seller" />;
}
