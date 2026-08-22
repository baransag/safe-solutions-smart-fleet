import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { QrCode, Download, Printer, RefreshCw, Shield } from 'lucide-react';

export default function QRCodesPage() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const printRef = useRef(null);

  useEffect(() => { fetchVehicles(); }, []);

  async function fetchVehicles() {
    try {
      const data = await api.get('/vehicles');
      setVehicles(data.vehicles || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateQR(vehicleId) {
    try {
      await api.post(`/vehicles/${vehicleId}/regenerate-qr`);
      toast.success('QR code regenerated');
      fetchVehicles();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function getQRUrl(vehicle) {
    if (vehicle.qr_code && vehicle.qr_code.startsWith('data:')) {
      return vehicle.qr_code;
    }
    const qrData = JSON.stringify({
      system: 'SAFE_SOLUTIONS',
      vehicleId: vehicle.vehicle_id || `VH-00${vehicle.id}`,
      name: `${vehicle.name || 'Company Bike'} - ${vehicle.assigned_employee_name || 'Rider'}`,
      numberPlate: vehicle.number_plate
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
  }

  function printSticker(vehicle) {
    const qrImage = getQRUrl(vehicle);
    setSelectedVehicle(vehicle);
    setTimeout(() => {
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>QR Sticker - ${vehicle.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; display: flex; justify-content: center; padding: 20px; }
          .sticker { width: 300px; border: 2px solid #0F2B5B; border-radius: 12px; padding: 20px; text-align: center; }
          .sticker-header { font-size: 14px; font-weight: 800; color: #0F2B5B; letter-spacing: 0.05em; margin-bottom: 4px; }
          .sticker-sub { font-size: 9px; color: #6B5B54; margin-bottom: 16px; }
          .qr-img { width: 200px; height: 200px; margin: 0 auto 16px; display: block; }
          .vehicle-id { font-size: 16px; font-weight: 800; color: #0F2B5B; }
          .vehicle-plate { font-size: 20px; font-weight: 800; color: #D42D56; margin: 4px 0 8px; letter-spacing: 0.1em; }
          .vehicle-name { font-size: 11px; color: #6B5B54; }
          .sticker-footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8px; color: #999; }
          @media print { body { padding: 0; } }
        </style></head>
        <body>
          <div class="sticker">
            <div class="sticker-header">SAFE SOLUTIONS</div>
            <div class="sticker-sub">Smart Fleet Management System</div>
            <img class="qr-img" src="${qrImage}" alt="QR Code" />
            <div class="vehicle-id">${vehicle.vehicle_id}</div>
            <div class="vehicle-plate">${vehicle.number_plate}</div>
            <div class="vehicle-name">${vehicle.name}</div>
            <div class="sticker-footer">Scan QR to verify vehicle • Tamper-resistant</div>
          </div>
        </body></html>
      `);
      win.document.close();
      win.print();
    }, 100);
  }

  if (loading) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Code Management</h1>
          <p className="page-description">Generate and print QR stickers for vehicles</p>
        </div>
      </div>

      <div className="grid grid-3" style={{ gap: 'var(--space-5)' }}>
        {vehicles.map(v => (
          <div key={v.id} className="card-elevated" style={{ textAlign: 'center' }}>
            <img
              src={getQRUrl(v)}
              alt={`QR: ${v.vehicle_id}`}
              style={{ width: '160px', height: '160px', margin: '0 auto var(--space-4)', borderRadius: 'var(--radius-md)', display: 'block' }}
            />

            <h4 style={{ fontWeight: 700, marginBottom: 2 }}>{v.vehicle_id}</h4>
            <p style={{ color: 'var(--color-crimson-red)', fontWeight: 700, fontSize: 'var(--text-lg)', fontFamily: 'var(--font-mono)' }}>{v.number_plate}</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>{v.name}</p>

            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => printSticker(v)}>
                <Printer size={14} /> Print
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => regenerateQR(v.id)}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden print template */}
      <div ref={printRef} style={{ display: 'none' }} />
    </div>
  );
}
