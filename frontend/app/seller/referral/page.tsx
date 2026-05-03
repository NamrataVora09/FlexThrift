'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface ReferredUser {
  initials: string;
  name: string;
  joined_at: string;
  reward_used: number;
  reward_earned: number;
}

interface ReferralStats {
  referral_code: string;
  referral_balance: number;
  has_used_referral: number;
  referral_expires_at: string | null;
  referred_by: string | null;
  total_referrals: number;
  total_earned: number;
  reward_amount: number;
  referral_enabled: boolean;
  how_it_works?: { title: string; desc: string }[];
  terms?: string[];
  referred_users: ReferredUser[];
}

export default function SellerReferralPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regCopied, setRegCopied] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    api.get<ReferralStats>('/auth/referral-stats').then((res) => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, []);

  const handleCopy = () => {
    if (!stats?.referral_code) return;
    navigator.clipboard.writeText(stats.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRegLink = () => {
    if (!stats?.referral_code) return;
    const link = window.location.origin + '/register?ref=' + stats.referral_code;
    navigator.clipboard.writeText(link);
    setRegCopied(true);
    setTimeout(() => setRegCopied(false), 2000);
  };

  const handleShare = () => {
    if (!stats?.referral_code) return;
    const text = `Join Flex and get ₹${stats.reward_amount} off your first subscription! Use my referral code: ${stats.referral_code}`;
    if (navigator.share) {
      navigator.share({ title: 'Join Flex', text });
    } else {
      navigator.clipboard.writeText(text);
      setShareMsg('Share message copied to clipboard!');
      setTimeout(() => setShareMsg(''), 3000);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isExpired = stats?.referral_expires_at
    ? new Date(stats.referral_expires_at) < new Date()
    : false;

  return (
    <DashboardLayout requiredRoles={['seller', 'super_admin']}>
      <style jsx>{`
        .ref-hero {
          background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
          border-radius: 24px;
          padding: 48px 40px;
          color: #fff;
          position: relative;
          overflow: hidden;
          margin-bottom: 28px;
        }
        .ref-hero::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 250px; height: 250px;
          background: radial-gradient(circle, rgba(255,198,58,0.2) 0%, transparent 70%);
          border-radius: 50%;
        }
        .ref-hero::after {
          content: '';
          position: absolute;
          bottom: -80px; left: 20%;
          width: 350px; height: 200px;
          background: radial-gradient(circle, rgba(255,198,58,0.07) 0%, transparent 70%);
          border-radius: 50%;
        }
        .hero-label {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #ffc63a;
          margin-bottom: 12px;
        }
        .hero-title {
          font-size: 2rem;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .hero-sub {
          color: rgba(255,255,255,0.65);
          font-size: 1rem;
          margin-bottom: 0;
        }
        .code-box {
          background: rgba(255,255,255,0.06);
          border: 1.5px dashed rgba(255,198,58,0.5);
          border-radius: 16px;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-top: 32px;
        }
        .code-display {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: 6px;
          color: #ffc63a;
          font-family: monospace;
          flex: 1;
          min-width: 160px;
        }
        .btn-copy {
          background: #ffc63a;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }
        .btn-copy:hover { background: #e6b030; }
        .btn-share {
          background: transparent;
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.3);
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }
        .btn-share:hover { border-color: #ffc63a; color: #ffc63a; }
        .stat-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #eee;
          padding: 28px 24px;
          text-align: center;
          transition: 0.3s;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06); transform: translateY(-2px); }
        .stat-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem;
          margin: 0 auto 16px;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 900;
          color: #000;
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .info-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #eee;
          padding: 28px;
          margin-bottom: 20px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .info-card h5 {
          font-size: 1.1rem;
          margin-bottom: 20px;
          color: #111;
          overflow-wrap: break-word;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .step-item {
          display: flex;
          gap: 16px;
          min-width: 0;
        }
        .step-num-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .step-num {
          width: 40px;
          height: 40px;
          background: #d6b06b;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          position: relative;
          z-index: 2;
        }
        .step-line {
          width: 2px;
          flex-grow: 1;
          background: #000;
          opacity: 0.4;
          margin: 4px 0;
        }
        .step-text {
          flex: 1;
          min-width: 0;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .step-text h6 {
          margin: 0 0 4px;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          color: #111;
          overflow-wrap: break-word;
        }
        .step-text p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.6;
          overflow-wrap: break-word;
        }
        .terms-list {
          padding-left: 20px;
          margin: 0;
          font-size: 0.85rem;
          color: #6b7280;
          line-height: 1.8;
          min-width: 0;
        }
        .terms-list li {
          margin-bottom: 12px;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .referred-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid #f5f5f5;
        }
        .referred-item:last-child { border-bottom: none; }
        .ref-avatar {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: #f3f4f6;
          color: #000;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.85rem;
          flex-shrink: 0;
        }
        .ref-name { font-weight: 700; font-size: 0.95rem; }
        .ref-date { font-size: 0.8rem; color: #9ca3af; }
        .ref-badge {
          margin-left: auto;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .balance-card {
          background: linear-gradient(135deg, #ffc63a 0%, #ff9500 100%);
          border-radius: 20px;
          padding: 28px;
          color: #000;
          margin-bottom: 20px;
        }
        .balance-card h6 { font-weight: 800; opacity: 0.7; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; }
        .balance-amount { font-size: 2.5rem; font-weight: 900; }
        .expiry-note { font-size: 0.8rem; opacity: 0.75; margin-top: 8px; }
        .disabled-overlay {
          background: #f9fafb;
          border-radius: 20px;
          padding: 48px;
          text-align: center;
          border: 2px dashed #e5e7eb;
        }
      `}</style>

      <div className="container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
          </div>
        ) : !stats?.referral_enabled ? (
          ''
        ) : (
          <>
            {/* Hero */}


            {/* Stats Row */}
            <div className="row g-3 mb-4">

<div className="col-6 col-md-4">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <i className="bi bi-currency-rupee" style={{ color: '#10b981' }}></i>
                  </div>
                  <div className="stat-value">₹{stats.total_earned}</div>
                  <div className="stat-label">Rewards Earned</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px' }}>after friend buys a plan</div>
                </div>
              </div>
<div className="col-6 col-md-4">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <i className="bi bi-wallet2" style={{ color: '#6366f1' }}></i>
                  </div>
                  <div className="stat-value">₹{stats.referral_balance.toFixed(0)}</div>
                  <div className="stat-label">Current Balance</div>
                </div>
              </div>
<div className="col-6 col-md-4">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <i className="bi bi-gift-fill" style={{ color: '#ef4444' }}></i>
                  </div>
                  <div className="stat-value">₹{stats.reward_amount}</div>
                  <div className="stat-label">Reward Per Referral</div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              {/* Left Column */}
              <div className="col-lg-8">
                {/* How it works */}
                <div className="info-card" style={{ height: 'auto' }}>
                  <h5 style={{ fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="bi bi-info-circle-fill" style={{ color: '#ffc63a' }}></i>
                    How It Works
                  </h5>
                  <div className="steps-container">
                    {(stats.how_it_works && stats.how_it_works.length > 0) ? (
                      stats.how_it_works.map((step, idx) => {
                        const works = stats.how_it_works || [];
                        return (
                          <div key={idx} className="step-item">
                            <div className="step-num-wrap">
                              <div className="step-num">{idx + 1}</div>
                              {idx < works.length - 1 && <div className="step-line"></div>}
                            </div>
                            <div className="step-text" style={{ paddingBottom: idx < works.length - 1 ? '24px' : '0' }}>
                              <h6>{step.title}</h6>
                              <p>{step.desc}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="step-item">
                          <div className="step-num-wrap">
                            <div className="step-num">1</div>
                            <div className="step-line"></div>
                          </div>
                          <div className="step-text" style={{ paddingBottom: '24px' }}>
                            <h6>Share Your Code</h6>
                            <p>Invite your friends to Flex using your unique referral code.</p>
                          </div>
                        </div>
                        <div className="step-item">
                          <div className="step-num-wrap">
                            <div className="step-num">2</div>
                            <div className="step-line"></div>
                          </div>
                          <div className="step-text" style={{ paddingBottom: '24px' }}>
                            <h6>Friends Join Flex</h6>
                            <p>Your friend registers on Flex and enters your referral code during sign-up.</p>
                          </div>
                        </div>
                        <div className="step-item">
                          <div className="step-num-wrap">
                            <div className="step-num">3</div>
                          </div>
                          <div className="step-text">
                            <h6>They Purchase a Plan</h6>
                            <p>When your friend buys their first subscription plan, the reward is unlocked.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="info-card" style={{ height: 'auto' }}>
                  <h5 style={{ fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="bi bi-shield-check" style={{ color: '#ffc63a' }}></i>
                    Terms & Conditions
                  </h5>
                  <ul className="terms-list">
                    {(stats.terms && stats.terms.length > 0) ? (
                      stats.terms.map((term, i) => <li key={i}>{term}</li>)
                    ) : (
                      <>
                        <li>Reward is credited when referred friend makes their first subscription purchase.</li>
                        <li>Referral balance is automatically applied at checkout.</li>
                        <li>Each user can only use one referral code during registration.</li>
                        <li>Referral rewards cannot be transferred or withdrawn as cash.</li>
                        <li>Flex reserves the right to modify or cancel the program at any time.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-lg-4">
                {/* Balance Card */}
                {stats.referral_balance > 0 && (
                  <div className="balance-card">
                    <h6><i className="bi bi-wallet2 me-1"></i>Available Balance</h6>
                    <div className="balance-amount">₹{stats.referral_balance.toFixed(2)}</div>
                    <p className="expiry-note mb-0">
                      {stats.referral_expires_at && !isExpired
                        ? `Valid until ${formatDate(stats.referral_expires_at)}`
                        : isExpired
                          ? 'Balance has expired'
                          : 'Applied automatically at checkout'}
                    </p>
                    <div style={{ marginTop: '16px', fontSize: '0.85rem', fontWeight: 600, opacity: 0.75 }}>
                      <i className="bi bi-info-circle me-1"></i>
                      Auto-applied on your next subscription purchase
                    </div>
                  </div>
                )}

                {/* Referred By */}
                {stats.referred_by && (
                  <div className="info-card">
                    <h5>
                      <i className="bi bi-person-check-fill" style={{ color: '#6366f1' }}></i>
                      You Were Referred
                    </h5>
                    <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Referral Code Used</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '3px', fontFamily: 'monospace' }}>{stats.referred_by}</div>
                      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: stats.has_used_referral ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {stats.has_used_referral
                          ? <><i className="bi bi-check-circle-fill me-1"></i>Reward used</>
                          : <><i className="bi bi-clock me-1"></i>Reward pending — buy a plan to activate</>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Share Your Code */}
                <div className="info-card">
                  <h5>
                    <i className="bi bi-share-fill" style={{ color: '#ffc63a' }}></i>
                    Share Your Code
                  </h5>
                  {stats.referral_code ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'left' }}>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', marginLeft: '4px' }}>
                           Your Referral Code
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '4px', color: '#ffc63a', fontFamily: 'monospace', textAlign: 'center' }}>{stats.referral_code}</div>
                      </div>
                      <div className="d-flex flex-column gap-2">
                        <button className="btn-copy w-100" style={{ height: '45px' }} onClick={handleCopy}>
                          <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'} me-2`}></i>
                          {copied ? 'Copied!' : 'Copy Code Only'}
                        </button>
                        <button className="btn-share w-100" style={{ height: '45px', background: '#d7b467', color: '#fff', borderColor: '#d7b467' }} onClick={handleCopyRegLink}>
                          <i className={`bi ${regCopied ? 'bi-check2' : 'bi-link-45deg'} me-2`}></i>
                          {regCopied ? 'Link Copied!' : 'Copy Registration Link'}
                        </button>
                      </div>
                      {shareMsg && (
                        <div style={{ marginTop: '12px', color: '#ffc63a', fontSize: '0.85rem', fontWeight: 700 }}>
                          <i className="bi bi-check2-circle me-1"></i>{shareMsg}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted small">Referral code not available.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
