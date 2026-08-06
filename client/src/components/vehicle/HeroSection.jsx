import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { ChevronLeft, ChevronRight, Shield, Calendar, MapPin, Car, Building2, HardHat, CheckCircle2, Clock, FileText } from 'lucide-react';
import './HeroSection.css';

const DEFAULT_SLIDES = [
  { id: 1, image_url: '/assets/images/hero-1.jpeg', title: 'Smart Fleet Operations', description: 'Real-time vehicle tracking & intelligent allocation', category: 'Company Announcement' },
  { id: 2, image_url: '/assets/images/Husnain.jpeg', title: 'M. Husnain Farooq — Controller', description: 'Enterprise Fleet & Management Controller', category: 'Leadership Notice' },
  { id: 3, image_url: '/assets/images/hero-2.jpeg', title: 'Automated Verification', description: 'QR code check-in & GPS validation', category: 'Safety Alert' },
  { id: 4, image_url: '/assets/images/Samaira.jpeg', title: 'Samaira Mubashar — Account & Finance', description: 'Finance & Operations Management', category: 'Executive Notice' },
  { id: 5, image_url: '/assets/images/hero-3.jpeg', title: 'Fuel & Maintenance Logs', description: 'Expense tracking and automated maintenance alerts', category: 'Maintenance' },
  { id: 6, image_url: '/assets/images/Shahzaib.jpeg', title: 'Engr. Shahzaib Ahmad — Marketing', description: 'Operations & Technical Field Representative', category: 'Team Highlight' }
];

export default function HeroSection() {
  const { user } = useAuth();
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchSlides();
    fetchUserMetaData();
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 4000);
      return () => clearInterval(intervalRef.current);
    }
  }, [slides.length]);

  async function fetchSlides() {
    try {
      const data = await api.get('/hero-slides/active');
      if (data.posts && data.posts.length > 0) {
        setSlides(data.posts);
      }
    } catch {
      // Keep default slides
    }
  }

  async function fetchUserMetaData() {
    try {
      const [attRes, assignRes] = await Promise.all([
        api.get('/attendance/today').catch(() => ({ attendance: null })),
        api.get('/vehicle-assignments/my').catch(() => ({ assignment: null }))
      ]);
      setTodayAttendance(attRes.attendance);
      setAssignedVehicle(assignRes.assignment);
    } catch {}
  }

  const nextSlide = () => {
    clearInterval(intervalRef.current);
    setCurrentSlide(prev => (prev + 1) % Math.max(slides.length, 1));
  };

  const prevSlide = () => {
    clearInterval(intervalRef.current);
    setCurrentSlide(prev => (prev - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1));
  };

  const getImageUrl = (url) => {
    if (!url) return '/assets/images/logo.jpeg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/assets/')) return url;
    return `http://localhost:5000${url}`;
  };

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="hero-section">
      <div className="hero-content">

        {/* LEFT CARD: EMPLOYEE PROFILE & OPERATIONAL STATUS */}
        <div className="hero-left">
          <div className="hero-user-profile-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={getImageUrl(user?.avatar_url)}
                  alt={user?.name}
                  style={{
                    width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid #ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                  }}
                  onError={(e) => { e.currentTarget.src = '/assets/images/logo.jpeg'; }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
                  borderRadius: '50%', background: '#10B981', border: '2px solid #fff'
                }} />
              </div>

              <div>
                <span className="hero-badge" style={{ margin: '0 0 4px', fontSize: 10, padding: '2px 10px' }}>
                  <Shield size={12} /> SAFE SOLUTIONS OPS
                </span>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                  {user?.name || 'Safe Solutions Employee'}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                  {user?.designation || 'Team Member'} • {user?.department || 'Operations'}
                </p>
              </div>
            </div>

            {/* LIVE OPERATIONAL METRICS SUMMARY */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10,
              background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(10px)',
              padding: 12, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', display: 'block' }}>Date</span>
                <strong style={{ fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} /> {todayDateStr}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', display: 'block' }}>Attendance Status</span>
                {todayAttendance ? (
                  <strong style={{ fontSize: 11, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {todayAttendance.attendance_type === 'office' ? <Building2 size={12} /> : <HardHat size={12} />}
                    {todayAttendance.attendance_type === 'office' ? 'Office' : 'Site'} ({todayAttendance.approval_status})
                  </strong>
                ) : (
                  <strong style={{ fontSize: 11, color: '#fef08a', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> Not Checked In
                  </strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', display: 'block' }}>Assigned Vehicle</span>
                <strong style={{ fontSize: 11, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Car size={12} /> {assignedVehicle ? assignedVehicle.number_plate || assignedVehicle.vehicle_name : 'No Vehicle'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SLIDER: ANNOUNCEMENTS & HERO BANNERS */}
        <div className="hero-right">
          <div className="hero-slider">
            {slides.map((slide, i) => (
              <div
                key={slide.id || i}
                className={`hero-slide ${i === currentSlide ? 'active' : ''}`}
              >
                {slide.media_type === 'video' ? (
                  <video
                    src={getImageUrl(slide.media_url)}
                    autoPlay
                    loop
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : slide.media_type === 'pdf' ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <FileText size={48} color="var(--color-primary-orange)" />
                      <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>PDF Document</p>
                      <a href={getImageUrl(slide.media_url)} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary" style={{ marginTop: 8 }}>View PDF</a>
                    </div>
                  </div>
                ) : (
                  <img
                    src={getImageUrl(slide.media_url || slide.image_url)}
                    alt={slide.title || 'Hero Banner'}
                    loading="lazy"
                  />
                )}
                <div className="slide-caption">
                  {slide.category && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                      background: '#C50337', color: '#fff', textTransform: 'uppercase', marginBottom: 4, display: 'inline-block'
                    }}>
                      {slide.category}
                    </span>
                  )}
                  <h4 style={{ margin: '2px 0 0' }}>{slide.title}</h4>
                  {slide.description && <p style={{ margin: '2px 0 0' }}>{slide.description}</p>}
                </div>
              </div>
            ))}

            {slides.length > 1 && (
              <>
                <button className="slider-nav slider-prev" onClick={prevSlide} aria-label="Previous Slide">
                  <ChevronLeft size={20} />
                </button>
                <button className="slider-nav slider-next" onClick={nextSlide} aria-label="Next Slide">
                  <ChevronRight size={20} />
                </button>
                <div className="slider-dots">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      className={`slider-dot ${i === currentSlide ? 'active' : ''}`}
                      onClick={() => {
                        clearInterval(intervalRef.current);
                        setCurrentSlide(i);
                      }}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="hero-bg-gradient" />
    </div>
  );
}
