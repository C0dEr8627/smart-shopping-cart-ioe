import React from 'react';
import { QrCode, Sparkles, ArrowRight, Smartphone, X, ShieldCheck } from 'lucide-react';

export default function WelcomeScanModal({ isOpen, onClose, onOpenScanner, onSelectCart }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bottom-sheet welcome-scan-sheet">
        <div className="welcome-sheet-header">
          <div className="welcome-step-pill">
            <Sparkles size={13} />
            <span>Step 1 • Welcome to SmartCart</span>
          </div>
          <button className="sheet-close-btn" onClick={onClose} aria-label="Dismiss Welcome Prompt">
            <X size={18} />
          </button>
        </div>

        <div className="welcome-hero-graphic">
          <div className="welcome-icon-glow">
            <QrCode size={40} strokeWidth={2.2} />
          </div>
        </div>

        <div className="welcome-sheet-body">
          <h2 className="welcome-sheet-title">Scan Cart QR to Begin</h2>
          <p className="welcome-sheet-desc">
            To start your shopping trip, please pair this mobile app with your physical smart cart by scanning the QR code on the cart frame.
          </p>
        </div>

        <div className="welcome-sheet-actions">
          <button 
            className="btn-welcome-scan-primary"
            onClick={() => {
              onClose();
              onOpenScanner();
            }}
          >
            <QrCode size={20} />
            <span>Open QR Camera Scanner</span>
            <ArrowRight size={18} />
          </button>

          <div className="welcome-divider">
            <span>or select demo cart directly</span>
          </div>

          <div className="welcome-quick-grid">
            <button 
              type="button" 
              className="welcome-quick-btn"
              onClick={() => {
                onClose();
                onSelectCart('CART_004');
              }}
            >
              <Smartphone size={16} />
              <span>Connect CART_004</span>
            </button>

            <button 
              type="button" 
              className="welcome-quick-btn"
              onClick={() => {
                onClose();
                onSelectCart('CART-101');
              }}
            >
              <Smartphone size={16} />
              <span>Connect CART-101</span>
            </button>
          </div>

          <button 
            type="button" 
            className="welcome-skip-btn"
            onClick={onClose}
          >
            I'll scan later • Explore Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
