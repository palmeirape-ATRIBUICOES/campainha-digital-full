import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Bell, CheckCircle, ShieldCheck, MapPin, ChevronRight, Mic, Video, PhoneOff, WifiOff, KeyRound } from 'lucide-react';
import Logo from '../components/Logo';

// ─── Configuração do Socket.io ────────────────────────────────────────────────
import { API } from '../config';


// Configuração ICE com STUN públicos do Google (funcionam em qualquer rede)
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // TURN público (fallback para NAT restritivo)
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

export default function VisitorCall() {
  const { id } = useParams(); // propertyId
  const [property, setProperty]     = useState(null);
  const [callingUnit, setCallingUnit] = useState(null);
  const [countdown, setCountdown]   = useState(0);
  const [status, setStatus]         = useState('idle');
  const [errorMsg, setErrorMsg]     = useState('');
  const [residentSocket, setResidentSocket] = useState(null);
  const [quickMessage, setQuickMessage] = useState('');

  const localVideoRef   = useRef(null); // câmera do visitante (oculta)
  const canvasRef       = useRef(null);
  const remoteAudioRef  = useRef(null);
  const socketRef       = useRef(null);
  const pcRef           = useRef(null);   // RTCPeerConnection
  const localStreamRef  = useRef(null);

  // ─── Inicialização do Socket.io ─────────────────────────────────────────
  useEffect(() => {
    const socket = io(API, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10
    });
    socketRef.current = socket;

    fetchProperty();

    // Morador atendeu – aguarda sinal de pronto antes de iniciar WebRTC
    // Em modo monitor: visitante vê "Chamando..." — NÃO revela que está sendo visto
    socket.on('call_answered', ({ residentSocketId, mode, unitId }) => {
      setResidentSocket(residentSocketId);
      // modo monitor: visitante continua vendo a tela de "chamando" (não sabe que está sendo monitorado)
      if (mode !== 'monitor') {
        setStatus('answered');
        setCountdown(0);
      }
      // NÃO inicia WebRTC aqui — aguarda o sinal webrtc_ready do morador
    });

    // Morador sinalizou que está pronto (mídia local capturada) – agora cria a offer
    socket.on('webrtc_ready', async ({ residentSocketId }) => {
      await startWebRTC(residentSocketId, 'active');
    });

    // Mensagem rápida enviada pelo morador
    socket.on('quick_message', ({ message }) => {
      setQuickMessage(message);
      setTimeout(() => setQuickMessage(''), 5000);
    });

    // Recebe answer do morador
    socket.on('webrtc_answer', async ({ answer }) => {
      if (pcRef.current && pcRef.current.signalingState !== 'stable') {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error('[WebRTC] Erro ao aplicar answer:', e);
        }
      }
    });

    // Recebe ICE candidate do morador
    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Erro ao adicionar ICE candidate:', e);
        }
      }
    });

    // Chamada encerrada pelo morador
    socket.on('call_ended', () => {
      setStatus('ended');
      stopAll();
    });

    // Portão liberado pelo morador
    socket.on('entry_authorized', () => {
      setStatus('authorized');
      setTimeout(() => {
        setStatus('idle');
        setCallingUnit(null);
        stopAll();
      }, 8000); // Back to idle after 8s
    });

    return () => {
      socket.disconnect();
      stopAll();
    };
  }, [id]);

  // ─── Countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (countdown > 0 && status === 'calling') {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0 && status === 'calling') {
      setStatus('idle');
      setCallingUnit(null);
      stopAll();
    }
    return () => clearTimeout(timer);
  }, [countdown, status]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const stopAll = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  const fetchProperty = async () => {
    try {
      const res  = await fetch(`${API}/api/properties/${id}`);
      const data = await res.json();
      setProperty(data);
    } catch (err) {
      console.error('[Fetch] Erro ao buscar propriedade:', err);
      setErrorMsg('Não foi possível carregar os dados. Verifique sua conexão.');
      setStatus('error');
    }
  };

  // Captura câmera + foto para o morador ver
  const getMediaAndPhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }

      // Tira uma foto após 600ms para o morador ver
      await new Promise(res => setTimeout(res, 600));
      const canvas = canvasRef.current;
      if (canvas && localVideoRef.current) {
        canvas.width  = localVideoRef.current.videoWidth  || 640;
        canvas.height = localVideoRef.current.videoHeight || 480;
        canvas.getContext('2d').drawImage(localVideoRef.current, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.5);
      }
    } catch (err) {
      console.warn('[Media] Câmera indisponível:', err.message);
    }
    return null;
  };

  // ─── WebRTC: Visitante cria a oferta ────────────────────────────────────
  const startWebRTC = useCallback(async (residentSocketId, mode) => {
    if (!localStreamRef.current) return;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // Adiciona tracks locais à conexão
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    // Quando receber áudio/vídeo do morador
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(e => console.warn('[Audio] autoplay bloqueado:', e));
      }
    };

    // Envia ICE candidates para o morador
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', {
          target: residentSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Estado:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        setErrorMsg('Conexão P2P falhou. Verifique sua rede.');
      }
    };

    // Cria e envia offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode !== 'monitor' // morador ativo manda vídeo/áudio de volta
      });
      await pc.setLocalDescription(offer);

      socketRef.current.emit('webrtc_offer', {
        target: residentSocketId,
        offer: pc.localDescription
      });
    } catch (err) {
      console.error('[WebRTC] Erro ao criar offer:', err);
      setErrorMsg('Erro ao iniciar videochamada.');
    }
  }, []);

  // ─── Tocar campainha ────────────────────────────────────────────────────
  const handleCall = async (unit) => {
    setStatus('calling');
    setCallingUnit(unit);
    setCountdown(30);

    const photo = await getMediaAndPhoto();

    socketRef.current.emit('initiate_call', {
      unitId: unit.id,
      propertyId: property.id, // Vínculo com a propriedade para isolamento
      photoBase64: photo
    });
  };

  const handleHangup = () => {
    if (residentSocket && socketRef.current) {
      socketRef.current.emit('call_ended', { target: residentSocket });
    }
    setStatus('idle');
    setCallingUnit(null);
    stopAll();
  };

  // ─── Render: Loading ─────────────────────────────────────────────────────
  if (!property && status !== 'error') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 229, 255, 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'mesh-pulse 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Verificando segurança...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Elementos ocultos para captura de mídia */}
      <video ref={localVideoRef} style={{ display: 'none' }} playsInline muted />
      <canvas ref={canvasRef}    style={{ display: 'none' }} />
      <audio  ref={remoteAudioRef} autoPlay playsInline />

      {/* Banner de mensagem rápida do morador */}
      {quickMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.92)', border: '1px solid var(--primary)', borderRadius: '16px', padding: '14px 24px', zIndex: 999, maxWidth: '320px', width: '90%', textAlign: 'center', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,229,255,0.2)' }}>
          <p style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, marginBottom: '4px', letterSpacing: '1px' }}>💬 MENSAGEM</p>
          <p style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>"{quickMessage}"</p>
        </div>
      )}

      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Logo size={42} showText={false} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>Campainha Digital</h1>
        {property && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', justifyContent: 'center', fontSize: '14px' }}>
            <MapPin size={14} /> {property.name}
          </div>
        )}
      </header>

      {/* ── Erro ──────────────────────────────────────────────────────────── */}
      {status === 'error' && (
        <div className="glass-panel fade-in" style={{ padding: '40px 24px', maxWidth: '400px', textAlign: 'center' }}>
          <WifiOff size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Erro de Conexão</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{errorMsg}</p>
          <button className="btn-primary" onClick={() => { setStatus('idle'); fetchProperty(); }}>Tentar Novamente</button>
        </div>
      )}

      {/* ── Idle: escolher unidade ─────────────────────────────────────────── */}
      {status === 'idle' && property && (
        <div className="fade-in" style={{ width: '100%', maxWidth: '400px' }}>
          {(property.type === 'individual' || property.type === 'house' || (property.units && property.units.length <= 1)) ? (
            <button
              id="btn-tocar-campainha"
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
                {property.units.map(unit => (
                  <button
                    key={unit.id}
                    id={`btn-unit-${unit.id}`}
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
        </div>
      )}

      {/* ── Chamando ──────────────────────────────────────────────────────── */}
      {status === 'calling' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 32px' }}>
            <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--primary)', borderRadius: '50%', animation: 'mesh-pulse 2s infinite ease-in-out', opacity: 0.2 }} />
            <div style={{ position: 'absolute', inset: '10px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px var(--primary-glow)' }}>
              <Bell size={40} color="#000" />
            </div>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Chamando...</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
            Unidade: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{callingUnit?.name}</span>
          </p>

          <div style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)', marginBottom: '32px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
              00:{countdown.toString().padStart(2, '0')}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            📷 Sua câmera está ativa para identificação.
          </p>

          <button
            className="btn-secondary"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
            onClick={handleHangup}
          >
            <PhoneOff size={18} /> Cancelar
          </button>
        </div>
      )}

      {/* ── Chamada ativa (áudio bidirecional) ───────────────────────────── */}
      {status === 'answered' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>
            <CheckCircle size={48} color="#000" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: '#10B981' }}>
            Comunicação Ativa
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '32px' }}>
            O morador está na linha. Vocês já podem conversar!
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
              <Video size={24} color="var(--primary)" />
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
              <Mic size={24} color="var(--primary)" />
            </div>
          </div>

          <button
            className="btn-secondary"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
            onClick={handleHangup}
          >
            <PhoneOff size={18} /> Encerrar
          </button>
        </div>
      )}

      {/* ── Morado monitorando (furtivo) ──────────────────────────────────── */}
      {status === 'monitored' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', background: 'rgba(245,158,11,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', border: '2px solid rgba(245,158,11,0.4)' }}>
            <Video size={48} color="#F59E0B" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: '#F59E0B' }}>
            Morador Monitorando
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            Sua câmera e áudio estão sendo transmitidos. Aguarde uma resposta.
          </p>

          <button
            className="btn-secondary"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
            onClick={handleHangup}
          >
            <PhoneOff size={18} /> Encerrar
          </button>
        </div>
      )}

      {/* ── Portão Liberado ─────────────────────────────────────────────── */}
      {status === 'authorized' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center', border: '2px solid #10B981', background: 'rgba(16,185,129,0.05)' }}>
          <div style={{ width: '100px', height: '100px', background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 0 40px rgba(16,185,129,0.5)', animation: 'mesh-pulse 1.5s infinite' }}>
            <KeyRound size={48} color="#000" />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#10B981', marginBottom: '12px', textTransform: 'uppercase' }}>Portão Liberado!</h2>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Seja bem-vindo!</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>O morador autorizou sua entrada. A portaria já foi notificada.</p>
        </div>
      )}

      {/* ── Chamada encerrada ─────────────────────────────────────────────── */}
      {status === 'ended' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <PhoneOff size={48} color="var(--text-muted)" style={{ margin: '0 auto 24px', display: 'block' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Chamada Encerrada</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>O morador encerrou a chamada.</p>
          <button className="btn-primary" onClick={() => { setStatus('idle'); setCallingUnit(null); }}>Tocar Novamente</button>
        </div>
      )}

      <footer style={{ marginTop: 'auto', paddingTop: '40px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Tecnologia Campainha Digital® • Conexão P2P Segura
        </p>
      </footer>
    </div>
  );
}
