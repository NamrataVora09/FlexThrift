'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

interface SeoManagerProps {
  pageKey: string;
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
  useEffect(() => {
    // Fetch custom SEO settings for this page from the database
    api.get<any>(`/shared/seo-settings/${pageKey}`).then((res) => {
      if (res.success && res.data) {
        const data = res.data;
        const title = data.title || defaultTitle;
        const desc = data.meta_description || defaultDescription;
        const keywords = data.meta_keywords || defaultKeywords;

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
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (!ogTitle) {
          ogTitle = document.createElement('meta');
          ogTitle.setAttribute('property', 'og:title');
          document.head.appendChild(ogTitle);
        }
        if (data.og_title || title) {
          ogTitle.setAttribute('content', data.og_title || title);
        }

        // Update OG Description
        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (!ogDesc) {
          ogDesc = document.createElement('meta');
          ogDesc.setAttribute('property', 'og:description');
          document.head.appendChild(ogDesc);
        }
        if (data.og_description || desc) {
          ogDesc.setAttribute('content', data.og_description || desc);
        }
      } else {
        // Fallback to defaults
        if (defaultTitle) document.title = defaultTitle;
      }
    }).catch(() => {
      // Fallback to defaults on error
      if (defaultTitle) document.title = defaultTitle;
    });
  }, [pageKey, defaultTitle, defaultDescription, defaultKeywords]);

  return null;
}
