import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Video, Phone, MicOff, PhoneOff, Bell, ShieldCheck, EyeOff, Download, Settings, Save, AlertCircle, Clock, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

export default function ResidentDashboard() {
  const { id } = useParams(); // unitId
  const [call, setCall]           = useState(null);
  const [status, setStatus]       = useState('idle');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showSettings, setShowSettings]   = useState(false);
  const [unitName, setUnitName]   = useState('Minha Casa');
  const [audioError, setAudioError] = useState(false);
  const [isMuted, setIsMuted]     = useState(false);
  const [visitorSocketId, setVisitorSocketId] = useState(null);

  const audioRef       = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef          = useRef(null);
  const socketRef      = useRef(null);

  // ─── Socket + WebRTC setup ──────────────────────────────────────────────
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 20
    });
    socketRef.current = socket;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    socket.emit('register_resident', { unitId: id });

    socket.on('incoming_call', (data) => {
      setCall(data);
      setStatus('ringing');
      setVisitorSocketId(data.visitorSocketId);
      playRingtone();
      triggerNotification(unitName);
    });

    // Visitante enviou WebRTC offer
    socket.on('webrtc_offer', async ({ sender, offer }) => {
      await handleWebRTCOffer(sender, offer);
    });

    // ICE candidate do visitante
    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[ICE] Erro ao adicionar candidate:', e);
        }
      }
    });

    // Visitante encerrou
    socket.on('call_ended', () => {
      setStatus('idle');
      setCall(null);
      stopAll();
    });

    const handleBIP = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBIP);

    return () => {
      socket.disconnect();
      window.removeEventListener('beforeinstallprompt', handleBIP);
      stopAll();
    };
  }, [id]);

  const playRingtone = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setAudioError(true));
    }
  };

  const stopRingtone = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setAudioError(false);
  };

  const triggerNotification = (name) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg =>
            reg.showNotification('CHAMADA RECEBIDA 🔔', {
              body: `${name} - Alguém está tocando sua campainha!`,
              icon: '/logo.png',
              vibrate: [200, 100, 200, 100, 400],
              tag: 'campainha-call',
              renotify: true,
              requireInteraction: true
            })
          );
        } else {
          const n = new Notification('CHAMADA RECEBIDA 🔔', {
            body: `${name} - Alguém está tocando!`,
            icon: '/logo.png'
          });
          n.onclick = () => window.focus();
        }
      } catch (e) { console.error('Notification error', e); }
    }
  };

  const stopAll = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
  };

  // ─── WebRTC: Morador recebe offer e responde ─────────────────────────────
  const handleWebRTCOffer = useCallback(async (senderSocketId, offer) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // Adiciona stream local se disponível (modo ativo)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Recebe stream do visitante
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(e => console.warn('[Video] play error:', e));
      }
    };

    // Envia ICE candidates para o visitante
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', {
          target: senderSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Estado morador:', pc.connectionState);
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('webrtc_answer', {
        target: senderSocketId,
        answer: pc.localDescription
      });
    } catch (err) {
      console.error('[WebRTC] Erro ao responder offer:', err);
    }
  }, []);

  // ─── Ações do morador ────────────────────────────────────────────────────
  const handleMonitor = () => {
    stopRingtone();
    setStatus('monitoring');
    localStreamRef.current = null; // sem stream local = furtivo
    socketRef.current.emit('answer_call', {
      visitorSocketId: call.visitorSocketId,
      mode: 'monitor',
      unitId: id
    });
  };

  const handleAnswer = async () => {
    stopRingtone();
    setStatus('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      // Se já existe PC (offer já chegou), adiciona tracks
      if (pcRef.current) {
        stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));
      }
    } catch (err) {
      console.warn('[Mic] Acesso negado:', err);
    }
    socketRef.current.emit('answer_call', {
      visitorSocketId: call.visitorSocketId,
      mode: 'active',
      unitId: id
    });
  };

  const handleEndCall = () => {
    stopRingtone();
    if (visitorSocketId && socketRef.current) {
      socketRef.current.emit('call_ended', { target: visitorSocketId });
    }
    setStatus('idle');
    setCall(null);
    stopAll();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => audioRef.current.pause()).catch(() => {});
      setAudioError(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }} onClick={unlockAudio}>
      <audio ref={audioRef} loop preload="auto">
        <source src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={28} color="var(--primary)" />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{unitName}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Sistema Ativo • ID: {id.slice(0, 8)}</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '12px', color: showSettings ? 'var(--primary)' : 'var(--text-main)', cursor: 'pointer' }}>
          <Settings size={20} />
        </button>
      </div>

      {audioError && status === 'ringing' && (
        <div style={{ background: '#EF4444', color: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
          <AlertCircle size={20} /> Toque em qualquer lugar para ativar o som!
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div className="glass-panel fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--primary)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Configurar Campainha</h3>
          <input type="text" className="input-glass" value={unitName} onChange={(e) => setUnitName(e.target.value)} style={{ width: '100%', marginBottom: '16px' }} placeholder="Nome de exibição" />
          <button className="btn-primary" onClick={() => setShowSettings(false)} style={{ padding: '12px', fontSize: '14px', width: '100%' }}>
            <Save size={16} /> Salvar
          </button>
        </div>
      )}

      {/* PWA Install */}
      {installPrompt && status === 'idle' && (
        <div className="animate-fade-up" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,119,255,0.2))', border: '1px solid var(--primary)', borderRadius: '20px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '12px' }}>
            <Download size={24} color="#000" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Instalar PWA</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Fique online mesmo fora do navegador.</p>
          </div>
          <button onClick={handleInstallClick} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', width: 'auto' }}>Instalar</button>
        </div>
      )}

      {/* ── IDLE ── */}
      {status === 'idle' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
            <Bell size={40} color="var(--text-muted)" style={{ opacity: 0.3 }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Aguardando Chamadas</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '240px' }}>Você será notificado assim que alguém tocar a campainha.</p>
          <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} /> Conectado ao Servidor
          </div>
        </div>
      )}

      {/* ── RINGING ── */}
      {status === 'ringing' && call && (
        <div className="glass-panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '24px', background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
            <h3 style={{ color: '#EF4444', fontWeight: 800, letterSpacing: '2px', fontSize: '14px', margin: 0, animation: 'pulse 1s infinite' }}>CHAMADA RECEBIDA</h3>
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: '200px' }}>
            {call.photo
              ? <img src={call.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}><User size={64} style={{ opacity: 0.2 }} /></div>
            }
            <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(8px)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} /> PRÉ-VISUALIZAÇÃO
            </div>
          </div>
          <div style={{ padding: '32px 24px', display: 'flex', gap: '16px' }}>
            <button className="btn-secondary" style={{ flex: 1, flexDirection: 'column', height: 'auto', padding: '20px' }} onClick={handleMonitor}>
              <EyeOff size={24} style={{ marginBottom: '8px' }} /> Monitorar (Furtivo)
            </button>
            <button className="btn-primary" style={{ flex: 1, flexDirection: 'column', height: 'auto', padding: '20px', background: '#10B981', boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }} onClick={handleAnswer}>
              <Phone size={24} style={{ marginBottom: '8px' }} /> Atender c/ Áudio
            </button>
          </div>
        </div>
      )}

      {/* ── MONITORING / ACTIVE ── */}
      {(status === 'monitoring' || status === 'active') && call && (
        <div className="glass-panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0 }}>{status === 'monitoring' ? 'Modo Furtivo' : 'Em Chamada'}</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Câmera ao vivo do visitante</span>
            </div>
            <div style={{ color: '#EF4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444', animation: 'pulse 1s infinite' }} /> LIVE
            </div>
          </div>

          <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '250px' }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {!remoteVideoRef.current?.srcObject && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10B981', borderRadius: '50%', animation: 'mesh-pulse 1s linear infinite' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Conectando câmera P2P...</span>
                {call.photo && <img src={call.photo} alt="blur" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, filter: 'blur(20px)', zIndex: -1 }} />}
              </div>
            )}
          </div>

          <div style={{ padding: '32px 24px', display: 'flex', gap: '20px', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
            {status === 'monitoring'
              ? <button className="btn-primary" style={{ flex: 1, background: '#10B981', boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }} onClick={handleAnswer}>
                  <Phone size={20} /> Falar com Visitante
                </button>
              : <button className="btn-secondary" style={{ width: '64px', height: '64px', borderRadius: '50%', padding: 0, background: isMuted ? 'rgba(239,68,68,0.2)' : undefined }} onClick={toggleMute}>
                  <MicOff size={24} />
                </button>
            }
            <button className="btn-secondary" style={{ width: '64px', height: '64px', borderRadius: '50%', padding: 0, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }} onClick={handleEndCall}>
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
