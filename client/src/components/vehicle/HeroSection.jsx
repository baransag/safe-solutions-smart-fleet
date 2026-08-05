import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import './HeroSection.css';

const DEFAULT_SLIDES = [
  { id: 1, image_url: '/assets/images/hero-1.jpeg', title: 'Smart Fleet Operations', description: 'Real-time vehicle tracking & intelligent allocation' },
  { id: 2, image_url: '/assets/images/hero-2.jpeg', title: 'Automated Verification', description: 'QR code check-in & speedometer validation' },
  { id: 3, image_url: '/assets/images/hero-3.jpeg', title: 'Fuel & Maintenance Logs', description: 'Expense tracking and automated maintenance alerts' },
  { id: 4, image_url: '/assets/images/hero-4.jpeg', title: 'Rider Performance & Attendance', description: 'GPS verified check-in & daily route intelligence' },
  { id: 5, image_url: '/assets/images/hero-5.jpeg', title: 'Enterprise Security', description: 'Tamper-resistant audit trails & fleet control' },
];

export default function HeroSection() {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchSlides();
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
      if (data.slides && data.slides.length > 0) {
        setSlides(data.slides);
      }
    } catch {
      // Keep default slides
    }
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
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/assets/')) return url;
    return `http://localhost:5000${url}`;
  };

  return (
    <div className="hero-section">
      <div className="hero-content">
        <div className="hero-left">
          <div className="hero-badge">
            <Shield size={14} />
            <span>Enterprise Fleet Intelligence</span>
          </div>
          <h1 className="hero-heading">
            Smart Fleet &<br />
            <span className="hero-heading-accent">Vehicle Management</span>
          </h1>
          <p className="hero-description">
            Complete company vehicle intelligence — track, manage, and optimize your fleet
            with real-time data, smart validation, and enterprise-grade security.
          </p>
          <div className="hero-cta">
            <a href="/check-in" className="btn btn-primary">Start Check-in</a>
            <a href="/vehicles" className="btn btn-ghost" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
              View Fleet
            </a>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-slider">
            {slides.map((slide, i) => (
              <div
                key={slide.id || i}
                className={`hero-slide ${i === currentSlide ? 'active' : ''}`}
              >
                <img
                  src={getImageUrl(slide.image_url)}
                  alt={slide.title || 'Hero Banner'}
                  loading="lazy"
                />
                {slide.title && (
                  <div className="slide-caption">
                    <h4>{slide.title}</h4>
                    {slide.description && <p>{slide.description}</p>}
                  </div>
                )}
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

      {/* Background decoration */}
      <div className="hero-bg-gradient" />
    </div>
  );
}
