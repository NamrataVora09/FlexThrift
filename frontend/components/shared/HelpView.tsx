'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface Props { role: string; }

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

interface SupportInfo {
  support_email?: string;
  support_phone?: string;
  support_hours?: string;
}

export default function HelpView({ role }: Props) {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [info, setInfo] = useState<SupportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFaqId, setActiveFaqId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [faqRes, infoRes] = await Promise.all([
        api.get<FAQItem[]>('/shared/faqs'),
        api.get<SupportInfo>('/shared/support-info')
      ]);
      if (faqRes.success) setFaqs(faqRes.data || []);
      if (infoRes.success) setInfo(infoRes.data || null);
      setLoading(false);
    };
    loadData();
  }, []);

  const toggleFaq = (id: number) => {
    setActiveFaqId(activeFaqId === id ? null : id);
  };

  return (
    <DashboardLayout requiredRoles={[role]}>
      <style jsx>{`
        .faq-item {
          border-bottom: 1px solid #f0f0f0;
          overflow: hidden;
        }
        .faq-question {
          width: 100%;
          padding: 1.25rem;
          background: #fff;
          border: none;
          text-align: left;
          font-weight: 600;
          color: #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .faq-question.active {
          background-color: rgb(215, 180, 103); /* Refined gold BG for active */
          color: #ffffff;
        }
        .faq-answer-wrapper {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-in-out;
          background: #fcfcfc;
        }
        .faq-answer-wrapper.active {
          max-height: 500px;
        }
        .faq-answer {
          padding: 1.5rem;
          line-height: 1.6;
          color: #4a4a4a;
          border-top: 1px solid #f0f0f0;
        }
        .support-title {
          color: #000000;
          font-weight: 700;
          margin-bottom: 2px;
          display: block;
        }
        .support-value {
          color: #9ca3af;
          font-size: 0.95rem;
          font-weight: 400;
        }
        .card {
          border: 1px solid #f0f0f0;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .chevron {
          transition: transform 0.3s ease;
        }
        .faq-question.active .chevron {
          transform: rotate(180deg);
        }
      `}</style>

      <div className="container py-4">
        <div className="mb-5">
          <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4, fontFamily: 'Poppins' }}>Help & Support</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Get answers to your questions and contact our support team.</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-12">
            {/* FAQ Section */}
            <div className="card mb-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: '1.1rem' }}>Frequently Asked Questions</h5>
                {loading ? (
                   <div className="text-center py-4">
                     <div className="spinner-border text-warning" role="status"></div>
                   </div>
                ) : (
                  <div className="faq-list">
                    {faqs.length > 0 ? faqs.map((item) => (
                      <div className="faq-item" key={item.id}>
                        <button 
                          className={`faq-question ${activeFaqId === item.id ? 'active' : ''}`}
                          onClick={() => toggleFaq(item.id)}
                        >
                          {item.question}
                          <i className={`bi bi-chevron-down chevron`}></i>
                        </button>
                        <div className={`faq-answer-wrapper ${activeFaqId === item.id ? 'active' : ''}`}>
                          <div className="faq-answer">
                            {item.answer}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-muted">No FAQs available at the moment.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information Section - Now BELOW FAQ */}
            <div className="card">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: '1.1rem' }}>Contact Information</h5>
                
                <div className="row g-4">
                  <div className="col-md-4">
                    <div className="d-flex align-items-start gap-3">
                      <div className="bg-light p-2 rounded-3">
                        <i className="bi bi-envelope-fill" style={{ fontSize: 20, color: '#ffc63a' }}></i>
                      </div>
                      <div>
                        <span className="support-title">Email Address</span>
                        <div className="support-value">{info?.support_email || (loading ? 'Loading...' : 'info@flexmarket.com')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="d-flex align-items-start gap-3">
                      <div className="bg-light p-2 rounded-3">
                        <i className="bi bi-telephone-fill" style={{ fontSize: 20, color: '#ffc63a' }}></i>
                      </div>
                      <div>
                        <span className="support-title">Phone Number</span>
                        <div className="support-value">{info?.support_phone || (loading ? 'Loading...' : 'Not Available')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="d-flex align-items-start gap-3">
                      <div className="bg-light p-2 rounded-3">
                        <i className="bi bi-clock-fill" style={{ fontSize: 20, color: '#ffc63a' }}></i>
                      </div>
                      <div>
                        <span className="support-title">Support Hours</span>
                        <div className="support-value">{info?.support_hours || (loading ? 'Loading...' : '9:00 AM - 6:00 PM')}</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
