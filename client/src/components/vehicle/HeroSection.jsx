import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { ChevronLeft, ChevronRight, Shield, Calendar, MapPin, Car, Building2, HardHat, CheckCircle2, Clock, FileText } from 'lucide-react';
import './HeroSection.css';

const DEFAULT_SLIDES = [
  { id: 1, image_url: '/assets/images/hero-1.jpeg', title: 'Smart Fleet Operations', description: 'Real-time vehicle tracking & intelligent fleet allocation', category: 'Company Announcement' },
  { id: 2, image_url: '/assets/images/hero-2.jpeg', title: 'Automated QR & GPS Verification', description: 'Instant QR code check-in & geofence validation', category: 'Safety Alert' },
  { id: 3, image_url: '/assets/images/hero-3.jpeg', title: 'Fuel & Maintenance Logs', description: 'Automated AI receipt scanning and vehicle servicing alerts', category: 'Maintenance' },
  { id: 4, image_url: '/assets/images/hero-4.jpeg', title: 'Workforce Attendance & Logistics', description: 'GPS verified check-in & daily operations routing', category: 'Company Notice' },
  { id: 5, image_url: '/assets/images/hero-5.jpeg', title: 'Enterprise Operations Hub', description: 'Tamper-resistant audit trails & command dashboard', category: 'Friday Mubarak' }
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
      const data = await api.get('/hero-slides');
      const activePosts = (data.posts || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.rich_text || 'Company Announcement',
        media_url: p.media_url,
        media_type: p.media_type || 'image',
        image_url: p.media_url || '/assets/images/hero-1.jpeg'
      }));
      const activeSlides = (data.slides || []).map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category || 'Company Announcement',
        image_url: s.image_url,
        media_url: s.image_url,
        media_type: 'image'
      }));

      const combined = [...activePosts, ...activeSlides];
      if (combined.length > 0) {
        setSlides(combined);
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
    if (url.startsWith('/uploads/')) {
      const apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
      return apiBase ? `${apiBase}${url}` : url;
    }
    return url;
  };

  return (
    <div className="hero-section">
      <div className="hero-slider" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}>
        {slides.length === 0 ? (
          <div className="hero-slide active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
            <div style={{ textAlign: 'center', color: '#fff', padding: 20 }}>
               <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>SAFE SOLUTIONS FleetOps</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Enterprise Fleet, Attendance & Site Operations</p>
            </div>
          </div>
        ) : (
          slides.map((slide, i) => (
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <div className="slide-caption" style={{ padding: '20px 40px', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
                {slide.category && (
                  <span style={{
                    fontSize: 10, fontWeight: 850, padding: '3px 10px', borderRadius: 4,
                    background: '#D42D56', color: '#fff', textTransform: 'uppercase', marginBottom: 6, display: 'inline-block', letterSpacing: '0.05em'
                  }}>
                    {slide.category}
                  </span>
                )}
                <h3 style={{ margin: '4px 0 0', color: '#fff', fontSize: '20px', fontWeight: 800 }}>{slide.title}</h3>
                {slide.description && <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{slide.description}</p>}
              </div>
            </div>
          ))
        )}

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

      <div className="hero-bg-gradient" />
    </div>
  );
}
