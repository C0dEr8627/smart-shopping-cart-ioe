import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, onValue, ref, update } from 'firebase/database';
import { Printer, RefreshCw, Search, ShoppingCart, Thermometer, UserRound, Wifi, WifiOff } from 'lucide-react';
import './styles.css';

const DEFAULT_CARTS = ['CART_004', 'CART-101'];

function firebaseConfig() {
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (!databaseURL) return null;
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    databaseURL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };
}

function App() {
  const [cartId, setCartId] = useState('CART_004');
  const [inputCartId, setInputCartId] = useState('CART_004');
  const [cart, setCart] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const config = firebaseConfig();
    if (!config) {
      setError('Firebase is not configured. Add desktop-app/.env from .env.example.');
      return undefined;
    }
    try {
      const app = getApps().length ? getApps()[0] : initializeApp(config);
      const db = getDatabase(app);
      const cartRef = ref(db, `carts/${cartId}`);
      setError('');
      const unsubscribe = onValue(cartRef, (snapshot) => {
        setCart(snapshot.val());
        setConnected(true);
      }, () => {
        setConnected(false);
        setError('Could not read this cart from Firebase.');
      });
      return unsubscribe;
    } catch (err) {
      setConnected(false);
      setError('Firebase connection failed.');
      return undefined;
    }
  }, [cartId]);

  const items = useMemo(() => Object.values(cart?.items || {}), [cart]);
  const total = Number(cart?.total || items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
  const totalItems = Number(cart?.total_items || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  const temperature = cart?.telemetry?.temp_c;
  const humidity = cart?.telemetry?.humidity;

  const selectCart = (event) => {
    event.preventDefault();
    const normalized = inputCartId.trim().toUpperCase();
    if (normalized) setCartId(normalized);
  };

  const markReadyForBilling = async () => {
    const config = firebaseConfig();
    if (!config) return;
    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const db = getDatabase(app);
    await update(ref(db, `carts/${cartId}`), {
      status: 'billing',
      last_updated: Date.now()
    });
  };

  const printBill = () => {
    window.print();
  };

  return (
    <div className="page">
      <header className="topbar no-print">
        <div>
          <div className="eyebrow">IoE SMART SHOPPING CART</div>
          <h1>Billing Counter</h1>
          <p>Cashier view — live cart from the shared Firebase database.</p>
        </div>
        <div className={connected ? 'connection live' : 'connection'}>
          {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          {connected ? 'Live' : 'Offline'}
        </div>
      </header>

      <main>
        <section className="control-card no-print">
          <form onSubmit={selectCart} className="cart-form">
            <label htmlFor="cart-id"><Search size={16} /> Cart ID</label>
            <div className="input-row">
              <input id="cart-id" value={inputCartId} onChange={e => setInputCartId(e.target.value)} placeholder="CART_004" />
              <button type="submit"><RefreshCw size={16} /> Load Cart</button>
            </div>
          </form>
          <div className="quick-carts">
            {DEFAULT_CARTS.map(id => (
              <button key={id} className={id === cartId ? 'quick active' : 'quick'} onClick={() => { setCartId(id); setInputCartId(id); }}>
                {id}
              </button>
            ))}
          </div>
        </section>

        {error && <div className="alert no-print">{error}</div>}

        <section className="bill" id="print-bill">
          <div className="bill-head">
            <div>
              <div className="bill-brand">IoE Smart Shopping Cart</div>
              <h2>Customer Bill</h2>
              <p>Cart: <strong>{cartId}</strong></p>
              <p>Customer: <strong>{cart?.paired_user || 'Guest'}</strong></p>
            </div>
            <div className="bill-meta">
              <div>{new Date().toLocaleString()}</div>
              <span className="status">{cart?.status || 'waiting'}</span>
            </div>
          </div>

          <div className="summary-grid">
            <div><ShoppingCart size={18} /><span>Items<strong>{totalItems}</strong></span></div>
            <div><UserRound size={18} /><span>Shopper<strong>{cart?.paired_user || 'Guest'}</strong></span></div>
            <div><Thermometer size={18} /><span>Cold section<strong>{temperature == null ? '—' : `${Number(temperature).toFixed(1)} °C`}</strong></span></div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Product</th><th>Category</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {items.length ? items.map((item, index) => {
                  const qty = Number(item.quantity || 0);
                  const price = Number(item.price || 0);
                  return <tr key={item.uid || index}>
                    <td>{index + 1}</td>
                    <td><strong>{item.image || '📦'} {item.name || item.uid}</strong><small>{item.uid}</small></td>
                    <td>{item.category || 'Grocery'}</td>
                    <td className="num">{qty}</td>
                    <td className="num">₹{price.toFixed(2)}</td>
                    <td className="num">₹{(qty * price).toFixed(2)}</td>
                  </tr>;
                }) : <tr><td colSpan="6" className="empty">No items in this cart yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="totals">
            <span>Total items: {totalItems}</span>
            <strong>Total: ₹{total.toFixed(2)}</strong>
          </div>

          <div className="cash-note">
            <strong>Payment at counter</strong>
            <span>Cashier manually collects ₹{total.toFixed(2)}. No online payment is processed by this project.</span>
          </div>

          <footer>Thank you for shopping with IoE Smart Shopping Cart.</footer>
        </section>

        <section className="actions no-print">
          <button className="secondary" onClick={markReadyForBilling} disabled={!cart}>
            Mark ready for billing
          </button>
          <button className="primary" onClick={printBill} disabled={!cart || !items.length}>
            <Printer size={18} /> Print Bill
          </button>
        </section>

        <p className="sync-note no-print">Humidity: {humidity == null ? '—' : `${Number(humidity).toFixed(1)}%`} · Cart data updates automatically.</p>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);