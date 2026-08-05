import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck, MapPin, Car, Clock, Camera, FileText, UserCheck, Search, Filter } from 'lucide-react';

export default function ApprovalCenterPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [remarks, setRemarks] = useState({});
  
  // Master pending requests queue for Manager & Controller Approval Center
  const [requests, setRequests] = useState([
    {
      id: 'REQ-101',
      type: 'vehicle_attendance',
      attendance_type_label: 'Vehicle Attendance',
      employee_id: 'EMP010',
      employee_name: 'M. Zahid',
      designation: 'Helper',
      avatar: '/assets/images/Zahid.jpeg',
      assigned_vehicle: 'Company Bike',
      number_plate: 'FDL-6381-07',
      date: 'Aug 5, 2026',
      time: '08:45 AM',
      gps: '31.4504° N, 73.1350° E (Faisalabad)',
      selfie_url: '/assets/images/Zahid.jpeg',
      meter_photo: '/assets/images/hero-2.jpeg',
      odometer: '7,800 KM',
      notes: 'Morning helper check-in for vehicle dispatch & site application',
      status: 'pending_approval'
    },
    {
      id: 'REQ-102',
      type: 'office_attendance',
      attendance_type_label: 'Office Attendance',
      employee_id: 'EMP003',
      employee_name: 'Engr. Shahzaib Ahmad',
      designation: 'Marketing Executive',
      avatar: '/assets/images/Shahzaib.jpeg',
      assigned_vehicle: 'Company Bike',
      number_plate: 'BBE-5688',
      date: 'Aug 5, 2026',
      time: '08:30 AM',
      gps: '31.4510° N, 73.1340° E (HQ Office)',
      selfie_url: '/assets/images/Shahzaib.jpeg',
      meter_photo: null,
      odometer: '15,200 KM',
      notes: 'Office arrival for client presentation',
      status: 'pending_approval'
    },
    {
      id: 'REQ-103',
      type: 'site_attendance',
      attendance_type_label: 'Site Attendance',
      employee_id: 'EMP004',
      employee_name: 'Shahbaz Ahmed',
      designation: 'Application Supervisor',
      avatar: '/assets/images/Shahbaz.jpeg',
      assigned_vehicle: 'Company / Personal Bike',
      number_plate: 'AGN-1227-21',
      date: 'Aug 5, 2026',
      time: '09:15 AM',
      gps: '31.4200° N, 73.0800° E (Industrial Area)',
      selfie_url: '/assets/images/Shahbaz.jpeg',
      meter_photo: '/assets/images/hero-4.jpeg',
      odometer: '12,450 KM',
      notes: 'On-site application supervision at Client Plant #4',
      status: 'pending_approval'
    },
    {
      id: 'REQ-104',
      type: 'fuel_request',
      attendance_type_label: 'Fuel Expense Request',
      employee_id: 'EMP007',
      employee_name: 'Adnan Ali',
      designation: 'Area Sales Manager',
      avatar: '/assets/images/Adnan-Ali.jpeg',
      assigned_vehicle: 'Company Car',
      number_plate: 'AHV-378',
      date: 'Aug 5, 2026',
      time: '10:00 AM',
      gps: '31.4300° N, 73.1100° E (Shell Station)',
      selfie_url: null,
      meter_photo: '/assets/images/hero-3.jpeg',
      odometer: '11,200 KM',
      fuel_liters: '25.0 L',
      fuel_amount: 'Rs. 7,250',
      notes: 'Full tank refuel for outstation client visits',
      status: 'pending_approval'
    }
  ]);

  const handleAction = (reqId, actionType) => {
    const remarkText = remarks[reqId] || '';
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        let newStatus = 'pending_approval';
        if (actionType === 'approve') newStatus = 'approved';
        if (actionType === 'reject') newStatus = 'rejected';
        if (actionType === 'resubmit') newStatus = 'needs_resubmission';
        return { ...req, status: newStatus, manager_remark: remarkText };
      }
      return req;
    }));

    if (actionType === 'approve') {
      toast.success(`Request ${reqId} Approved! Status updated to Approved / Present.`);
    } else if (actionType === 'reject') {
      toast.error(`Request ${reqId} Rejected! Notification sent to employee.`);
    } else if (actionType === 'resubmit') {
      toast.info(`Resubmission requested for ${reqId}. Employee notified to revise.`);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'pending') return req.status === 'pending_approval';
    if (activeTab === 'approved') return req.status === 'approved';
    if (activeTab === 'rejected') return req.status === 'rejected';
    if (activeTab === 'resubmit') return req.status === 'needs_resubmission';
    return true;
  });

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 10, background: 'linear-gradient(135deg, #021C4F 0%, #C50337 100%)', borderRadius: 12, color: '#fff' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="page-title">Approval Center</h1>
              <p className="page-description">Review & Action Manager / Controller Attendance & Fuel Approvals</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-warning" style={{ fontSize: 13, padding: '8px 14px', background: 'rgba(245, 158, 11, 0.15)', color: '#D97706', fontWeight: 700 }}>
            ⏳ {requests.filter(r => r.status === 'pending_approval').length} Pending Requests
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 12, overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'all' ? '#021C4F' : '#f0f4f8', color: activeTab === 'all' ? '#fff' : '#666'
          }}
        >
          All Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'pending' ? '#D97706' : '#f0f4f8', color: activeTab === 'pending' ? '#fff' : '#666'
          }}
        >
          ⏳ Pending ({requests.filter(r => r.status === 'pending_approval').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'approved' ? '#10B981' : '#f0f4f8', color: activeTab === 'approved' ? '#fff' : '#666'
          }}
        >
          ✅ Approved ({requests.filter(r => r.status === 'approved').length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'rejected' ? '#EF4444' : '#f0f4f8', color: activeTab === 'rejected' ? '#fff' : '#666'
          }}
        >
          ❌ Rejected ({requests.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {/* Requests Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {filteredRequests.map(req => (
          <div key={req.id} className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 20, border: '1px solid rgba(2, 28, 79, 0.1)' }}>
            {/* Header / Employee Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img
                  src={req.avatar}
                  alt={req.employee_name}
                  style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #021C4F' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#021C4F' }}>{req.employee_name}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>{req.designation} • ID: {req.employee_id}</p>
                </div>
              </div>

              <span className={`badge badge-${req.status === 'approved' ? 'green' : req.status === 'rejected' ? 'red' : req.status === 'needs_resubmission' ? 'purple' : 'yellow'}`} style={{ fontWeight: 700 }}>
                {req.status === 'approved' ? '✅ Approved' : req.status === 'rejected' ? '❌ Rejected' : req.status === 'needs_resubmission' ? '🔄 Needs Resubmit' : '⏳ Pending Review'}
              </span>
            </div>

            {/* Request Meta Details */}
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Request Type</span>
                <span style={{ fontWeight: 700, color: '#021C4F' }}>{req.attendance_type_label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Assigned Vehicle</span>
                <span style={{ fontWeight: 700, color: '#C50337' }}>{req.assigned_vehicle} ({req.number_plate})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Original Check-in Time</span>
                <span style={{ fontWeight: 600 }}>{req.date} at {req.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>GPS Verification</span>
                <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>📍 {req.gps}</span>
              </div>
              {req.odometer && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Odometer Reading</span>
                  <span style={{ fontWeight: 700, color: '#10B981' }}>{req.odometer}</span>
                </div>
              )}
            </div>

            {/* Photo Previews */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {req.selfie_url && (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#64748b' }}>Live Selfie Photo</p>
                  <img src={req.selfie_url} alt="Selfie" style={{ width: '100%', height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                </div>
              )}
              {req.meter_photo && (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#64748b' }}>Meter / Receipt Photo</p>
                  <img src={req.meter_photo} alt="Meter" style={{ width: '100%', height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                </div>
              )}
            </div>

            {/* Work Notes */}
            <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', margin: '0 0 14px', background: '#fff', padding: 8, borderRadius: 6, border: '1px border-dashed #cbd5e1' }}>
              💬 "{req.notes}"
            </p>

            {/* Manager Remarks Input */}
            {req.status === 'pending_approval' ? (
              <div>
                <input
                  type="text"
                  placeholder="Add Controller / Manager remarks..."
                  value={remarks[req.id] || ''}
                  onChange={(e) => setRemarks({ ...remarks, [req.id]: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                    fontSize: 12, marginBottom: 12
                  }}
                />

                {/* 3 Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <button
                    onClick={() => handleAction(req.id, 'approve')}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#10B981', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'reject')}
                    className="btn btn-danger btn-sm"
                    style={{ background: '#EF4444', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'resubmit')}
                    className="btn btn-secondary btn-sm"
                    style={{ background: '#8B5CF6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <RotateCcw size={14} /> Resubmit
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 10, background: '#f1f5f9', borderRadius: 8, fontSize: 11, color: '#475569' }}>
                <strong>Decision Remarks:</strong> {req.manager_remark || 'Action completed cleanly by Controller.'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
