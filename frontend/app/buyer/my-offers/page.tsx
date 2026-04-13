'use client';

import { useEffect, useState, useMemo, useRef, ChangeEvent } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ── Inline rental calendar (reused from ProductDetailClient) ────────────────
const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const D = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function RentalCalendar({ bookedRanges, startDate, endDate, onRangeChange }: {
  bookedRanges: { start: string; end: string }[];
  startDate: string; endDate: string;
  onRangeChange: (s: string, e: string) => void;
}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [phase, setPhase] = useState<'start'|'end'>('start');
  const [hover, setHover] = useState<Date|null>(null);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parse = (s: string) => { if (!s) return null; const [y,m,day]=s.split('-').map(Number); return new Date(y,m-1,day); };

  const isBooked = (d: Date) => { const ds=fmt(d); return bookedRanges.some(r=>ds>=r.start&&ds<=r.end); };
  const sD=parse(startDate), eD=parse(endDate);
  const inRange = (d: Date) => {
    if (!sD) return false;
    const eff=eD||hover; if(!eff) return false;
    const lo=sD<=eff?sD:eff, hi=sD<=eff?eff:sD;
    return d>lo&&d<hi;
  };

  const yr=view.getFullYear(), mo=view.getMonth();
  const cells:(Date|null)[]=[];
  for(let i=0;i<new Date(yr,mo,1).getDay();i++) cells.push(null);
  for(let i=1;i<=new Date(yr,mo+1,0).getDate();i++) cells.push(new Date(yr,mo,i));

  const click=(d:Date)=>{
    if(d<today||isBooked(d)) return;
    if(phase==='start'||(sD&&eD)){onRangeChange(fmt(d),'');setPhase('end');}
    else{
      const s=sD!;
      d<s?onRangeChange(fmt(d),fmt(s)):onRangeChange(fmt(s),fmt(d));
      setPhase('start');
    }
  };

  return (
    <div style={{background:'#fff',border:'1px solid #eee',borderRadius:12,padding:12,userSelect:'none',fontSize:'0.8rem'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <button type="button" onClick={()=>setView(new Date(yr,mo-1,1))} style={{background:'none',border:'1px solid #eee',borderRadius:6,cursor:'pointer',padding:'1px 10px',fontWeight:700}}>‹</button>
        <span style={{fontWeight:700}}>{M[mo]} {yr}</span>
        <button type="button" onClick={()=>setView(new Date(yr,mo+1,1))} style={{background:'none',border:'1px solid #eee',borderRadius:6,cursor:'pointer',padding:'1px 10px',fontWeight:700}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:2}}>
        {D.map(n=><div key={n} style={{textAlign:'center',fontWeight:700,color:'#aaa',padding:2}}>{n}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const past=d<today, bk=isBooked(d), dis=past||bk;
          const isS=sD&&fmt(d)===fmt(sD), isE=eD&&fmt(d)===fmt(eD), rng=inRange(d), isT=fmt(d)===fmt(today);
          let bg='transparent',col='#000',br='6px';
          if(bk){bg='#fee2e2';col='#dc2626';}
          else if(isS||isE){bg='#ffc63a';col='#000';br='8px';}
          else if(rng){bg='#fff3cc';col='#555';br='0';}
          if(past&&!bk) col='#ccc';
          return <div key={i} onClick={()=>click(d)} onMouseEnter={()=>{if(!dis)setHover(d);}} onMouseLeave={()=>setHover(null)}
            title={bk?'Already booked':undefined}
            style={{textAlign:'center',padding:'5px 2px',borderRadius:br,background:bg,color:col,cursor:dis?'not-allowed':'pointer',
              fontWeight:(isS||isE||isT)?700:400,border:isT&&!isS&&!isE?'1.5px solid #ffc63a':'1.5px solid transparent',
              opacity:past&&!bk?0.35:1,transition:'background .1s'}}>
            {d.getDate()}
            {bk&&<div style={{width:3,height:3,background:'#dc2626',borderRadius:'50%',margin:'1px auto 0'}}/>}
          </div>;
        })}
      </div>
      <div style={{display:'flex',gap:8,marginTop:8,color:'#888',fontSize:'0.72rem',flexWrap:'wrap'}}>
        <span><span style={{display:'inline-block',width:8,height:8,background:'#ffc63a',borderRadius:2,marginRight:3}}/>Selected</span>
        <span><span style={{display:'inline-block',width:8,height:8,background:'#fff3cc',borderRadius:2,marginRight:3}}/>Range</span>
        <span><span style={{display:'inline-block',width:8,height:8,background:'#fee2e2',borderRadius:2,marginRight:3}}/>Booked</span>
      </div>
      {startDate&&(
        <div style={{marginTop:8,padding:'6px 10px',background:'#fffdf0',borderRadius:7,border:'1px solid #ffc63a44',fontSize:'0.78rem'}}>
          {endDate
            ? <><strong>{startDate}</strong> → <strong>{endDate}</strong>
                {' '}·{' '}<span style={{color:'#888'}}>{Math.round((new Date(endDate).getTime()-new Date(startDate).getTime())/86400000)+1} days</span></>
            : <><strong>{startDate}</strong> — click an end date</>}
        </div>
      )}
    </div>
  );
}

