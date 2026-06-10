import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Bell, CheckCircle, ShieldCheck, MapPin, ChevronRight, Mic, Video, PhoneOff, WifiOff, KeyRound, Navigation, AlertTriangle, LocateFixed } from 'lucide-react';
import Logo from '../components/Logo';

// ─── Configuração do Socket.io ────────────────────────────────────────────────
import { API } from '../config';


// ICE config is fetched dynamically from the backend to allow
// secure TURN credentials rotation without frontend deploys.
const DEFAULT_ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10
};

let _cachedIceConfig = null;
async function fetchIceConfig() {
  if (_cachedIceConfig) return _cachedIceConfig;
  try {
    const res = await fetch(`${API}/api/ice-servers`);
    if (res.ok) {
      const data = await res.json();
      _cachedIceConfig = { iceServers: data.iceServers, iceCandidatePoolSize: 10 };
      return _cachedIceConfig;
    }
  } catch (e) {
    console.warn('[ICE] Failed to fetch ICE servers from backend, using defaults:', e);
  }
  return DEFAULT_ICE_CONFIG;
}

export default function VisitorCall() {
  const { id } = useParams(); // propertyId
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetUnitId = queryParams.get('unitId');

  const [property, setProperty]     = useState(null);

  const targetUnit = (targetUnitId && property && property.units)
    ? property.units.find(u => u.id === targetUnitId)
    : null;
  const [callingUnit, setCallingUnit] = useState(null);
  const [countdown, setCountdown]   = useState(0);
  const [status, setStatus]         = useState('idle');
  const [errorMsg, setErrorMsg]     = useState('');
  const [residentSocket, setResidentSocket] = useState(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [geoStatus, setGeoStatus]   = useState('idle'); // idle | requesting | denied | ready
  const geoCoordsRef = useRef(null); // { lat, lng }
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    if (remoteStream) {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.warn('[Audio] play error:', e));
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => console.warn('[Video] play error:', e));
      }
    }
  }, [remoteStream, remoteAudioRef.current, remoteVideoRef.current]);

  const localVideoRef   = useRef(null); // câmera do visitante (oculta)
  const canvasRef       = useRef(null);
  const remoteAudioRef  = useRef(null);
  const remoteVideoRef  = useRef(null); // câmera do morador (se ativada)
  const socketRef       = useRef(null);
  const pcRef           = useRef(null);   // RTCPeerConnection
  const localStreamRef  = useRef(null);
  const webrtcStartedRef = useRef(false); // Dedup: evita criar 2 PeerConnections

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
      if (mode !== 'monitor') {
        // Se o morador estava monitorando (oculto) e agora mudou para conversa ativa ("Falar"),
        // precisamos resetar a conexão WebRTC antiga para iniciar uma limpa com áudio
        if (webrtcStartedRef.current) {
          console.log('[WebRTC] Transição de Monitor -> Ativo detectada no visitante. Reiniciando PeerConnection...');
          if (pcRef.current) {
            try { pcRef.current.close(); } catch {}
            pcRef.current = null;
          }
          webrtcStartedRef.current = false;
        }
        setStatus('answered');
        setCountdown(0);
      }
      // NÃO inicia WebRTC aqui — aguarda o sinal webrtc_ready do morador
    });

    // Morador sinalizou que está pronto (mídia local capturada) – agora cria a offer
    socket.on('webrtc_ready', async ({ residentSocketId }) => {
      if (webrtcStartedRef.current) {
        console.log('[WebRTC] webrtc_ready duplicado ignorado');
        return;
      }
      webrtcStartedRef.current = true;
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

    // Chamada falhou / Licença inativa / Geofence
    socket.on('call_failed', ({ reason, message }) => {
      if (reason === 'geofence_too_far' || reason === 'geofence_no_gps') {
        setStatus('geofence_blocked');
      } else {
        setStatus('call_failed_license');
      }
      setErrorMsg(message || 'A campainha digital desta residência está inativa.');
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
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteStream(null);
    webrtcStartedRef.current = false; // Permite nova chamada depois
  };

  const fetchProperty = async () => {
    try {
      const res  = await fetch(`${API}/api/properties/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Propriedade não encontrada.');
        setStatus('error');
        return;
      }
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
      console.warn('[Media] Câmera indisponível, tentando apenas áudio:', err.message);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch (errAudio) {
        console.error('[Media] Microfone também indisponível:', errAudio.message);
      }
    }
    return null;
  };

  // ─── WebRTC: Visitante cria a oferta ────────────────────────────────────
  const startWebRTC = useCallback(async (residentSocketId, mode) => {
    if (!localStreamRef.current) return;

    const iceConfig = await fetchIceConfig();
    console.log('[ICE] Using', iceConfig.iceServers.length, 'ICE servers');
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;

    // Adiciona tracks locais à conexão
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    // Quando receber áudio/vídeo do morador
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        console.log('[WebRTC] Visitor remote stream received:', event.streams[0].id);
        setRemoteStream(event.streams[0]);
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

  /** Solicita GPS do visitante. Resolve com { lat, lng } ou null. */
  const requestGeo = () =>
    new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve(null);
      setGeoStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          geoCoordsRef.current = coords;
          setGeoStatus('ready');
          resolve(coords);
        },
        () => { geoCoordsRef.current = null; setGeoStatus('denied'); resolve(null); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const handleCall = async (unit) => {
    if (status === 'calling' || status === 'active' || status === 'monitoring') return;
    // Solicita GPS antes de chamar (servidor rejeita se geofence ativo e coords ausentes)
    const coords = geoCoordsRef.current || await requestGeo();

    setStatus('calling');
    setCallingUnit(unit);
    setCountdown(120);

    const photo = await getMediaAndPhoto();

    socketRef.current.emit('initiate_call', {
      unitId: unit.id,
      propertyId: property.id,
      photoBase64: photo,
      visitorLat: coords?.lat ?? null,
      visitorLng: coords?.lng ?? null
    });
  };

  const handleHangup = () => {
    if (residentSocket && socketRef.current) {
      socketRef.current.emit('call_ended', { target: residentSocket, unitId: callingUnit?.id });
    } else if (socketRef.current && callingUnit) {
      socketRef.current.emit('cancel_call', { unitId: callingUnit.id });
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
        <div style={{ 
          position: 'fixed', 
          top: '30px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 50%, #EC4899 100%)', 
          borderRadius: '24px', 
          padding: '24px 32px', 
          zIndex: 9999, 
          maxWidth: '450px', 
          width: '92%', 
          textAlign: 'center', 
          boxShadow: '0 20px 50px rgba(79, 70, 229, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          animation: 'fade-in 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }}>
              <Bell size={32} color="#ffffff" />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 6px 0' }}>💬 MENSAGEM DO MORADOR</p>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: '1.2', letterSpacing: '-0.5px' }}>
                "{quickMessage}"
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '8px' }}>
          <Logo size={48} vertical={true} />
        </div>
        {property && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', justifyContent: 'center', fontSize: '14px', marginTop: '4px' }}>
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
          {/* Aviso GPS negado */}
          {geoStatus === 'denied' && (
            <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={17} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}>Localização negada</p>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>Se o geofence estiver ativo, a chamada será bloqueada sem GPS.</p>
              </div>
            </div>
          )}
          {targetUnit ? (
            <button
              id="btn-tocar-campainha"
              className="btn-primary"
              style={{ width: '100%', padding: '32px 24px', fontSize: '20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', boxShadow: '0 12px 40px rgba(0, 229, 255, 0.3)' }}
              onClick={() => handleCall(targetUnit)}
            >
              <Bell size={48} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 800 }}>TOCAR CAMPAINHA</span>
                <span style={{ fontSize: '14px', opacity: 0.8, fontWeight: 600 }}>Unidade: {targetUnit.name}</span>
              </div>
            </button>
          ) : (property.type === 'individual' || property.type === 'house' || (property.units && property.units.length <= 1)) ? (
            <button
              id="btn-tocar-campainha"
              className="btn-primary"
              style={{ width: '100%', padding: '32px 24px', fontSize: '20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 12px 40px rgba(0, 229, 255, 0.3)' }}
              onClick={() => handleCall(property.units[0])}
            >
              <Bell size={48} />
              TOCAR CAMPAINHA
            </button>
          ) : property.isVila ? (
            /* ── MODO VILA: lista de campanhas com visual diferenciado ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  🏘️ Selecione a campanha
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                {property.units.map((unit, idx) => (
                  <button
                    key={unit.id}
                    id={`btn-vila-unit-${unit.id}`}
                    onClick={() => handleCall(unit)}
                    style={{
                      width: '100%', padding: '18px 20px', borderRadius: '18px',
                      border: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
                      background: 'var(--bg-surface)',
                      backdropFilter: 'blur(12px)',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                  >
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                      background: `hsl(${(idx * 47) % 360},70%,50%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 14px hsl(${(idx * 47) % 360},70%,40%,0.3)`
                    }}>
                      <Bell size={22} color="#FFF" />
                    </div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>{unit.name}</div>
                      {unit.residents?.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {unit.residents.map(r => r.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={20} color="var(--primary)" />
                  </button>
                ))}
              </div>
            </div>
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

          {/* LGPD Compliance Warning Notice */}
          <p style={{
            marginTop: '32px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: '1.4',
            maxWidth: '320px',
            marginLeft: 'auto',
            marginRight: 'auto',
            opacity: 0.65
          }}>
            <strong>Aviso de Privacidade (LGPD):</strong> Ao tocar a campainha, a sua câmera e áudio serão transmitidos temporariamente em tempo real para identificação e segurança de acesso.
          </p>
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
              {`${Math.floor(countdown / 60).toString().padStart(2, '0')}:${(countdown % 60).toString().padStart(2, '0')}`}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center',
            padding: '12px 16px',
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '16px',
            marginBottom: '24px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'left'
          }}>
            <ShieldCheck size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>
              <strong>LGPD:</strong> Câmera ativa exclusivamente para identificação do visitante e controle de acesso seguro.
            </span>
          </div>

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
          
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 32px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #10B981', boxShadow: '0 8px 32px rgba(16,185,129,0.4)', background: '#000' }}>
            <video ref={remoteVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: -1 }}>
              <CheckCircle size={48} color="#10B981" />
            </div>
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
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
            Sua câmera e áudio estão sendo transmitidos. Aguarde uma resposta.
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center',
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            borderRadius: '16px',
            marginBottom: '24px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'left'
          }}>
            <ShieldCheck size={18} color="#F59E0B" style={{ flexShrink: 0 }} />
            <span>
              <strong>LGPD:</strong> Transmissão segura e em tempo real para fins de identificação patrimonial e residencial.
            </span>
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

      {/* ── Bloqueado por Geofence ──────────────────────────────────────── */}
      {status === 'geofence_blocked' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center', border: '2px solid #F59E0B', background: 'rgba(245,158,11,0.04)' }}>
          <div style={{ width: '90px', height: '90px', background: 'rgba(245,158,11,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', border: '2px solid rgba(245,158,11,0.35)' }}>
            <Navigation size={44} color="#F59E0B" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#F59E0B', marginBottom: '16px' }}>Fora do Raio de Acesso</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '12px', fontSize: '15px' }}>{errorMsg}</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px', opacity: 0.65 }}>
            Por segurança, a campainha só pode ser acionada de dentro do endereço cadastrado.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={async () => { geoCoordsRef.current = null; const c = await requestGeo(); if (c) { setStatus('idle'); setErrorMsg(''); } }}
            >
              <LocateFixed size={18} /> Atualizar Localização
            </button>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => { setStatus('idle'); setCallingUnit(null); setErrorMsg(''); }}>Voltar</button>
          </div>
        </div>
      )}

      {/* ── Licença Expirada / Campainha Inativa ─────────────────────────── */}
      {status === 'call_failed_license' && (
        <div className="glass-panel fade-in" style={{ padding: '48px 24px', width: '100%', maxWidth: '400px', textAlign: 'center', border: '2px solid #EF4444', background: 'rgba(239,68,68,0.02)' }}>
          <div style={{ width: '80px', height: '80px', background: '#EF4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(239,68,68,0.3)' }}>
            <PhoneOff size={36} color="#FFF" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginBottom: '12px' }}>Campainha Inativa</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            {errorMsg}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            Por favor, tente contato com o morador de outra maneira.
          </p>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => { setStatus('idle'); setCallingUnit(null); }}>Voltar ao Início</button>
        </div>
      )}

      <footer style={{ marginTop: 'auto', paddingTop: '40px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Tecnologia Campainha Digital®
        </p>
      </footer>
    </div>
  );
}
