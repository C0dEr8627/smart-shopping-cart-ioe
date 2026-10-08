/**
 * IoE Smart Shopping Cart — Firebase Realtime Database Integration
 * 
 * Supports:
 * 1. Direct connection to Google Firebase Realtime Database via Firebase SDK.
 * 2. Seamless local/demo cloud fallback with identical schema & reactive listeners,
 *    ensuring the app works immediately out-of-the-box before cloud keys are entered.
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  update, 
  remove, 
  get,
  child 
} from 'firebase/database';

// Default Demo Product Catalog with Cold-Chain Perishable flags
export const DEFAULT_PRODUCTS = {
  "F175D3AD": {
    uid: "F175D3AD",
    name: "Organic Whole Milk 1L",
    price: 42,
    is_cold: true,
    category: "Dairy",
    image: "🥛",
    shelf_stock: 50
  },
  "918AB7AD": {
    uid: "918AB7AD",
    name: "Greek Yoghurt 200g",
    price: 35,
    is_cold: true,
    category: "Dairy",
    image: "🥣",
    shelf_stock: 40
  },
  "1CECRM01": {
    uid: "1CECRM01",
    name: "Vanilla Bean Ice Cream 500ml",
    price: 95,
    is_cold: true,
    category: "Frozen",
    image: "🍨",
    shelf_stock: 30
  },
  "7297745C": {
    uid: "7297745C",
    name: "Basmati Rice 1kg",
    price: 65,
    is_cold: false,
    category: "Grains",
    image: "🌾",
    shelf_stock: 80
  },
  "1FCD1AD": {
    uid: "1FCD1AD",
    name: "Choco Chip Biscuits",
    price: 25,
    is_cold: false,
    category: "Bakery",
    image: "🍪",
    shelf_stock: 100
  },
  "6149AAAD": {
    uid: "6149AAAD",
    name: "Fresh Alphonso Mangoes",
    price: 50,
    is_cold: false,
    category: "Produce",
    image: "🥭",
    shelf_stock: 35
  },
  "B1A2C4AD": {
    uid: "B1A2C4AD",
    name: "Whole Wheat Flour 2kg",
    price: 85,
    is_cold: false,
    category: "Grains",
    image: "🍞",
    shelf_stock: 60
  },
  "E3DE4F6": {
    uid: "E3DE4F6",
    name: "Rolled Breakfast Oats",
    price: 40,
    is_cold: false,
    category: "Breakfast",
    image: "🥣",
    shelf_stock: 45
  },
  "C0FFE01": {
    uid: "C0FFE01",
    name: "Artisan Coffee Beans 250g",
    price: 120,
    is_cold: false,
    category: "Beverages",
    image: "☕",
    shelf_stock: 25
  }
};

const DEFAULT_CARTS = {
  "CART_004": {
    cart_id: "CART_004",
    name: "IoE Smart Cart #004",
    status: "available",
    paired_user: null,
    items: {},
    total: 0,
    total_items: 0,
    removal_mode: false,
    removal_target_uid: null,
    theft_alarm: false,
    telemetry: {
      temp_c: 19.2,
      humidity: 56.0,
      cold_alert: false,
      obstacle: false,
      dim_lighting: false,
      vibration: false,
      ultrasonic_cm: 28.5
    },
    lcd_display: {
      line1: "Welcome! Cart #004",
      line2: "Scan QR to Pair"
    },
    last_updated: Date.now()
  },
  "CART-101": {
    cart_id: "CART-101",
    name: "IoE Smart Cart #101",
    status: "available",
    paired_user: null,
    items: {},
    total: 0,
    total_items: 0,
    removal_mode: false,
    removal_target_uid: null,
    theft_alarm: false,
    telemetry: {
      temp_c: 20.0,
      humidity: 52.0,
      cold_alert: false,
      obstacle: false,
      dim_lighting: false,
      vibration: false,
      ultrasonic_cm: 30.0
    },
    lcd_display: {
      line1: "Welcome! Cart #101",
      line2: "Scan QR to Pair"
    },
    last_updated: Date.now()
  }
};

// ─── Local Mock Reactive Store ───────────────────────────────────────────────
class MockRealtimeDB {
  constructor() {
    this.listeners = new Map();
    this.storageKey = 'ioe_cart_mock_db';
    this.data = this.loadInitial();
  }

  loadInitial() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      products: { ...DEFAULT_PRODUCTS },
      carts: { ...DEFAULT_CARTS },
      bills: {}
    };
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch(e) {}
  }

  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);
    
    // Initial emit
    callback(this.getVal(path));

    return () => {
      if (this.listeners.has(path)) {
        this.listeners.get(path).delete(callback);
      }
    };
  }

  getVal(path) {
    const parts = path.split('/').filter(Boolean);
    let curr = this.data;
    for (const p of parts) {
      if (!curr) return null;
      curr = curr[p];
    }
    return curr ? JSON.parse(JSON.stringify(curr)) : null;
  }

  setVal(path, value) {
    const parts = path.split('/').filter(Boolean);
    let curr = this.data;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!curr[p]) curr[p] = {};
      curr = curr[p];
    }
    curr[parts[parts.length - 1]] = value;
    this.save();
    this.notify(path);
  }

  updateVal(path, partial) {
    const parts = path.split('/').filter(Boolean);
    let curr = this.data;
    for (const p of parts) {
      if (!curr[p]) curr[p] = {};
      curr = curr[p];
    }
    Object.assign(curr, partial);
    this.save();
    this.notify(path);
  }

  notify(path) {
    for (const [subPath, callbacks] of this.listeners.entries()) {
      if (path.startsWith(subPath) || subPath.startsWith(path)) {
        const val = this.getVal(subPath);
        callbacks.forEach(cb => cb(val));
      }
    }
  }
}

const mockDb = new MockRealtimeDB();

// ─── Firebase Manager ────────────────────────────────────────────────────────
let firebaseApp = null;
let realtimeDb = null;
let activeConfig = null;

export function loadSavedFirebaseConfig() {
  // 1. Check environment variables (.env / production host)
  if (import.meta.env?.VITE_FIREBASE_DATABASE_URL) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_demo_placeholder_key",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
    };
  }

  // 2. Check localStorage from in-app settings
  try {
    const raw = localStorage.getItem('ioe_firebase_config');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch(e) {}
  return null;
}


export function saveFirebaseConfig(config) {
  try {
    if (config) {
      localStorage.setItem('ioe_firebase_config', JSON.stringify(config));
    } else {
      localStorage.removeItem('ioe_firebase_config');
    }
  } catch(e) {}
}

export function initFirebase(config) {
  if (!config || !config.databaseURL) {
    firebaseApp = null;
    realtimeDb = null;
    activeConfig = null;
    return false;
  }
  try {
    const apps = getApps();
    firebaseApp = apps.length > 0 ? apps[0] : initializeApp(config);
    realtimeDb = getDatabase(firebaseApp);
    activeConfig = config;
    return true;
  } catch(err) {
    console.warn("Firebase init error, using reactive local fallback:", err);
    firebaseApp = null;
    realtimeDb = null;
    return false;
  }
}

// Check initial saved config
const initialCfg = loadSavedFirebaseConfig();
if (initialCfg) {
  initFirebase(initialCfg);
}

export function isRealFirebaseActive() {
  return !!realtimeDb;
}

// ─── Realtime Cart Operations ────────────────────────────────────────────────
export function subscribeToCart(cartId, onData) {
  const normId = (cartId || 'CART_004').toUpperCase();
  const path = `carts/${normId}`;

  if (realtimeDb) {
    const cartRef = ref(realtimeDb, path);
    const unsubscribe = onValue(cartRef, (snapshot) => {
      const val = snapshot.val();
      onData(val || mockDb.getVal(path));
    });
    return unsubscribe;
  } else {
    return mockDb.subscribe(path, onData);
  }
}

export function subscribeToAvailableCarts(onData) {
  const path = 'carts';
  if (realtimeDb) {
    const cartsRef = ref(realtimeDb, path);
    return onValue(cartsRef, (snapshot) => {
      const val = snapshot.val();
      onData(val || mockDb.getVal(path));
    });
  } else {
    return mockDb.subscribe(path, onData);
  }
}

// ─── Stage 1: QR Pair / Unpair ───────────────────────────────────────────────
export async function pairCartCloud(cartId, username) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}`;
  const updates = {
    status: 'linked',
    paired_user: username || 'Guest',
    lcd_display: {
      line1: `Welcome! ${username || 'Shopper'}`,
      line2: `Cart Linked OK`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }
  return true;
}

export async function unpairCartCloud(cartId) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}`;
  const updates = {
    status: 'available',
    paired_user: null,
    lcd_display: {
      line1: `Welcome! ${cid}`,
      line2: `Scan QR to Pair`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }
  return true;
}

// ─── Stage 2: Add Scanned Item (RC522 + Ultrasonic Trigger) ───────────────────
export async function addScannedItemCloud(cartId, uid) {
  const cid = cartId.toUpperCase();
  const product = DEFAULT_PRODUCTS[uid.toUpperCase()] || {
    uid: uid.toUpperCase(),
    name: `Grocery Item (${uid.substring(0, 6)})`,
    price: 25,
    is_cold: false,
    category: "General",
    image: "📦"
  };

  const path = `carts/${cid}`;
  let currentCart = realtimeDb ? (await get(ref(realtimeDb, path))).val() : mockDb.getVal(path);
  if (!currentCart) {
    currentCart = { ...DEFAULT_CARTS["CART_004"], cart_id: cid, name: `IoE Smart Cart #${cid}` };
  }

  const items = currentCart.items ? { ...currentCart.items } : {};
  if (items[uid]) {
    items[uid].quantity = (items[uid].quantity || 1) + 1;
  } else {
    items[uid] = {
      uid: product.uid,
      name: product.name,
      price: product.price,
      is_cold: product.is_cold || false,
      category: product.category || "Grocery",
      image: product.image || "🛒",
      quantity: 1
    };
  }

  // Recalculate totals
  const total = Object.values(items).reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = Object.values(items).reduce((acc, item) => acc + item.quantity, 0);

  const updates = {
    items,
    total,
    total_items: totalItems,
    status: 'in_use',
    lcd_display: {
      line1: `${product.name.substring(0, 11)} Rs.${product.price}`,
      line2: `Total:Rs.${total} (${totalItems})`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }

  return { product, total, totalItems };
}

// ─── Stage 3: Sensor Telemetry & Alerts ───────────────────────────────────────
export async function updateTelemetryCloud(cartId, telemetryData) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}/telemetry`;

  if (realtimeDb) {
    await update(ref(realtimeDb, path), telemetryData);
  } else {
    mockDb.updateVal(path, telemetryData);
  }
}

// ─── Stage 4: Cloud-Driven Item Removal ───────────────────────────────────────
export async function setRemovalModeCloud(cartId, targetUid, enable = true) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}`;
  
  let prodName = "Item";
  if (targetUid && DEFAULT_PRODUCTS[targetUid]) {
    prodName = DEFAULT_PRODUCTS[targetUid].name;
  }

  const updates = {
    removal_mode: enable,
    removal_target_uid: enable ? targetUid : null,
    status: enable ? 'removal_mode' : 'in_use',
    lcd_display: enable ? {
      line1: `Scan to Remove`,
      line2: `${prodName.substring(0, 16)}`
    } : {
      line1: `Cart Ready`,
      line2: `Continue Shopping`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }
}

export async function confirmItemRemovalCloud(cartId, uid) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}`;

  let currentCart = realtimeDb ? (await get(ref(realtimeDb, path))).val() : mockDb.getVal(path);
  if (!currentCart || !currentCart.items) return false;

  const items = { ...currentCart.items };
  if (items[uid]) {
    if (items[uid].quantity > 1) {
      items[uid].quantity -= 1;
    } else {
      delete items[uid];
    }
  }

  const total = Object.values(items).reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = Object.values(items).reduce((acc, item) => acc + item.quantity, 0);

  const updates = {
    items,
    total,
    total_items: totalItems,
    removal_mode: false,
    removal_target_uid: null,
    status: totalItems > 0 ? 'in_use' : 'linked',
    lcd_display: {
      line1: `Item Removed!`,
      line2: `Total:Rs.${total} (${totalItems})`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }

  return true;
}

// ─── Stage 5: Anti-Theft Vibration Alarm ──────────────────────────────────────
export async function triggerTheftAlarmCloud(cartId, enable = true) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}`;
  const updates = {
    theft_alarm: enable,
    status: enable ? 'alarm' : 'in_use',
    lcd_display: enable ? {
      line1: `SECURITY ALERT!`,
      line2: `UNPAID CART MOVE`
    } : {
      line1: `Alarm Cleared`,
      line2: `Continue Shopping`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }
}

// ─── Stage 6: Dummy In-App Payment & Session Reset ────────────────────────────
export async function processDummyPaymentCloud(cartId, paymentDetails) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}`;

  let currentCart = realtimeDb ? (await get(ref(realtimeDb, path))).val() : mockDb.getVal(path);
  if (!currentCart) throw new Error("Cart not found");

  const billId = `BILL-${Math.floor(100000 + Math.random() * 900000)}`;
  const billRecord = {
    bill_id: billId,
    cart_id: cid,
    username: currentCart.paired_user || 'Guest',
    items: currentCart.items || {},
    total: currentCart.total || 0,
    payment_method: paymentDetails.method || 'UPI',
    timestamp: new Date().toISOString()
  };

  // 1. Record bill
  if (realtimeDb) {
    await set(ref(realtimeDb, `bills/${billId}`), billRecord);
  } else {
    mockDb.setVal(`bills/${billId}`, billRecord);
  }

  // 2. Mark cart as PAID and update LCD
  const updates = {
    status: 'paid',
    theft_alarm: false,
    removal_mode: false,
    lcd_display: {
      line1: `Payment Success!`,
      line2: `Thank You! Exit OK`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }

  return billRecord;
}

export async function resetCartAfterPaymentCloud(cartId) {
  const cid = cartId.toUpperCase();
  const path = `carts/${cid}`;
  const updates = {
    items: {},
    total: 0,
    total_items: 0,
    status: 'available',
    paired_user: null,
    removal_mode: false,
    theft_alarm: false,
    lcd_display: {
      line1: `Welcome! ${cid}`,
      line2: `Scan QR to Pair`
    },
    last_updated: Date.now()
  };

  if (realtimeDb) {
    await update(ref(realtimeDb, path), updates);
  } else {
    mockDb.updateVal(path, updates);
  }
}
