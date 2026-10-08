import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Wallet, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  ShieldCheck, 
  QrCode 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutModal({ 
  cartId, 
  total, 
  totalItems, 
  onClose, 
  onPaymentSuccess 
}) {
  const [method, setMethod] = useState('upi'); // upi | card | tap
  const [upiApp, setUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('shopper@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    setIsProcessing(true);

    // Realistic processing delay for dummy payment
    await new Promise((resolve) => setTimeout(resolve, 1400));

    try {
      // Trigger celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch(e) {}

    setIsProcessing(false);
    onPaymentSuccess({
      method: method.toUpperCase(),
      detail: method === 'upi' ? `${upiApp.toUpperCase()} (${upiId})` : 'Visa Card •••• 8821',
      total
    });
  };

  return (
    <div className="modal-overlay">
      <div className="bottom-sheet">
        <div className="sheet-handle" />

        <div className="sheet-header">
          <div>
            <h3 className="sheet-title">Instant Digital Checkout</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Cart: {cartId} · {totalItems} items
            </p>
          </div>
          <button className="sheet-close-btn" onClick={onClose} disabled={isProcessing}>
            <X size={16} />
          </button>
        </div>

        {/* Amount Due Card */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Total Payable
            </span>
            <div style={{ 
              fontFamily: "'Space Grotesk', sans-serif", 
              fontSize: '28px', 
              fontWeight: '800', 
              color: 'var(--color-primary)' 
            }}>
              Rs. {total}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              color: '#065f46',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '4px 8px',
              borderRadius: '999px',
              fontWeight: '600'
            }}>
              <ShieldCheck size={13} />
              Dummy 256-Bit SSL
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="pay-methods-grid">
          <button 
            className={`pay-method-btn ${method === 'upi' ? 'selected' : ''}`}
            onClick={() => setMethod('upi')}
          >
            <Smartphone size={22} />
            <span>UPI Instant</span>
          </button>

          <button 
            className={`pay-method-btn ${method === 'card' ? 'selected' : ''}`}
            onClick={() => setMethod('card')}
          >
            <CreditCard size={22} />
            <span>Credit / Debit</span>
          </button>

          <button 
            className={`pay-method-btn ${method === 'tap' ? 'selected' : ''}`}
            onClick={() => setMethod('tap')}
          >
            <Wallet size={22} />
            <span>Apple/Google Pay</span>
          </button>
        </div>

        {/* Method Detail Subsections */}
        {method === 'upi' && (
          <div style={{ marginBottom: '20px' }}>
            <div className="upi-quick-apps">
              <button 
                className={`upi-app-chip ${upiApp === 'gpay' ? 'active' : ''}`}
                onClick={() => setUpiApp('gpay')}
              >
                Google Pay
              </button>
              <button 
                className={`upi-app-chip ${upiApp === 'phonepe' ? 'active' : ''}`}
                onClick={() => setUpiApp('phonepe')}
              >
                PhonePe
              </button>
              <button 
                className={`upi-app-chip ${upiApp === 'paytm' ? 'active' : ''}`}
                onClick={() => setUpiApp('paytm')}
              >
                Paytm
              </button>
              <button 
                className={`upi-app-chip ${upiApp === 'qr' ? 'active' : ''}`}
                onClick={() => setUpiApp('qr')}
              >
                Show QR
              </button>
            </div>

            {upiApp === 'qr' ? (
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px', 
                padding: '16px', 
                textAlign: 'center', 
                color: '#0f172a', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <QrCode size={110} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>
                  UPI Dynamic QR: Rs. {total}
                </span>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {method === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Card Number"
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                defaultValue="08/29" 
                placeholder="MM/YY"
                style={{
                  flex: 1,
                  background: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
              <input 
                type="password" 
                defaultValue="742" 
                placeholder="CVV"
                maxLength={3}
                style={{
                  width: '90px',
                  background: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        )}

        {method === 'tap' && (
          <div style={{ 
            background: 'var(--bg-subtle)', 
            border: '1px dashed var(--border-medium)', 
            borderRadius: '14px', 
            padding: '20px', 
            textAlign: 'center', 
            marginBottom: '20px' 
          }}>
            <Smartphone size={32} style={{ color: 'var(--color-primary)', marginBottom: '6px' }} />
            <h4 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Tap to Pay Ready</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Hold device or double-click side button to simulate Apple/Google Pay.
            </p>
          </div>
        )}

        <button 
          className="btn-pay" 
          style={{ width: '100%' }}
          onClick={handlePay}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="spin-slow" />
              <span>Authorizing Cloud Ledger...</span>
            </>
          ) : (
            <>
              <Lock size={16} />
              <span>Simulate Pay Rs. {total}</span>
            </>
          )}
        </button>

        <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '12px' }}>
          🔒 Test mode: No real funds deducted. Updates cart status to PAID in real time.
        </p>
      </div>
    </div>
  );
}
