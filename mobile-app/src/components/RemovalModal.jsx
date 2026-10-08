import React from 'react';
import { RefreshCw, X, Check, Radio } from 'lucide-react';

export default function RemovalModal({ 
  targetItem, 
  onConfirmRemoval, 
  onCancelRemoval 
}) {
  if (!targetItem) return null;

  return (
    <div className="modal-overlay">
      <div className="bottom-sheet">
        <div className="sheet-handle" />

        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.2)', 
              color: '#ef4444', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <RefreshCw size={18} className="spin-slow" />
            </span>
            <h3 className="sheet-title">Stage 4: Removal Mode Active</h3>
          </div>
          <button className="sheet-close-btn" onClick={onCancelRemoval}>
            <X size={16} />
          </button>
        </div>

        <div style={{
          background: 'var(--color-red-light)',
          border: '1px solid #fecaca',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>{targetItem.image || "📦"}</span>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{targetItem.name}</h4>
              <p style={{ fontSize: '12px', color: 'var(--color-red-text)' }}>
                Unit Price: Rs. {targetItem.price} · Tag: {targetItem.uid}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--lcd-bezel)',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '18px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', letterSpacing: '0.5px' }}>CART LCD DISPLAY</div>
          <div style={{ fontFamily: 'var(--font-lcd)', fontSize: '14px', color: 'var(--lcd-glass)', letterSpacing: '1px' }}>
            SCAN TO REMOVE
          </div>
          <div style={{ fontFamily: 'var(--font-lcd)', fontSize: '13px', color: '#a7f3d0', letterSpacing: '1px' }}>
            {targetItem.name.substring(0, 16).toUpperCase()}
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
          The hardware has been flagged into <strong>Removal Mode</strong>. Pass the item tag across the <strong>RC522 RFID reader</strong>. The Arduino will double beep and deduct the price from your bill.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-pay" 
            style={{ 
              background: 'var(--color-red)', 
              color: '#ffffff',
              boxShadow: 'var(--shadow-sm)'
            }}
            onClick={() => onConfirmRemoval(targetItem.uid)}
          >
            <Radio size={16} />
            Simulate RFID Tag Removal
          </button>
          <button 
            className="sheet-close-btn" 
            style={{ width: 'auto', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '600' }}
            onClick={onCancelRemoval}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
