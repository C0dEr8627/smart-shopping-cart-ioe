import React from 'react';
import { Trash2, Snowflake, Package, Sparkles } from 'lucide-react';

export default function CartItemList({ items, onInitiateRemoval, onOpenSandbox }) {
  const itemList = Object.values(items || {});

  if (itemList.length === 0) {
    return (
      <div className="empty-cart-view">
        <div className="empty-icon-wrap">
          <Package size={32} />
        </div>
        <h3 className="empty-title">Your Basket is Empty</h3>
        <p className="empty-desc">
          Drop products into the cart. The ultrasonic rim sensor and RFID scanner will record items automatically.
        </p>
        <button 
          className="btn-pay" 
          style={{ padding: '10px 18px', fontSize: '13px', width: 'auto' }}
          onClick={onOpenSandbox}
        >
          <Sparkles size={16} />
          Simulate Hardware Scans
        </button>
      </div>
    );
  }

  return (
    <div className="cart-items-section">
      <div className="section-header-row">
        <h2 className="section-title">
          <span>Scanned Basket Ledger</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
            ({itemList.reduce((acc, i) => acc + (i.quantity || 1), 0)} items)
          </span>
        </h2>
      </div>

      {itemList.map((item) => (
        <div key={item.uid} className="cart-item-card">
          <div className="item-thumb">
            {item.image || "🛒"}
          </div>

          <div className="item-meta">
            <h4 className="item-title">{item.name}</h4>
            <div className="item-sub-tags">
              {item.is_cold && (
                <span className="cold-badge">
                  <Snowflake size={10} />
                  Perishable
                </span>
              )}
              <span className="category-tag">UID: {item.uid}</span>
              <span className="category-tag">· {item.category || 'Grocery'}</span>
            </div>
          </div>

          <div className="item-pricing">
            <div className="item-price">Rs. {item.price * (item.quantity || 1)}</div>
            <div className="item-qty-tag">Qty: {item.quantity || 1} × Rs.{item.price}</div>
          </div>

          <button 
            className="item-remove-btn"
            onClick={() => onInitiateRemoval(item)}
            title={`Remove ${item.name}`}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
