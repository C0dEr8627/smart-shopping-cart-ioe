import React, { useState, useEffect } from 'react';
import { 
  subscribeToCart, 
  subscribeToAvailableCarts, 
  pairCartCloud, 
  unpairCartCloud, 
  addScannedItemCloud, 
  setRemovalModeCloud, 
  confirmItemRemovalCloud, 
  updateTelemetryCloud, 
  triggerTheftAlarmCloud, 
  processDummyPaymentCloud, 
  resetCartAfterPaymentCloud 
} from './firebase';

import Navbar from './components/Navbar';
import LcdMirror from './components/LcdMirror';
import TelemetryBar from './components/TelemetryBar';
import ColdAlertBanner from './components/ColdAlertBanner';
import CartItemList from './components/CartItemList';
import CheckoutModal from './components/CheckoutModal';
import ReceiptModal from './components/ReceiptModal';
import QrScannerModal from './components/QrScannerModal';
import RemovalModal from './components/RemovalModal';
import TheftAlarmModal from './components/TheftAlarmModal';
import HardwareSimulatorDrawer from './components/HardwareSimulatorDrawer';
import PairCartHero from './components/PairCartHero';
import WelcomeScanModal from './components/WelcomeScanModal';

import { Cpu, ArrowRight, ShoppingBag } from 'lucide-react';


