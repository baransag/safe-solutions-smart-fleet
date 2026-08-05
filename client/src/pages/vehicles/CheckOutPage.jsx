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
  const [checking, setChecking] = useState(true);

  const [scannedVehicle, setScannedVehicle] = useState(null);
  const [gps, setGps] = useState(null);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [meterBlob, setMeterBlob] = useState(null);
  const [meterPreview, setMeterPreview] = useState(null);
  const [meterReading, setMeterReading] = useState('');
  const [checkoutResult, setCheckoutResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const data = await api.get('/checkins/today');
      setTodayStatus(data);
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
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStep(2); setLoading(false); toast.success('GPS captured'); },
      (err) => { toast.error('GPS error: ' + err.message); setLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSubmit() {
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
      toast.success('Check-out submitted!');
      setStep(5);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  if (!todayStatus?.hasCheckedIn) {
    return (
      <div className="page">
        <div className="checkin-complete-card card-elevated">
          <AlertTriangle size={48} style={{ color: 'var(--color-warning)' }} />
          <h2>No Check-in Found</h2>
          <p>You need to check in first before checking out.</p>
          <a href="/check-in" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>Go to Check-in</a>
        </div>
      </div>
    );
  }

  if (todayStatus?.hasCheckedOut) {
    return (
      <div className="page">
        <div className="checkin-complete-card card-elevated animate-scale-in">
          <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
          <h2>Already Checked Out</h2>
          <p>You've completed your vehicle session for today.</p>
        </div>
      </div>
    );
  }

  if (step === 5 && checkoutResult) {
    return (
      <div className="page">
        <div className="checkin-complete-card card-elevated animate-scale-in">
          <CheckCircle2 size={56} style={{ color: 'var(--color-success)' }} />
          <h2>Check-out Complete!</h2>
          <div className="checkin-summary" style={{ marginTop: 'var(--space-4)' }}>
            <div className="summary-row"><span>Opening KM</span><span>{parseFloat(checkoutResult.opening_km).toLocaleString()}</span></div>
            <div className="summary-row"><span>Closing KM</span><span>{parseFloat(checkoutResult.closing_km).toLocaleString()}</span></div>
            <div className="summary-row" style={{ fontWeight: 700 }}>
              <span><TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />Today's Distance</span>
              <span style={{ color: 'var(--color-primary-orange)' }}>{parseFloat(checkoutResult.distance_km).toLocaleString()} km</span>
            </div>
            <div className="summary-row">
              <span><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />Duration</span>
              <span>{Math.floor(checkoutResult.duration_minutes / 60)}h {checkoutResult.duration_minutes % 60}m</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page checkin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Check-out</h1>
          <p className="page-description">Evening vehicle return</p>
        </div>
      </div>

      <div className="stepper">
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className={`stepper-step ${i === step ? 'active' : i < step ? 'completed' : ''}`}>
              <div className="stepper-circle">{i < step ? <CheckCircle2 size={16} /> : i + 1}</div>
              <span className="stepper-label">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`stepper-line ${i < step ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="checkin-step-content animate-fade-in-up">
        {step === 0 && <QRStep onScan={handleQRScan} checkinInfo={todayStatus?.checkin} />}
        {step === 1 && <GPSStep onCapture={captureGPS} loading={loading} />}
        {step === 2 && <CameraStep label="Take Selfie" onCapture={(b, p) => { setSelfieBlob(b); setStep(3); }} />}
        {step === 3 && <CameraStep label="Capture Meter Photo" onCapture={(b, p) => { setMeterBlob(b); setMeterPreview(p); setStep(4); }} />}
        {step === 4 && (
          <div className="step-card card-elevated">
            <h3><CheckCircle2 size={20} /> Confirm & Submit</h3>
            {meterPreview && <img src={meterPreview} alt="Meter" style={{ width: '100%', maxWidth: 300, borderRadius: 'var(--radius-md)', margin: 'var(--space-4) auto', display: 'block' }} />}
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Closing Meter Reading (KM) *</label>
              <input className="form-input" type="number" step="0.1" placeholder="Enter closing odometer" value={meterReading} onChange={(e) => setMeterReading(e.target.value)}
                     style={{ fontSize: 'var(--text-xl)', fontWeight: 700, textAlign: 'center' }} autoFocus />
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Opening: {parseFloat(todayStatus?.checkin?.meter_reading || 0).toLocaleString()} km
            </p>
            <button className="btn btn-teal btn-lg" onClick={handleSubmit} disabled={loading || !meterReading} style={{ width: '100%', marginTop: 'var(--space-6)' }}>
              {loading ? 'Submitting...' : 'Submit Check-out'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QRStep({ onScan, checkinInfo }) {
  const html5QrRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('qr-reader-out');
      html5QrRef.current = scanner;
      scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScan, () => {}).catch(err => {
        console.warn('QR scanner notice:', err);
        setCameraError(true);
      });
    });
    return () => { html5QrRef.current?.stop().catch(() => {}); };
  }, []);

  const handleQuickVerify = () => {
    if (!checkinInfo) return;
    const payload = JSON.stringify({
      system: 'SAFE_SOLUTIONS',
      vehicleId: checkinInfo.vehicle_id || 'VH-001',
      name: `${checkinInfo.vehicle_name || 'Company Bike'}`,
      numberPlate: checkinInfo.number_plate
    });
    onScan(payload);
  };

  return (
    <div className="step-card card-elevated" style={{ textAlign: 'center' }}>
      <h3><QrCode size={20} /> Scan Vehicle QR Code</h3>
      <p>Scan your vehicle QR or use quick verification to begin checkout</p>
      <div id="qr-reader-out" style={{ width: '100%', maxWidth: 400, margin: 'var(--space-4) auto', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
      
      {cameraError && (
        <div style={{
          padding: 'var(--space-3)', background: 'rgba(230, 118, 45, 0.1)', border: '1px solid var(--color-primary-orange)',
          borderRadius: 'var(--radius-md)', margin: 'var(--space-4) auto', maxWidth: 400, color: 'var(--text-primary)', fontSize: 'var(--text-sm)'
        }}>
          📷 Web camera not active. Click the verification button below:
        </div>
      )}

      {checkinInfo && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleQuickVerify} style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
            <QrCode size={18} /> Verify Vehicle ({checkinInfo.number_plate})
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
