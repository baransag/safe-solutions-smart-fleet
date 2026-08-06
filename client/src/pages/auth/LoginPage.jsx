import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Shield, Eye, EyeOff, Check, Lock, User, Layout } from 'lucide-react';
import api from '../../services/api';
import './LoginPage.css';

const INTRO_IMAGES = [
  '/assets/images/hero-1.jpeg',
  '/assets/images/hero-2.jpeg',
  '/assets/images/hero-3.jpeg',
  '/assets/images/hero-4.jpeg',
  '/assets/images/hero-5.jpeg'
];

const PREPARATION_STEPS = [
  'Establishing Secure Fleet Connection...',
  'Initializing Site Attendance Modules...',
  'Loading Waterproofing Projects...',
  'Deploying Fleet Intelligence...'
];

export default function LoginPage() {
  const { completeLogin } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Pre-login Intro states
  const [introActive, setIntroActive] = useState(true);
  const [introSlide, setIntroSlide] = useState(0);
  const [introProgress, setIntroProgress] = useState(0);

  // Post-login sequence states
  const [loginSuccessLoading, setLoginSuccessLoading] = useState(false);
  const [successStep, setSuccessStep] = useState(0);
  const [successData, setSuccessData] = useState(null);

  // Pre-login progress timer (5.5 seconds duration)
  useEffect(() => {
    if (!introActive) return;

    const slideInterval = setInterval(() => {
      setIntroSlide(prev => (prev + 1) % INTRO_IMAGES.length);
    }, 1200);

    const progressInterval = setInterval(() => {
      setIntroProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(slideInterval);
          setIntroActive(false);
          return 100;
        }
        return prev + 0.6; // 166 steps of 30ms = 5000ms duration
      });
    }, 30);

    return () => {
      clearInterval(slideInterval);
      clearInterval(progressInterval);
    };
  }, [introActive]);

  // Post-login loading steps sequence (runs for 5.0 seconds duration)
  useEffect(() => {
    if (!loginSuccessLoading || !successData) return;

    const interval = setInterval(() => {
      setSuccessStep(prev => {
        if (prev >= PREPARATION_STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            completeLogin(successData);
            toast.success(`Welcome back, ${successData.user.name}!`);
          }, 800);
          return prev + 1;
        }
        return prev + 1;
      });
    }, 1250); // 4 steps * 1250ms = 5000ms total duration

    return () => clearInterval(interval);
  }, [loginSuccessLoading, successData, completeLogin, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      setSuccessData(data);
      setLoginSuccessLoading(true);
    } catch (err) {
      toast.error(err.message || 'Login failed');
      setLoading(false);
    }
  };

  // Render Pre-login Intro Slideshow (Faisalabad HQ & FleetOps theme)
  if (introActive) {
    return (
      <div className="pre-login-intro" style={{ background: '#050508', color: '#fff', overflow: 'hidden' }}>
        <div className="intro-slides">
          {INTRO_IMAGES.map((img, i) => (
            <div key={i} className={`intro-slide ${i === introSlide ? 'active' : ''}`}>
              <img src={img} alt="Intro slide" className="intro-slide-img" />
            </div>
          ))}
        </div>
        <div className="intro-overlay" />
        <div className="intro-content" style={{ zIndex: 10, textAlign: 'center', padding: '0 24px' }}>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', borderRadius: 16, display: 'inline-flex', marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <img src="/assets/images/logo.jpeg" alt="Safe Solutions Logo" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'contain' }} />
          </div>
          <h1 className="intro-logo animate-fade-in" style={{ fontSize: 32, letterSpacing: '0.04em', fontWeight: 900, marginBottom: 8, color: '#fff' }}>
            SAFE SOLUTIONS FleetOps
          </h1>
          <p className="intro-subtitle" style={{ fontSize: 13, letterSpacing: '0.12em', color: 'var(--color-gold)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 40 }}>
            Enterprise Fleet, Attendance & Site Operations
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 40 }}>
            <span>🏗️ Construction</span>
            <span>•</span>
            <span>🚛 Fleet</span>
            <span>•</span>
            <span>📍 Faisalabad HQ</span>
          </div>
          <div className="intro-progress-bar" style={{ width: 220, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', margin: '0 auto' }}>
            <div className="intro-progress-fill" style={{ width: `${introProgress}%`, height: '100%', background: 'linear-gradient(90deg, #C50337 0%, var(--color-gold) 100%)', boxShadow: '0 0 10px #C50337' }} />
          </div>
        </div>
      </div>
    );
  }

  // Render Post-login Sequenced Loading Screen (5 seconds cinematic loader)
  if (loginSuccessLoading) {
    return (
      <div className="post-login-loader" style={{ background: '#050508', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div className="post-loader-card animate-scale-in" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(30px)', width: '90%', maxWidth: 460, padding: 40, borderRadius: 24, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
          <div className="post-loader-spinner" style={{ borderColor: 'rgba(255,255,255,0.05)', borderTopColor: 'var(--color-gold)', width: 36, height: 36, margin: '0 auto 24px' }} />
          
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.04em', margin: '0 0 8px', color: '#fff' }}>SAFE SOLUTIONS FleetOps</h1>
          <p style={{ fontSize: 12, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 24px', fontWeight: 700 }}>
            Enterprise Fleet, Attendance & Site Operations
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}>
            <span>🏗️ Construction</span>
            <span>🚛 Fleet</span>
            <span>📅 Attendance</span>
            <span>💧 Waterproofing</span>
            <span>🔍 Inspection</span>
            <span>📍 Faisalabad HQ</span>
          </div>

          <div className="post-loader-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {PREPARATION_STEPS.map((text, i) => {
              const isCompleted = successStep > i;
              const isActive = successStep === i;
              return (
                <div key={i} className={`post-loader-item ${isCompleted ? 'completed' : isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: isCompleted ? 'rgba(255,255,255,0.7)' : isActive ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.3s' }}>
                  <div className="post-loader-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: isCompleted ? '#10B981' : isActive ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)', boxShadow: isActive ? '0 0 10px var(--color-gold)' : 'none' }} />
                  <span style={{ fontWeight: isActive ? 700 : 500 }}>{text}</span>
                  {isCompleted && <Check size={14} style={{ color: '#10B981', marginLeft: 'auto' }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg-shapes">
        <div className="login-shape shape-1" style={{ background: '#C50337' }} />
        <div className="login-shape shape-2" style={{ background: '#021C4F' }} />
        <div className="login-shape shape-3" style={{ background: '#D97706' }} />
      </div>

      {/* Floating Animated Construction Theme Particles */}
      <div className="construction-particles" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.15 }}>
        <div className="particle" style={{ position: 'absolute', left: '10%', top: '20%', fontSize: 24 }}>🏗️</div>
        <div className="particle" style={{ position: 'absolute', right: '15%', top: '30%', fontSize: 20 }}>🚛</div>
        <div className="particle" style={{ position: 'absolute', left: '20%', bottom: '25%', fontSize: 22 }}>💧</div>
        <div className="particle" style={{ position: 'absolute', right: '25%', bottom: '15%', fontSize: 18 }}>🔧</div>
      </div>

      <div className="login-container animate-scale-in">
        <div className="login-card card-glass">
          <div className="login-header">
            <div className="login-logo" style={{ background: '#fff', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: 70, height: 70, padding: 4 }}>
              <img
                src="/assets/images/logo.jpeg"
                alt="Safe Solutions Logo"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={28} />
              </div>
            </div>
            <h1 className="login-title" style={{ fontSize: 22, letterSpacing: '0.03em', fontWeight: 900, color: '#fff' }}>SAFE SOLUTIONS FleetOps</h1>
            <p className="login-subtitle" style={{ color: 'var(--color-gold)', fontSize: 10, letterSpacing: '0.12em', fontWeight: 700 }}>Enterprise Fleet, Attendance & Site Operations</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={13} /> Email Address or Employee ID</label>
              <input
                id="email"
                type="text"
                className="form-input"
                placeholder="e.g. boss@safesolutions.com or ADMIN001"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={13} /> Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)',
                    padding: '4px', display: 'flex'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#C50337' }}
                />
                Remember Me
              </label>
              <a
                href="#forgot"
                onClick={(e) => { e.preventDefault(); toast.info("Please contact IT Admin to reset your password."); }}
                style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 700 }}
              >
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 8, background: '#C50337', borderColor: '#C50337', fontWeight: 800, height: 48, borderRadius: 10 }}
            >
              {loading ? (
                <>
                  <div className="loader" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: 'white', marginRight: 8 }} />
                  Verifying Workspace...
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Secure Enterprise Access</p>
            <p>SAFE SOLUTIONS ONE &copy; 2026. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
