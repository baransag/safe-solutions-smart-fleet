import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { FileText, Send, Plus, Trash2, Calendar, User, MapPin, Building, Phone, Briefcase, Package, MessageSquare, CheckCircle2, Share2, Search, Printer, Download, Image as ImageIcon } from 'lucide-react';


export default function VisitReportsPage() {
  const { user, isAdmin, isController, isBoss, isManager } = useAuth();
  const toast = useToast();
  const isElevated = isAdmin || isController || isBoss || isManager;

  const [tab, setTab] = useState('new'); // 'new' | 'history'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');

  // New Visit Report Form State
  const [salesPerson, setSalesPerson] = useState(user?.name || '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [rows, setRows] = useState([
    {
      project_location: '',
      client_name: '',
      contractor_name: '',
      architect_consultant: '',
      contact_number: '',
      purpose_of_visit: '',
      product_of_interest: '',
      remarks: ''
    }
  ]);

  useEffect(() => {
    fetchReports();
    fetchWhatsAppGroupLink();
  }, []);

  async function fetchWhatsAppGroupLink() {
    try {
      const data = await api.get('/settings');
      if (data.settings && data.settings.whatsapp_group_link) {
        setWhatsappGroupLink(data.settings.whatsapp_group_link);
      }
    } catch {
      // Quiet fail — default empty, will show warning if not set
    }
  }

  async function fetchReports() {
    setLoading(true);
    try {
      const data = await api.get('/visit-reports');
      setReports(data.reports || []);
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  }

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        project_location: '',
        client_name: '',
        contractor_name: '',
        architect_consultant: '',
        contact_number: '',
        purpose_of_visit: '',
        product_of_interest: '',
        remarks: ''
      }
    ]);
  };

  const removeRow = (idx) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  // Generate High-Resolution Image (PNG) from the Visit Report Table (Canvas Based)
  const generateAndDownloadReportImage = (targetRows = rows, targetSalesPerson = salesPerson, targetDate = visitDate) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = 1400;
    const headerHeight = 160;
    const rowHeight = 70;
    const footerHeight = 80;
    const totalHeight = headerHeight + 50 + (Math.max(targetRows.length, 1) * rowHeight) + footerHeight;

    canvas.width = width;
    canvas.height = totalHeight;

    // 1. Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalHeight);

    // 2. Header Background Ribbon
    ctx.fillStyle = '#3B2621';
    ctx.fillRect(0, 0, width, 14);

    // 3. Top Title
    ctx.fillStyle = '#3B2621';
    ctx.font = 'bold 36px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Safe Solutions', width / 2, 60);

    ctx.font = 'bold 20px Inter, Arial, sans-serif';
    ctx.fillStyle = '#E06D34';
    ctx.fillText('VISIT REPORT', width / 2, 92);

    // 4. Sales Person & Date Bar
    ctx.fillStyle = '#F8F3EA';
    ctx.fillRect(40, 110, width - 80, 44);
    ctx.strokeStyle = '#3B2621';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 110, width - 80, 44);

    ctx.fillStyle = '#3B2621';
    ctx.font = 'bold 16px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Sale Person:  ${targetSalesPerson || user?.name}`, 60, 138);

    ctx.textAlign = 'right';
    ctx.fillText(`Date:  ${targetDate}`, width - 60, 138);

    // 5. Table Columns definition
    const startX = 40;
    const startY = 165;
    const tableWidth = width - 80;
    
    const cols = [
      { name: 'Sr #', w: 50 },
      { name: 'Project Name / Locations', w: 220 },
      { name: 'Client', w: 140 },
      { name: 'Contractor', w: 130 },
      { name: 'Architect / Consultant', w: 140 },
      { name: 'Contact Person', w: 130 },
      { name: 'Purpose of Visit', w: 180 },
      { name: 'Product of Interest', w: 150 },
      { name: 'Remarks', w: 180 }
    ];

    // Draw Table Header
    ctx.fillStyle = '#006A71'; // Rich Teal Header
    ctx.fillRect(startX, startY, tableWidth, 44);
    ctx.strokeStyle = '#3B2621';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX, startY, tableWidth, 44);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';

    let curX = startX;
    cols.forEach(col => {
      ctx.fillText(col.name, curX + col.w / 2, startY + 27);
      ctx.beginPath();
      ctx.moveTo(curX + col.w, startY);
      ctx.lineTo(curX + col.w, startY + 44);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();
      curX += col.w;
    });

    // Draw Table Rows
    let curY = startY + 44;
    targetRows.forEach((r, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#FAF6EE';
      ctx.fillRect(startX, curY, tableWidth, rowHeight);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, curY, tableWidth, rowHeight);

      ctx.fillStyle = '#3B2621';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';

      let cellX = startX;
      
      // Values
      const rowValues = [
        String(idx + 1),
        r.project_location || '—',
        r.client_name || '—',
        r.contractor_name || '—',
        r.architect_consultant || '—',
        r.contact_number || '—',
        r.purpose_of_visit || '—',
        r.product_of_interest || '—',
        r.remarks || '—'
      ];

      cols.forEach((col, cIdx) => {
        const val = rowValues[cIdx];
        ctx.textAlign = cIdx === 0 ? 'center' : 'left';
        const textX = cIdx === 0 ? cellX + col.w / 2 : cellX + 8;
        
        // Wrap or truncate text
        if (cIdx === 0) {
          ctx.font = 'bold 12px Inter, Arial';
          ctx.fillText(val, textX, curY + 40);
        } else if (cIdx === 1) {
          ctx.font = 'bold 12px Inter, Arial';
          ctx.fillStyle = '#E06D34';
          ctx.fillText(val.length > 28 ? val.substring(0, 26) + '...' : val, textX, curY + 38);
          ctx.fillStyle = '#3B2621';
        } else {
          ctx.font = '11px Inter, Arial';
          ctx.fillText(val.length > 22 ? val.substring(0, 20) + '...' : val, textX, curY + 38);
        }

        // Column line
        ctx.beginPath();
        ctx.moveTo(cellX + col.w, curY);
        ctx.lineTo(cellX + col.w, curY + rowHeight);
        ctx.strokeStyle = '#CBD5E1';
        ctx.stroke();

        cellX += col.w;
      });

      curY += rowHeight;
    });

    // 6. Footer Branding
    ctx.fillStyle = '#F8F3EA';
    ctx.fillRect(0, totalHeight - 50, width, 50);
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAFE SOLUTIONS FLEETOPS — ENTERPRISE OPERATIONS PLATFORM • FAISALABAD HQ', width / 2, totalHeight - 20);

    // Download PNG
    const link = document.createElement('a');
    link.download = `Safe_Solutions_Visit_Report_${targetDate}_${(targetSalesPerson || 'Report').replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast.success('📸 High-resolution Report Image generated & downloaded! You can now share it directly on WhatsApp.');
  };

  // Open WhatsApp Group link in new tab
  const openWhatsAppGroup = () => {
    if (!whatsappGroupLink) {
      toast.warning('WhatsApp Group link is not configured. Please ask Admin to set it in System Settings.');
      return;
    }
    window.open(whatsappGroupLink, '_blank');
  };

  const handleSubmit = async (e, sharePNG = false) => {
    e?.preventDefault?.();

    const validRows = rows.filter(r => r.project_location.trim() && r.purpose_of_visit.trim());
    if (validRows.length === 0) {
      toast.warning('Please enter Project Location and Purpose of Visit for at least one row.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = validRows.map(r => ({
        ...r,
        sales_person_name: salesPerson || user?.name,
        visit_date: visitDate
      }));

      await api.post('/visit-reports', { reports: payload });
      toast.success(`✅ ${validRows.length} Daily Visit Report(s) saved to database!`);

      // Always generate and download PNG when sharing
      if (sharePNG) {
        generateAndDownloadReportImage(validRows, salesPerson, visitDate);
        // Open WhatsApp Group link after short delay for PNG download
        setTimeout(() => {
          openWhatsAppGroup();
        }, 800);
      }

      // Reset form
      setRows([
        {
          project_location: '',
          client_name: '',
          contractor_name: '',
          architect_consultant: '',
          contact_number: '',
          purpose_of_visit: '',
          product_of_interest: '',
          remarks: ''
        }
      ]);
      fetchReports();
      setTab('history');
    } catch (err) {
      toast.error(err.message || 'Failed to submit visit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareExistingToWhatsApp = (r) => {
    generateAndDownloadReportImage([r], r.sales_person_name, new Date(r.visit_date).toISOString().split('T')[0]);
    setTimeout(() => {
      openWhatsAppGroup();
    }, 800);
  };

  const filteredReports = reports.filter(r => {
    const matchSearch = !searchTerm || 
      (r.project_location && r.project_location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.client_name && r.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.sales_person_name && r.sales_person_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.product_of_interest && r.product_of_interest.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchDate = !filterDate || r.visit_date === filterDate || (r.visit_date && r.visit_date.startsWith(filterDate));
    return matchSearch && matchDate;
  });

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #3B2621 0%, #E06D34 50%, #006A71 100%)', borderRadius: 14, color: '#fff', boxShadow: '0 4px 14px rgba(59, 38, 33, 0.25)' }}>
            <FileText size={24} />
          </div>
          <div>
            <h1 className="page-title" style={{ color: '#3B2621' }}>Daily Field Visit Report</h1>
            <p className="page-description">Digital Safe Solutions Visit Report • Picture / PDF Export & WhatsApp Dispatch</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => generateAndDownloadReportImage(rows, salesPerson, visitDate)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E06D34', borderColor: '#E06D34', fontWeight: 800 }}
          >
            <Download size={14} /> Export PNG Picture
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>📝 New Visit Report</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📊 Submitted Reports Registry ({reports.length})</button>
      </div>

      {/* ─── TAB 1: NEW VISIT REPORT ENTRY ─── */}
      {tab === 'new' && (
        <div className="animate-fade-in-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="card-elevated" style={{ border: '2px solid #3B2621', borderRadius: 20, padding: 24, background: '#fff' }}>
            
            {/* Header section matching Word Doc */}
            <div style={{ borderBottom: '2px solid #3B2621', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#3B2621', letterSpacing: '0.02em' }}>Safe Solutions</h2>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#E06D34', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>VISIT REPORT</div>
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#3B2621' }}>Sale Person:</span>
                    <input
                      type="text"
                      className="form-input"
                      value={salesPerson}
                      onChange={e => setSalesPerson(e.target.value)}
                      placeholder="Salesperson Name"
                      style={{ width: 200, fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#3B2621' }}>Date:</span>
                    <input
                      type="date"
                      className="form-input"
                      value={visitDate}
                      onChange={e => setVisitDate(e.target.value)}
                      style={{ width: 160, fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visit Entry Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {rows.map((row, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: 16,
                    background: index % 2 === 0 ? '#FAF6EE' : '#FFFFFF',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', background: '#006A71', padding: '3px 12px', borderRadius: 8 }}>
                      Visit Entry #{index + 1}
                    </span>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}
                      >
                        <Trash2 size={14} /> Remove Entry
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Project Name / Location *</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Kohinoor Plaza / Faisalabad"
                        value={row.project_location}
                        onChange={e => handleRowChange(index, 'project_location', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Client</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Crescent Bahuman Ltd"
                        value={row.client_name}
                        onChange={e => handleRowChange(index, 'client_name', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Contractor</label>
                      <input
                        className="form-input"
                        placeholder="e.g. BuildTech Construction"
                        value={row.contractor_name}
                        onChange={e => handleRowChange(index, 'contractor_name', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Architect / Consultant</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Arch. Salman Associates"
                        value={row.architect_consultant}
                        onChange={e => handleRowChange(index, 'architect_consultant', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Visit Person Contact Number</label>
                      <input
                        className="form-input"
                        placeholder="e.g. 0300-1234567"
                        value={row.contact_number}
                        onChange={e => handleRowChange(index, 'contact_number', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Purpose of Visit *</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Waterproofing demo, Quotation follow-up"
                        value={row.purpose_of_visit}
                        onChange={e => handleRowChange(index, 'purpose_of_visit', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Product of Interest</label>
                      <input
                        className="form-input"
                        placeholder="e.g. PU Membrane, Sealants, Chemicals"
                        value={row.product_of_interest}
                        onChange={e => handleRowChange(index, 'product_of_interest', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#3B2621' }}>Remarks / Meeting Outcome</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Sampling requested for Monday"
                        value={row.remarks}
                        onChange={e => handleRowChange(index, 'remarks', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Row Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addRow}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#006A71', border: '1px dashed #006A71', background: '#FAF6EE' }}
              >
                <Plus size={16} /> Add Another Visit Row
              </button>

              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                Total visits entered: <strong>{rows.length}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #E2E8F0', paddingTop: 20, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                onClick={() => generateAndDownloadReportImage(rows, salesPerson, visitDate)}
                style={{ background: '#FAF6EE', color: '#3B2621', border: '1px solid #3B2621', fontWeight: 800, padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ImageIcon size={16} color="#E06D34" /> 📸 Generate Picture (PNG)
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => handleSubmit(e, false)}
                disabled={submitting}
                style={{ background: '#3B2621', fontWeight: 800, padding: '12px 24px', borderRadius: 12 }}
              >
                {submitting ? 'Saving to Database...' : '💾 Save to Database'}
              </button>

              <button
                type="button"
                className="btn"
                onClick={(e) => handleSubmit(e, true)}
                disabled={submitting}
                style={{ background: '#25D366', color: '#fff', fontWeight: 800, padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)' }}
              >
                <Share2 size={18} /> Save, Download PNG & Open WhatsApp Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SUBMITTED REPORTS REGISTRY ─── */}
      {tab === 'history' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by project, client, salesperson, product..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Date:</span>
              <input
                type="date"
                className="form-input"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                style={{ width: 160 }}
              />
              {filterDate && (
                <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>Clear</button>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="table-container hide-on-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sale Person</th>
                  <th>Project Name / Location</th>
                  <th>Client</th>
                  <th>Contractor</th>
                  <th>Architect / Consultant</th>
                  <th>Contact Person</th>
                  <th>Purpose of Visit</th>
                  <th>Product of Interest</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(r => (
                  <tr key={r.id}>
                    <td><strong>{new Date(r.visit_date).toLocaleDateString('en-GB')}</strong></td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#3B2621' }}>{r.sales_person_name}</span>
                    </td>
                    <td><strong style={{ color: '#E06D34' }}>{r.project_location}</strong></td>
                    <td>{r.client_name || '—'}</td>
                    <td>{r.contractor_name || '—'}</td>
                    <td>{r.architect_consultant || '—'}</td>
                    <td>{r.contact_number ? <span style={{ color: '#006A71', fontWeight: 700 }}>📞 {r.contact_number}</span> : '—'}</td>
                    <td><div style={{ maxWidth: 200, fontSize: 12 }}>{r.purpose_of_visit}</div></td>
                    <td>{r.product_of_interest ? <span style={{ background: '#FAF6EE', color: '#E06D34', border: '1px solid #E06D34', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>{r.product_of_interest}</span> : '—'}</td>
                    <td><div style={{ maxWidth: 180, fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>{r.remarks || '—'}</div></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => generateAndDownloadReportImage([r], r.sales_person_name, new Date(r.visit_date).toISOString().split('T')[0])}
                          title="Download PNG Picture of this report"
                          style={{ color: '#006A71', fontWeight: 700, padding: '4px 8px' }}
                        >
                          <Download size={13} /> PNG
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleShareExistingToWhatsApp(r)}
                          title="Download PNG and open WhatsApp Group"
                          style={{ color: '#25D366', fontWeight: 700, padding: '4px 8px' }}
                        >
                          <Share2 size={13} /> Share
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                      No visit reports found. Click "New Visit Report" to add one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="show-on-mobile">
            <div className="mobile-card-list">
              {filteredReports.map(r => (
                <div key={`mvis_${r.id}`} className="mobile-record-card" style={{ borderLeft: '4px solid #E06D34' }}>
                  <div className="mobile-card-header">
                    <div>
                      <div className="mobile-card-title" style={{ color: '#E06D34' }}>{r.project_location}</div>
                      <div className="mobile-card-subtitle">
                        {new Date(r.visit_date).toLocaleDateString('en-GB')} • {r.sales_person_name}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-cell">
                      <span className="mobile-card-label">Client</span>
                      <span className="mobile-card-value">{r.client_name || '—'}</span>
                    </div>

                    <div className="mobile-card-cell">
                      <span className="mobile-card-label">Contractor</span>
                      <span className="mobile-card-value">{r.contractor_name || '—'}</span>
                    </div>

                    <div className="mobile-card-cell" style={{ gridColumn: 'span 2' }}>
                      <span className="mobile-card-label">Purpose of Visit</span>
                      <span className="mobile-card-value">{r.purpose_of_visit}</span>
                    </div>

                    {r.product_of_interest && (
                      <div className="mobile-card-cell" style={{ gridColumn: 'span 2' }}>
                        <span className="mobile-card-label">Product of Interest</span>
                        <span className="mobile-card-value" style={{ color: '#E06D34' }}>{r.product_of_interest}</span>
                      </div>
                    )}

                    {r.contact_number && (
                      <div className="mobile-card-cell" style={{ gridColumn: 'span 2' }}>
                        <span className="mobile-card-label">Contact</span>
                        <span className="mobile-card-value" style={{ color: '#006A71' }}>📞 {r.contact_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="mobile-card-footer" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => generateAndDownloadReportImage([r], r.sales_person_name, new Date(r.visit_date).toISOString().split('T')[0])}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                    >
                      <Download size={14} /> PNG Picture
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleShareExistingToWhatsApp(r)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#25D366', borderColor: '#25D366', fontWeight: 700 }}
                    >
                      <Share2 size={14} /> WhatsApp
                    </button>
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 && (
                <div className="card-elevated" style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                  No visit reports found. Click "New Visit Report" to add one!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
