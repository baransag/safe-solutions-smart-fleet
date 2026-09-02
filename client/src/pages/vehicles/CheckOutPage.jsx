import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import {
  QrCode, MapPin, Camera, ScanLine, CheckCircle2,
  AlertTriangle, Route, TrendingUp, Clock
} from 'lucide-react';
import './CheckInPage.css';

const STEPS = ['Scan QR', 'GPS', 'Selfie', 'Meter Photo', 'Confirm'];

export default function CheckOutPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [checking, setChecking] = useState(true);
  const [attOnlyMode, setAttOnlyMode] = useState(false);

  const [scannedVehicle, setScannedVehicle] = useState(null);
  const [gps, setGps] = useState(null);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [meterBlob, setMeterBlob] = useState(null);
  const [meterPreview, setMeterPreview] = useState(null);
  const [meterReading, setMeterReading] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [attCheckoutResult, setAttCheckoutResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const [vData, aData] = await Promise.all([
        api.get('/checkins/today').catch(() => null),
        api.get('/attendance/today').catch(() => null)
      ]);
      setTodayStatus(vData);
      setTodayAttendance(aData?.attendance || null);
    } catch {
    } finally {
      setChecking(false);
    }
  }

  function handleQRScan(decodedText) {
    try {
      const data = JSON.parse(decodedText);
      if (data.system !== 'SAFE_SOLUTIONS') { toast.error('Invalid QR'); return; }
      setScannedVehicle(data);
      toast.success(`Vehicle verified: ${data.name}`);
      setStep(1);
    } catch { toast.error('Invalid QR code'); }
  }

  function captureGPS() {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStep(attOnlyMode ? 4 : 2);
        setLoading(false);
        toast.success('GPS captured');
      },
      (err) => {
        // Fallback default coordinates if GPS permission denied
        setGps({ lat: 31.4504, lng: 73.1350 });
        setStep(attOnlyMode ? 4 : 2);
        setLoading(false);
        toast.warning('Using approximate GPS location');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleAttendanceOnlySubmit() {
    setLoading(true);
    try {
      const payload = {
        lat: gps?.lat || 31.4504,
        lng: gps?.lng || 73.1350,
        notes: checkoutNotes
      };
      const res = await api.post('/attendance/vehicle-checkout', payload);
      setAttCheckoutResult(res.attendance);
      toast.success(res.message || 'Attendance Check-Out completed successfully!');
      setStep(5);
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Attendance check-out failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (attOnlyMode) {
      return handleAttendanceOnlySubmit();
    }

    if (!meterReading) { toast.warning('Enter the meter reading'); return; }
    setLoading(true);
    try {
      const vehiclesData = await api.get('/vehicles');
      const matched = vehiclesData.vehicles?.find(v => v.vehicle_id === scannedVehicle?.vehicleId);
      if (!matched) { toast.error('Vehicle not found'); setLoading(false); return; }

      const formData = new FormData();
      formData.append('vehicle_id', matched.id);
      formData.append('gps_lat', gps?.lat || '');
      formData.append('gps_lng', gps?.lng || '');
      formData.append('meter_reading', meterReading);
      if (selfieBlob) formData.append('selfie', selfieBlob, 'selfie.jpg');
      if (meterBlob) formData.append('meter_photo', meterBlob, 'meter.jpg');

      const result = await api.upload('/checkins/vehicle-checkout', formData);
      setCheckoutResult(result.checkout);
      if (result.checkout?.attendance_checkout) {
        setAttCheckoutResult(result.checkout.attendance_checkout);
      }
      toast.success('Check-out submitted successfully!');
      setStep(5);
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  // Case 1: Completed screen
  if (step === 5) {
    return (
      <div className="page">
        <div className="checkin-complete-card card-elevated animate-scale-in">
          <CheckCircle2 size={56} style={{ color: 'var(--color-success)' }} />
          <h2>Check-out Complete!</h2>

          {checkoutResult && (
            <div className="checkin-summary" style={{ marginTop: 'var(--space-4)' }}>
              <div className="summary-row"><span>Opening KM</span><span>{parseFloat(checkoutResult.opening_km).toLocaleString()}</span></div>
              <div className="summary-row"><span>Closing KM</span><span>{parseFloat(checkoutResult.closing_km).toLocaleString()}</span></div>
              <div className="summary-row" style={{ fontWeight: 700 }}>
                <span><TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />Today's Distance</span>
                <span style={{ color: 'var(--color-primary-orange)' }}>{parseFloat(checkoutResult.distance_km).toLocaleString()} km</span>
              </div>
              <div className="summary-row">
                <span><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />Vehicle Duration</span>
                <span>{Math.floor(checkoutResult.duration_minutes / 60)}h {checkoutResult.duration_minutes % 60}m</span>
              </div>
            </div>
          )}

          {attCheckoutResult && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                ✓ Attendance Check-Out Synchronized
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Status: {attCheckoutResult.approval_status === 'approved' ? 'Approved' : 'Pending Approval'}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="/dashboard" className="btn btn-secondary">Go to Dashboard</a>
            <a href="/attendance" className="btn btn-primary">View Attendance</a>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: No vehicle check-in found
  if (!todayStatus?.hasCheckedIn && !attOnlyMode) {
    const hasOpenAttendance = todayAttendance && !todayAttendance.check_out_time;
    const hasCheckedOutAttendance = todayAttendance && todayAttendance.check_out_time;

    return (
      <div className="page">
        <div className="checkin-complete-card card-elevated">
          {hasOpenAttendance ? (
            <>
              <div className="avatar avatar-lg" style={{ background: 'rgba(15, 110, 119, 0.1)', color: 'var(--color-deep-teal)', margin: '0 auto 16px' }}>
                <Route size={32} />
              </div>
              <h2>Attendance Check-Out via Bike QR</h2>
              <p style={{ maxWidth: 460, margin: '8px auto 16px', color: 'var(--text-secondary)' }}>
                You have active <strong>{todayAttendance.attendance_type === 'office' ? '🏢 Office Attendance' : '🏗️ Site Attendance'}</strong> open for today ({todayAttendance.location_name || todayAttendance.project_name || 'Head Office'}).
                You can submit your attendance check-out using your assigned Bike QR code.
              </p>
              <button
                className="btn btn-teal btn-lg"
                onClick={() => { setAttOnlyMode(true); setStep(0); }}
                style={{ margin: '8px auto', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <QrCode size={20} /> Scan Bike QR for Attendance Check-Out
              </button>
            </>
          ) : hasCheckedOutAttendance ? (
            <>
              <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
              <h2>Attendance Already Checked Out</h2>
              <p>
                Attendance already checked out today at {new Date(todayAttendance.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}.
              </p>
              <a href="/attendance" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>Go to Attendance</a>
            </>
          ) : (
            <>
              <AlertTriangle size={48} style={{ color: 'var(--color-warning)' }} />
              <h2>No Active Attendance or Vehicle Check-in</h2>
              <p>No active attendance check-in found for today. Please complete Check-In first.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                <a href="/attendance" className="btn btn-primary">Go to Attendance Check-In</a>
                <a href="/check-in" className="btn btn-secondary">Vehicle Check-In</a>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Case 3: Vehicle session already checked out
  if (todayStatus?.hasCheckedOut && !attOnlyMode) {
    return (
      <div className="page">
        <div className="checkin-complete-card card-elevated animate-scale-in">
          <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
          <h2>Already Checked Out</h2>
          <p>You've completed your vehicle session for today.</p>
          {todayAttendance?.check_out_time && (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Attendance checked out at {new Date(todayAttendance.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}.
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentSteps = attOnlyMode ? ['Scan Bike QR', 'GPS Location', 'Confirm Check-Out'] : STEPS;

  return (
    <div className="page checkin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{attOnlyMode ? 'Attendance Check-Out via Bike QR' : 'Vehicle Check-out'}</h1>
          <p className="page-description">{attOnlyMode ? 'Evening attendance departure scan' : 'Evening vehicle return & attendance checkout'}</p>
        </div>
      </div>

      <div className="stepper">
        {currentSteps.map((label, i) => {
          const stepIndex = attOnlyMode ? (i === 0 ? 0 : i === 1 ? 1 : 4) : i;
          const isActive = step === stepIndex;
          const isCompleted = step > stepIndex;
          return (
            <div key={i} style={{ display: 'contents' }}>
              <div className={`stepper-step ${isActive ? 'active' : isCompleted ? 'completed' : ''}`}>
                <div className="stepper-circle">{isCompleted ? <CheckCircle2 size={16} /> : i + 1}</div>
                <span className="stepper-label">{label}</span>
              </div>
              {i < currentSteps.length - 1 && <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />}
            </div>
          );
        })}
      </div>

      <div className="checkin-step-content animate-fade-in-up">
        {step === 0 && <QRStep onScan={handleQRScan} checkinInfo={todayStatus?.checkin} isAttOnly={attOnlyMode} />}
        {step === 1 && <GPSStep onCapture={captureGPS} loading={loading} />}
        {step === 2 && !attOnlyMode && <CameraStep label="Take Selfie" onCapture={(b, p) => { setSelfieBlob(b); setStep(3); }} />}
        {step === 3 && !attOnlyMode && <CameraStep label="Capture Meter Photo" onCapture={(b, p) => { setMeterBlob(b); setMeterPreview(p); setStep(4); }} />}
        {step === 4 && (
          <div className="step-card card-elevated">
            <h3><CheckCircle2 size={20} /> Confirm & Submit Check-Out</h3>

            {/* Attendance Status Box */}
            {todayAttendance && !todayAttendance.check_out_time ? (
              <div style={{ margin: '16px 0', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Completing Today's Attendance Check-Out
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  {todayAttendance.attendance_type === 'office' ? '🏢 Office Attendance' : '🏗️ Site Attendance'} • {todayAttendance.location_name || todayAttendance.project_name || 'Head Office'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Check-In: {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              </div>
            ) : todayAttendance?.check_out_time ? (
              <div style={{ margin: '16px 0', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)' }}>
                ℹ️ Today's attendance was already checked out at {new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}.
              </div>
            ) : (
              <div style={{ margin: '16px 0', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, textAlign: 'left', fontSize: 12, color: 'var(--text-tertiary)' }}>
                ℹ️ No active employee attendance check-in found for today.
              </div>
            )}

            {!attOnlyMode && (
              <>
                {meterPreview && <img src={meterPreview} alt="Meter" style={{ width: '100%', maxWidth: 300, borderRadius: 'var(--radius-md)', margin: 'var(--space-4) auto', display: 'block' }} />}
                <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                  <label className="form-label">Closing Meter Reading (KM) *</label>
                  <input className="form-input" type="number" step="0.1" placeholder="Enter closing odometer" value={meterReading} onChange={(e) => setMeterReading(e.target.value)}
                         style={{ fontSize: 'var(--text-xl)', fontWeight: 700, textAlign: 'center' }} autoFocus />
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                  Opening: {parseFloat(todayStatus?.checkin?.meter_reading || 0).toLocaleString()} km
                </p>
              </>
            )}

            <div className="form-group" style={{ marginTop: 12, textAlign: 'left' }}>
              <label className="form-label">Optional Departure Notes:</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Returned from site duty..."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
              />
            </div>

            <button
              className="btn btn-teal btn-lg"
              onClick={handleSubmit}
              disabled={loading || (!attOnlyMode && !meterReading)}
              style={{ width: '100%', marginTop: 'var(--space-6)' }}
            >
              {loading ? 'Submitting Check-out...' : attOnlyMode ? 'Submit Attendance Check-out' : 'Submit Vehicle & Attendance Check-out'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QRStep({ onScan, checkinInfo, isAttOnly }) {
  const html5QrRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [myAssignment, setMyAssignment] = useState(null);

  useEffect(() => {
    if (!checkinInfo) {
      api.get('/vehicle-assignments/my').then(res => {
        if (res?.assignment) setMyAssignment(res.assignment);
      }).catch(() => {});
    }

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('qr-reader-out');
      html5QrRef.current = scanner;
      scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScan, () => {}).catch(err => {
        console.warn('QR scanner notice:', err);
        setCameraError(true);
      });
    });
    return () => { html5QrRef.current?.stop().catch(() => {}); };
  }, [checkinInfo]);

  const activeVehicle = checkinInfo || myAssignment;

  const handleQuickVerify = () => {
    if (!activeVehicle) return;
    const payload = JSON.stringify({
      system: 'SAFE_SOLUTIONS',
      vehicleId: activeVehicle.vehicle_id || activeVehicle.v_id || 'VH-001',
      name: `${activeVehicle.vehicle_name || activeVehicle.name || 'Company Bike'}`,
      numberPlate: activeVehicle.number_plate
    });
    onScan(payload);
  };

  return (
    <div className="step-card card-elevated" style={{ textAlign: 'center' }}>
      <h3><QrCode size={20} /> {isAttOnly ? 'Scan Bike QR Code' : 'Scan Vehicle QR Code'}</h3>
      <p>{isAttOnly ? 'Scan your assigned bike QR or click verify to proceed with attendance check-out' : 'Scan your vehicle QR or use quick verification to begin checkout'}</p>
      <div id="qr-reader-out" style={{ width: '100%', maxWidth: 400, margin: 'var(--space-4) auto', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
      
      {cameraError && (
        <div style={{
          padding: 'var(--space-3)', background: 'rgba(230, 118, 45, 0.1)', border: '1px solid var(--color-primary-orange)',
          borderRadius: 'var(--radius-md)', margin: 'var(--space-4) auto', maxWidth: 400, color: 'var(--text-primary)', fontSize: 'var(--text-sm)'
        }}>
          📷 Web camera not active. Click the verification button below:
        </div>
      )}

      {activeVehicle && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleQuickVerify} style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
            <QrCode size={18} /> Verify Bike ({activeVehicle.number_plate})
          </button>
        </div>
      )}
    </div>
  );
}

function GPSStep({ onCapture, loading }) {
  return (
    <div className="step-card card-elevated">
      <h3><MapPin size={20} /> Capture GPS Location</h3>
      <button className="btn btn-primary btn-lg" onClick={onCapture} disabled={loading} style={{ width: '100%', marginTop: 'var(--space-4)' }}>
        {loading ? 'Capturing...' : 'Capture Location'}
      </button>
    </div>
  );
}

function CameraStep({ label, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [captured, setCaptured] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(() => {});
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  function capture() {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(blob => { const preview = c.toDataURL('image/jpeg', 0.8); setCaptured(preview); streamRef.current?.getTracks().forEach(t => t.stop()); onCapture(blob, preview); }, 'image/jpeg', 0.8);
  }

  if (captured) return <div className="step-card card-elevated"><CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} /><p>Photo captured ✓</p></div>;

  return (
    <div className="step-card card-elevated">
      <h3><Camera size={20} /> {label}</h3>
      <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', maxWidth: 400, margin: 'var(--space-4) auto', background: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
      </div>
      <button className="btn btn-primary btn-lg" onClick={capture} style={{ width: '100%', maxWidth: 400, margin: 'var(--space-4) auto 0', display: 'block' }}>
        <Camera size={18} /> Capture
      </button>
    </div>
  );
}
