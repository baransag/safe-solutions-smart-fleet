import { useState } from 'react';
import {
  BookOpen, Printer, Download, X, Search, CheckCircle2,
  QrCode, MapPin, Camera, Route, Fuel, FileText, CalendarCheck,
  ShieldCheck, AlertCircle, ChevronRight, ChevronLeft, HelpCircle
} from 'lucide-react';
import './AppUserGuideModal.css';

const CHAPTERS = [
  {
    id: 'overview',
    title: '1. Overview & Daily Routine',
    icon: BookOpen,
    summary: 'Daily operational workflow for field employees and drivers',
    content: (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F2B5B', marginBottom: 8 }}>
          SAFE SOLUTIONS FleetOps — User Guide & Manual
        </h2>
        <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>
          Welcome to the official user guide for the SAFE SOLUTIONS Smart Fleet Management & Operations System. This guide provides step-by-step instructions for all daily activities including attendance, vehicle check-in/out, fuel claim submission, and leave requests.
        </p>

        <div className="ebook-urdu-text">
          <strong>اردو خلاصہ (Quick Summary in Urdu):</strong><br />
          یہ گائیڈ ایپ کو استعمال کرنے کے آسان اور درست طریقے بتاتی ہے۔ روزانہ کا شیڈول یہ ہے: سب سے پہلے صبح حاضری (Attendance) لگائیں، پھر گاڑی کا چیک اِن (Vehicle Check-in) کریں، دن کے دوران فیول یا وزٹ رپورٹس سبمٹ کریں، اور شام کو گاڑی کا چیک آؤٹ (Vehicle Check-out) مکمل کریں۔
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F2B5B', marginTop: 24, marginBottom: 12 }}>
          Daily Standard Operational Cycle
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
          <div className="ebook-step-card" style={{ borderLeftColor: '#0284c7' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7' }}>STEP 1 • MORNING</span>
            <h4 style={{ margin: '4px 0', fontSize: 14, color: '#0F2B5B' }}>Attendance Check-In</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Scan office QR or capture GPS for site attendance.</p>
          </div>

          <div className="ebook-step-card" style={{ borderLeftColor: '#D42D56' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#D42D56' }}>STEP 2 • MORNING</span>
            <h4 style={{ margin: '4px 0', fontSize: 14, color: '#0F2B5B' }}>Vehicle Check-In</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Scan vehicle QR, verify GPS, and snap meter photo.</p>
          </div>

          <div className="ebook-step-card" style={{ borderLeftColor: '#059669' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>STEP 3 • DAYTIME</span>
            <h4 style={{ margin: '4px 0', fontSize: 14, color: '#0F2B5B' }}>Fuel & Visit Reports</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Upload petrol slips and submit client site visit logs.</p>
          </div>

          <div className="ebook-step-card" style={{ borderLeftColor: '#F59E0B' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>STEP 4 • EVENING</span>
            <h4 style={{ margin: '4px 0', fontSize: 14, color: '#0F2B5B' }}>Vehicle Check-Out</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Scan bike QR, snap closing meter, and calculate daily KM.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'attendance',
    title: '2. Employee Attendance',
    icon: CalendarCheck,
    summary: 'Office QR scanning and Site GPS attendance',
    content: (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginBottom: 8 }}>
          2. Employee Attendance Check-In & Check-Out
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          Employees can mark their attendance through either <strong>🏢 Office Attendance</strong> or <strong>🏗️ Site Attendance</strong>.
        </p>

        <div className="ebook-step-card">
          <h4 style={{ margin: 0, fontSize: 15, color: '#0F2B5B' }}>🏢 Office Attendance (Office Staff)</h4>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            <li>Navigate to <strong>Attendance</strong> from the sidebar.</li>
            <li>Click <strong>Scan Office QR Code</strong>.</li>
            <li>Point your mobile camera at the QR code displayed at Head Office or your branch.</li>
            <li>Once verified, your check-in time is recorded instantly.</li>
          </ol>
          <div className="ebook-urdu-text">
            <strong>اردو رہنمائی:</strong> اگر آپ آفس میں کام کرتے ہیں تو "Office Attendance" منتخب کریں اور آفس وال پر لگے کیو آر کوڈ کو اپنے کیمرے سے اسکین کریں۔
          </div>
        </div>

        <div className="ebook-step-card" style={{ borderLeftColor: '#D42D56' }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#0F2B5B' }}>🏗️ Site Attendance (Field & Security Staff)</h4>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            <li>Select <strong>Site Attendance</strong> tab.</li>
            <li>Select or enter your Project / Client Site Name.</li>
            <li>Allow location access for GPS verification.</li>
            <li>Take a quick live selfie or site photo and click <strong>Submit Site Attendance</strong>.</li>
          </ol>
          <div className="ebook-urdu-text">
            <strong>اردو رہنمائی:</strong> اگر آپ فیلڈ یا کلائنٹ سائٹ پر ہیں تو "Site Attendance" پر کلک کریں، اپنا پروجیکٹ منتخب کریں، سائٹ کی تصویر یا سیلفی کھینچیں اور سبمٹ کریں۔
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'checkin',
    title: '3. Vehicle Check-In (Morning)',
    icon: QrCode,
    summary: 'Morning bike/vehicle verification & meter reading',
    content: (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginBottom: 8 }}>
          3. Morning Vehicle Check-In
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          Before beginning your daily transit, you must complete the 4-step Vehicle Check-In to record your morning opening meter.
        </p>

        <div className="ebook-step-card">
          <h4 style={{ margin: 0, fontSize: 14, color: '#0F2B5B' }}>Step-by-Step Check-In Guide</h4>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <strong>Step 1 (Scan QR):</strong> Scan the official SAFE SOLUTIONS QR sticker on your vehicle or click <em>"Verify Assigned Vehicle"</em>.
            </div>
            <div>
              <strong>Step 2 (Device Link):</strong> Click <em>"Capture Location"</em> to verify device link.
            </div>
            <div>
              <strong>Step 3 (Meter Photo & AI OCR):</strong> Align camera with your speedometer/meter and click <em>"Capture Photo"</em>. The system automatically reads your odometer reading.
            </div>
            <div>
              <strong>Step 4 (Confirm & Submit):</strong> Verify the opening meter reading and click <em>"Submit Check-in"</em>.
            </div>
          </div>
          <div className="ebook-urdu-text">
            <strong>اردو رہنمائی:</strong> صبح بائیک شروع کرنے سے پہلے Check-In صفحے پر جائیں۔ بائیک کا کیو آر اسکین کریں، میٹر کی واضح تصویر بنائیں تاکہ اسپیڈومیٹر ریڈنگ صحیح آئے، اور تصدیق کر کے سبمٹ کر دیں۔
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'checkout',
    title: '4. Vehicle Check-Out (Evening)',
    icon: Route,
    summary: 'Evening bike return, closing meter & distance calculation',
    content: (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginBottom: 8 }}>
          4. Evening Vehicle Check-Out & Day Closing
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          At the end of your shift, complete Vehicle Check-Out to record the closing meter reading and calculate your daily distance travelled.
        </p>

        <div className="ebook-step-card" style={{ borderLeftColor: '#059669' }}>
          <h4 style={{ margin: 0, fontSize: 14, color: '#0F2B5B' }}>Step-by-Step Check-Out Guide</h4>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <strong>Step 1 (Scan QR):</strong> Scan your vehicle QR code or click <em>"Verify Assigned Vehicle"</em>.
            </div>
            <div>
              <strong>Step 2 (Verification):</strong> Click <em>"Confirm Device & Location"</em>.
            </div>
            <div>
              <strong>Step 3 (Closing Meter Photo):</strong> Take a clear photo of the ending meter reading.
            </div>
            <div>
              <strong>Step 4 (Distance Calculation & Confirm):</strong> The app automatically subtracts morning opening KM from evening closing KM and displays your total travelled distance (e.g. +38.5 KM). Click <em>"Submit Vehicle Check-out"</em>.
            </div>
          </div>
          <div className="ebook-urdu-text">
            <strong>اردو رہنمائی:</strong> شام کو ڈیوٹی ختم کرتے وقت Check-Out پر جائیں۔ بائیک کا کیو آر اسکین کریں، شام کے میٹر کی تصویر کھینچیں۔ سسٹم خود بخود پورے دن کے چلے ہوئے کلومیٹر کا حساب لگا دے گا۔ پھر Submit Check-out دبا دیں۔
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'fuel',
    title: '5. Fuel Expense Claims',
    icon: Fuel,
    summary: 'Submitting petrol slips, liters, amount & station details',
    content: (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginBottom: 8 }}>
          5. Fuel Expense Claims & Receipt Uploads
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          Whenever company fuel is purchased, drivers can submit an instant claim with receipt photo for Manager and Controller approval.
        </p>

        <div className="ebook-step-card">
          <h4 style={{ margin: 0, fontSize: 14, color: '#0F2B5B' }}>How to Submit a Fuel Claim</h4>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            <li>Go to <strong>Fuel Management</strong> and click <strong>Submit Fuel Receipt</strong>.</li>
            <li>Take a clear, well-lit photo of the petrol pump printed receipt.</li>
            <li>Enter Total Amount (Rs), Liters filled, Petrol Pump Name, and Current Odometer Reading.</li>
            <li>Click <strong>Submit for Approval</strong>. Your manager will review and approve the reimbursement.</li>
          </ol>
          <div className="ebook-urdu-text">
            <strong>اردو رہنمائی:</strong> پیٹرول ڈلواتے وقت پمپ کی پرچی (Receipt) کی صاف تصویر بنائیں، روپے اور لیٹر درج کریں اور سبمٹ کریں۔ کنٹرولر یا منیجر اس کو منظوری دے دیں گے۔
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'leave',
    title: '6. Leave & Half-Day Requests',
    icon: FileText,
    summary: 'Full Day, Half-Day (Morning/Evening) and Short Leave requests',
    content: (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginBottom: 8 }}>
          6. Submitting Leave & Half-Day Requests
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          Employees can apply for official leave, half-day absence, or gate pass directly from the system.
        </p>

        <div className="ebook-step-card" style={{ borderLeftColor: '#D42D56' }}>
          <h4 style={{ margin: 0, fontSize: 14, color: '#0F2B5B' }}>Request Types Available</h4>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            <li><strong>Full Day Leave:</strong> For 1 or more full working days (Sick, Casual, Annual, Emergency).</li>
            <li><strong>Half-Day (Morning / First Half):</strong> Arrive at work after lunch.</li>
            <li><strong>Half-Day (Afternoon / Second Half):</strong> Leave work early in the afternoon.</li>
            <li><strong>Short Leave / Gate Pass:</strong> For 1-2 hours urgent personal or medical leave.</li>
          </ul>
          <div className="ebook-urdu-text">
            <strong>اردو رہنمائی:</strong> چھٹی یا ہاف ڈے لینے کے لیے Attendance پیج پر "Request Leave / Half-Day" کا بٹن دبائیں۔ اپنی چھٹی کی تاریخ، وجہ اور ہاف ڈے کا وقت منتخب کر کے سبمٹ کریں۔ منیجر کی طرف سے منظوری کا میسج آ جائے گا۔
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'troubleshooting',
    title: '7. Troubleshooting & FAQ',
    icon: HelpCircle,
    summary: 'Common camera, GPS, and scanning solutions',
    content: (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginBottom: 8 }}>
          7. Frequently Asked Questions & Troubleshooting
        </h2>

        <div className="ebook-step-card">
          <h4 style={{ margin: 0, fontSize: 14, color: '#0F2B5B' }}>Q1: Camera is showing a black screen or not opening?</h4>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            Ensure your mobile browser (Chrome/Safari) has permission to access the camera. Tap the lock icon in the browser address bar and select "Allow Camera". Alternatively, use the one-tap verification button.
          </p>
        </div>

        <div className="ebook-step-card">
          <h4 style={{ margin: 0, fontSize: 14, color: '#0F2B5B' }}>Q2: What if my odometer reading is blurry?</h4>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            You can use the <strong>Flip Camera</strong> button to switch between Front and Back cameras, or tap <strong>Retake Photo</strong> for a clearer snap. You can also manually confirm/edit the number on the confirmation screen.
          </p>
        </div>

        <div className="ebook-urdu-text">
          <strong>ہیلپ لائن اور رابطہ:</strong> اگر کسی بھی قسم کا مسئلہ درپیش ہو تو اپنے سپروائزر یا کنٹرولر سے رابطہ کریں۔
        </div>
      </div>
    )
  }
];

export default function AppUserGuideModal({ isOpen, onClose }) {
  const [activeChapter, setActiveChapter] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const currentIdx = CHAPTERS.findIndex(c => c.id === activeChapter);
  const currentChapter = CHAPTERS[currentIdx] || CHAPTERS[0];

  const filteredChapters = CHAPTERS.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ebook-backdrop animate-fade-in" onClick={onClose}>
      <div className="ebook-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="ebook-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>
                SAFE SOLUTIONS FleetOps — Interactive User Guide & E-Book
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                Complete step-by-step user manual & operational handbook
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, border: 'none',
                background: '#D42D56', color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(212,45,86,0.3)'
              }}
              title="Print or Save as PDF"
            >
              <Printer size={15} /> Download PDF / Print
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="ebook-body">
          {/* SIDEBAR CHAPTER SELECTOR */}
          <div className="ebook-sidebar">
            <div style={{ padding: '12px 14px 6px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search guide..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8,
                    border: '1px solid #cbd5e1', fontSize: 12, background: '#f8fafc'
                  }}
                />
              </div>
            </div>

            <div className="ebook-chapter-list">
              {filteredChapters.map(chap => {
                const Icon = chap.icon;
                const isActive = chap.id === activeChapter;
                return (
                  <button
                    key={chap.id}
                    className={`ebook-chapter-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveChapter(chap.id)}
                  >
                    <Icon size={16} />
                    <div style={{ textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                      <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {chap.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN READING CONTENT */}
          <div className="ebook-content-area">
            {currentChapter.content}

            {/* Navigation Footer */}
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              {currentIdx > 0 ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveChapter(CHAPTERS[currentIdx - 1].id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ChevronLeft size={14} /> Previous: {CHAPTERS[currentIdx - 1].title.split('.')[1]}
                </button>
              ) : <div />}

              {currentIdx < CHAPTERS.length - 1 ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveChapter(CHAPTERS[currentIdx + 1].id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0F2B5B' }}
                >
                  Next: {CHAPTERS[currentIdx + 1].title.split('.')[1]} <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onClose}
                  style={{ background: '#059669' }}
                >
                  ✓ Finish Reading
                </button>
              )}
            </div>

            {/* FULL PRINT VIEW (Appears only during window.print) */}
            <div className="ebook-print-view">
              <div style={{ textAlign: 'center', marginBottom: 30, borderBottom: '2px solid #0F2B5B', paddingBottom: 16 }}>
                <h1 style={{ fontSize: 24, margin: 0, color: '#0F2B5B' }}>SAFE SOLUTIONS — SMART FLEET OPERATIONS MANUAL</h1>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Official Field & Enterprise User Handbook • Version 2.4</p>
              </div>
              {CHAPTERS.map(c => (
                <div key={c.id} style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
                  {c.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
