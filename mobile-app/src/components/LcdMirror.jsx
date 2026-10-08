import React from 'react';
import { Monitor, Cpu } from 'lucide-react';

export default function LcdMirror({ lcdDisplay, cartId, status }) {
  const line1 = lcdDisplay?.line1 || `IoE Cart: ${cartId || '#004'}`;
  const line2 = lcdDisplay?.line2 || "Scan QR to Pair";

  // Pad or trim to 16-20 characters for true LCD realism
  const formattedL1 = (line1 + "                ").substring(0, 16);
  const formattedL2 = (line2 + "                ").substring(0, 16);

  return (
    <div className="lcd-container">
      <div className="lcd-header">
        <div className="lcd-tag">
          <Cpu size={12} />
          <span>I2C LCD Onboard Screen Mirror</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>ADDR: 0x27</span>
          <span className="pulse-dot" style={{ width: '6px', height: '6px' }} />
        </div>
      </div>

      <div className="lcd-glass">
        <div className="lcd-line">{formattedL1}</div>
        <div className="lcd-line lcd-line-2">{formattedL2}</div>
      </div>
    </div>
  );
}
