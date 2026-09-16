import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHead from '../components/PageHead';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { AuthAPI, PatientAPI, AssessmentAPI, AlertAPI, UploadAPI } from '../lib/api';
import { IcClock, IcDoc, IcUpload, IcLogout, IcHeart } from '../components/Icons';
import VitalSimulator from '../components/VitalSimulator';

const READING_STORAGE_KEY = 'smart-healthcare-latest-reading';
const READING_EVENT = 'smart-healthcare-reading';

function Badge({ level }) {
  const cls =
    level === 'Critical' ? 'badge-critical'
      : level === 'High' ? 'badge-high'
      : level === 'Moderate' ? 'badge-moderate' : 'badge-low';
  return <span className={`badge ${cls}`}>{level}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ patient: {}, assessments: [], alerts: [], docs: [] });
  const [simulatorReading, setSimulatorReading] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(READING_STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [smsNotice, setSmsNotice] = useState(() => {
    try {
      const reading = JSON.parse(localStorage.getItem(READING_STORAGE_KEY) || 'null');
      return Boolean(reading?.active && reading.type === 'critical');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    Promise.all([PatientAPI.get(), AssessmentAPI.history(), AlertAPI.list(), UploadAPI.list()])
      .then(([patient, assessments, alerts, docs]) =>
        setData({ patient, assessments, alerts, docs })
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const receiveReading = (event) => {
      const reading = event.detail;
      setSimulatorReading(reading);
      if (reading.type === 'critical' && reading.active) {
        setSmsNotice(true);
      } else if (!reading.active) {
        setSmsNotice(false);
      }
    };
    window.addEventListener(READING_EVENT, receiveReading);
    const receiveStoredReading = (event) => {
      if (event.key !== READING_STORAGE_KEY || !event.newValue) return;
      receiveReading({ detail: JSON.parse(event.newValue) });
    };
    window.addEventListener('storage', receiveStoredReading);
    return () => {
      window.removeEventListener(READING_EVENT, receiveReading);
      window.removeEventListener('storage', receiveStoredReading);
    };
  }, []);

  const { patient, assessments, alerts, docs } = data;
  const latest = assessments[0];
  const simulatorIsActive = Boolean(simulatorReading?.active);
  const simulatorStatus = simulatorReading?.type === 'critical'
    ? { label: 'Critical', desc: 'Critical simulator reading detected', cls: 'badge-critical' }
    : simulatorReading?.type === 'medium'
      ? { label: 'Medium', desc: 'Simulator reading needs attention', cls: 'badge-moderate' }
      : { label: 'Normal', desc: 'Simulator readings are within the normal range', cls: 'badge-low' };

  let status = simulatorIsActive ? simulatorStatus : { label: 'Good', desc: 'No active concerns detected', cls: 'badge-low' };
  if (!simulatorIsActive && latest) {
    if (latest.risk_level === 'Critical') status = { label: 'Critical', desc: 'Critical attention required', cls: 'badge-critical' };
    else if (latest.risk_level === 'High') status = { label: 'High', desc: 'High risk — monitor closely', cls: 'badge-high' };
    else if (latest.risk_level === 'Moderate') status = { label: 'Moderate', desc: 'Moderate risk — stay observant', cls: 'badge-moderate' };
    else status = { label: 'Low Risk', desc: 'Assessment completed successfully', cls: 'badge-low' };
  }

  const logout = async () => {
    await AuthAPI.logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="page">
      <PageHead
        title={loading ? 'Dashboard' : `Hi, ${(user?.name || 'Patient').split(' ')[0]}`}
        right={
          <div className="split" style={{ gap: 8 }}>
            <ThemeToggle />
            <button className="icon-btn" onClick={logout} title="Sign out">
              <IcLogout size={17} />
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="card empty"><span className="spinner" /></div>
      ) : (
        <div className="fade-in">
          {smsNotice && simulatorReading?.type === 'critical' && (
            <div className="dashboard-sms-alert" role="alert">
              <strong>SMS sent to user</strong>
              <button type="button" onClick={() => setSmsNotice(false)} aria-label="Dismiss alert">×</button>
            </div>
          )}
          <VitalSimulator />
          <div className="card" style={{ background: 'var(--primary-soft)', borderColor: 'transparent' }}>
            <div className="split">
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--primary-strong)' }}>
                  Health Status
                </p>
                <h2 style={{ fontSize: 24, marginTop: 4 }}>{status.label}</h2>
                <p className="sub" style={{ fontSize: 13, marginTop: 4 }}>{status.desc}</p>
              </div>
              <span className={`badge ${status.cls}`}>{status.label}</span>
            </div>
            {latest && (
              <p className="hint" style={{ marginTop: 10 }}>
                Score: {latest.risk_score} · {new Date(latest.created_at).toLocaleDateString()}
              </p>
            )}
            {simulatorIsActive && simulatorReading && (
              <p className="hint" style={{ marginTop: 10 }}>
                Live simulator: {simulatorReading.heartRate} bpm · {simulatorReading.oxygen}% oxygen · {simulatorReading.temperature}°C
              </p>
            )}
          </div>

          <div className="stat-grid">
            <div className="stat">
              <p className="stat-label">Assessments</p>
              <p className="stat-value">{assessments.length}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Alerts</p>
              <p className="stat-value" style={{ color: alerts.length ? 'var(--danger)' : undefined }}>
                {alerts.length}
              </p>
            </div>
          </div>

          <h3 className="section-title">Recent Assessments</h3>
          {assessments.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon"><IcClock /></div>
              <h3>No assessments yet</h3>
              <p>Complete an assessment to track your health.</p>
              <Link to="/assessment" className="btn btn-primary btn-sm">Start Assessment</Link>
            </div>
          ) : (
            assessments.slice(0, 3).map((a) => (
              <div className="card card-pad-s" key={a.id}>
                <div className="split">
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>
                      Score: <span style={{ color: 'var(--primary)' }}>{a.risk_score}</span>
                    </p>
                    <p className="hint" style={{ marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge level={a.risk_level} />
                </div>
              </div>
            ))
          )}

          <h3 className="section-title">Uploaded Reports</h3>
          {docs.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon"><IcDoc /></div>
              <h3>No reports yet</h3>
              <p>Upload prescriptions or reports.</p>
              <Link to="/upload" className="btn btn-ghost btn-sm" style={{ width: 'auto' }}>
                <IcUpload size={15} /> Upload Report
              </Link>
            </div>
          ) : (
            docs.slice(0, 3).map((d) => (
              <div className="card card-pad-s" key={d.id}>
                <div className="split">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <div className="logo-box logo-sm" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', boxShadow: 'none' }}>
                      <IcDoc size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.file_name}</p>
                      <p className="hint">{new Date(d.upload_time).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>View</a>
                </div>
              </div>
            ))
          )}

          <h3 className="section-title">Medication Reminders</h3>
          {(!patient.medications || patient.medications?.length === 0) ? (
            <div className="card empty">
              <div className="empty-icon"><IcHeart /></div>
              <h3>No medication reminders</h3>
              <p>Add medications during your next assessment.</p>
            </div>
          ) : (
            patient.medications.map((m, i) => (
              <div className="card card-pad-s" key={i}>
                <div className="split">
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</p>
                    <p className="hint" style={{ marginTop: 2 }}>
                      {m.dosage || ''} {m.time ? `· ${m.time}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 20 }}>⏰</span>
                </div>
              </div>
            ))
          )}

          <div className="btn-row" style={{ marginTop: 22 }}>
            <Link to="/assessment" className="btn btn-primary">New Assessment</Link>
            <Link to="/upload" className="btn btn-ghost">Upload Report</Link>
          </div>
        </div>
      )}
    </div>
  );
}