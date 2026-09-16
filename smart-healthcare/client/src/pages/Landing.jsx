import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import ThemeToggle from '../components/ThemeToggle';
import VitalSimulator from '../components/VitalSimulator';
import { IcHeart, IcAssess, IcUpload, IcClock, IcSpark, IcChat, IcCamera, IcWarn, IcShield } from '../components/Icons';

export default function Landing() {
  const { user, loading } = useAuth();

  if (user && !loading) return <Dashboard />;

  return (
    <div className="page" style={{ paddingTop: 22 }}>
      <div className="split">
        <div className="logo-box">
          <IcHeart size={30} />
        </div>
        <ThemeToggle />
      </div>

      <div style={{ marginTop: 22 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.6px' }}>
          {loading ? 'Smart Healthcare' : user ? `Welcome, ${user.name.split(' ')[0]} 👋` : 'Smart Healthcare'}
        </h1>
        <p className="sub" style={{ fontSize: 14, marginTop: 6 }}>
          Your health, always monitored — at your fingertips.
        </p>
      </div>

      <div className="card ai-hero fade-in" style={{ marginTop: 20 }}>
        <div className="split">
          <div>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <IcSpark size={13} /> NEW
            </span>
            <h2 style={{ fontSize: 20, marginTop: 10 }}>AI Health Assistant</h2>
            <p style={{ fontSize: 13.5, marginTop: 6, opacity: 0.92, lineHeight: 1.5 }}>
              Ask about everyday symptoms or scan a skin photo — understand rashes, fever, cold
              and more with simple, reassuring guidance.
            </p>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <Link to="/assistant?mode=chat" className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', boxShadow: 'none' }}>
            <IcChat size={17} /> Chat
          </Link>
          <Link to="/assistant?mode=scan" className="btn" style={{ background: '#fff', color: 'var(--primary-strong)', boxShadow: 'none' }}>
            <IcCamera size={17} /> Scan Skin
          </Link>
        </div>
      </div>

      <VitalSimulator />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
        <Link to="/assessment" className="card tappable" style={{ padding: 18 }}>
          <div className="logo-box logo-sm" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', boxShadow: 'none' }}>
            <IcAssess />
          </div>
          <h3 style={{ fontSize: 15, marginTop: 12 }}>Start Assessment</h3>
          <p className="hint" style={{ marginTop: 4 }}>Complete your health checkup</p>
        </Link>

        <Link to="/upload" className="card tappable" style={{ padding: 18 }}>
          <div className="logo-box logo-sm" style={{ background: 'var(--success-soft)', color: 'var(--success)', boxShadow: 'none' }}>
            <IcUpload />
          </div>
          <h3 style={{ fontSize: 15, marginTop: 12 }}>Upload Reports</h3>
          <p className="hint" style={{ marginTop: 4 }}>Store medical documents</p>
        </Link>

        <Link to="/history" className="card tappable" style={{ padding: 18 }}>
          <div className="logo-box logo-sm" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', boxShadow: 'none' }}>
            <IcClock />
          </div>
          <h3 style={{ fontSize: 15, marginTop: 12 }}>View History</h3>
          <p className="hint" style={{ marginTop: 4 }}>Track your health timeline</p>
        </Link>

        <Link to="/login" className="card tappable" style={{ padding: 18 }}>
          <div className="logo-box logo-sm" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', boxShadow: 'none' }}>
            <IcShield />
          </div>
          <h3 style={{ fontSize: 15, marginTop: 12 }}>Sign In</h3>
          <p className="hint" style={{ marginTop: 4 }}>View your health dashboard</p>
        </Link>
      </div>

      {!user && !loading && (
        <div className="card" style={{ marginTop: 18, textAlign: 'center', padding: '18px 16px' }}>
          <p className="sub" style={{ fontSize: 14 }}>
            Save your assessments and reports with an account.
          </p>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <Link to="/login" className="btn btn-ghost btn-sm" style={{ width: 'auto' }}>Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Create account</Link>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 18, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ color: 'var(--danger)' }}>
          <IcWarn size={20} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Emergency?</p>
          <p className="hint" style={{ marginTop: 3 }}>
            Call your local emergency number right away or visit the nearest hospital. This app is
            a guide, not a replacement for medical care.
          </p>
        </div>
      </div>
    </div>
  );
}