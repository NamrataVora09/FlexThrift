import { Metadata } from 'next';
import ErrorMessagesClient from './ErrorMessagesClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Error Messages — SuperAdmin — FlexMarket',
  description: 'Manage dynamic error and notification messages on FlexMarket.',
};

export default async function ErrorMessagesPage() {
  return <ErrorMessagesClient />;
}