interface OfferHistory {
  action: string;
  created_at: string;
  new_start_date?: string;
  new_end_date?: string;
}

interface ConflictInfo {
  message: string;
  type: string;
}

interface ChatMessage {
  id: number;
  sender_name: string;
  sender_role: 'buyer' | 'seller';
  message: string;
  media_url?: string;
  created_at: string;
}


interface Offer {
  id: number;
  product_id: number;
  product_title: string;
  product_image?: string;
  listing_type: string;
  offer_type?: string;
  offer_price: string;
  offered_price?: string;
  original_price: string;
  status: string;
  created_at: string;
  accepted_at?: string;
  seller_name?: string;
  buyer_name?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  rental_cost?: string;
  deposit_amount?: string;
  delivery_address?: string;
  delivery_pin_code?: string;
  message?: string;
  conflict_info?: ConflictInfo;
  history?: OfferHistory[];
  seller_remarks?: string;
  buyer_rated_seller?: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8080');

function getImageUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('uploads/')) return `${BASE_URL}/${path}`;
  return `${BASE_URL}/uploads/products/${path}`;
}

const STATUS_FILTERS = ['all', 'pending', 'negotiating', 'accepted', 'rejected'] as const;

const pillStyles: Record<string, React.CSSProperties> = {
  pending: { background: '#f8f9fa', color: '#666', border: '1px solid #eee' },
  negotiating: { background: '#fff7e6', color: '#d97706', border: '1px solid #fde68a' },
  accepted: { background: '#eaffea', color: '#1a8a1a', border: '1px solid #c9f9c9' },
  rejected: { background: '#fff5f5', color: '#d63031', border: '1px solid #ffeaea' },
  cancelled: { background: '#f8f9fa', color: '#999', border: '1px solid #eee' },
};

function getHistoryLabel(action: string): string {
  switch (action) {
    case 'initial_offer': return 'Offer Initiated';
    case 'buyer_date_update': return 'Buyer updated dates';
    case 'seller_suggest_dates': return 'Seller suggested new dates';
    case 'buyer_accept_negotiation': return 'Buyer accepted suggested dates';
    default: return action;
  }
}

