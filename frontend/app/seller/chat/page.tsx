'use client';

import { useEffect, useState, useRef, ChangeEvent } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace('/api/v1', '');

interface Conversation {
  offer_id: number;
  offer_status: string;
  offer_price: string;
  product_title: string;
  product_id: number;
  buyer_name: string;
  buyer_id: number;
  last_message: string;
  last_sender_role: 'buyer' | 'seller';
  last_message_at: string;
  unread_count: number;
}

interface ChatMessage {
  id: number;
  sender_name: string;
  sender_role: 'buyer' | 'seller';
  message: string;
  media_url?: string;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const statusColor: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#10b981',
  rejected: '#ef4444',
  withdrawn: '#9ca3af',
};

export default function SellerChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = () => {
    setLoadingConvs(true);
    api.get<Conversation[]>('/seller/chats').then((r) => {
      if (r.success && r.data) setConversations(r.data);
      setLoadingConvs(false);
    });
  };

  useEffect(() => { loadConversations(); }, []);

  const loadMessages = (offerId: number) => {
    setLoadingMsgs(true);
    setMessages([]);
    api.get<ChatMessage[]>(`/seller/offer-messages/${offerId}`).then((r) => {
      if (r.success && r.data) setMessages(r.data);
      setLoadingMsgs(false);
      // mark as read in local state
      setConversations((prev) =>
        prev.map((c) => c.offer_id === offerId ? { ...c, unread_count: 0 } : c)
      );
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (conv: Conversation) => {
    setSelected(conv);
    loadMessages(conv.offer_id);
    setInput('');
  };

  const sendMessage = async () => {
    if (!selected) return;
    if (!input.trim() && !previewFile) return;
    setSending(true);

    if (previewFile) {
      // Upload file via multipart
      const formData = new FormData();
      formData.append('file', previewFile);
      if (input.trim()) formData.append('message', input.trim());
      try {
        const data = await api.upload(`/seller/offer-messages/${selected.offer_id}/upload`, formData);
        if (!data.success) { 
          toast.error(data.message || 'Upload failed'); 
          setSending(false); 
          return; 
        }
      } catch {
        toast.error('Upload failed'); 
        setSending(false); 
        return;
      }
      setPreviewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      const res = await api.post(`/seller/offer-messages/${selected.offer_id}`, { message: input.trim() });
      if (!res?.success) { 
        toast.error(res?.message || 'Failed to send'); 
        setSending(false); 
        return; 
      }
    }

    setInput('');
    loadMessages(selected.offer_id);
    loadConversations();
    setSending(false);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreviewFile(file);
  };

  const filteredConvs = conversations.filter((c) =>
    c.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.product_title.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + Number(c.unread_count), 0);

  return (
    <DashboardLayout requiredRoles={['seller']}>
      <style>{`
        .chat-shell { display: flex; height: calc(100vh - 80px); border-radius: 16px; overflow: hidden; border: 1px solid #eee; background: #fff; }
        .chat-sidebar { width: 320px; min-width: 320px; border-right: 1px solid #eee; display: flex; flex-direction: column; }
        .chat-sidebar-header { padding: 20px 16px 12px; border-bottom: 1px solid #eee; }
        .chat-search { border: 1px solid #eee; border-radius: 24px; padding: 8px 16px; font-size: 0.85rem; outline: none; width: 100%; background: #f9f9f9; }
        .chat-search:focus { border-color: #ffc63a; background: #fff; }
        .conv-list { flex: 1; overflow-y: auto; }
        .conv-item { padding: 14px 16px; cursor: pointer; border-bottom: 1px solid #f5f5f5; transition: background 0.15s; display: flex; gap: 12px; align-items: flex-start; }
        .conv-item:hover { background: #fafafa; }
        .conv-item.active { background: #fffbeb; border-left: 3px solid #ffc63a; }
        .conv-avatar { width: 42px; height: 42px; border-radius: 50%; background: #000; color: #ffc63a; font-weight: 800; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .conv-body { flex: 1; min-width: 0; }
        .conv-name { font-weight: 700; font-size: 0.9rem; color: #111; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-product { font-size: 0.75rem; color: #888; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-last { font-size: 0.78rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .conv-time { font-size: 0.7rem; color: #aaa; }
        .unread-badge { background: #ffc63a; color: #000; font-size: 0.65rem; font-weight: 800; padding: 2px 7px; border-radius: 20px; }
        .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .chat-topbar { padding: 16px 24px; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; background: #fff; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; background: #fafafa; }
        .msg-row { display: flex; }
        .msg-row.mine { justify-content: flex-end; }
        .msg-row.theirs { justify-content: flex-start; }
        .msg-bubble { max-width: 65%; padding: 10px 16px; border-radius: 18px; font-size: 0.875rem; line-height: 1.5; }
        .msg-bubble.mine { background: #000; color: #ffc63a; border-bottom-right-radius: 4px; }
        .msg-bubble.theirs { background: #fff; color: #333; border: 1px solid #eee; border-bottom-left-radius: 4px; }
        .msg-sender { font-size: 0.7rem; font-weight: 700; opacity: 0.6; margin-bottom: 3px; }
        .msg-time { font-size: 0.68rem; opacity: 0.5; margin-top: 4px; text-align: right; }
        .chat-input-bar { padding: 16px 20px; border-top: 1px solid #eee; display: flex; gap: 10px; background: #fff; }
        .chat-input { flex: 1; border: 1px solid #eee; border-radius: 24px; padding: 10px 20px; font-size: 0.875rem; outline: none; resize: none; }
        .chat-input:focus { border-color: #ffc63a; }
        .send-btn { background: #000; color: #ffc63a; border: none; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
        .send-btn:hover { background: #ffc63a; color: #000; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .empty-chat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbb; }
        @media (max-width: 768px) {
          .chat-shell { flex-direction: column; height: auto; }
          .chat-sidebar { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid #eee; max-height: 280px; }
          .chat-main { min-height: 400px; }
        }
      `}</style>

      <div className="container-fluid px-0">
        {/* Page header */}
        <div className="d-flex align-items-center justify-content-between px-3 pb-3">
          <div>
            <h1 className="fw-bold mb-0" style={{ fontSize: '1.6rem' }}>Messages</h1>
            <p className="text-muted small mb-0">Chat with buyers about their offers.</p>
          </div>
          {totalUnread > 0 && (
            <span className="badge rounded-pill" style={{ background: '#ffc63a', color: '#000', fontWeight: 800, fontSize: '0.8rem', padding: '6px 14px' }}>
              {totalUnread} unread
            </span>
          )}
        </div>

        <div className="chat-shell shadow-sm mx-3">
          {/* ---- Left: Conversation list ---- */}
          <div className="chat-sidebar">
            <div className="chat-sidebar-header">
              <input
                className="chat-search"
                placeholder="Search buyer or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="conv-list">
              {loadingConvs && (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" />
                  Loading...
                </div>
              )}
              {!loadingConvs && filteredConvs.length === 0 && (
                <div className="text-center py-5 text-muted small">
                  <i className="bi bi-chat-dots" style={{ fontSize: '2.5rem', opacity: 0.2 }} /><br />
                  No conversations yet
                </div>
              )}
              {filteredConvs.map((conv) => (
                <div
                  key={conv.offer_id}
                  className={`conv-item${selected?.offer_id === conv.offer_id ? ' active' : ''}`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className="conv-avatar">
                    {conv.buyer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="conv-body">
                    <div className="conv-name">{conv.buyer_name}</div>
                    <div className="conv-product">{conv.product_title}</div>
                    <div className="conv-last">
                      {conv.last_sender_role === 'seller' ? 'You: ' : ''}{conv.last_message}
                    </div>
                  </div>
                  <div className="conv-meta">
                    <span className="conv-time">{timeAgo(conv.last_message_at)}</span>
                    {Number(conv.unread_count) > 0 && (
                      <span className="unread-badge">{conv.unread_count}</span>
                    )}
                    <span
                      className="badge rounded-pill"
                      style={{ fontSize: '0.6rem', background: statusColor[conv.offer_status] || '#ccc', color: '#fff', padding: '2px 7px' }}
                    >
                      {conv.offer_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Right: Chat window ---- */}
          <div className="chat-main">
            {!selected ? (
              <div className="empty-chat">
                <i className="bi bi-chat-square-dots" style={{ fontSize: '4rem', opacity: 0.15 }} />
                <p className="mt-3 fw-semibold" style={{ opacity: 0.4 }}>Select a conversation to start chatting</p>
              </div>
            ) : (
              <>
                {/* Chat topbar */}
                <div className="chat-topbar">
                  <div className="d-flex align-items-center gap-3">
                    <div className="conv-avatar" style={{ width: 38, height: 38, fontSize: '0.9rem' }}>
                      {selected.buyer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: '0.95rem' }}>{selected.buyer_name}</div>
                      <div className="small text-muted">{selected.product_title}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-pill"
                      style={{ background: statusColor[selected.offer_status] || '#ccc', color: '#fff', fontSize: '0.75rem', padding: '5px 12px' }}
                    >
                      {selected.offer_status}
                    </span>
                    <div className="text-muted small">
                      Offer: <strong>₹{Number(selected.offer_price).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                  {loadingMsgs && (
                    <div className="text-center text-muted py-4">
                      <div className="spinner-border spinner-border-sm me-2" />Loading messages...
                    </div>
                  )}
                  {!loadingMsgs && messages.length === 0 && (
                    <div className="text-center text-muted py-5">
                      <i className="bi bi-chat-left-dots" style={{ fontSize: '2rem', opacity: 0.2 }} /><br />
                      No messages yet — say hello!
                    </div>
                  )}
                  {messages.map((m) => {
                    const isMine = m.sender_role === 'seller';
                    const isImage = m.media_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(m.media_url);
                    const isVideo = m.media_url && /\.(mp4|mov)$/i.test(m.media_url);
                    const isPdf   = m.media_url && /\.pdf$/i.test(m.media_url);
                    return (
                      <div key={m.id} className={`msg-row${isMine ? ' mine' : ' theirs'}`}>
                        <div className={`msg-bubble${isMine ? ' mine' : ' theirs'}`}>
                          <div className="msg-sender">{m.sender_name} · {m.sender_role}</div>
                          {m.media_url && isImage && (
                            <a href={`${BASE_URL}/${m.media_url}`} target="_blank" rel="noreferrer">
                              <img
                                src={`${BASE_URL}/${m.media_url}`}
                                alt="attachment"
                                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 4, display: 'block' }}
                              />
                            </a>
                          )}
                          {m.media_url && isVideo && (
                            <video controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 4, display: 'block' }}>
                              <source src={`${BASE_URL}/${m.media_url}`} />
                            </video>
                          )}
                          {m.media_url && isPdf && (
                            <a href={`${BASE_URL}/${m.media_url}`} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, marginBottom: 4, color: 'inherit', textDecoration: 'none' }}>
                              <i className="bi bi-file-earmark-pdf-fill" style={{ fontSize: '1.3rem' }} />
                              <span style={{ fontSize: '0.8rem' }}>View PDF</span>
                            </a>
                          )}
                          {m.media_url && !isImage && !isVideo && !isPdf && (
                            <a href={`${BASE_URL}/${m.media_url}`} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, marginBottom: 4, color: 'inherit', textDecoration: 'none' }}>
                              <i className="bi bi-paperclip" style={{ fontSize: '1.1rem' }} />
                              <span style={{ fontSize: '0.8rem' }}>Download file</span>
                            </a>
                          )}
                          {m.message && <div>{m.message}</div>}
                          <div className="msg-time">
                            {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* File preview strip */}
                {previewFile && (
                  <div style={{ padding: '8px 20px', borderTop: '1px solid #f0f0f0', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="bi bi-paperclip text-warning" />
                    <span style={{ fontSize: '0.82rem', flex: 1 }}>{previewFile.name} ({(previewFile.size / 1024).toFixed(0)} KB)</span>
                    <button onClick={() => { setPreviewFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1rem' }}>
                      <i className="bi bi-x-circle-fill" />
                    </button>
                  </div>
                )}

                {/* Input bar */}
                <div className="chat-input-bar">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,video/*,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    style={{ background: 'none', border: '1px solid #eee', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', flexShrink: 0 }}
                  >
                    <i className="bi bi-paperclip" style={{ fontSize: '1.1rem' }} />
                  </button>
                  <input
                    className="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Message ${selected.buyer_name}...`}
                  />
                  <button className="send-btn" onClick={sendMessage} disabled={sending || (!input.trim() && !previewFile)}>
                    {sending ? <div className="spinner-border spinner-border-sm" /> : <i className="bi bi-send-fill" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
