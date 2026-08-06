import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Shield, Eye, EyeOff, Check } from 'lucide-react';
import api from '../../services/api';
import './LoginPage.css';

const INTRO_IMAGES = [
  '/assets/images/hero-1.jpeg',
  '/assets/images/hero-2.jpeg',
  '/assets/images/hero-3.jpeg',
  '/assets/images/hero-4.jpeg',
  '/assets/images/hero-5.jpeg',
  '/assets/images/Husnain.jpeg',
  '/assets/images/Samaira.jpeg'
];

const PREPARATION_STEPS = [
  'Loading Company Workspace...',
  'Preparing Fleet Intelligence...',
  'Loading Attendance...',
  'Loading Operations...'
];

export default function LoginPage() {
  const { completeLogin } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-login Intro states
  const [introActive, setIntroActive] = useState(true);
  const [introSlide, setIntroSlide] = useState(0);
  const [introProgress, setIntroProgress] = useState(0);

  // Post-login sequence states
  const [loginSuccessLoading, setLoginSuccessLoading] = useState(false);
  const [successStep, setSuccessStep] = useState(0);
  const [successData, setSuccessData] = useState(null);

  // Pre-login progress timer
  useEffect(() => {
    if (!introActive) return;

    // Cycle slides
    const slideInterval = setInterval(() => {
      setIntroSlide(prev => (prev + 1) % INTRO_IMAGES.length);
    }, 1500);

    // Progress bar fill (runs for 6.0 seconds)
    const progressInterval = setInterval(() => {
      setIntroProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(slideInterval);
          setIntroActive(false);
          return 100;
        }
        return prev + 0.5; // 200 steps of 30ms = 6000ms
      });
    }, 30);

    return () => {
      clearInterval(slideInterval);
      clearInterval(progressInterval);
    };
  }, [introActive]);

  // Post-login loading steps sequence (runs for 3.2 seconds)
  useEffect(() => {
    if (!loginSuccessLoading || !successData) return;

    const interval = setInterval(() => {
      setSuccessStep(prev => {
        if (prev >= PREPARATION_STEPS.length - 1) {
          clearInterval(interval);
          // Let it load for a brief moment then sign in
          setTimeout(() => {
            completeLogin(successData);
            toast.success(`Welcome back, ${successData.user.name}!`);
          }, 600);
          return prev + 1;
        }
        return prev + 1;
      });
    }, 800); // 4 steps * 800ms = 3.2 seconds total duration

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
      // Defer state login; verify credentials first
      const data = await api.post('/auth/login', { email, password });
      setSuccessData(data);
      setLoginSuccessLoading(true);
    } catch (err) {
      toast.error(err.message || 'Login failed');
      setLoading(false);
    }
  };

  // Render Pre-login Intro Slideshow
  if (introActive) {
    return (
      <div className="pre-login-intro">
        <div className="intro-slides">
          {INTRO_IMAGES.map((img, i) => (
            <div key={i} className={`intro-slide ${i === introSlide ? 'active' : ''}`}>
              <img src={img} alt="Intro slide" className="intro-slide-img" />
            </div>
          ))}
        </div>
        <div className="intro-overlay" />
        <div className="intro-content">
          <h1 className="intro-logo animate-fade-in" style={{ fontSize: 26, letterSpacing: '0.04em' }}>SAFE SOLUTIONS COMMAND CENTER</h1>
          <p className="intro-subtitle" style={{ fontSize: 12, letterSpacing: '0.1em' }}>Enterprise Workforce & Fleet Intelligence Platform</p>
          <div className="intro-progress-bar">
            <div className="intro-progress-fill" style={{ width: `${introProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // Render Post-login Sequenced Loading Screen
  if (loginSuccessLoading) {
    return (
      <div className="post-login-loader">
        <div className="post-loader-card animate-scale-in">
          <div className="post-loader-spinner" />
          <h2 className="post-loader-title">Welcome Back</h2>
          <div className="post-loader-list">
            {PREPARATION_STEPS.map((text, i) => {
              const isCompleted = successStep > i;
              const isActive = successStep === i;
              return (
                <div key={i} className={`post-loader-item ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                  <div className="post-loader-dot" />
                  <span>{text}</span>
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
        <div className="login-shape shape-1" />
        <div className="login-shape shape-2" />
        <div className="login-shape shape-3" />
      </div>

      <div className="login-container animate-scale-in">
        <div className="login-card card-glass">
          <div className="login-header">
            <div className="login-logo">
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
            <h1 className="login-title" style={{ fontSize: 20, letterSpacing: '0.03em' }}>SAFE SOLUTIONS COMMAND CENTER</h1>
            <p className="login-subtitle">Enterprise Workforce & Fleet Intelligence Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address or Employee ID</label>
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
              <label className="form-label" htmlFor="password">Password</label>
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

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 'var(--space-2)', background: 'var(--color-accent)', fontWeight: 700 }}
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