export default function App() {
  const [cartId, setCartId] = useState('CART_004');
  const [cartData, setCartData] = useState(null);
  const [availableCarts, setAvailableCarts] = useState({});

  // Modals & Drawers
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    return sessionStorage.getItem('smartcart_welcomed') !== 'true';
  });
  const [removalTargetItem, setRemovalTargetItem] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [billRecord, setBillRecord] = useState(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);


  // Subscribe to real-time cart data from Firebase
  useEffect(() => {
    const unsubscribeCart = subscribeToCart(cartId, (data) => {
      setCartData(data);
      if (data?.removal_mode && data?.removal_target_uid && !removalTargetItem) {
        const target = data.items?.[data.removal_target_uid] || {
          uid: data.removal_target_uid,
          name: "Item Marked for Removal",
          price: 0
        };
        setRemovalTargetItem(target);
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

  // Derived state
  const items = cartData?.items || {};
  const total = cartData?.total || 0;
  const totalItems = cartData?.total_items || 0;
  const telemetry = cartData?.telemetry || {
    temp_c: 19.5,
    humidity: 55,
    obstacle: false,
    dim_lighting: false,
    vibration: false
  };
  const lcdDisplay = cartData?.lcd_display || {
    line1: `Welcome! ${cartId}`,
    line2: "Scan QR to Pair"
  };
  const isTheftAlarmActive = cartData?.theft_alarm === true;
  const isRemovalMode = cartData?.removal_mode === true;

  // Cold items check for Stage 3 Perishable warning
  const hasColdItems = Object.values(items).some((i) => i.is_cold);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectCart = async (newCartId) => {
    setCartId(newCartId);
    await pairCartCloud(newCartId, 'Shopper');
    setIsQrOpen(false);
  };

  const handleScanItem = async (uid) => {
    await addScannedItemCloud(cartId, uid);
  };

  const handleInitiateRemoval = async (item) => {
    setRemovalTargetItem(item);
    await setRemovalModeCloud(cartId, item.uid, true);
  };

  const handleConfirmRemoval = async (uid) => {
    await confirmItemRemovalCloud(cartId, uid);
    setRemovalTargetItem(null);
  };

  const handleCancelRemoval = async () => {
    await setRemovalModeCloud(cartId, null, false);
    setRemovalTargetItem(null);
  };

  const handleTelemetryUpdate = async (patch) => {
    await updateTelemetryCloud(cartId, patch);
  };

  const handleTheftAlarm = async (enable) => {
    await triggerTheftAlarmCloud(cartId, enable);
  };

  const handlePaymentSuccess = async (paymentDetails) => {
    const record = await processDummyPaymentCloud(cartId, paymentDetails);
    setIsCheckoutOpen(false);
    setBillRecord(record);
  };

  const handleNewSession = async () => {
    await resetCartAfterPaymentCloud(cartId);
    setBillRecord(null);
  };

  return (
    <div className="app-shell">
      {/* 1. Sticky Navigation Bar */}
      <Navbar 
        cartId={cartId}
        status={cartData?.status || 'available'}
        onOpenQr={() => setIsQrOpen(true)}
      />

      {/* 2. Responsive Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Main Column: Cold alerts, Itemized Cart Ledger */}
        <div className="dashboard-main-col">
          {/* Step 1: Pair Cart QR Hero Banner */}
          <PairCartHero 
            cartId={cartId}
            status={cartData?.status}
            onOpenQr={() => setIsQrOpen(true)}
            onSelectCart={handleSelectCart}
          />

          {/* Cold Chain Warning Notification */}
          <ColdAlertBanner 
            temp={telemetry?.temp_c ?? 20}
            hasColdItems={hasColdItems}
          />

          {/* Live Itemized Cart Ledger */}
          <CartItemList 
            items={items}
            onInitiateRemoval={handleInitiateRemoval}
            onOpenSandbox={() => setIsSandboxOpen(true)}
          />
        </div>


        {/* Sidebar Column: LCD Mirror, Telemetry Sensors, Desktop Checkout Summary */}
        <div className="dashboard-side-col">
          {/* Authentic Onboard I2C LCD Mirror */}
          <LcdMirror 
            lcdDisplay={lcdDisplay}
            cartId={cartId}
            status={cartData?.status}
          />

          {/* IoE Telemetry Dashboard (DHT11, IR, LDR, SW-420) */}
          <TelemetryBar 
            telemetry={telemetry}
            hasColdItems={hasColdItems}
          />

          {/* Desktop Summary Card */}
          <div className="desktop-summary-card">
            <div className="summary-card-header">
              <span className="summary-card-title">Cart Checkout Summary</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="summary-row">
              <span>Cart Subtotal</span>
              <span style={{ fontWeight: '600' }}>Rs. {total}</span>
            </div>
            <div className="summary-row">
              <span>Store Tax / GST</span>
              <span style={{ color: '#059669', fontWeight: '600' }}>Included</span>
            </div>
            <div className="summary-row">
              <span>Session Security</span>
              <span style={{ color: '#0284c7', fontWeight: '600' }}>Armed</span>
            </div>

            <div className="summary-row total">
              <span>Total Due</span>
              <span className="price">Rs. {total}</span>
            </div>

            <button 
              className="btn-pay"
              style={{ width: '100%', marginTop: '6px' }}
              disabled={totalItems === 0 || isTheftAlarmActive}
              onClick={() => setIsCheckoutOpen(true)}
            >
              <span>Proceed to Pay</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Hardware Sandbox Test Button */}
      <button 
        className="sandbox-floating-btn"
        onClick={() => setIsSandboxOpen(true)}
        title="Open Hardware Simulator Sandbox"
      >
        <Cpu size={15} />
        <span>Hardware Tester</span>
      </button>

      {/* 7. Fixed Bottom Checkout Bar (Stage 6) */}
      <div className="bottom-checkout-bar">
        <div className="bill-summary">
          <span className="bill-label">Total Bill ({totalItems} items)</span>
          <div className="bill-amount">
            <span>Rs.</span>{total}
          </div>
        </div>

        <button 
          className="btn-pay"
          disabled={totalItems === 0 || isTheftAlarmActive}
          onClick={() => setIsCheckoutOpen(true)}
        >
          <span>Pay Now</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      {/* Stage 1: QR Scanner */}
      {isQrOpen && (
        <QrScannerModal 
          onClose={() => setIsQrOpen(false)}
          onSelectCart={handleSelectCart}
          availableCarts={availableCarts}
          activeCartId={cartId}
        />
      )}

      {/* Stage 4: Removal Mode */}
      {removalTargetItem && (
        <RemovalModal 
          targetItem={removalTargetItem}
          onConfirmRemoval={handleConfirmRemoval}
          onCancelRemoval={handleCancelRemoval}
        />
      )}

      {/* Stage 5: Anti-Theft Lock Screen */}
      {isTheftAlarmActive && (
        <TheftAlarmModal 
          onDisarm={() => handleTheftAlarm(false)}
          onProceedPay={() => {
            handleTheftAlarm(false);
            setIsCheckoutOpen(true);
          }}
        />
      )}

      {/* Stage 6: Dummy Checkout */}
      {isCheckoutOpen && (
        <CheckoutModal 
          cartId={cartId}
          total={total}
          totalItems={totalItems}
          onClose={() => setIsCheckoutOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Stage 6: Digital Receipt */}
      {billRecord && (
        <ReceiptModal 
          billRecord={billRecord}
          onNewSession={handleNewSession}
        />
      )}

      {/* Hardware Testing Sandbox Drawer */}
      <HardwareSimulatorDrawer 
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        cartId={cartId}
        telemetry={telemetry}
        isRemovalMode={isRemovalMode}
        theftAlarm={isTheftAlarmActive}
        onSimulateScan={handleScanItem}
        onSimulateRemoval={handleConfirmRemoval}
        onSimulateTelemetry={handleTelemetryUpdate}
        onSimulateTheftAlarm={handleTheftAlarm}
        onResetCart={handleNewSession}
      />



      {/* Step 1: Initial Welcome QR Onboarding Modal */}
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

