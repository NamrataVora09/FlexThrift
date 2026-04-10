'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from './PageHeader';

interface Props { role: string; }

const FAQ = [
  { q: 'How do I list a product?', a: 'Go to "Upload Product" from the sidebar, fill in the details, add images, and submit. Your product will be reviewed by our team.' },
  { q: 'How long does product approval take?', a: 'Products are typically reviewed within 24-48 hours.' },
  { q: 'How do offers work?', a: 'Buyers can make offers on your products. You can accept or reject offers from the Offers page.' },
  { q: 'What is the reliability score?', a: 'Your reliability score reflects your trustworthiness on the platform. It is affected by successful transactions, timely responses, and reviews.' },
  { q: 'How do subscriptions work?', a: 'Subscriptions unlock premium features like higher product limits and priority placement. Visit the Subscriptions page to see available plans.' },
  { q: 'How do I contact support?', a: 'Email us at info@webappsofttech.com or use the contact form below.' },
];

export default function HelpView({ role }: Props) {
  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title="Help & Support" />

        <div className="card mb-4">
          <div className="card-body">
            <h5 className="subsection_label_font mb-3">Frequently Asked Questions</h5>
            <div className="accordion" id="faqAccordion">
              {FAQ.map((item, i) => (
                <div className="accordion-item" key={i} style={{ border: 'none', borderBottom: '1px solid #eee' }}>
                  <h2 className="accordion-header">
                    <button className="accordion-button collapsed fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target={`#faq${i}`}>
                      {item.q}
                    </button>
                  </h2>
                  <div id={`faq${i}`} className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                    <div className="accordion-body normal_label_font">{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h5 className="subsection_label_font mb-3">Contact Us</h5>
            <div className="row">
              <div className="col-md-4 mb-3">
                <div className="d-flex align-items-center gap-3">
                  <i className="fa fa-envelope" style={{ fontSize: 24, color: '#ffc63a' }}></i>
                  <div>
                    <small className="normal_label_font">Email</small>
                    <p className="mb-0 fw-semibold">info@webappsofttech.com</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="d-flex align-items-center gap-3">
                  <i className="fa fa-phone" style={{ fontSize: 24, color: '#ffc63a' }}></i>
                  <div>
                    <small className="normal_label_font">Phone</small>
                    <p className="mb-0 fw-semibold">+91 9999 999 999</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="d-flex align-items-center gap-3">
                  <i className="fa fa-clock" style={{ fontSize: 24, color: '#ffc63a' }}></i>
                  <div>
                    <small className="normal_label_font">Support Hours</small>
                    <p className="mb-0 fw-semibold">Mon-Sat, 9 AM - 6 PM</p>
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
