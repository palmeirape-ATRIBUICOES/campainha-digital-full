import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const requestRef = useRef(null);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', true); // Necessário para iOS
          videoRef.current.play();
          requestRef.current = requestAnimationFrame(tick);
        }
      } catch (err) {
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          onScan(code.data);
          return; // Para a leitura
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [onScan]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
        <h3 style={{ color: '#FFF', margin: 0, fontSize: '16px' }}>Escaneie a Placa</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '16px', fontWeight: 'bold' }}>Cancelar</button>
      </div>
      
      {error ? (
        <div style={{ color: '#FFF', padding: '24px', textAlign: 'center', marginTop: '60px' }}>{error}</div>
      ) : (
        <>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {/* Overlay de foco */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '250px', height: '250px', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '24px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
             <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '30px', height: '30px', borderTop: '4px solid #3B82F6', borderLeft: '4px solid #3B82F6', borderTopLeftRadius: '24px' }}></div>
             <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '30px', height: '30px', borderTop: '4px solid #3B82F6', borderRight: '4px solid #3B82F6', borderTopRightRadius: '24px' }}></div>
             <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '30px', height: '30px', borderBottom: '4px solid #3B82F6', borderLeft: '4px solid #3B82F6', borderBottomLeftRadius: '24px' }}></div>
             <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '30px', height: '30px', borderBottom: '4px solid #3B82F6', borderRight: '4px solid #3B82F6', borderBottomRightRadius: '24px' }}></div>
          </div>
        </>
      )}
    </div>
  );
}
