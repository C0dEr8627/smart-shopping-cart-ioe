import React from 'react';
import { Thermometer, ShieldAlert } from 'lucide-react';

export default function TelemetryBar({ telemetry, hasColdItems }) {
  const temp = Number(telemetry?.temp_c ?? 20);
  const humidity = Number(telemetry?.humidity ?? 55);
  const isColdAlert = hasColdItems && temp > 8.0;
  const obstacle = telemetry?.obstacle === true;

  return (
    <section className="telemetry-bar" aria-label="Smart Cart Sensors">
      <div
        className={`telemetry-pill ${isColdAlert ? 'alert' : ''}`}
        title={`DHT11 cold-section temperature: ${temp}°C, humidity: ${humidity}%`}
      >
        <span className="telem-icon">
          <Thermometer size={16} />
        </span>
        <span className="telem-label">Cold Section</span>
        <span className={`telem-val ${isColdAlert ? 'warn' : ''}`}>
          {temp.toFixed(1)}°C
        </span>
      </div>

      <div
        className={`telemetry-pill ${obstacle ? 'alert' : ''}`}
        title={obstacle ? 'IR obstacle detected in front of cart' : 'Path clear'}
      >
        <span className="telem-icon">
          <ShieldAlert size={16} />
        </span>
        <span className="telem-label">IR Sensor</span>
        <span className="telem-val">
          {obstacle ? 'Obstacle' : 'Clear'}
        </span>
      </div>

      <div className="telemetry-pill">
        <span className="telem-label">Humidity</span>
        <span className="telem-val">{humidity.toFixed(0)}%</span>
      </div>
    </section>
  );
}
