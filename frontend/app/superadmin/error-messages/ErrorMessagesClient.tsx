'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

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
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#000', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { background: '#dc3545', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { background: '#6c757d', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const modalBackdrop: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 25, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };

export default function ErrorMessagesClient() {
  const [messages, setMessages] = useState<ErrorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ErrorMessage | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({ message_key: '', message_value: '', category: 'general' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: ErrorMessage[] }>('/superadmin/error-messages');
      if (res.success && res.data) {
        setMessages(res.data.data);
      }
    } catch (err: any) {
      setErrorMsg('Failed to load error messages');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.message_key.trim()) errors.message_key = 'Message key is required';
    if (!formData.message_value.trim()) errors.message_value = 'Message value is required';
    if (formData.message_key.includes(' ')) errors.message_key = 'Message key cannot contain spaces';
    
    if (!editingMessage) {
      const exists = messages.some(m => m.message_key === formData.message_key);
      if (exists) errors.message_key = 'This message key already exists';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddMessage = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post('/superadmin/error-messages', formData);
      if (res.success) {
        setSuccessMsg('Error message created successfully!');
        setShowAddModal(false);
        setFormData({ message_key: '', message_value: '', category: 'general' });
        await loadMessages();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to create message');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !validateForm()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post(`/superadmin/error-messages/${editingMessage.id}`, formData);
      if (res.success) {
        setSuccessMsg('Error message updated successfully!');
        setShowEditModal(false);
        setEditingMessage(null);
        setFormData({ message_key: '', message_value: '', category: 'general' });
        await loadMessages();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to update message');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteId) return;
    
    setSubmitting(true);
    try {
      const res = await api.delete(`/superadmin/error-messages/${deleteId}`);
      if (res.success) {
        setSuccessMsg('Error message deleted successfully!');
        setShowDeleteConfirm(false);
        setDeleteId(null);
        await loadMessages();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to delete message');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete message');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (message: ErrorMessage) => {
    setEditingMessage(message);
    setFormData({ message_key: message.message_key, message_value: message.message_value, category: message.category });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setFormData({ message_key: '', message_value: '', category: 'general' });
    setFormErrors({});
    setShowAddModal(true);
  };

  const openDeleteConfirm = (id: number) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  // Filter messages
  const filteredMessages = messages.filter(m => {
    const matchesSearch = searchQuery === '' || 
      m.message_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message_value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-chat-square-text" style={{ color: '#ffc63a' }}></i> Dynamic Error Messages
          </h1>
          <p className="text-muted small">Manage system-wide messages shown to users across the platform. SuperAdmin only.</p>
        </div>

        {/* Success/Error Messages */}
        {successMsg && <div className="alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center" style={{ borderRadius: 12 }}><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</div>}
        {errorMsg && <div className="alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center" style={{ borderRadius: 12 }}><i className="bi bi-exclamation-circle-fill me-2"></i>{errorMsg}</div>}

        {/* Controls Section */}
        <div style={sectionStyle}>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <input 
                type="text" 
                className="form-control" 
                style={inputStyle}
                placeholder="Search by key or value..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="col-md-3">
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
            <div className="col-md-5 text-end">
              <button style={btnGold} onClick={openAddModal} className="btn">
                <i className="bi bi-plus-circle me-2"></i>Add New Message
              </button>
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            Found <strong>{filteredMessages.length}</strong> message(s) • Total: <strong>{messages.length}</strong>
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
                  <th style={{ fontWeight: 600, borderTop: 'none' }}>Value</th>
                  <th style={{ fontWeight: 600, borderTop: 'none' }}>Category</th>
                  <th style={{ fontWeight: 600, borderTop: 'none', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map(msg => (
                  <tr key={msg.id}>
                    <td style={{ verticalAlign: 'middle', fontWeight: 500, fontSize: '0.875rem' }}>
                      <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>{msg.message_key}</code>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontSize: '0.875rem', maxWidth: 300 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={msg.message_value}>
                        {msg.message_value.substring(0, 60)}{msg.message_value.length > 60 ? '...' : ''}
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
                      <button style={{ ...btnSecondary, marginRight: 8, padding: '6px 10px' }} onClick={() => openEditModal(msg)} className="btn btn-sm">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button style={btnDanger} onClick={() => openDeleteConfirm(msg.id)} className="btn btn-sm">
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Message Modal */}
      {(showAddModal || showEditModal) && (
        <div style={modalBackdrop} onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h5 style={{ fontWeight: 700, marginBottom: 20 }}>
              {editingMessage ? 'Edit Error Message' : 'Add New Error Message'}
            </h5>
            
            <div className="mb-3">
              <label className="form-label fw-bold small">Message Key {!editingMessage && <span style={{ color: '#dc3545' }}>*</span>}</label>
              <input 
                type="text" 
                className="form-control" 
                style={inputStyle}
                value={formData.message_key}
                onChange={(e) => setFormData({ ...formData, message_key: e.target.value })}
                disabled={!!editingMessage}
                placeholder="e.g., auth_login_required"
              />
              {formErrors.message_key && <small style={{ color: '#dc3545' }}>{formErrors.message_key}</small>}
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold small">Message Value <span style={{ color: '#dc3545' }}>*</span></label>
              <textarea 
                className="form-control" 
                style={inputStyle}
                rows={4}
                value={formData.message_value}
                onChange={(e) => setFormData({ ...formData, message_value: e.target.value })}
                placeholder="Enter the message text. Use {key} for placeholders."
              />
              {formErrors.message_value && <small style={{ color: '#dc3545' }}>{formErrors.message_value}</small>}
              <small className="text-muted d-block mt-1">Tip: Use {'{min}'} or {'{key}'} for dynamic placeholders</small>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold small">Category</label>
              <select 
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
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                style={btnGold}
                onClick={editingMessage ? handleEditMessage : handleAddMessage}
                disabled={submitting}
              >
                {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <>Save Message</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={modalBackdrop} onClick={() => setShowDeleteConfirm(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h5 style={{ fontWeight: 700, marginBottom: 20 }}>Confirm Delete</h5>
            <p>Are you sure you want to delete this error message? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                style={btnSecondary}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                style={btnDanger}
                onClick={handleDeleteMessage}
                disabled={submitting}
              >
                {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</> : <>Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
