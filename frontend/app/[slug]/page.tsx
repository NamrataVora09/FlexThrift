'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import LandingNavbar from '@/components/layout/LandingNavbar';
import Footer from '@/components/layout/Footer';

interface CmsPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function PublicCmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get<CmsPage>(`/cms-page/${slug}`).then((res) => {
      if (res.success && res.data) {
        setPage(res.data);
      } else {
        setError(res.message || 'Page not found');
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingNavbar />
        <main className="flex-grow container py-5 text-center">
          <div className="spinner-border text-gold"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingNavbar />
        <main className="flex-grow container py-5 text-center">
          <h1 className="display-4 fw-bold">404</h1>
          <p className="lead">{error || 'Page not found'}</p>
          <a href="/" className="btn btn-gold rounded-pill px-4">Back to Home</a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingNavbar />
      
      <main className="flex-grow">
        {/* Header Section */}
        <div className="bg-light py-5 border-bottom mb-5">
          <div className="container">
            <h1 className="display-5 fw-bold mb-0" style={{ color: '#1e2022' }}>{page.title}</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 mt-2">
                <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Home</a></li>
                <li className="breadcrumb-item active text-gold" aria-current="page">{page.title}</li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Content Section */}
        <div className="container pb-5">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div 
                className="cms-content"
                style={{ 
                  fontSize: '1.1rem', 
                  lineHeight: '1.8',
                  color: '#4b566b'
                }}
                dangerouslySetInnerHTML={{ __html: page.content }} 
              />
              
              <div className="mt-5 pt-4 border-top text-muted small">
                Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        .cms-content h1, .cms-content h2, .cms-content h3 {
          color: #1e2022;
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }
        .cms-content p {
          margin-bottom: 1.25rem;
        }
        .cms-content ul, .cms-content ol {
          margin-bottom: 1.25rem;
          padding-left: 2rem;
        }
        .cms-content li {
          margin-bottom: 0.5rem;
        }
        .btn-gold {
          background: #ffc63a;
          color: #212529;
          font-weight: 600;
          border: none;
        }
        .btn-gold:hover {
          background: #ffb700;
          transform: translateY(-1px);
        }
        .text-gold {
          color: #ffc63a;
        }
      `}</style>
    </div>
  );
}
