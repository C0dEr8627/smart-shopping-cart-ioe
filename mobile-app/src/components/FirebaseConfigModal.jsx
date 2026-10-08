import React, { useState } from 'react';
import { X, Database, Save, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';
import { 
  loadSavedFirebaseConfig, 
  saveFirebaseConfig, 
  initFirebase, 
  isRealFirebaseActive 
} from '../firebase';

export default function FirebaseConfigModal({ isOpen, onClose, onConfigSaved }) {
  const currentSaved = loadSavedFirebaseConfig() || {};
  const [apiKey, setApiKey] = useState(currentSaved.apiKey || '');
  const [databaseURL, setDatabaseURL] = useState(currentSaved.databaseURL || '');
  const [projectId, setProjectId] = useState(currentSaved.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentSaved.authDomain || '');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const isCurrentlyLive = isRealFirebaseActive();

  const handleSave = (e) => {
    e.preventDefault();
    if (!databaseURL.trim()) {
      setStatusMsg('Please provide a Firebase databaseURL (e.g. https://your-app-default-rtdb.firebaseio.com)');
      return;
    }

    const config = {
      apiKey: apiKey.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim() || databaseURL.split('//')[1]?.split('.')[0] || 'smart-cart-ioe',
      authDomain: authDomain.trim() || `${projectId}.firebaseapp.com`
    };

    saveFirebaseConfig(config);
    const success = initFirebase(config);
    if (success) {
      setStatusMsg('Connected to Firebase Realtime Database!');
      setTimeout(() => {
        onConfigSaved();
        onClose();
      }, 1000);
    } else {
      setStatusMsg('Could not connect with these keys. Saved for retry.');
    }
  };

  const handleResetToDemo = () => {
    saveFirebaseConfig(null);
    initFirebase(null);
    setStatusMsg('Switched back to local reactive demo store.');
    setTimeout(() => {
      onConfigSaved();
      onClose();
    }, 1000);
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
              background: 'rgba(59, 130, 246, 0.2)', 
              color: '#60a5fa', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Database size={18} />
            </span>
            <div>
              <h3 className="sheet-title">Firebase Realtime DB Settings</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Status: {isCurrentlyLive ? 'Connected to live Firebase' : 'Using reactive local store'}
              </p>
            </div>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {statusMsg && (
          <div style={{
            background: 'rgba(0, 230, 153, 0.15)',
            border: '1px solid #00e699',
            color: '#00e699',
            borderRadius: '10px',
            padding: '10px',
            fontSize: '12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle2 size={15} />
            {statusMsg}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Firebase Realtime Database URL *
            </label>
            <input 
              type="url" 
              value={databaseURL} 
              onChange={(e) => setDatabaseURL(e.target.value)}
              placeholder="https://your-project-default-rtdb.firebaseio.com"
              required
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                marginTop: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              API Key
            </label>
            <input 
              type="text" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                marginTop: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Project ID
            </label>
            <input 
              type="text" 
              value={projectId} 
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="smart-cart-ioe"
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                marginTop: '4px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button 
              type="submit" 
              className="btn-pay" 
              style={{ flex: 1, fontSize: '13px' }}
            >
              <Save size={15} />
              Save & Connect
            </button>

            <button 
              type="button" 
              onClick={handleResetToDemo}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: '999px',
                padding: '0 14px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} />
              Use Demo Store
            </button>
          </div>
        </form>

        <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
          💡 When connected, any scan sent by your ESP8266 Wi-Fi hardware will instantly update this mobile web app with zero latency!
        </p>
      </div>
    </div>
  );
}