export default function Page() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ id: number; action: 'cancel' | 'accept_dates'; title: string; message?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [changeDatesModal, setChangeDatesModal] = useState<{ id: number; title: string; productId: number } | null>(null);
  const [cdStart, setCdStart] = useState('');
  const [cdEnd, setCdEnd] = useState('');
  const [cdLoading, setCdLoading] = useState(false);
  const [cdError, setCdError] = useState<string | null>(null);
  const [cdBookedRanges, setCdBookedRanges] = useState<{ start: string; end: string }[]>([]);
  const [minRentalDays, setMinRentalDays] = useState(3);
  const [cdPrice, setCdPrice] = useState('0');
  const [cdDailyRate, setCdDailyRate] = useState('0');

  // Rating state
  const [ratingModal, setRatingModal] = useState<{ id: number; title: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);


  // Chat state
  const [chatModal, setChatModal] = useState<{ id: number; title: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatFile, setChatFile] = useState<File | null>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    // The backend returns { success: true, data: Offer[], minRentalDays: number }
    api.get<Offer[]>('/buyer/my-offers').then((r) => {
      // Cast to any to access the root-level 'minRentalDays' property which isn't in generic ApiResponse
      const res = r as any;
      if (res.success && res.data) {
        setOffers(res.data);
        if (res.minRentalDays) setMinRentalDays(res.minRentalDays);
      }
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    const res = await api.post(`/buyer/cancel-offer/${actionModal.id}`);
    setActionLoading(false);
    if (res?.success) {
      setActionModal(null);
      load();
    } else {
      toast.error(res?.message || 'Action failed');
    }
  };

  const handleAcceptDates = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    const res = await api.post(`/buyer/confirmDateChange/${actionModal.id}`);
    setActionLoading(false);
    if (res?.success) {
      setActionModal(null);
      load();
    } else {
      toast.error(res?.message || 'Failed to confirm dates');
    }
  };

  const handleRateSubmit = async () => {
    if (!ratingModal) return;
    setRatingLoading(true);
    const res = await api.post<any>('/buyer/rate-seller', {
      offer_id: ratingModal.id,
      rating: ratingValue
    });
    setRatingLoading(false);
    if (res.success) {
      setRatingModal(null);
      load();
    } else {
      toast.error(res.message || 'Failed to submit rating');
    }
  };


  const openChangeDates = (o: Offer) => {
    setCdStart(o.rental_start_date || '');
    setCdEnd(o.rental_end_date || '');
    setCdPrice(o.offered_price || o.offer_price || '0');
    setCdDailyRate(o.rental_cost || '0');
    setCdError(null);
    setCdBookedRanges([]);
    setChangeDatesModal({ id: o.id, title: o.product_title, productId: o.product_id });
    // fetch booked ranges so calendar shows unavailable dates
    api.get<{ booked_ranges: { start: string; end: string }[] }>(`/product/${o.product_id}/booked-dates`)
      .then(r => { if (r.success && r.data) setCdBookedRanges(r.data.booked_ranges.filter(br => !(br.start === o.rental_start_date && br.end === o.rental_end_date))); })
      .catch(() => {});
  };

  // Recalculate price in modal
  useEffect(() => {
    if (cdStart && cdEnd && cdDailyRate !== '0') {
      const s = new Date(cdStart);
      const e = new Date(cdEnd);
      const diff = e.getTime() - s.getTime();
      const days = Math.round(diff / 86400000) + 1;
      if (days > 0) {
        setCdPrice((parseFloat(cdDailyRate) * days).toString());
      }
    }
  }, [cdStart, cdEnd, cdDailyRate]);

  const handleChangeDates = async () => {
    if (!changeDatesModal) return;
    // Inclusive day count — same as backend: round(diff/86400)+1
    if (!cdStart || !cdEnd) { setCdError('Please select both start and end dates.'); return; }
    const totalDays = Math.round((new Date(cdEnd).getTime() - new Date(cdStart).getTime()) / 86400000) + 1;
    if (totalDays < minRentalDays) { setCdError(`Minimum ${minRentalDays} days rental required. You selected ${totalDays} day${totalDays === 1 ? '' : 's'}.`); return; }
    setCdLoading(true);
    setCdError(null);
    const res = await api.post(`/buyer/update-offer-dates/${changeDatesModal.id}`, {
      rental_start_date: cdStart,
      rental_end_date: cdEnd,
      offer_price: cdPrice,
    });
    setCdLoading(false);
    if (res?.success) {
      setChangeDatesModal(null);
      load();
    } else {
      setCdError(res?.message || 'Failed to update dates');
    }
  };

  const loadChat = (offerId: number) => {
    setChatLoading(true);
    setChatMessages([]);
    api.get<ChatMessage[]>(`/buyer/offer-messages/${offerId}`).then((r) => {
      if (r.success && r.data) setChatMessages(r.data);
      setChatLoading(false);
    });
  };

  const openChat = (offer: Offer) => {
    setChatModal({ id: offer.id, title: offer.product_title });
    loadChat(offer.id);
  };

  const sendChatMessage = async () => {
    if (!chatModal) return;
    if (!chatInput.trim() && !chatFile) return;
    setChatSending(true);

    if (chatFile) {
      const formData = new FormData();
      formData.append('file', chatFile);
      if (chatInput.trim()) formData.append('message', chatInput.trim());
      try {
        const data = await api.upload(`/buyer/offer-messages/${chatModal.id}/upload`, formData);
        if (!data.success) {
          toast.error(data.message || 'Upload failed');
          setChatSending(false);
          return;
        }
      } catch {
        toast.error('Upload failed');
        setChatSending(false);
        return;
      }
      setChatFile(null);
      if (chatFileRef.current) chatFileRef.current.value = '';
    } else {
      const res = await api.post(`/buyer/offer-messages/${chatModal.id}`, { message: chatInput.trim() });
      if (!res?.success) {
        toast.error(res?.message || 'Failed to send');
        setChatSending(false);
        return;
      }
    }

    setChatInput('');
    loadChat(chatModal.id);
    setChatSending(false);
  };

  const filtered = useMemo(() => {
    const list = offers || [];
    return filter === 'all' ? list : list.filter((o) => o.status === filter);
  }, [offers, filter]);

  const counts = useMemo(() => {
    const list = offers || [];
    return {
      all: list.length,
      pending: list.filter((o) => o.status === 'pending').length,
      negotiating: list.filter((o) => o.status === 'negotiating').length,
      accepted: list.filter((o) => o.status === 'accepted').length,
      rejected: list.filter((o) => o.status === 'rejected').length,
    }
  }, [offers]);

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx global>{`
        .luxury-item-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #eee;
          margin-bottom: 20px;
          transition: all 0.3s ease;
        }
        .luxury-item-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          border-color: #ffc63a;
        }
        .item-img {
          width: 100px;
          height: 125px;
          object-fit: cover;
          border-radius: 12px;
        }
        .status-pill {
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
          white-space: nowrap;
        }
        .price-badge {
          font-size: 1.5rem;
          font-weight: 800;
          color: #000;
        }
        .btn-modern-cancel {
          background: #fff5f5;
          color: #d63031;
          border: 1px solid #ffeaea;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          transition: 0.2s;
          cursor: pointer;
        }
        .btn-modern-cancel:hover {
          background: #d63031;
          color: white;
        }
        .no-data-lux {
          padding: 80px 0;
          text-align: center;
          background: white;
          border-radius: 20px;
          border: 1px solid #eee;
        }
        .conflict-alert {
          background: #fff1f2;
          color: #e11d48;
          border: 1px solid #fda4af;
          border-radius: 12px;
          padding: 12px 16px;
          margin-top: 15px;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filter-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .filter-pill {
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #eee;
          background: #fff;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-pill:hover {
          border-color: #ffc63a;
        }
        .filter-pill.active {
          background: #000;
          color: #ffc63a;
          border-color: #000;
        }
        .filter-pill .count-badge {
          background: rgba(0,0,0,0.08);
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          margin-left: 6px;
        }
        .filter-pill.active .count-badge {
          background: rgba(255,198,58,0.25);
        }
      `}</style>

      <div className="container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h1 className="fw-bold mb-1" style={{ fontSize: '1.75rem' }}>Sent Proposals</h1>
            <p className="text-muted mb-0">Track offers and negotiation status with sellers.</p>
          </div>
          <Link
            href="/buyer"
            className="btn btn-dark rounded-pill px-4"
            style={{ fontWeight: 700 }}
          >
            New Request
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="filter-pills">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-pill${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="count-badge">{counts[f as keyof typeof counts] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border" role="status" style={{ color: '#ffc63a' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="no-data-lux shadow-sm">
            <i className="bi bi-tag" style={{ fontSize: '6rem', opacity: 0.1 }}></i>
            <h3 className="mt-3 fw-bold">No active offers</h3>
            <p className="text-muted">Explore the marketplace to send your first proposal.</p>
          </div>
        )}

        {/* Offer Cards */}
        {!loading && filtered.map((o) => {
          const offerType = o.offer_type || o.listing_type || 'buy';
          const price = o.offered_price || o.offer_price;
          const statusLabel = o.status === 'negotiating' ? 'action required' : o.status;

          return (
            <div key={o.id} className="luxury-item-card shadow-sm">
              <div className="row align-items-center">
                {/* Product Image */}
                <div className="col-auto">
                  <img
                    src={getImageUrl(o.product_image) || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=120&h=120&fit=crop'}
                    className="item-img"
                    alt={o.product_title || 'Product'}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=120&h=120&fit=crop'; }}
                  />
                </div>

                {/* Content */}
                <div className="col px-md-4">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="fw-bold mb-1">{o.product_title}</h5>
                      <small className="text-muted d-block mb-2">
                        #REF-{o.id} &bull; {offerType.charAt(0).toUpperCase() + offerType.slice(1)}
                      </small>
                    </div>
                    <span
                      className="status-pill"
                      style={pillStyles[o.status] || pillStyles.pending}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* Price & Details Section */}
                  <div className="bg-light p-3 rounded-4 mt-2">
                    <div className="row text-center text-md-start align-items-center">
                      <div className="col-md-4 border-end">
                        <small className="text-muted d-block">PROPOSED PRICE</small>
                        <span className="price-badge">
                          ₹{Number(price).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="col-md-8 ps-md-4">
                        {offerType === 'rent' && o.rental_start_date && o.rental_end_date && (
                          <p className="mb-0 small fw-bold text-muted">
                            <i className="bi bi-calendar-event me-1 text-primary"></i>
                            {new Date(o.rental_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            {' '}to{' '}
                            {new Date(o.rental_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        )}

                        {o.status === 'negotiating' && o.message ? (
                          <div
                            className="alert alert-info py-2 px-3 mt-2 rounded-3 border-0 small mb-0"
                          >
                            <i className="bi bi-info-circle-fill me-2"></i>
                            <strong>Action Required:</strong> {o.message}
                          </div>
                        ) : (
                          <div className="mt-1">
                            <p className="mb-0 small text-muted fst-italic">
                              <i className="bi bi-chat-left-dots me-1"></i>
                              {o.message || 'No message attached.'}
                            </p>
                            {o.seller_remarks && (
                              <div className="mt-2 p-2 rounded-3 border-start border-4 border-warning bg-warning-subtle small text-dark fw-medium">
                                <i className="bi bi-reply-fill me-1"></i>
                                Seller: {o.seller_remarks}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conflict Alert */}
                    {o.conflict_info && (
                      <div className="conflict-alert">
                        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.2rem' }}></i>
                        <div>
                          {o.conflict_info.message}
                          {o.conflict_info.type === 'rent_conflict' && (
                            <>
                              <br />
                              <small style={{ fontWeight: 400, opacity: 0.75 }}>
                                You can try changing your dates to something else.
                              </small>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Negotiation History */}
                    {o.history && o.history.length > 0 && (
                      <div className="mt-3 pt-3 border-top">
                        <h6 className="small fw-bold text-muted mb-2">
                          <i className="bi bi-clock-history me-1"></i> Negotiation Logs
                        </h6>
                        <div className="small">
                          {o.history.map((h, idx) => (
                            <div key={idx} className="d-flex gap-2 mb-2">
                              <div className="text-primary"><i className="bi bi-dot"></i></div>
                              <div>
                                <span className="text-dark fw-semibold">
                                  {getHistoryLabel(h.action)}
                                </span>
                                <div className="text-muted" style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                                  {new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  {h.new_start_date && h.new_end_date && (
                                    <>
                                      {' '}&bull;{' '}
                                      {new Date(h.new_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                      {' - '}
                                      {new Date(h.new_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="col-md-2 text-end">
                  <div className="d-grid gap-2">
                    {o.status === 'negotiating' && (
                      <>
                        {offerType === 'rent' && (
                          <button
                            className="btn btn-warning rounded-pill fw-bold mb-1"
                            style={{ fontSize: '0.82rem', background: '#ffc63a', border: 'none', color: '#000' }}
                            onClick={() => openChangeDates(o)}
                          >
                            <i className="bi bi-calendar-plus me-1"></i> Change dates
                          </button>
                        )}
                        <button
                          className="btn btn-success rounded-pill fw-bold"
                          style={{ fontSize: '0.82rem' }}
                          onClick={() => setActionModal({ id: o.id, action: 'accept_dates', title: o.product_title, message: o.message })}
                        >
                          <i className="bi bi-calendar-check me-1"></i> Accept Dates
                        </button>
                        <button
                          className="btn-modern-cancel"
                          style={{ fontSize: '0.82rem' }}
                          onClick={() => setActionModal({ id: o.id, action: 'cancel', title: o.product_title })}
                        >
                          Decline &amp; Cancel
                        </button>
                      </>
                    )}
                    {o.status === 'pending' && (
                      <>
                        {offerType === 'rent' && (
                          <button
                            className="btn btn-warning rounded-pill fw-bold mb-1"
                            style={{ fontSize: '0.82rem', background: '#ffc63a', border: 'none', color: '#000' }}
                            onClick={() => openChangeDates(o)}
                          >
                            <i className="bi bi-calendar-plus me-1"></i> Change dates
                          </button>
                        )}
                        <button
                          className="btn-modern-cancel"
                          onClick={() => setActionModal({ id: o.id, action: 'cancel', title: o.product_title })}
                        >
                          Cancel Offer
                        </button>
                      </>
                    )}
                    {o.status === 'accepted' && !Number(o.buyer_rated_seller) && (
                      <button
                        className="btn btn-warning rounded-pill fw-bold"
                        style={{ fontSize: '0.82rem', background: '#ffc63a', border: 'none' }}
                        onClick={() => { setRatingModal({ id: o.id, title: o.product_title }); setRatingValue(5); }}
                      >
                        <i className="bi bi-star-fill me-1"></i> Rate Seller
                      </button>
                    )}
                    {o.status === 'accepted' && Number(o.buyer_rated_seller) === 1 && (
                      <span className="badge bg-light text-success border py-2 rounded-pill small">
                        <i className="bi bi-check-circle-fill me-1"></i> Rated
                      </span>
                    )}

                    <Link
                      href={`/buyer/product/${o.product_id}`}
                      className="btn btn-light rounded-pill border"
                    >
                      View Item
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
          onClick={() => setActionModal(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold">
                  {actionModal.action === 'accept_dates' ? 'Accept Seller\'s Dates' : 'Cancel Proposal'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setActionModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                {actionModal.action === 'accept_dates' ? (
                  <>
                    <p className="mb-2">
                      The seller has suggested new dates for <strong>&ldquo;{actionModal.title}&rdquo;</strong>.
                    </p>
                    {actionModal.message && (
                      <div className="alert alert-info border-0 rounded-3 small py-2 px-3 mb-2">
                        <i className="bi bi-info-circle-fill me-2"></i>{actionModal.message}
                      </div>
                    )}
                    <p className="mb-0 text-muted small">Accepting will finalise the deal on the seller&apos;s proposed dates.</p>
                  </>
                ) : (
                  <p className="mb-0">
                    Are you sure you want to withdraw your offer on <strong>&ldquo;{actionModal.title}&rdquo;</strong>?
                    This action cannot be undone.
                  </p>
                )}
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button className="btn btn-light" onClick={() => setActionModal(null)}>
                  {actionModal.action === 'accept_dates' ? 'Not now' : 'No, keep it'}
                </button>
                {actionModal.action === 'accept_dates' ? (
                  <button
                    className="btn btn-success fw-bold"
                    onClick={handleAcceptDates}
                    disabled={actionLoading}
                    style={{ borderRadius: '10px' }}
                  >
                    {actionLoading ? 'Processing...' : 'Yes, Accept Dates'}
                  </button>
                ) : (
                  <button
                    className="btn btn-danger fw-bold"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    style={{ borderRadius: '10px' }}
                  >
                    {actionLoading ? 'Processing...' : 'Yes, withdraw it!'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Dates Modal */}
      {changeDatesModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setChangeDatesModal(null)}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-calendar-event me-2" style={{ color: '#ffc63a' }}></i>
                  Change Rental Dates
                </h5>
                <button type="button" className="btn-close" onClick={() => setChangeDatesModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-3">
                  Offer: <strong>{changeDatesModal.title}</strong>
                  {cdBookedRanges.length > 0 && (
                    <span className="ms-2 badge bg-danger-subtle text-danger border border-danger-subtle">
                      {cdBookedRanges.length} period{cdBookedRanges.length > 1 ? 's' : ''} unavailable
                    </span>
                  )}
                </p>
                 <RentalCalendar
                  bookedRanges={cdBookedRanges}
                  startDate={cdStart}
                  endDate={cdEnd}
                  onRangeChange={(s, e) => { setCdStart(s); setCdEnd(e); setCdError(null); }}
                />
                <div className="mt-4 bg-light p-3 rounded-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Updated Rental Price:</span>
                    <span className="fw-bold h5 mb-0 text-dark">₹{Number(cdPrice).toLocaleString('en-IN')}</span>
                  </div>
                  {cdStart && cdEnd && (
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-info-circle me-1"></i>
                      Calculated: ₹{cdDailyRate} × {Math.round((new Date(cdEnd).getTime() - new Date(cdStart).getTime()) / 86400000) + 1} days
                    </div>
                  )}
                </div>
                {cdError && (
                  <div className="alert alert-danger border-0 rounded-3 small py-2 px-3 mt-3 mb-0">
                    <i className="bi bi-exclamation-circle-fill me-2"></i>{cdError}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button className="btn btn-light rounded-3" onClick={() => setChangeDatesModal(null)}>Cancel</button>
                <button
                  className="btn btn-dark fw-bold rounded-3 px-4"
                  onClick={handleChangeDates}
                  disabled={cdLoading || !cdStart || !cdEnd}
                >
                  {cdLoading ? <><span className="spinner-border spinner-border-sm me-2"/>Saving...</> : 'Save New Dates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setChatModal(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-chat-dots me-2"></i>Chat — {chatModal.title}
                </h5>
                <button type="button" className="btn-close" onClick={() => setChatModal(null)}></button>
              </div>
              <div className="modal-body p-0">
                <div style={{ height: 360, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                  {chatLoading && <div className="text-center text-muted py-4">Loading...</div>}
                  {!chatLoading && chatMessages.length === 0 && (
                    <div className="text-center text-muted py-5">No messages yet. Start the conversation!</div>
                  )}
                  {chatMessages.map((m) => {
                    const isMine = m.sender_role === 'buyer';
                    const isImage = m.media_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(m.media_url);
                    const isVideo = m.media_url && /\.(mp4|mov)$/i.test(m.media_url);
                    const isPdf   = m.media_url && /\.pdf$/i.test(m.media_url);
                    return (
                      <div key={m.id} className={`d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                        <div style={{
                          maxWidth: '70%', padding: '10px 14px',
                          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isMine ? '#000' : '#f4f4f4',
                          color: isMine ? '#ffc63a' : '#333', fontSize: '0.875rem'
                        }}>
                          <div className="fw-bold small mb-1" style={{ opacity: 0.7 }}>{m.sender_name} · {m.sender_role}</div>
                          {m.media_url && isImage && (
                            <a href={`${BASE_URL}/${m.media_url}`} target="_blank" rel="noreferrer">
                              <img src={`${BASE_URL}/${m.media_url}`} alt="attachment" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, marginBottom: 4, display: 'block' }} />
                            </a>
                          )}
                          {m.media_url && isVideo && (
                            <video controls style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, marginBottom: 4, display: 'block' }}>
                              <source src={`${BASE_URL}/${m.media_url}`} />
                            </video>
                          )}
                          {m.media_url && (isPdf || (!isImage && !isVideo)) && (
                            <a href={`${BASE_URL}/${m.media_url}`} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'rgba(255,255,255,0.15)', borderRadius: 6, marginBottom: 4, color: 'inherit', textDecoration: 'none' }}>
                              <i className="bi bi-paperclip" /> <span style={{ fontSize: '0.78rem' }}>{isPdf ? 'View PDF' : 'Download file'}</span>
                            </a>
                          )}
                          {m.message && <div>{m.message}</div>}
                          <div className="small mt-1" style={{ opacity: 0.5 }}>
                            {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {chatFile && (
                  <div className="border-top px-3 py-2 d-flex align-items-center gap-2" style={{ background: '#fffbeb', fontSize: '0.82rem' }}>
                    <i className="bi bi-paperclip text-warning" />
                    <span className="flex-grow-1">{chatFile.name}</span>
                    <button onClick={() => { setChatFile(null); if (chatFileRef.current) chatFileRef.current.value = ''; }}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}>
                      <i className="bi bi-x-circle-fill" />
                    </button>
                  </div>
                )}
                <div className="border-top p-3 d-flex gap-2">
                  <input type="file" ref={chatFileRef} accept="image/*,video/*,.pdf" style={{ display: 'none' }}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setChatFile(f); }} />
                  <button title="Attach file" onClick={() => chatFileRef.current?.click()}
                    style={{ background: 'none', border: '1px solid #eee', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', flexShrink: 0 }}>
                    <i className="bi bi-paperclip" />
                  </button>
                  <input
                    className="form-control"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                    placeholder="Type a message..."
                    style={{ borderRadius: '2rem' }}
                  />
                  <button
                    className="btn btn-dark px-4 fw-bold"
                    style={{ borderRadius: '2rem' }}
                    onClick={sendChatMessage}
                    disabled={chatSending || (!chatInput.trim() && !chatFile)}
                  >
                    {chatSending ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-send"></i>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-0 px-4 pt-4">
                <h5 className="modal-title fw-bold">Rate Your Experience</h5>
                <button type="button" className="btn-close" onClick={() => setRatingModal(null)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                <p className="text-muted small mb-4">How was your interaction with the seller for <strong>{ratingModal.title}</strong>?</p>
                <div className="d-flex justify-content-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn p-1"
                      style={{ fontSize: '2.5rem', color: s <= ratingValue ? '#ffc63a' : '#dee2e6', transition: 'transform 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onClick={() => setRatingValue(s)}
                    >
                      <i className={`bi bi-star${s <= ratingValue ? '-fill' : ''}`}></i>
                    </button>
                  ))}
                </div>
                <div className="h5 fw-bold mb-0">
                  {ratingValue === 5 && 'Outstanding! 🌟'}
                  {ratingValue === 4 && 'Very Good! 😊'}
                  {ratingValue === 3 && 'Decent Experience 😐'}
                  {ratingValue === 2 && 'Could be better 😕'}
                  {ratingValue === 1 && 'Poor Experience 😞'}
                </div>
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button type="button" className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setRatingModal(null)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-dark rounded-pill px-4 fw-bold" 
                  onClick={handleRateSubmit}
                  disabled={ratingLoading}
                >
                  {ratingLoading ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

