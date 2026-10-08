import React from 'react';
import { QrCode, CheckCircle2, Sparkles, ArrowRight, Smartphone, ShieldCheck } from 'lucide-react';

export default function PairCartHero({ cartId, status, onOpenQr, onSelectCart }) {
  const isLinked = status === 'linked' || status === 'in_use';

  if (isLinked) {
    return (
      <div className="pair-hero-card linked">
        <div className="pair-hero-left">
          <div className="pair-hero-icon linked">
            <CheckCircle2 size={22} />
          </div>
          <div className="pair-hero-text">
            <div className="pair-hero-status-row">
              <span className="pair-status-badge linked">
                <span className="status-dot online" />
                Active Cart Connected
              </span>
              <span className="pair-cart-id">{cartId}</span>
            </div>
            <p className="pair-hero-sub">
              Your session is synced. Scanned RFID items will update this screen and the onboard LCD automatically.
            </p>
          </div>
        </div>

        <button className="pair-hero-switch-btn" onClick={onOpenQr} title="Switch or Re-scan Cart QR">
          <QrCode size={15} />
          <span>Switch Cart</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pair-hero-card unlinked">
      <div className="pair-hero-decor-badge">
        <Sparkles size={13} />
        <span>Step 1 • Initialization</span>
      </div>

      <div className="pair-hero-content">
        <div className="pair-hero-icon unlinked pulse-glow">
          <QrCode size={28} />
        </div>

        <div className="pair-hero-text">
          <h2 className="pair-hero-title">Pair Your Smart Shopping Cart</h2>
          <p className="pair-hero-sub">
            Scan the QR code printed on your physical cart's frame to initialize session security & mirror the onboard I2C display.
          </p>
        </div>
      </div>

      <div className="pair-hero-actions">
        <button className="btn-scan-hero" onClick={onOpenQr}>
          <QrCode size={18} />
          <span>Scan Cart QR Code</span>
          <ArrowRight size={17} />
        </button>

        <div className="pair-quick-pills">
          <span className="quick-label">Or Instant Connect:</span>
          <button 
            type="button" 
            className={`quick-cart-chip ${cartId === 'CART_004' ? 'active' : ''}`}
            onClick={() => onSelectCart && onSelectCart('CART_004')}
          >
            <Smartphone size={13} />
            CART_004
          </button>
          <button 
            type="button" 
            className={`quick-cart-chip ${cartId === 'CART-101' ? 'active' : ''}`}
            onClick={() => onSelectCart && onSelectCart('CART-101')}
          >
            <Smartphone size={13} />
            CART-101
          </button>
        </div>
      </div>
    </div>
  );
}

