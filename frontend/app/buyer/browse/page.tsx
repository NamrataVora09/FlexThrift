import { Suspense } from 'react';
import BrowsePageClient from './BrowsePageClient';

export const dynamic = 'force-dynamic';

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowsePageClient />
    </Suspense>
  );
}
