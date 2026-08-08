import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { QrCode, Plus, Download, Printer, RefreshCw, Trash2, Shield, MapPin, Calendar, CheckCircle, XCircle, Building2, HardHat, Clock } from 'lucide-react';

export default function EmployeeQRCodesPage() {
  const { user, isController, isAdmin } = useAuth();
  const toast = useToast();

  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'office', // 'office' | 'site' | 'temporary'
    project_name: '',
    category: 'Head Office',
    lat: '31.4504',
    lng: '73.1350',
    allowed_radius_meters: '200',
    expiry_date: ''
  });

  useEffect(() => {
    fetchQRCodes();
  }, []);

  async function fetchQRCodes() {
    try {
      setLoading(true);
      const res = await api.get('/employee-qr-codes');
      // Show ONLY Office QR codes in Office QR Code Management view
      const officeQrs = (res.qrCodes || []).filter(qr => qr.type === 'office');
      setQrCodes(officeQrs);
    } catch (err) {
      toast.error('Failed to load QR codes.');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateQR = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter Office or Site Name.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/employee-qr-codes/generate', formData);
      toast.success(`QR Code "${res.qrCode.name}" generated successfully!`);
      setShowGenerateModal(false);
      setFormData({
        name: '',
        type: 'office',
        project_name: '',
        category: 'Head Office',
        lat: '31.4504',
        lng: '73.1350',
        allowed_radius_meters: '200',
        expiry_date: ''
      });
      fetchQRCodes();
    } catch (err) {
      toast.error(err.message || 'Failed to generate QR Code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (qr) => {
    const newStatus = qr.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/employee-qr-codes/${qr.id}/status`, { status: newStatus });
      toast.success(`QR Code marked as ${newStatus.toUpperCase()}`);
      setQrCodes(prev => prev.map(item => item.id === qr.id ? { ...item, status: newStatus } : item));
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleRegenerate = async (id) => {
    try {
      const res = await api.post(`/employee-qr-codes/${id}/regenerate`);
      toast.success('QR Code secure token regenerated!');
      fetchQRCodes();
    } catch (err) {
      toast.error('Failed to regenerate token.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete QR Code "${name}"?`)) return;
    try {
      await api.delete(`/employee-qr-codes/${id}`);
      toast.success('QR Code deleted.');
      setQrCodes(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      toast.error('Failed to delete QR code.');
    }
  };

  const downloadPNG = (qr) => {
    if (!qr.qr_image_data) return;
    const link = document.createElement('a');
    link.href = qr.qr_image_data;
    link.download = `${qr.qr_id}_${qr.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${qr.qr_id} as PNG`);
  };

  const printQR = (qr) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${qr.name}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #021C4F; border-radius: 16px; padding: 30px; display: inline-block; max-width: 400px; }
            h2 { color: #021C4F; margin: 0 0 5px; }
            p { color: #555; font-size: 14px; margin: 5px 0; }
            img { width: 280px; height: 280px; margin: 20px 0; }
            .footer { font-size: 12px; color: #777; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>SAFE SOLUTIONS OPS</h2>
            <p><strong>${qr.name}</strong></p>
            <p>${qr.type.toUpperCase()} ATTENDANCE QR CODE</p>
            <img src="${qr.qr_image_data}" alt="${qr.name}" />
            <p><strong>ID: ${qr.qr_id}</strong></p>
            <p style="font-size:12px;">Radius: ${qr.allowed_radius_meters}m • Category: ${qr.category}</p>
            ${qr.type === 'site' ? `<p style="color:#c50337; font-weight:bold; font-size:18px; margin-top:10px;">OTP: ${qr.otp_secret || 'N/A'}</p>` : ''}
            <div class="footer">Scan with SAFE SOLUTIONS Employee App for Attendance</div>
          </div>
          <script>window.print(); setTimeout(() => window.close(), 1000);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadPDF = (qr) => {
    printQR(qr);
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
            <div style={{ padding: 10, background: '#0A0A14', borderRadius: 12, color: '#fff' }}>
              <QrCode size={24} />
            </div>
            <div>
              <h1 className="page-title">Official Office QR Code</h1>
              <p className="page-description">Permanent Head Office Attendance QR Code for Faisalabad HQ</p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Codes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
        {qrCodes.map(qr => (
          <div key={qr.id} className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 20, border: '1px solid rgba(2, 28, 79, 0.1)', background: '#fff', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: qr.type === 'site' ? '#fff1f2' : qr.type === 'temporary' ? '#fef3c7' : '#eff6ff', color: qr.type === 'site' ? '#c50337' : qr.type === 'temporary' ? '#d97706' : '#021c4f', textTransform: 'uppercase' }}>
                  {qr.type} ATTENDANCE
                </span>
                <h4 style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 800, color: '#021C4F' }}>{qr.name}</h4>
                {qr.project_name && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Project: {qr.project_name}</p>}
              </div>

              {/* Active Toggle Switch */}
              <button
                onClick={() => handleToggleStatus(qr)}
                className={`badge badge-${qr.status === 'active' ? 'green' : 'red'}`}
                style={{ border: 'none', cursor: 'pointer', fontWeight: 700, padding: '6px 12px' }}
                title="Click to toggle Active / Inactive status"
              >
                {qr.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
              </button>
            </div>

            {/* QR Code Image Preview */}
            <div style={{ textAlign: 'center', padding: '16px 0', background: '#f8fafc', borderRadius: 12, marginBottom: 14, border: '1px dashed #cbd5e1' }}>
              <img
                src={qr.qr_image_data || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qr.qr_token || qr.qr_id || 'OFFICE')}`}
                alt={qr.name}
                style={{ width: 180, height: 180, objectFit: 'contain' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#021C4F', fontFamily: 'monospace' }}>
                ID: {qr.qr_id}
              </div>
            </div>

            {/* Details */}
            <div style={{ fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Assigned Category</span>
                <strong style={{ color: '#021C4F' }}>{qr.category || 'Head Office'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GPS Location</span>
                <strong style={{ color: '#0284c7' }}>{qr.lat}, {qr.lng}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Allowed Radius</span>
                <strong>{qr.allowed_radius_meters} meters</strong>
              </div>
              {qr.expiry_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Expiry Date</span>
                  <strong>{new Date(qr.expiry_date).toLocaleDateString()}</strong>
                </div>
              )}
              {qr.type === 'site' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                  <span>Site OTP Secret</span>
                  <strong style={{ letterSpacing: '2px', fontSize: 14 }}>{qr.otp_secret || 'N/A'}</strong>
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div style={{ display: 'grid', gridTemplateColumns: qr.qr_id === 'QR-OFFICE-001' ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 6, borderTop: '1px solid #eee', paddingTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadPNG(qr)} title="Download PNG">
                <Download size={14} /> PNG
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadPDF(qr)} title="Download PDF">
                <Download size={14} /> PDF
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => printQR(qr)} title="Print QR Code">
                <Printer size={14} /> Print
              </button>
              {qr.qr_id !== 'QR-OFFICE-001' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(qr.id, qr.name)} title="Delete QR Code">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {qr.qr_id === 'QR-OFFICE-001' && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(2, 28, 79, 0.05)', borderRadius: 8, border: '1px solid rgba(2, 28, 79, 0.15)', fontSize: 11, color: '#021C4F', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                🔒 Permanent Office QR — Assigned to SAFE SOLUTIONS Head Office Faisalabad
              </div>
            )}
          </div>
        ))}
      </div>

      {/* GENERATE QR CODE MODAL */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: 500, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#021C4F', display: 'flex', alignItems: 'center', gap: 8 }}>
              <QrCode size={20} color="#C50337" /> Generate New Attendance QR Code
            </h3>

            <form onSubmit={handleCreateQR}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>QR Category & Lifetime</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                >
                  <option value="office">🏢 Permanent Office QR (Head Office)</option>
                  <option value="site">🏗️ Temporary Site Project QR (Client Site)</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  {formData.type === 'office' ? 'Office Location Name *' : 'Site / Plant Location Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formData.type === 'office' ? 'e.g. Head Office Faisalabad' : 'e.g. Client Plant #4 Site'}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              {formData.type === 'site' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Client Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Industrial Zone Waterproofing Project..."
                    value={formData.project_name}
                    onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lat}
                    onChange={e => setFormData({ ...formData, lat: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lng}
                    onChange={e => setFormData({ ...formData, lng: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    required
                    value={formData.allowed_radius_meters}
                    onChange={e => setFormData({ ...formData, allowed_radius_meters: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    {formData.type === 'site' ? 'Expiry Date *' : 'Expiry Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    required={formData.type === 'site'}
                    value={formData.expiry_date}
                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ background: '#021C4F', fontWeight: 700 }}>
                  {actionLoading ? 'Generating...' : 'Generate & Secure QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
