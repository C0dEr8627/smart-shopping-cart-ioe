import React, { useEffect } from 'react';
import { ShieldAlert, BellOff, ArrowRight } from 'lucide-react';

export default function TheftAlarmModal({ onDisarm, onProceedPay }) {
  useEffect(() => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    } catch(e) {}
  }, []);

  return (
    <div className="alarm-overlay" role="alertdialog" aria-modal="true">
      <div className="alarm-card">
        <div className="alarm-icon-pulse">
          <ShieldAlert size={40} />
        </div>

        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          ANTI-THEFT ALARM!
        </h2>

        <div style={{
          display: 'inline-block',
          background: 'var(--color-red-light)',
          border: '1px solid #fecaca',
          color: 'var(--color-red-text)',
          fontSize: '11px',
          fontWeight: '700',
          padding: '3px 10px',
          borderRadius: '999px',
          marginBottom: '14px',
          letterSpacing: '0.5px'
        }}>
          SW-420 VIBRATION SENSOR TRIGGERED
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '22px' }}>
          Cart motion was detected while status is <strong>UNPAID</strong>. The hardware siren has sounded and the active session is locked.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className="btn-pay" 
            style={{ width: '100%', fontSize: '14px' }}
            onClick={onProceedPay}
          >
            <span>Pay & Disarm Cart</span>
            <ArrowRight size={16} />
          </button>

          <button 
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
              borderRadius: '999px',
              padding: '10px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onClick={onDisarm}
          >
            <BellOff size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Acknowledge / Reset Alarm
          </button>
        </div>
      </div>
    </div>
  );
}
