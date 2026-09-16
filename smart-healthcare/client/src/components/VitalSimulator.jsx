import { useEffect, useState } from 'react';
import { IcHeart } from './Icons';
import { RiskAPI } from '../lib/api';

const STORAGE_KEY = 'smart-healthcare-vital-simulator';
const READING_STORAGE_KEY = 'smart-healthcare-latest-reading';
const READING_EVENT = 'smart-healthcare-reading';
const READING_TYPE_ORDER = ['normal', 'medium', 'critical'];
const READING_TYPES = {
  normal: {
    label: 'Normal',
    className: 'simulator-normal',
    message: 'Readings are within the normal range. Continue your regular routine.',
    action: 'No action needed',
    vitals: { heartRate: 72, oxygen: 98, temperature: 36.7, activity: 42 },
  },
  medium: {
    label: 'Medium',
    className: 'simulator-medium',
    message: 'Some readings need attention. Follow your medication plan and rest.',
    action: 'Medication suggestion and caretaker guidance',
    vitals: { heartRate: 96, oxygen: 94, temperature: 38.1, activity: 25 },
  },
  critical: {
    label: 'Critical',
    className: 'simulator-critical',
    message: 'Critical readings detected. Immediate medical attention is recommended.',
    action: 'Caretaker notified. Seek hospitalization immediately.',
    vitals: { heartRate: 132, oxygen: 87, temperature: 39.6, activity: 8 },
  },
};

function nextVitals(previous, type) {
  const range = type === 'normal' ? 1 : type === 'medium' ? 3 : 5;
  return {
    heartRate: previous.heartRate + Math.round((Math.random() - 0.5) * range * 2),
    oxygen: previous.oxygen + Math.round((Math.random() - 0.5) * range),
    temperature: Number((previous.temperature + (Math.random() - 0.5) * range * 0.08).toFixed(1)),
    activity: Math.max(0, previous.activity + Math.round((Math.random() - 0.5) * range * 2)),
  };
}

export default function VitalSimulator() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === 'on');
  const [readingType, setReadingType] = useState('normal');
  const [vitals, setVitals] = useState(READING_TYPES.normal.vitals);
  const [acnoResult, setAcnoResult] = useState(null);
  const reading = READING_TYPES[readingType];

  useEffect(() => {
    if (!enabled) {
      setAcnoResult(null);
      return undefined;
    }
    let active = true;
    RiskAPI.analyzeSimulator(vitals, readingType)
      .then((result) => {
        if (active) setAcnoResult(result.available ? result : null);
      })
      .catch(() => {
        if (active) setAcnoResult(null);
      });
    return () => { active = false; };
  }, [enabled, readingType]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    if (!enabled) {
      const payload = { active: false, timestamp: new Date().toISOString() };
      localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(READING_EVENT, { detail: payload }));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const publishReading = (currentVitals) => {
      const payload = {
        ...currentVitals,
        type: readingType,
        label: READING_TYPES[readingType].label,
        acno: acnoResult,
        active: true,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(READING_EVENT, { detail: payload }));
    };

    publishReading(vitals);
    const timer = window.setInterval(() => {
      setVitals((previous) => {
        const next = nextVitals(previous, readingType);
        publishReading(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, readingType, acnoResult]);

  useEffect(() => {
    if (!enabled) return;
    const payload = {
      ...vitals,
      type: readingType,
      label: reading.label,
      active: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(payload));
  }, [enabled, readingType, reading, vitals]);

  useEffect(() => {
    if (!enabled) return undefined;
    let nextIndex = (READING_TYPE_ORDER.indexOf(readingType) + 1) % READING_TYPE_ORDER.length;
    const timer = window.setInterval(() => {
      const nextType = READING_TYPE_ORDER[nextIndex];
      nextIndex = (nextIndex + 1) % READING_TYPE_ORDER.length;
      setReadingType(nextType);
      setVitals(READING_TYPES[nextType].vitals);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return (
    <section className={`simulator ${enabled ? 'simulator-on' : ''} ${enabled ? reading.className : ''}`} aria-label="Vital simulator">
      <div className="simulator-head">
        <div className="simulator-title">
          <div className="logo-box logo-sm simulator-icon"><IcHeart size={18} /></div>
          <div>
            <h2>Vital Simulator</h2>
            <p className="hint">Preview live health readings</p>
          </div>
        </div>
        <button
          type="button"
          className={`simulator-switch ${enabled ? 'is-on' : ''}`}
          aria-pressed={enabled}
          onClick={() => setEnabled((value) => !value)}
        >
          <span className="simulator-switch-knob" />
          <span>{enabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      {enabled && (
        <div className="fade-in">
          <div className="simulator-status">
            <strong>{reading.label} reading</strong>
            <span>{reading.message}</span>
            <small>{reading.action}</small>
          </div>

          <div className="simulator-readings">
            <div className="simulator-reading">
              <span>Heart rate</span>
              <strong>{vitals.heartRate}<small> bpm</small></strong>
            </div>
            <div className="simulator-reading">
              <span>Oxygen</span>
              <strong>{vitals.oxygen}<small>%</small></strong>
            </div>
            <div className="simulator-reading">
              <span>Temperature</span>
              <strong>{vitals.temperature}<small>°C</small></strong>
            </div>
            <div className="simulator-reading">
              <span>Activity</span>
              <strong>{vitals.activity}<small>%</small></strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}