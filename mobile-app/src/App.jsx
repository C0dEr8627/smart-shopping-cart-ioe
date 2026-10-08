import React, { useState, useEffect } from 'react';
import {
  subscribeToCart,
  subscribeToAvailableCarts,
  pairCartCloud,
  setRemovalModeCloud
} from './firebase';

import Navbar from './components/Navbar';
import LcdMirror from './components/LcdMirror';
import TelemetryBar from './components/TelemetryBar';
import ColdAlertBanner from './components/ColdAlertBanner';
import CartItemList from './components/CartItemList';
import QrScannerModal from './components/QrScannerModal';
import RemovalModal from './components/RemovalModal';
import PairCartHero from './components/PairCartHero';
import WelcomeScanModal from './components/WelcomeScanModal';

import { ShoppingBag } from 'lucide-react';

export default function App() {
  const [cartId, setCartId] = useState('CART_004');
  const [cartData, setCartData] = useState(null);
  const [availableCarts, setAvailableCarts] = useState({});
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    return sessionStorage.getItem('smartcart_welcomed') !== 'true';
  });
  const [removalTargetItem, setRemovalTargetItem] = useState(null);

  useEffect(() => {
    const unsubscribeCart = subscribeToCart(cartId, (data) => {
      setCartData(data);

      if (data?.removal_mode && data?.removal_target_uid) {
        const target = data.items?.[data.removal_target_uid] || {
          uid: data.removal_target_uid,
          name: 'Selected Item',
          price: 0
        };
        setRemovalTargetItem(target);
      }

      // Hardware clears removal_mode after the RFID tag is scanned.
      if (!data?.removal_mode) {
        setRemovalTargetItem(null);
      }
    });

    const unsubscribeAvailable = subscribeToAvailableCarts((data) => {
      setAvailableCarts(data || {});
    });

    return () => {
      if (typeof unsubscribeCart === 'function') unsubscribeCart();
      if (typeof unsubscribeAvailable === 'function') unsubscribeAvailable();
    };
  }, [cartId]);

  const items = cartData?.items || {};
  const total = cartData?.total || 0;
  const totalItems = cartData?.total_items || 0;
  const telemetry = cartData?.telemetry || {
    temp_c: 20,
    humidity: 55,
    obstacle: false
  };
  const lcdDisplay = cartData?.lcd_display || {
    line1: `Welcome! ${cartId}`,
    line2: 'Scan QR to Pair'
  };

  const hasColdItems = Object.values(items).some((item) => item.is_cold);

  const handleSelectCart = async (newCartId) => {
    setCartId(newCartId);
    await pairCartCloud(newCartId, 'Shopper');
    setIsQrOpen(false);
  };

  const handleInitiateRemoval = async (item) => {
    setRemovalTargetItem(item);
    await setRemovalModeCloud(cartId, item.uid, true);
  };

  const handleCancelRemoval = async () => {
    await setRemovalModeCloud(cartId, null, false);
    setRemovalTargetItem(null);
  };

  return (
    <div className="app-shell">
      <Navbar
        cartId={cartId}
        status={cartData?.status || 'available'}
        onOpenQr={() => setIsQrOpen(true)}
      />

      <div className="dashboard-grid">
        <div className="dashboard-main-col">
          <PairCartHero
            cartId={cartId}
            status={cartData?.status}
            onOpenQr={() => setIsQrOpen(true)}
            onSelectCart={handleSelectCart}
          />

          <ColdAlertBanner
            temp={telemetry?.temp_c ?? 20}
            hasColdItems={hasColdItems}
          />

          <CartItemList
            items={items}
            onInitiateRemoval={handleInitiateRemoval}
          />
        </div>

        <div className="dashboard-side-col">
          <LcdMirror
            lcdDisplay={lcdDisplay}
            cartId={cartId}
            status={cartData?.status}
          />

          <TelemetryBar
            telemetry={telemetry}
            hasColdItems={hasColdItems}
          />

          <div className="desktop-summary-card">
            <div className="summary-card-header">
              <span className="summary-card-title">Live Cart Summary</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="summary-row">
              <span>Cart Subtotal</span>
              <span style={{ fontWeight: '600' }}>Rs. {total}</span>
            </div>

            <div className="summary-row">
              <span>Billing</span>
              <span style={{ color: '#0284c7', fontWeight: '600' }}>
                At Counter
              </span>
            </div>

            <div className="summary-row total">
              <span>Total</span>
              <span className="price">Rs. {total}</span>
            </div>

            <div style={{
              marginTop: '10px',
              padding: '10px',
              borderRadius: '10px',
              background: 'var(--color-blue-light)',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              Finish shopping and take this cart to the billing counter.
              The cashier desktop app will show the same cart and print the bill.
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-checkout-bar">
        <div className="bill-summary">
          <span className="bill-label">Current Bill ({totalItems} items)</span>
          <div className="bill-amount">
            <span>Rs.</span>{total}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} />
          <span>Pay at Billing Counter</span>
        </div>
      </div>

      {isQrOpen && (
        <QrScannerModal
          onClose={() => setIsQrOpen(false)}
          onSelectCart={handleSelectCart}
          availableCarts={availableCarts}
          activeCartId={cartId}
        />
      )}

      {removalTargetItem && (
        <RemovalModal
          targetItem={removalTargetItem}
          onCancelRemoval={handleCancelRemoval}
        />
      )}

      <WelcomeScanModal
        isOpen={isWelcomeModalOpen}
        onClose={() => {
          sessionStorage.setItem('smartcart_welcomed', 'true');
          setIsWelcomeModalOpen(false);
        }}
        onOpenScanner={() => {
          sessionStorage.setItem('smartcart_welcomed', 'true');
          setIsWelcomeModalOpen(false);
          setIsQrOpen(true);
        }}
        onSelectCart={(cid) => {
          sessionStorage.setItem('smartcart_welcomed', 'true');
          setIsWelcomeModalOpen(false);
          handleSelectCart(cid);
        }}
      />
    </div>
  );
}
