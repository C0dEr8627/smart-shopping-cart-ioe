import React from 'react';
import { ShoppingCart, Database, QrCode } from 'lucide-react';
import { isRealFirebaseActive } from '../firebase';

export default function Navbar({ 
  cartId, 
  status, 
  onOpenQr
}) {
  const isCloudLive = isRealFirebaseActive();

  return (
    <header className="top-navbar">
      <div className="brand-section">
        <div className="brand-logo-badge">
          <ShoppingCart size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="brand-title">SmartCart IoE</h1>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
            <span className="brand-badge">
              <span className="pulse-dot" />
              {cartId || 'No Cart'}
            </span>
            <span 
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '999px',
                background: isCloudLive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: isCloudLive ? '#60a5fa' : '#fbbf24',
                border: `1px solid ${isCloudLive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title={isCloudLive ? "Connected to live Firebase Realtime DB" : "Running on reactive local store"}
            >
              <Database size={9} />
              {isCloudLive ? 'Firebase' : 'Demo DB'}
            </span>
          </div>
        </div>
      </div>

      <div className="nav-actions">
        <button 
          className="nav-qr-btn" 
          onClick={onOpenQr} 
          title="Scan Cart QR Code (Step 1)"
          aria-label="Scan Cart QR"
        >
          <span className="nav-qr-icon-wrap">
            <QrCode size={16} strokeWidth={2.4} />
            <span className="nav-qr-glow-dot" />
          </span>
          <span className="nav-qr-label">Scan Cart</span>
        </button>
      </div>
    </header>
  );
}
