import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Flashlight, RefreshCw, CheckCircle, Smartphone } from 'lucide-react';

export default function QrScannerModal({ 
  onClose, 
  onSelectCart, 
  availableCarts, 
  activeCartId 
}) {
  const [manualId, setManualId] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        requestScan();
      }

      // Check flashlight
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        setHasTorch(true);
      }
    } catch(err) {
      console.warn("Camera init issue, use manual/one-tap picker:", err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } catch(e) {}
    }
  };

  const switchCamera = () => {
    stopCamera();
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(startCamera, 300);
  };

  const requestScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (window.jsQR) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          const raw = code.data.trim();
          let parsedId = raw;
          if (raw.includes('CART')) {
            const match = raw.match(/CART[-_][0-9A-Za-z]+/i);
            if (match) parsedId = match[0].toUpperCase();
          }
          stopCamera();
          onSelectCart(parsedId);
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(requestScan);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [cameraFacing]);

  const handleManualConnect = (e) => {
    e.preventDefault();
    if (manualId.trim()) {
      stopCamera();
      onSelectCart(manualId.trim().toUpperCase());
    }
  };

  const cartList = Object.values(availableCarts || {});

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { stopCamera(); onClose(); } }}>
      <div className="bottom-sheet qr-scanner-sheet">
        <div className="sheet-header">
          <div>
            <div className="sheet-step-badge">Step 1 • Cart Onboarding</div>
            <h3 className="sheet-title">Scan Cart QR Code</h3>
            <p className="sheet-subtitle">
              Point your camera at the QR code placed on the shopping cart handlebar or frame
            </p>
          </div>
          <button className="sheet-close-btn" onClick={() => { stopCamera(); onClose(); }} aria-label="Close Scanner">
            <X size={18} />
          </button>
        </div>

        {/* Camera Preview Box */}
        <div className="qr-camera-viewport">
          <video 
            ref={videoRef} 
            className="qr-video"
            muted 
            playsInline 
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scanner Viewfinder Reticle */}
          <div className="qr-reticle">
            <div className="reticle-corner top-left" />
            <div className="reticle-corner top-right" />
            <div className="reticle-corner bottom-left" />
            <div className="reticle-corner bottom-right" />
            <div className="qr-laser-scanner" />
          </div>

          {/* Camera Controls Overlay */}
          {isCameraActive && (
            <div className="qr-camera-controls">
              {hasTorch && (
                <button 
                  type="button"
                  onClick={toggleTorch}
                  className={`qr-ctrl-btn ${torchOn ? 'active' : ''}`}
                  title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
                >
                  <Flashlight size={16} />
                </button>
              )}
              <button 
                type="button"
                onClick={switchCamera}
                className="qr-ctrl-btn"
                title="Switch Camera Lens"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          {!isCameraActive && (
            <div className="qr-camera-fallback">
              <div className="qr-fallback-icon">
                <Camera size={28} />
              </div>
              <p className="qr-fallback-title">Camera Preview Inactive</p>
              <p className="qr-fallback-desc">
                Using web simulator? Select a simulated cart below or enter ID manually.
              </p>
            </div>
          )}
        </div>

        {/* Quick Cart Selector (One-Tap Instant Pairing) */}
        <div className="qr-quick-section">
          <div className="qr-section-title-row">
            <span className="qr-section-label">One-Tap Quick Select</span>
            <span className="qr-quick-hint">No camera needed</span>
          </div>
          <div className="qr-cart-pills-row">
            {['CART_004', 'CART-101'].map((cid) => {
              const isCurrent = activeCartId === cid;
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => { stopCamera(); onSelectCart(cid); }}
                  className={`qr-cart-choice-btn ${isCurrent ? 'selected' : ''}`}
                >
                  <div className="choice-left">
                    <Smartphone size={16} />
                    <span>{cid}</span>
                  </div>
                  {isCurrent ? (
                    <span className="choice-badge-active">
                      <CheckCircle size={13} /> Active
                    </span>
                  ) : (
                    <span className="choice-badge-connect">Select</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual ID Input */}
        <form onSubmit={handleManualConnect} className="qr-manual-form">
          <input 
            type="text" 
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            placeholder="Or type Cart ID (e.g. CART_004)"
            className="qr-manual-input"
          />
          <button 
            type="submit" 
            className="btn-pay" 
            style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}

