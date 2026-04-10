import { Metadata } from 'next';
import TransactionsView from '@/components/shared/TransactionsView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Transactions — Seller — FlexMarket',
  description: 'View your transaction history on FlexMarket.',
};

export default async function SellerTransactionsPage() {
  return <TransactionsView role="seller" apiPath="/seller/transactions" />;
}
