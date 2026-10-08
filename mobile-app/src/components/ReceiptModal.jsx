import React from 'react';
import { CheckCircle2, Download, ShoppingBag, ArrowRight } from 'lucide-react';

export default function ReceiptModal({ billRecord, onNewSession }) {
  if (!billRecord) return null;

  const items = Object.values(billRecord.items || {});

  const handleDownload = () => {
    // Open backend PDF receipt endpoint if running, or trigger browser print
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="bottom-sheet" style={{ textAlign: 'center' }}>
        <div className="sheet-handle" />

        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          <CheckCircle2 size={32} />
        </div>

        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
          Payment Successful!
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Cart unlocked. LCD updated to: <em>Payment Success! Thank You!</em>
        </p>

        {/* Digital Bill Card */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px dashed var(--border-medium)',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'left',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Bill ID</span>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{billRecord.bill_id}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cart ID</span>
            <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{billRecord.cart_id}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Payment Method</span>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{billRecord.payment_method}</span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginBottom: '10px' }}>
            {items.map((i, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{i.quantity}× {i.name}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Rs. {i.price * i.quantity}</span>
              </div>
            ))}
          </div>

          <div style={{ 
            borderTop: '1px solid var(--border-subtle)', 
            paddingTop: '10px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Total Paid</span>
            <span style={{ 
              fontFamily: "'Space Grotesk', sans-serif", 
              fontWeight: '800', 
              fontSize: '20px', 
              color: 'var(--color-primary)' 
            }}>
              Rs. {billRecord.total}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className="btn-pay" 
            style={{ width: '100%', fontSize: '14px' }}
            onClick={onNewSession}
          >
            <ShoppingBag size={16} />
            <span>Start Next Shopping Session</span>
          </button>

          <button 
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              borderRadius: '999px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleDownload}
          >
            <Download size={15} />
            Download / Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
