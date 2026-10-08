import React, { useEffect } from 'react';
import { Snowflake, AlertTriangle } from 'lucide-react';

export default function ColdAlertBanner({ temp, hasColdItems }) {
  const isAlertActive = hasColdItems && temp > 22.0;

  useEffect(() => {
    if (isAlertActive) {
      try {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } catch(e) {}
    }
  }, [isAlertActive]);

  if (!isAlertActive) return null;

  return (
    <div className="cold-alert-banner" role="alert">
      <div className="cold-alert-icon">
        <AlertTriangle size={18} />
      </div>
      <div className="cold-alert-text">
        <h4>Alert: Cold items are warming up!</h4>
        <p>Basket temperature is {temp.toFixed(1)}°C. Please proceed to checkout or re-chill cold goods.</p>
      </div>
    </div>
  );
}
