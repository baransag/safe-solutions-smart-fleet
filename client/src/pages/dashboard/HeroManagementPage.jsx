import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { Image, Plus, Edit2, Trash2, CheckCircle, XCircle, Calendar, Megaphone, Upload, Shield } from 'lucide-react';

export default function HeroManagementPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSlide, setEditSlide] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Holiday Notice',
    priority: '1',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    image_url: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const categories = [
    'Holiday Notice',
    'Friday Reminder',
    'Company Meeting',
    'Emergency Notice',
    'Safety Alert',
    'New Policy',
    'Office Timing',
    'Vehicle Maintenance Notice'
  ];

  useEffect(() => {
    fetchSlides();
  }, []);

  async function fetchSlides() {
    try {
      setLoading(true);
      const res = await api.get('/hero-slides/all');
      setSlides(res.posts || []);
    } catch (err) {
      toast.error('Failed to load hero slides.');
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => setImagePreview(evt.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      toast.error('Announcement Title is required.');
      return;
    }

    setActionLoading(true);
    try {
      if (editSlide) {
        await api.put(`/hero-slides/${editSlide.id}`, {
          ...form,
          sort_order: parseInt(form.priority, 10)
        });
        toast.success('Announcement updated!');
      } else {
        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('priority', form.priority);
        formData.append('start_date', form.start_date);
        if (form.end_date) formData.append('end_date', form.end_date);
        if (imageFile) formData.append('media_file', imageFile);

        await api.post('/hero-slides', formData);
        toast.success('Company announcement created & published!');
      }

      setShowModal(false);
      setEditSlide(null);
      setImageFile(null);
      setImagePreview(null);
      setForm({
        title: '', description: '', category: 'Holiday Notice',
        priority: 'normal', start_date: new Date().toISOString().split('T')[0],
        end_date: '', is_active: true, image_url: ''
      });
      fetchSlides();
    } catch (err) {
      toast.error(err.message || 'Failed to save announcement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (slide) => {
    try {
      await api.put(`/hero-slides/${slide.id}`, { is_active: !slide.is_active });
      toast.success(`Announcement marked as ${!slide.is_active ? 'ACTIVE' : 'INACTIVE'}`);
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, is_active: !s.is_active } : s));
    } catch (err) {
      toast.error('Failed to update announcement status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company announcement banner?')) return;
    try {
      await api.delete(`/hero-slides/${id}`);
      toast.success('Announcement deleted.');
      setSlides(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      toast.error('Failed to delete slide.');
    }
  };

  const openEditModal = (slide) => {
    setEditSlide(slide);
    setForm({
      title: slide.title || '',
      description: slide.description || '',
      category: slide.category || 'Holiday Notice',
      priority: String(slide.sort_order || 1),
      start_date: slide.start_date || new Date().toISOString().split('T')[0],
      end_date: slide.end_date || '',
      is_active: slide.is_active ?? true,
      image_url: slide.image_url || ''
    });
    setImagePreview(slide.image_url || null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader"><div className="loader loader-lg" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 10, background: '#021C4F', borderRadius: 12, color: '#fff' }}>
              <Megaphone size={24} />
            </div>
            <div>
              <h1 className="page-title">Hero Banner & Announcement Management</h1>
              <p className="page-description">Manage dashboard announcement banners, holiday notices, and safety alerts</p>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditSlide(null);
            setImageFile(null);
            setImagePreview(null);
            setForm({
              title: '', description: '', category: 'Holiday Notice',
              priority: '1', start_date: new Date().toISOString().split('T')[0],
              end_date: '', is_active: true, image_url: ''
            });
            setShowModal(true);
          }}
          style={{ background: '#021C4F', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> New Announcement Banner
        </button>
      </div>

      {/* Grid of Banners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {slides.map(slide => (
          <div key={slide.id} className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(2, 28, 79, 0.1)' }}>
            <div style={{ position: 'relative', height: 180, background: '#000' }}>
              <img
                src={slide.image_url || '/assets/images/hero-1.jpeg'}
                alt={slide.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.src = '/assets/images/hero-1.jpeg'; }}
              />
              <span style={{
                position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 6,
                background: '#C50337', color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase'
              }}>
                {slide.category || 'Company Notice'}
              </span>

              <button
                onClick={() => handleToggleActive(slide)}
                style={{
                  position: 'absolute', top: 12, right: 12, border: 'none', borderRadius: 20,
                  padding: '4px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  background: slide.is_active ? '#10B981' : '#EF4444', color: '#fff'
                }}
              >
                {slide.is_active ? 'ACTIVE' : 'INACTIVE'}
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#021C4F' }}>{slide.title}</h4>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{slide.description}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: 10, marginBottom: 14 }}>
                <span>Priority: P{slide.sort_order || 1}</span>
                <span>Created: {new Date(slide.created_at || Date.now()).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(slide)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                  <Edit2 size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(slide.id)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: 520, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#021C4F', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={20} color="#C50337" /> {editSlide ? 'Edit Announcement Banner' : 'Create Company Announcement'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Announcement Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid Holiday Schedule Announcement..."
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Description / Details</label>
                <textarea
                  rows={3}
                  placeholder="Enter notice details for employees..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ width: '100%', fontSize: 12 }}
                />
                {imagePreview && (
                  <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 120 }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>End Date (Optional)</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ background: '#021C4F', fontWeight: 700 }}>
                  {actionLoading ? 'Saving...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
