import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, X, AlertCircle } from 'lucide-react';

export default function EmployeeQRScanner({ isOpen, onClose, onScanSuccess, title = 'Scan Attendance QR Code' }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanError, setScanError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrcodeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initCameraScanner() {
      try {
        setScanError(null);
        setIsScanning(true);

        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setScanError('No camera found on this device. Please allow camera permissions.');
          setIsScanning(false);
          return;
        }

        setCameras(devices);

        // Find environment/back camera by default
        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('0')
        );

        const chosenCameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(chosenCameraId);

        startScannerWithCamera(chosenCameraId);
      } catch (err) {
        if (!isMounted) return;
        setScanError(err.message || 'Failed to initialize camera scanner.');
        setIsScanning(false);
      }
    }

    initCameraScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('QR scanner cleanup:', e);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  const startScannerWithCamera = async (cameraId) => {
    await stopScanner();

    try {
      const qrScanner = new Html5Qrcode('employee-qr-reader');
      html5QrcodeRef.current = qrScanner;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      await qrScanner.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' },
        config,
        (decodedText) => {
          stopScanner();
          onScanSuccess(decodedText);
        },
        () => {} // silent on frame errors
      );

      setIsScanning(true);
    } catch (err) {
      // Fallback attempt with environment facingMode if exact cameraId fails
      try {
        const qrScanner = new Html5Qrcode('employee-qr-reader');
        html5QrcodeRef.current = qrScanner;
        await qrScanner.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            stopScanner();
            onScanSuccess(decodedText);
          },
          () => {}
        );
        setIsScanning(true);
      } catch (fallbackErr) {
        setScanError(`Camera error: ${err.message || fallbackErr.message}`);
        setIsScanning(false);
      }
    }
  };

  const handleCameraChange = (e) => {
    const newCamId = e.target.value;
    setSelectedCameraId(newCamId);
    startScannerWithCamera(newCamId);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => { stopScanner(); onClose(); }}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0F2B5B' }}>
            <Camera size={20} color="#D42D56" /> {title}
          </h3>
          <button className="btn-icon" onClick={() => { stopScanner(); onClose(); }} style={{ background: '#f1f5f9', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
          Align the Office or Site QR Code within the camera box below. Back camera is open by default.
        </p>

        {/* Multi-Camera Selector */}
        {cameras.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Switch Camera Device:
            </label>
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cam.id.substring(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scanner Container */}
        <div
          id="employee-qr-reader"
          style={{
            width: '100%',
            minHeight: 280,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#0f172a',
            border: '2px solid #0F2B5B',
            position: 'relative'
          }}
        />

        {scanError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: 12, borderRadius: 8, marginTop: 14, color: '#991b1b', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} />
            <span>{scanError}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { stopScanner(); onClose(); }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
