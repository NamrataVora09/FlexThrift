'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface ErrorMessage {
  id: number;
  message_key: string;
  message_value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

const categories = ['general', 'error', 'success', 'warning', 'info'];
const categoryColors: Record<string, string> = {
  error: '#dc3545',
  success: '#28a745',
  warning: '#ffc107',
  info: '#17a2b8',
  general: '#6c757d',
};
const categoryBgColors: Record<string, string> = {
  error: '#f8d7da',
  success: '#d4edda',
  warning: '#fff3cd',
  info: '#d1ecf1',
  general: '#e2e3e5',
};

const sectionStyle: React.CSSProperties = { background: '#fff', padding: 25, borderRadius: 12, marginBottom: 25, border: '1px solid #eee' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { background: '#6c757d', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const modalBackdrop: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 25, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };

export default function ErrorMessagesClient() {
  const { toastSuccess, toastError } = useToast();
  const [messages, setMessages] = useState<ErrorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal states — Edit only; no Add or Delete
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ErrorMessage | null>(null);

  // Form states
  const [formData, setFormData] = useState({ message_value: '', category: 'general' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get<ErrorMessage[]>('/superadmin/error-messages');
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (err: any) {
      toastError('app_messages_load_failed', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.message_value.trim()) {
      errors.message_value = 'Message value cannot be blank';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !validateForm()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/superadmin/error-messages/${editingMessage.id}`, {
        message_value: formData.message_value.trim(),
        category: formData.category,
      });
      if (res.success) {
        toastSuccess('app_messages_update_success', 'Message updated successfully!');
        setShowEditModal(false);
        setEditingMessage(null);
        setFormData({ message_value: '', category: 'general' });
        await loadMessages();
      } else {
        toastError('app_messages_update_failed', res.message || 'Failed to update message');
      }
    } catch (err: any) {
      toastError('app_messages_update_failed', err.message || 'Failed to update message');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (message: ErrorMessage) => {
    setEditingMessage(message);
    setFormData({ message_value: message.message_value, category: message.category });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Filter messages
  const filteredMessages = messages.filter(m => {
    const matchesSearch = searchQuery === '' ||
      m.message_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message_value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 on search or filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-chat-square-text" style={{ color: '#ffc63a' }}></i> Dynamic App Messages
          </h1>
          <p className="text-muted small">
            View and edit system-wide messages shown to users across the platform. SuperAdmin only.
          </p>
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: '0.82rem',
            color: '#856404',
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            
          </div>
        </div>

        {/* Controls Section */}
        <div style={sectionStyle}>
          <div className="row g-3 mb-3">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                style={inputStyle}
                placeholder="Search by key or value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-control"
                style={inputStyle}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              Found <strong>{filteredMessages.length}</strong> message(s) • Total: <strong>{messages.length}</strong>
            </div>
            {totalPages > 1 && (
              <div className="text-muted small">
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Messages Table */}
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
        ) : filteredMessages.length === 0 ? (
          <div style={sectionStyle} className="text-center py-5">
            <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#ddd' }}></i>
            <p className="text-muted mt-3">No messages found</p>
          </div>
        ) : (
          <div className="table-responsive" style={sectionStyle}>
            <table className="table table-hover mb-0">
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th style={{ fontWeight: 600, borderTop: 'none' }}>Key</th>
                  <th style={{ fontWeight: 600, borderTop: 'none' }}>Message</th>
                  <th style={{ fontWeight: 600, borderTop: 'none' }}>Category</th>
                  <th style={{ fontWeight: 600, borderTop: 'none', textAlign: 'center' }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMessages.map(msg => (
                  <tr key={msg.id}>
                    <td style={{ verticalAlign: 'middle', fontWeight: 500, fontSize: '0.875rem' }}>
                      <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>{msg.message_key}</code>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontSize: '0.875rem', maxWidth: 300 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={msg.message_value}>
                        {msg.message_value.substring(0, 70)}{msg.message_value.length > 70 ? '...' : ''}
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span style={{
                        background: categoryBgColors[msg.category] || '#e2e3e5',
                        color: categoryColors[msg.category] || '#6c757d',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {msg.category}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                      <button
                        id={`edit-msg-${msg.id}`}
                        style={{ ...btnSecondary, padding: '6px 12px' }}
                        onClick={() => openEditModal(msg)}
                        className="btn btn-sm"
                        title="Edit message text"
                      >
                        <i className="bi bi-pencil me-1"></i> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="d-flex justify-content-center gap-2 mb-4">
            <button
              style={{ ...btnSecondary, background: currentPage === 1 ? '#eee' : '#6c757d', color: currentPage === 1 ? '#999' : '#fff' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="btn btn-sm px-3"
            >
              <i className="bi bi-chevron-left me-1"></i> Previous
            </button>

            <div className="d-flex gap-1 align-items-center mx-2">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        ...btnSecondary,
                        background: currentPage === pageNum ? '#ffc63a' : '#fff',
                        color: currentPage === pageNum ? '#fff' : '#444',
                        border: '1px solid #ddd',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: currentPage === pageNum ? 700 : 400
                      }}
                      className="btn btn-sm p-0"
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="text-muted mx-1">...</span>;
                }
                return null;
              })}
            </div>

            <button
              style={{ ...btnSecondary, background: currentPage === totalPages ? '#eee' : '#6c757d', color: currentPage === totalPages ? '#999' : '#fff' }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="btn btn-sm px-3"
            >
              Next <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        )}

        {/* Reference Section — always visible */}
        {!loading && (
          <div style={{ ...sectionStyle, marginTop: 8, background: '#fafbff', border: '1px solid #e8ecff' }}>
            <h6 style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.9rem', color: '#1a1a1a' }}>
              <i className="bi bi-bookmark-fill me-2" style={{ color: '#ffc63a' }}></i>
              Message Keys Reference
              <span className="text-muted fw-normal ms-2" style={{ fontSize: '0.75rem' }}>
                — click a key to search for it
              </span>
            </h6>
            <p className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>
              These are all the message keys currently configured in the system. Use these keys in your application code to display dynamic, editable messages.
            </p>
            <div className="d-flex flex-wrap gap-2">
              {(messages.length > 0
                ? Array.from(new Set(messages.map(m => m.message_key))).sort()
                : [
                  'auth_login_required', 'already_rated_seller', 'booking_conflict',
                  'dates_update_success', 'min_rental_duration', 'offer_cancelled_success',
                  'offer_not_found', 'offer_sent_success', 'order_cancel_success',
                  'order_not_found', 'payment_success', 'product_not_found',
                  'rating_window_expired', 'review_submit_success'
                ]
              ).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSearchQuery(key)}
                  style={{
                    background: searchQuery === key ? '#ffc63a' : '#fff',
                    border: `1px solid ${searchQuery === key ? '#ffc63a' : '#dde2f0'}`,
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    color: searchQuery === key ? '#fff' : '#444',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: searchQuery === key ? 700 : 400,
                    transition: 'all 0.15s'
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Message Modal — Key is read-only, message value and category editable */}
      {showEditModal && editingMessage && (
        <div style={modalBackdrop} onClick={() => { setShowEditModal(false); }}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h5 style={{ fontWeight: 700, marginBottom: 4 }}>Edit Message</h5>
            <p className="text-muted small mb-4">You can only edit the message text. The key is fixed and cannot be changed.</p>

            {/* Message Key — display only, no input */}
            <div className="mb-3">
              <label className="form-label fw-bold small">Message Key <span className="text-muted fw-normal">(read-only)</span></label>
              <div style={{
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                padding: '0.6rem 1rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                color: '#555',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <i className="bi bi-lock-fill" style={{ color: '#aaa', fontSize: '0.75rem' }}></i>
                {editingMessage.message_key}
              </div>
            </div>

            {/* Message Value — editable */}
            <div className="mb-3">
              <label className="form-label fw-bold small">Message Text <span style={{ color: '#dc3545' }}>*</span></label>
              <textarea
                id="edit-message-value"
                className="form-control"
                style={{ ...inputStyle, borderColor: formErrors.message_value ? '#dc3545' : '#e7eaf3' }}
                rows={4}
                value={formData.message_value}
                onChange={(e) => {
                  setFormData({ ...formData, message_value: e.target.value });
                  if (formErrors.message_value) setFormErrors({});
                }}
                placeholder="Enter the message text shown to users. Use {key} for dynamic placeholders."
              />
              {formErrors.message_value && (
                <small style={{ color: '#dc3545' }}>
                  <i className="bi bi-exclamation-circle me-1"></i>{formErrors.message_value}
                </small>
              )}
              <small className="text-muted d-block mt-1">Tip: Use {'{min}'} or {'{name}'} for dynamic placeholders</small>
            </div>

            {/* Category — editable */}
            <div className="mb-4">
              <label className="form-label fw-bold small">Category</label>
              <select
                id="edit-message-category"
                className="form-control"
                style={inputStyle}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                style={btnSecondary}
                onClick={() => { setShowEditModal(false); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                id="save-edit-message-btn"
                style={btnGold}
                onClick={handleEditMessage}
                disabled={submitting}
              >
                {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <>Save Message</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
