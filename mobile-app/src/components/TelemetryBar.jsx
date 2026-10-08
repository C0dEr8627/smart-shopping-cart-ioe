import React from 'react';
import { Thermometer, ShieldAlert, Lightbulb, Activity } from 'lucide-react';

export default function TelemetryBar({ telemetry, hasColdItems }) {
  const temp = telemetry?.temp_c ?? 20.5;
  const humidity = telemetry?.humidity ?? 55;
  const isColdAlert = hasColdItems && temp > 22.0;
  const obstacle = telemetry?.obstacle ?? false;
  const dimLight = telemetry?.dim_lighting ?? false;
  const vibration = telemetry?.vibration ?? false;

  return (
    <section className="telemetry-bar" aria-label="Sensor Telemetry Status">
      {/* 1. DHT11 Cold-Chain Temp */}
      <div 
        className={`telemetry-pill ${isColdAlert ? 'alert' : ''}`}
        title={`DHT11 Sensor: ${temp}°C, Humidity ${humidity}%`}
      >
        <span className="telem-icon" style={{ color: isColdAlert ? '#ef4444' : '#38bdf8' }}>
          <Thermometer size={16} />
        </span>
        <span className="telem-label">Basket Temp</span>
        <span className={`telem-val ${isColdAlert ? 'warn' : ''}`}>
          {temp.toFixed(1)}°C
        </span>
      </div>

      {/* 2. IR Obstacle Safety Bumper */}
      <div 
        className={`telemetry-pill ${obstacle ? 'alert' : ''}`}
        title={obstacle ? "Obstacle warning! Object closer than 20cm" : "Bumper path clear"}
      >
        <span className="telem-icon" style={{ color: obstacle ? '#f59e0b' : '#10b981' }}>
          <ShieldAlert size={16} />
        </span>
        <span className="telem-label">IR Bumper</span>
        <span className="telem-val" style={{ color: obstacle ? '#f59e0b' : '#10b981' }}>
          {obstacle ? 'Caution' : 'Clear'}
        </span>
      </div>

      {/* 3. LDR Ambient Lighting */}
      <div 
        className={`telemetry-pill ${dimLight ? 'active-feature' : ''}`}
        title={dimLight ? "Dark aisle detected: Basket LED bar ON" : "Normal aisle lighting"}
      >
        <span className="telem-icon" style={{ color: dimLight ? '#fbbf24' : '#94a3b8' }}>
          <Lightbulb size={16} />
        </span>
        <span className="telem-label">Aisle Light</span>
        <span className="telem-val" style={{ color: dimLight ? '#fbbf24' : '#94a3b8' }}>
          {dimLight ? 'Light Bar' : 'Ambient'}
        </span>
      </div>

      {/* 4. SW-420 Anti-Theft Vibration Guard */}
      <div 
        className={`telemetry-pill ${vibration ? 'alert' : ''}`}
        title={vibration ? "Vibration/Motion detected on chassis" : "Cart stationary / safe"}
      >
        <span className="telem-icon" style={{ color: vibration ? '#ef4444' : '#00e699' }}>
          <Activity size={16} />
        </span>
        <span className="telem-label">Guard Motion</span>
        <span className="telem-val" style={{ color: vibration ? '#ef4444' : '#00e699' }}>
          {vibration ? 'Motion' : 'Armed'}
        </span>
      </div>
    </section>
  );
}
