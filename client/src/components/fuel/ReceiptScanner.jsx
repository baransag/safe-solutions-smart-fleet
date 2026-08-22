import { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, X, Sparkles, AlertTriangle, CheckCircle2, Eye, Upload, FileText } from 'lucide-react';

/**
 * Clean Slip Scanner with Dual Upload Mode (Camera + Device File Upload) & Side-by-Side Slip Checker
 */
export default function ReceiptScanner({ onCaptureComplete, assignedVehicleName }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);

  const [rawImageBlob, setRawImageBlob] = useState(null);
  const [rawImagePreview, setRawImagePreview] = useState(null);

  // Camera handling
  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      }).catch(async () => {
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      });

      streamRef.current = stream;
      setActive(true);
    } catch (err) {
      console.warn('Camera stream notice:', err.message);
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        setError('Camera unavailable. Please use the Upload File button.');
      }
    }
  }

  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [active]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setRawImageBlob(file);
        setRawImagePreview(evt.target.result);
        onCaptureComplete({
          rawBlob: file,
          processedBlob: file,
          rawPreview: evt.target.result,
          processedPreview: evt.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  }

  function snapPhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      const preview = canvas.toDataURL('image/jpeg', 0.92);
      stopCamera();
      setRawImageBlob(blob);
      setRawImagePreview(preview);
      onCaptureComplete({
        rawBlob: blob,
        processedBlob: blob,
        rawPreview: preview,
        processedPreview: preview
      });
    }, 'image/jpeg', 0.92);
  }

  function resetScanner() {
    setRawImageBlob(null);
    setRawImagePreview(null);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* STEP 1: INITIAL CAMERA / UPLOAD SELECTION BUTTONS */}
      {!active && !rawImagePreview && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={startCamera}
            style={{
              padding: '16px',
              fontSize: 14,
              fontWeight: 800,
              background: '#0F2B5B',
              border: 'none',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Camera size={18} /> Open Camera
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '16px',
              fontSize: 14,
              fontWeight: 800,
              border: '1px solid #CBD5E1',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#F8FAFC',
              color: '#0F2B5B'
            }}
          >
            <Upload size={18} /> Upload Slip Photo
          </button>
        </div>
      )}

      {/* STEP 2: ACTIVE LIVE CAMERA STREAM */}
      {active && (
        <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000', position: 'relative' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 380, objectFit: 'cover' }} />

          <div style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(255,255,255,0.7)', margin: 20, borderRadius: 12, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              Align Slip Inside Frame
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, padding: 16, background: 'rgba(0,0,0,0.85)' }}>
            <button type="button" className="btn btn-ghost" onClick={stopCamera} style={{ color: '#fff', flex: 1 }}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={snapPhoto} style={{ flex: 2, background: '#D42D56', fontWeight: 800 }}>
              <Camera size={18} /> Snap Slip Photo
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DISPLAY UPLOADED SLIP PREVIEW WITH RETAKE BUTTON */}
      {rawImagePreview && (
        <div className="animate-fade-in-up" style={{ border: '2px solid #0F2B5B', borderRadius: 16, background: '#fff', overflow: 'hidden', boxShadow: '0 8px 30px rgba(15, 43, 91, 0.08)' }}>
          <div style={{ background: '#0F2B5B', color: '#fff', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13 }}>
              <FileText size={16} color="#E8A838" /> FUEL RECEIPT SLIP ATTACHED
            </div>
            <button type="button" onClick={resetScanner} className="btn btn-ghost btn-sm" style={{ color: '#fff', padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
              <RefreshCw size={12} /> Retake / Change Slip
            </button>
          </div>

          <div style={{ padding: 16, textAlign: 'center', background: '#0f172a' }}>
            <img
              src={rawImagePreview}
              alt="Fuel Slip Preview"
              style={{
                maxWidth: '100%',
                maxHeight: 280,
                borderRadius: 10,
                border: '2px solid #334155',
                objectFit: 'contain'
              }}
            />
          </div>

          <div style={{ padding: '10px 16px', background: '#ECFDF5', borderTop: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#065F46', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#059669" /> Slip attached successfully. Please enter or verify your written fuel details below:
          </div>
        </div>
      )}
    </div>
  );
}
