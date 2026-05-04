import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Video, Phone, MicOff, PhoneOff, User, Bell, MapPin, ShieldCheck, EyeOff, Download, Settings, Save } from 'lucide-react';

const socket = io('http://localhost:3001');

export default function ResidentDashboard() {
  const { id } = useParams(); // this is the unitId
  const [call, setCall] = useState(null); 
  const [status, setStatus] = useState('idle'); 
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [unitName, setUnitName] = useState('Minha Casa');
  const audioRef = useRef(null);

  useEffect(() => {
    socket.emit('register_resident', { unitId: id });

    socket.on('incoming_call', (data) => {
      setCall(data);
      setStatus('ringing');
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play blocked', e));
      }
    });

    // PWA Install Logic
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      socket.off('incoming_call');
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [id]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleMonitor = () => {
    setStatus('monitoring');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleAnswer = () => {
    setStatus('active');
    socket.emit('answer_call', { visitorSocketId: call.visitorSocketId });
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleEndCall = () => {
    setStatus('idle');
    setCall(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Hidden audio for ringtone */}
      <audio ref={audioRef} loop>
        <source src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <ShieldCheck size={28} color="var(--primary)" />
           <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{unitName}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Sistema Ativo • ID: {id.slice(0,8)}</p>
           </div>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '12px', color: showSettings ? 'var(--primary)' : 'var(--text-main)', cursor: 'pointer' }}>
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Panel (Conditional) */}
      {showSettings && (
        <div className="glass-panel fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--primary)' }}>
           <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Configurar Campainha</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Nome de Exibição (Ex: Casa Principal)</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={unitName} 
                  onChange={(e) => setUnitName(e.target.value)} 
                />
              </div>
              <button className="btn-primary" onClick={() => setShowSettings(false)} style={{ padding: '12px', fontSize: '14px' }}>
                <Save size={16} /> Salvar Configurações
              </button>
           </div>
        </div>
      )}

      {/* PWA Install Notification (Conditional) */}
      {installPrompt && status === 'idle' && (
        <div className="animate-fade-up" style={{ background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 119, 255, 0.2) 100%)', border: '1px solid var(--primary)', borderRadius: '20px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '12px' }}>
              <Download size={24} color="#000" />
           </div>
           <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Instalar no Celular</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Receba chamadas como um app nativo.</p>
           </div>
           <button onClick={handleInstallClick} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', width: 'auto' }}>
              Instalar
           </button>
        </div>
      )}

      {status === 'idle' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
             <Bell size={40} color="var(--text-muted)" style={{ opacity: 0.3 }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Aguardando Chamadas</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '240px' }}>Você será notificado assim que alguém ler o QR Code do seu portão.</p>
          
          <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>
             <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} /> Conectado ao Servidor
          </div>
        </div>
      )}

      {status === 'ringing' && call && (
        <div className="glass-panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
            <h3 style={{ color: '#EF4444', fontWeight: 800, letterSpacing: '2px', fontSize: '14px', margin: 0 }}>CHAMADA RECEBIDA</h3>
          </div>
          
          <div style={{ flex: 1, position: 'relative', background: '#000' }}>
            {call.photo ? (
              <img src={call.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 <User size={64} style={{ opacity: 0.2 }} />
              </div>
            )}
            <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(8px)' }}>
               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} /> AO VIVO
            </div>
          </div>

          <div style={{ padding: '32px 24px', display: 'flex', gap: '16px' }}>
            <button className="btn-secondary" style={{ flex: 1, flexDirection: 'column', height: 'auto', padding: '20px' }} onClick={handleMonitor}>
              <EyeOff size={24} style={{ marginBottom: '8px' }} />
              Monitorar
            </button>
            <button className="btn-primary" style={{ flex: 1, flexDirection: 'column', height: 'auto', padding: '20px', background: '#10B981', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)' }} onClick={handleAnswer}>
              <Phone size={24} style={{ marginBottom: '8px' }} />
              Atender
            </button>
          </div>
        </div>
      )}

      {(status === 'monitoring' || status === 'active') && call && (
        <div className="glass-panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
               <h3 style={{ fontSize: '16px', margin: 0 }}>{status === 'monitoring' ? 'Modo Furtivo' : 'Em Chamada'}</h3>
               <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Conexão Direta Criptografada</span>
            </div>
            <div style={{ color: '#EF4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444' }} />
              REC
            </div>
          </div>
          
          <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
             {call.photo ? (
              <img src={call.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
            ) : (
              <Video size={64} color="var(--text-muted)" />
            )}
          </div>

          <div style={{ padding: '32px 24px', display: 'flex', gap: '20px', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
             {status === 'monitoring' ? (
                <button className="btn-primary" style={{ flex: 1, background: '#10B981', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)' }} onClick={handleAnswer}>
                  <Phone size={20} /> Iniciar Áudio
                </button>
             ) : (
                <button className="btn-secondary" style={{ width: '64px', height: '64px', borderRadius: '50%', padding: 0 }}>
                  <MicOff size={24} />
                </button>
             )}
            <button className="btn-secondary" style={{ width: '64px', height: '64px', borderRadius: '50%', padding: 0, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }} onClick={handleEndCall}>
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
         <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Campainha Digital PWA v1.0</p>
         <p style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>Segurança de Nível Bancário Ativa</p>
      </div>
    </div>
  );
}
