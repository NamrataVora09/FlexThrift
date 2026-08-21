'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface SeoManagerProps {
  pageKey?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultKeywords?: string;
}

export default function SeoManager({
  pageKey,
  defaultTitle,
  defaultDescription,
  defaultKeywords,
}: SeoManagerProps) {
  const pathname = usePathname();

  useEffect(() => {
    const lookupKey = pageKey || pathname || '/';
    if (!lookupKey) return;

    // Fetch custom SEO settings for this page or route path from the database
    api
      .get<any>(`/shared/seo-settings/${encodeURIComponent(lookupKey)}`)
      .then((res) => {
        if (res.success && res.data) {
          const data = res.data;
          
          // Prioritize saved database values!
          const title = (data.title && data.title.trim()) ? data.title.trim() : defaultTitle;
          const desc = (data.meta_description && data.meta_description.trim()) ? data.meta_description.trim() : defaultDescription;
          const keywords = (data.meta_keywords && data.meta_keywords.trim()) ? data.meta_keywords.trim() : defaultKeywords;
          const ogTitle = (data.og_title && data.og_title.trim()) ? data.og_title.trim() : title;
          const ogDesc = (data.og_description && data.og_description.trim()) ? data.og_description.trim() : desc;

          if (title) {
            document.title = title;
          }

          // Update Meta Description
          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
          }
          if (desc) {
            metaDesc.setAttribute('content', desc);
          }

          // Update Meta Keywords
          let metaKeywords = document.querySelector('meta[name="keywords"]');
          if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.setAttribute('name', 'keywords');
            document.head.appendChild(metaKeywords);
          }
          if (keywords) {
            metaKeywords.setAttribute('content', keywords);
          }

          // Update OG Title
          let ogTitleTag = document.querySelector('meta[property="og:title"]');
          if (!ogTitleTag) {
            ogTitleTag = document.createElement('meta');
            ogTitleTag.setAttribute('property', 'og:title');
            document.head.appendChild(ogTitleTag);
          }
          if (ogTitle) {
            ogTitleTag.setAttribute('content', ogTitle);
          }

          // Update OG Description
          let ogDescTag = document.querySelector('meta[property="og:description"]');
          if (!ogDescTag) {
            ogDescTag = document.createElement('meta');
            ogDescTag.setAttribute('property', 'og:description');
            document.head.appendChild(ogDescTag);
          }
          if (ogDesc) {
            ogDescTag.setAttribute('content', ogDesc);
          }

          // Update Twitter Title
          let twTitleTag = document.querySelector('meta[name="twitter:title"]');
          if (!twTitleTag) {
            twTitleTag = document.createElement('meta');
            twTitleTag.setAttribute('name', 'twitter:title');
            document.head.appendChild(twTitleTag);
          }
          if (ogTitle) {
            twTitleTag.setAttribute('content', ogTitle);
          }

          // Update Twitter Description
          let twDescTag = document.querySelector('meta[name="twitter:description"]');
          if (!twDescTag) {
            twDescTag = document.createElement('meta');
            twDescTag.setAttribute('name', 'twitter:description');
            document.head.appendChild(twDescTag);
          }
          if (ogDesc) {
            twDescTag.setAttribute('content', ogDesc);
          }
        } else if (defaultTitle) {
          document.title = defaultTitle;
        }
      })
      .catch(() => {
        if (defaultTitle) document.title = defaultTitle;
      });
  }, [pageKey, pathname, defaultTitle, defaultDescription, defaultKeywords]);

  return null;
}
