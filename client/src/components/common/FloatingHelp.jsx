import { useState } from 'react';
import { MessageCircle, X, Phone, ShieldCheck, UserCheck } from 'lucide-react';

export default function FloatingHelp() {
  const [open, setOpen] = useState(false);

  // Configurable WhatsApp Contact Numbers from Master List
  const MANAGER_PHONE = '923006646124'; // Samaira Mubashar (03006646124)
  const CONTROLLER_PHONE = '923468760963'; // M. Husnain Farooq (03468760963)

  const openWhatsApp = (phone, name, role) => {
    const text = encodeURIComponent(`Hello ${name} (${role}), I need assistance with SAFE SOLUTIONS Smart Fleet System.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zindex: 9999 }}>
      {open && (
        <div className="animate-scale-in" style={{
          position: 'absolute',
          bottom: 70,
          right: 0,
          width: 320,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          border: '1px solid rgba(2, 28, 79, 0.15)',
          padding: 20,
          color: '#021C4F'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
            <div>
              <h4 style={{ fontWeight: 800, margin: 0, fontSize: 15, color: '#021C4F' }}>Need Help?</h4>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>Contact Manager or Controller on WhatsApp</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => openWhatsApp(MANAGER_PHONE, 'Samaira Mubashar', 'Manager Accounts & Finance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: '#25D366',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <UserCheck size={18} />
              <div>
                <div>Contact Manager</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Samaira Mubashar (03006646124)</div>
              </div>
            </button>

            <button
              onClick={() => openWhatsApp(CONTROLLER_PHONE, 'M. Husnain Farooq', 'Controller')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: '#021C4F',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <ShieldCheck size={18} />
              <div>
                <div>Contact Controller</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>M. Husnain Farooq (03468760963)</div>
              </div>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #021C4F 0%, #C50337 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 30,
          boxShadow: '0 8px 24px rgba(197, 3, 55, 0.4)',
          fontWeight: 800,
          fontSize: 14,
          cursor: 'pointer'
        }}
      >
        <MessageCircle size={20} />
        Need Help?
      </button>
    </div>
  );
}
