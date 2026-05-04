import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Bell, CheckCircle, ShieldCheck, MapPin, User, ChevronRight } from 'lucide-react';

const socket = io('http://localhost:3001');

export default function VisitorCall() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [callingUnit, setCallingUnit] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, calling, answered
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchProperty();
    
    socket.on('call_answered', () => {
      setStatus('answered');
      setCountdown(0);
    });

    return () => {
      socket.off('call_answered');
    };
  }, [id]);

  useEffect(() => {
    let timer;
    if (countdown > 0 && status === 'calling') {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0 && status === 'calling') {
      setStatus('idle');
      setCallingUnit(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, status]);

  const fetchProperty = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/properties/${id}`);
      const data = await res.json();
      setProperty(data);
    } catch (err) {
      console.error('Error fetching property', err);
    }
  };

  const capturePhoto = async () => {
    return new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setTimeout(() => {
              const canvas = canvasRef.current;
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
              const photoData = canvas.toDataURL('image/jpeg', 0.8);
              stream.getTracks().forEach(t => t.stop());
              resolve(photoData);
            }, 500);
          };
        } else {
          resolve(null);
        }
      } catch (err) {
        console.error("Camera access denied or failed", err);
        resolve(null);
      }
    });
  };

  const handleCall = async (unit) => {
    setStatus('calling');
    setCallingUnit(unit);
    setCountdown(30);

    const photoBase64 = await capturePhoto();

    socket.emit('initiate_call', {
      unitId: unit.id,
      photoBase64
    });
  };

  if (!property) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
         <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 229, 255, 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'mesh-pulse 1s linear infinite', margin: '0 auto 16px' }} />
         <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Verificando segurança...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Hidden elements for silent capture */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
         <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(0, 229, 255, 0.05)', borderRadius: '16px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
            <ShieldCheck size={32} color="var(--primary)" />
         </div>
         <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>Campainha Digital</h1>
         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', justifyContent: 'center', fontSize: '14px' }}>
            <MapPin size={14} /> {property.name}
         </div>
      </header>

      {status === 'idle' && (
        <div className="fade-in" style={{ width: '100%', maxWidth: '400px' }}>
          {property.type === 'individual' ? (
            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '32px 24px', fontSize: '20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 12px 40px rgba(0, 229, 255, 0.3)' }} 
              onClick={() => handleCall(property.units[0])}
            >
              <Bell size={48} />
              TOCAR CAMPAINHA
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Para quem é a visita?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {property.units.map(unit => (
                  <button 
                    key={unit.id} 
                    className="btn-secondary" 
                    style={{ width: '100%', padding: '20px 24px', borderRadius: '16px', justifyContent: 'space-between' }} 
                    onClick={() => handleCall(unit)}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>{unit.name}</span>
                    <ChevronRight size={20} color="var(--primary)" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: '60px', textAlign: 'center' }}>
             <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Segurança Monitorada Ativa</p>
          </div>
        </div>
      )}

      {status === 'calling' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 32px' }}>
             <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--primary)', borderRadius: '50%', animation: 'mesh-pulse 2s infinite ease-in-out', opacity: 0.2 }}></div>
             <div style={{ position: 'absolute', inset: '10px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px var(--primary-glow)' }}>
                <Bell size={40} color="#000" />
             </div>
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Notificando Morador...</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Unidade: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{callingUnit?.name}</span></p>
          
          <div style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
             <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
               00:{countdown.toString().padStart(2, '0')}
             </span>
          </div>
          
          <p style={{ marginTop: '32px', fontSize: '13px', color: 'var(--text-muted)' }}>Aguarde alguns segundos enquanto a conexão é estabelecida.</p>
        </div>
      )}

      {status === 'answered' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)' }}>
             <CheckCircle size={48} color="#000" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: '#10B981' }}>Chamada Atendida</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>O morador visualizou sua chamada. Aguarde a comunicação via áudio/vídeo.</p>
        </div>
      )}

      <footer style={{ marginTop: 'auto', paddingTop: '40px' }}>
         <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Tecnologia Campainha Digital®</p>
      </footer>
    </div>
  );
}
