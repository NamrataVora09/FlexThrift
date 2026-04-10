import { Metadata } from 'next';
import UserSubscriptionsClient from './UserSubscriptionsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'User Subscriptions — SuperAdmin — FlexMarket',
  description: 'Manage user subscription assignments on FlexMarket.',
};

export default async function UserSubscriptionsPage() {
  return <UserSubscriptionsClient />;
}
