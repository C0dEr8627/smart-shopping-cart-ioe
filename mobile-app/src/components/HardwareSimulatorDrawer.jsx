import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Radio, 
  Thermometer, 
  ShieldAlert, 
  Lightbulb, 
  Activity, 
  PlusCircle, 
  Trash2, 
  RotateCcw 
} from 'lucide-react';
import { DEFAULT_PRODUCTS } from '../firebase';

export default function HardwareSimulatorDrawer({
  isOpen,
  onClose,
  cartId,
  telemetry,
  isRemovalMode,
  theftAlarm,
  onSimulateScan,
  onSimulateRemoval,
  onSimulateTelemetry,
  onSimulateTheftAlarm,
  onResetCart
}) {
  const [selectedUid, setSelectedUid] = useState('F175D3AD'); // default milk

  if (!isOpen) return null;

  const currentTemp = telemetry?.temp_c ?? 20.0;
  const currentObstacle = telemetry?.obstacle ?? false;
  const currentDimLight = telemetry?.dim_lighting ?? false;
  const currentVib = telemetry?.vibration ?? false;

  const handleTempToggle = () => {
    const newTemp = currentTemp > 22.0 ? 18.5 : 26.8;
    onSimulateTelemetry({ temp_c: newTemp, cold_alert: newTemp > 22.0 });
  };

  const handleObstacleToggle = () => {
    onSimulateTelemetry({ obstacle: !currentObstacle });
  };

  const handleDimLightToggle = () => {
    onSimulateTelemetry({ dim_lighting: !currentDimLight });
  };

  const handleVibToggle = () => {
    onSimulateTheftAlarm(!theftAlarm);
  };

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
              background: 'rgba(0, 230, 153, 0.2)', 
              color: '#00e699', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Cpu size={18} />
            </span>
            <div>
              <h3 className="sheet-title">IoE Hardware Testing Sandbox</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Simulate physical inputs for cart: {cartId}
              </p>
            </div>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* 1. Item Entry Simulation (HC-SR04 + RC522 RFID) */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '14px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Radio size={13} />
            Stage 2: Ultrasonic + RC522 RFID Scan
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                padding: '10px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit'
              }}
            >
              {Object.values(DEFAULT_PRODUCTS).map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.image} {p.name} — Rs.{p.price} {p.is_cold ? '(Cold/Perishable)' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => onSimulateScan(selectedUid)}
              className="btn-pay"
              style={{ width: 'auto', padding: '8px 14px', fontSize: '12px' }}
            >
              <PlusCircle size={15} />
              Drop in Cart
            </button>
          </div>
        </div>

        {/* 2. Sensor Telemetry Toggles */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '14px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-blue-text)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Stage 3 & 5: Sensor Environment Triggers
          </div>

          <div className="sandbox-action-grid">
            {/* Heat Spike */}
            <button 
              className={`sandbox-btn ${currentTemp > 22.0 ? 'danger' : ''}`}
              onClick={handleTempToggle}
            >
              <Thermometer size={16} />
              <div>
                <div>DHT11 Temp: {currentTemp > 22.0 ? '26.8°C (Hot)' : '18.5°C (Chilled)'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Toggle heat warning</div>
              </div>
            </button>

            {/* IR Collision */}
            <button 
              className={`sandbox-btn ${currentObstacle ? 'danger' : ''}`}
              onClick={handleObstacleToggle}
            >
              <ShieldAlert size={16} />
              <div>
                <div>IR Bumper: {currentObstacle ? 'Close (<20cm)' : 'Clear'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Simulate obstacle</div>
              </div>
            </button>

            {/* LDR Dark Aisle */}
            <button 
              className={`sandbox-btn ${currentDimLight ? 'active-feature' : ''}`}
              onClick={handleDimLightToggle}
            >
              <Lightbulb size={16} />
              <div>
                <div>LDR Light: {currentDimLight ? 'Dark Aisle' : 'Bright'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Auto basket LED</div>
              </div>
            </button>

            {/* SW-420 Anti-Theft Vibration */}
            <button 
              className={`sandbox-btn ${theftAlarm ? 'danger' : ''}`}
              onClick={handleVibToggle}
            >
              <Activity size={16} />
              <div>
                <div>SW-420: {theftAlarm ? 'THEFT ALARM' : 'Stationary'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Motion on unpaid</div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Stage 4 Removal Confirmation if active */}
        {isRemovalMode && (
          <div style={{
            background: 'var(--color-red-light)',
            border: '1px solid #fecaca',
            borderRadius: '14px',
            padding: '14px',
            marginBottom: '14px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-red-text)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Stage 4: Removal Scanner Ready
            </div>
            <button
              onClick={() => onSimulateRemoval(selectedUid)}
              className="btn-pay"
              style={{
                width: '100%',
                background: 'var(--color-red)',
                color: '#ffffff',
                boxShadow: 'var(--shadow-xs)',
                fontSize: '13px'
              }}
            >
              <Trash2 size={15} />
              Confirm Physical RFID Tag Removal
            </button>
          </div>
        )}

        {/* 4. Session Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onResetCart}
            style={{
              flex: 1,
              background: '#ffffff',
              border: '1px solid var(--border-medium)',
              borderRadius: '10px',
              padding: '10px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} />
            Reset Cart to Empty
          </button>
        </div>
      </div>
    </div>
  );
}
