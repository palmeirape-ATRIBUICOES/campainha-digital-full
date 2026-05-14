import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Phone, MicOff, PhoneOff, Bell, ShieldCheck, EyeOff, Download, AlertCircle, Video, VideoOff, LogOut, History, Settings, Home, KeyRound, MessageCircle, Building2, Mail } from 'lucide-react';
import { HistoryPanel, SettingsPanel, DEFAULT_CATEGORIES } from './ResidentPanels';
import Logo from '../components/Logo';
import MessagesPanel from '../components/resident/MessagesPanel';
import IntercomPanel from '../components/resident/IntercomPanel';
import ServicesPanel from '../components/resident/ServicesPanel';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

// ─── Som real de campainha via Web Audio API ──────────────────────────────────
// Gera o padrão "ding-dong" sem depender de arquivo externo
let doorbellCtx = null;
let doorbellInterval = null;

function playDoorbellSound() {
  try {
    if (!doorbellCtx) doorbellCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = doorbellCtx;

    // Força volume máximo via GainNode
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.5, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const ding = (freq, start, dur) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + start + dur);
      gain.gain.setValueAtTime(0.8, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };

    ding(880, 0,    0.6); // DING
    ding(660, 0.65, 0.8); // DONG
  } catch (e) { console.warn('[Doorbell]', e); }
}

function startDoorbell() {
  playDoorbellSound();
  doorbellInterval = setInterval(playDoorbellSound, 2200);
  // Vibração: padrão campainha
  if ('vibrate' in navigator) navigator.vibrate([400, 200, 400, 200, 800, 500, 400, 200, 400]);
}

function stopDoorbell() {
  if (doorbellInterval) { clearInterval(doorbellInterval); doorbellInterval = null; }
  if ('vibrate' in navigator) navigator.vibrate(0);
}


export default function ResidentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('home'); // home | history | settings | messages
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState('idle'); // idle|ringing|active|monitoring
  const [audioError, setAudioError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [unitName, setUnitName] = useState(() => localStorage.getItem('cd_unit_name') || 'Minha Casa');
  const [accessCode, setAccessCode] = useState('');
  const [visitorSocketId, setVisitorSocketId] = useState(null);
  const [quickMsgs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cd_quick_msgs') || 'null') || DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
  });
  const [activeMsgCat, setActiveMsgCat] = useState('general');
  const [sentMsg, setSentMsg] = useState('');
  const [neighborBlock, setNeighborBlock] = useState('');
  const [neighborNumber, setNeighborNumber] = useState('');
  const [neighborResults, setNeighborResults] = useState([]);
  const [neighborSearching, setNeighborSearching] = useState(false);
  const [neighborError, setNeighborError] = useState('');
  const [propertyId, setPropertyId] = useState(() => localStorage.getItem('residentPropertyId'));
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const audioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Busca informações salvas localmente para evitar consultas inseguras
    const savedCode = localStorage.getItem('residentAccessCode');
    const savedPropId = localStorage.getItem('residentPropertyId');
    if (savedCode) setAccessCode(savedCode);

    const s = io(API, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 20 });
    socketRef.current = s;
    s.emit('register_resident', { unitId: id, propertyId: savedPropId });

    // Fetch broadcast messages
    const fetchMessages = async () => {
      if (!savedPropId) return;
      try {
        const res = await fetch(`${API}/api/properties/${savedPropId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setBroadcastMessages(data);
          const readIds = JSON.parse(localStorage.getItem('cd_read_msgs') || '[]');
          setUnreadCount(data.filter(m => !readIds.includes(m.id)).length);
        }
      } catch {}
    };
    fetchMessages();


    s.on('incoming_call', (data) => {
      setCall(data); setStatus('ringing'); setVisitorSocketId(data.visitorSocketId);
      setTab('home'); setSentMsg('');
      // Som de campainha real + vibração
      startDoorbell();
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🔔 CAMPAINHA!', { body: `${unitName} — alguém está na porta!`, icon: '/logo.png' });
        } catch {}
      }
    });

    s.on('webrtc_offer', async ({ sender, offer }) => handleOffer(sender, offer));
    s.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
    s.on('call_ended', () => { setStatus('idle'); setCall(null); stopAll(); });

    // Receber mensagens broadcast do condomínio
    s.on('broadcast_message', (msg) => {
      setBroadcastMessages(prev => [msg, ...prev]);
      setUnreadCount(prev => prev + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(`📢 ${msg.title}`, { body: msg.body, icon: '/logo.png' }); } catch {}
      }
    });

    // Receber mensagem direta do porteiro
    s.on('doorman_message', (msg) => {
      const porteiroMsg = {
        id: Date.now().toString(),
        title: `📋 Mensagem da ${msg.senderName || 'Portaria'}`,
        body: msg.message,
        priority: 'normal',
        createdAt: msg.timestamp || new Date().toISOString()
      };
      setBroadcastMessages(prev => [porteiroMsg, ...prev]);
      setUnreadCount(prev => prev + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(`📋 Portaria`, { body: msg.message, icon: '/logo.png' }); } catch {}
      }
    });


    const bip = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', bip);
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();

    return () => { s.disconnect(); window.removeEventListener('beforeinstallprompt', bip); stopAll(); };
  }, [id]);

  const stopRing = () => { stopDoorbell(); setAudioError(false); };
  const stopAll = () => {
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
  };

  const searchNeighbor = async () => {
    if (!neighborBlock && !neighborNumber) return;
    setNeighborSearching(true); setNeighborError(''); setNeighborResults([]);
    try {
      const params = new URLSearchParams();
      if (neighborBlock) params.set('block', neighborBlock);
      if (neighborNumber) params.set('number', neighborNumber);
      const r = await fetch(`${API}/api/properties/${propertyId}/search-unit?${params}`);
      if (r.ok) {
        const data = await r.json();
        setNeighborResults(data.filter(u => u.id !== id));
      } else {
        const d = await r.json();
        setNeighborError(d.error || 'Unidade não encontrada.');
      }
    } catch { setNeighborError('Erro de conexão.'); }
    setNeighborSearching(false);
  };

  const handleIntercomCall = (neighbor) => {
    if (!socketRef.current || !propertyId) return;
    setStatus('active');
    socketRef.current.emit('initiate_call', {
      unitId: neighbor.id,
      propertyId: propertyId,
      callerName: unitName,
      photoBase64: null
    });
    setVisitorSocketId(null);
  };

  const markMessagesRead = () => {
    const ids = broadcastMessages.map(m => m.id);
    localStorage.setItem('cd_read_msgs', JSON.stringify(ids));
    setUnreadCount(0);
  };

  const handleOffer = useCallback(async (senderSocketId, offer) => {
    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    pc.ontrack = (e) => { if (remoteVideoRef.current && e.streams[0]) { remoteVideoRef.current.srcObject = e.streams[0]; remoteVideoRef.current.play().catch(() => {}); } };
    pc.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit('webrtc_ice_candidate', { target: senderSocketId, candidate: e.candidate }); };
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit('webrtc_answer', { target: senderSocketId, answer: pc.localDescription });
  }, []);

  const handleMonitor = () => {
    stopRing(); setStatus('monitoring'); localStreamRef.current = null;
    socketRef.current.emit('answer_call', { visitorSocketId: call.visitorSocketId, mode: 'monitor', unitId: id });
  };

  const handleAnswer = async (withCamera = false) => {
    stopRing(); setStatus('active'); setCamOn(withCamera);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withCamera });
      localStreamRef.current = stream;
      if (withCamera && localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.play().catch(() => {}); }
      if (pcRef.current) stream.getTracks().forEach(t => pcRef.current.addTrack(t, stream));
    } catch (e) { console.warn('[Media]', e); }
    socketRef.current.emit('answer_call', { visitorSocketId: call.visitorSocketId, mode: 'active', unitId: id });
  };

  const handleEnd = () => {
    stopRing();
    if (visitorSocketId) socketRef.current.emit('call_ended', { target: visitorSocketId });
    setStatus('idle'); setCall(null); stopAll();
  };

  const handleOpenGate = () => {
    const propId = call?.propertyId || localStorage.getItem('residentPropertyId');
    if (socketRef.current && call) {
      socketRef.current.emit('authorize_entry', { 
        unitId: id, 
        propertyId: propId, 
        visitorId: visitorSocketId || call.visitorSocketId 
      });
      sendQuickMsg("Portão Aberto! Pode entrar.");
      setTimeout(() => {
        handleEnd();
      }, 3000); // Ends call 3 seconds after opening gate
    }
  };

  const toggleMute = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
  };

  const toggleCam = async () => {
    if (!camOn) {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({ video: true });
        vs.getVideoTracks().forEach(t => { localStreamRef.current?.addTrack(t); pcRef.current?.addTrack(t, localStreamRef.current); });
        if (localVideoRef.current) { localVideoRef.current.srcObject = localStreamRef.current; localVideoRef.current.play().catch(() => {}); }
        setCamOn(true);
      } catch {}
    } else {
      localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
      setCamOn(false);
    }
  };

  const authorizeEntry = () => {
    if (!socketRef.current || !call) return;
    socketRef.current.emit('authorize_entry', { 
      unitId: id, 
      propertyId: call.propertyId,
      visitorId: call.visitId 
    });
    alert('Entrada autorizada! Notificação enviada à portaria.');
  };

  const sendQuickMsg = (msg) => {
    if (!visitorSocketId) return;
    socketRef.current.emit('send_quick_message', { target: visitorSocketId, message: msg });
    setSentMsg(msg);
    setTimeout(() => setSentMsg(''), 3000);
  };

  const saveSettings = () => { localStorage.setItem('cd_unit_name', unitName); };

  const activeC = quickMsgs.find(c => c.id === activeMsgCat);

  // ── Bottom Nav ───────────────────────────────────────────────────────────
  const NavBar = () => (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-surface-elevated)', borderTop: '1px solid var(--border-subtle)', display: 'flex', zIndex: 100 }}>
      {[
        { key: 'home', icon: <Home size={20} />, label: 'Campainha' },
        { key: 'messages', icon: <Mail size={20} />, label: 'Avisos', badge: unreadCount },
        { key: 'history', icon: <History size={20} />, label: 'Histórico' },
        { key: 'settings', icon: <Settings size={20} />, label: 'Config.' },
      ].map(n => (
        <button key={n.key} onClick={() => { setTab(n.key); if (n.key === 'messages') markMessagesRead(); }} style={{ flex: 1, padding: '12px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: tab === n.key ? 'var(--primary)' : 'var(--text-muted)', fontSize: '10px', fontWeight: 700, transition: 'color 0.2s', position: 'relative' }}>
          {n.icon}
          {n.badge > 0 && <div style={{ position:'absolute',top:'6px',right:'calc(50% - 18px)',width:'16px',height:'16px',borderRadius:'50%',background:'#EF4444',color:'#fff',fontSize:'9px',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center' }}>{n.badge}</div>}
          {n.label}
        </button>
      ))}
      <button onClick={() => navigate('/')} style={{ flex: 1, padding: '12px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700 }}>
        <LogOut size={20} />Sair
      </button>
    </nav>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', paddingBottom: '72px' }} onClick={() => { if (audioRef.current) audioRef.current.play().then(() => audioRef.current.pause()).catch(() => {}); }}>
      <audio ref={audioRef} loop preload="auto"><source src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" type="audio/mpeg" /></audio>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Logo size={28} showText={false} />
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{unitName}</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>ID: {id.slice(0, 8)} • {status === 'idle' ? '🟢 Online' : '🔴 Em chamada'}</p>
        </div>
        {installPrompt && (
          <button onClick={async () => { installPrompt.prompt(); const r = await installPrompt.userChoice; if (r.outcome === 'accepted') setInstallPrompt(null); }}
            style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Download size={14} /> Instalar
          </button>
        )}
      </div>

      {audioError && <div style={{ margin: '12px 24px 0', background: '#EF4444', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={16} />Toque na tela para ativar o som!</div>}

      {/* ── HOME TAB ── */}
      {tab === 'home' && (
        <>
          {/* IDLE */}
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 32px', gap: '20px' }}>

              {/* Bell hero */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '16px' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#FFF', border: '2px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                  <Bell size={36} color="#10B981" style={{ opacity: 0.8 }}/>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>Aguardando Chamadas</h3>
                <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>Você será notificado quando tocarem.</p>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', background: 'rgba(16,185,129,0.08)', padding: '5px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}/> Conectado
                </div>
              </div>

              {/* Código de Acesso */}
              <div style={{ width: '100%', maxWidth: '380px', background: '#FFF', borderRadius: '16px', padding: '16px 18px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', margin: '0 0 8px' }}>SEU CÓDIGO DE ACESSO</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#3B82F6', letterSpacing: '4px', fontFamily: 'monospace' }}>{accessCode || '...'}</span>
                  <button onClick={() => { const m = `Código de acesso Campainha Digital: ${accessCode}\nApp: ${window.location.origin}/morador-login`; window.open(`https://wa.me/?text=${encodeURIComponent(m)}`,'_blank'); }}
                    style={{ padding: '8px 14px', borderRadius: '10px', background: '#25D366', border: 'none', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MessageCircle size={14}/> Compartilhar
                  </button>
                </div>
              </div>

              {/* Mensagens do condomínio - colapssável */}
              <MessagesPanel messages={broadcastMessages} unreadCount={unreadCount} onClear={markMessagesRead}/>

              {/* Interfone Digital */}
              {propertyId && <IntercomPanel propertyId={propertyId} unitId={id} socketRef={socketRef} unitName={unitName}/>}

              {/* Serviços & Parceiros */}
              <ServicesPanel/>

            </div>

          {/* RINGING */}
          {status === 'ringing' && call && (
            <div style={{ padding: '16px 24px' }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#EF4444', fontWeight: 800, fontSize: '13px', letterSpacing: '1px' }}>CHAMADA RECEBIDA</span>
              </div>

              {/* Foto visitante */}
              <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#F1F5F9', aspectRatio: '4/3', position: 'relative', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                {call.photo ? <img src={call.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}><Bell size={48} style={{ opacity: 0.1 }} /></div>}
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', color: '#0F172A', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, backdropFilter: 'blur(8px)', border: '1px solid var(--border-subtle)' }}>
                  📷 {call.callerName || 'Visitante'} na porta
                </div>
              </div>

              {/* Caller Name highlight */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{call.callerName === 'Visitante' ? 'Chamada do Portão' : `Interfone: ${call.callerName}`}</h3>
              </div>

              {/* Mensagens rápidas */}
              <div style={{ background: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px' }}>📨 ENVIAR MENSAGEM RÁPIDA</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {quickMsgs.map(c => (
                    <button key={c.id} onClick={() => setActiveMsgCat(c.id)}
                      style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: activeMsgCat === c.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: activeMsgCat === c.id ? '#000' : 'var(--text-muted)' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {activeC?.messages.map((msg, i) => (
                    <button key={i} onClick={() => sendQuickMsg(msg)}
                      style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '12px', border: '1px solid var(--border-subtle)', background: sentMsg === msg ? '#10B981' : 'rgba(255,255,255,0.05)', color: sentMsg === msg ? '#000' : 'var(--text-main)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                      {sentMsg === msg ? '✓ Enviado' : `"${msg}"`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de atender */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <button onClick={handleMonitor} style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                  <EyeOff size={22} color="var(--primary)" />Modo Oculto
                </button>
                <button onClick={() => handleAnswer(false)} style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                  <Phone size={22} color="#10B981" />Só Áudio
                </button>
              </div>
              <button onClick={() => handleAnswer(true)} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '15px', background: '#10B981', boxShadow: '0 8px 24px rgba(16,185,129,0.35)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Video size={22} /> Atender com Câmera e Áudio
              </button>
              <button onClick={handleEnd} style={{ width: '100%', marginTop: '10px', padding: '12px', borderRadius: '14px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <PhoneOff size={18} /> Recusar
              </button>
            </div>
          )}

          {/* MONITORING */}
          {status === 'monitoring' && call && (
            <div style={{ padding: '16px 24px' }}>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '14px', padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                <EyeOff size={16} color="#F59E0B" /><span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '13px' }}>Modo Oculto Ativo — visitante não sabe que você está vendo</span>
              </div>
              <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#000', position: 'relative', marginBottom: '16px', minHeight: '220px' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(245,158,11,0.9)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, color: '#000' }}>👁 OCULTO</div>
              </div>

              {/* Mensagens rápidas */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>ENVIAR MENSAGEM SEM REVELAR CÂMERA</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {quickMsgs.find(c => c.id === 'general')?.messages.map((msg, i) => (
                    <button key={i} onClick={() => sendQuickMsg(msg)}
                      style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '12px', border: '1px solid var(--border-subtle)', background: sentMsg === msg ? '#10B981' : 'rgba(255,255,255,0.05)', color: sentMsg === msg ? '#000' : 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                      {sentMsg === msg ? '✓' : `"${msg}"`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleAnswer(false)} className="btn-primary" style={{ flex: 1, padding: '14px', background: '#10B981', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Phone size={18} /> Falar
                </button>
                <button onClick={authorizeEntry} style={{ flex: 1, padding: '14px', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid #10B981', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}>
                  <KeyRound size={18} /> Abrir
                </button>
                <button onClick={handleEnd} style={{ width: '56px', height: '52px', borderRadius: '14px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PhoneOff size={20} />
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE CALL */}
          {status === 'active' && call && (
            <div style={{ padding: '16px 24px' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#10B981', fontWeight: 700, fontSize: '13px' }}>Chamada em andamento</span>
              </div>

              {/* Vídeos */}
              <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', background: '#000', minHeight: '220px', marginBottom: '16px' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', objectFit: 'cover' }} />
                {camOn && <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: '12px', right: '12px', width: '100px', borderRadius: '12px', border: '2px solid var(--primary)' }} />}
              </div>

              {/* Mensagens */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {quickMsgs.find(c => c.id === 'general')?.messages.slice(0, 3).map((msg, i) => (
                  <button key={i} onClick={() => sendQuickMsg(msg)}
                    style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '12px', border: '1px solid var(--border-subtle)', background: sentMsg === msg ? '#10B981' : 'rgba(255,255,255,0.05)', color: sentMsg === msg ? '#000' : 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                    {sentMsg === msg ? '✓' : `"${msg}"`}
                  </button>
                ))}
              </div>

              {/* Controles */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                <button onClick={toggleMute} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)', color: isMuted ? '#EF4444' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MicOff size={22} />
                </button>
                <button onClick={toggleCam} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: camOn ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.08)', color: camOn ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {camOn ? <Video size={22} /> : <VideoOff size={22} />}
                </button>
                <button onClick={handleEnd} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>
                  <PhoneOff size={22} />
                </button>
              </div>

              <button onClick={handleOpenGate} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <KeyRound size={24} /> LIBERAR ENTRADA
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'messages' && (
        <div style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>📢 Avisos do Condomínio</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>{broadcastMessages.length} mensagen{broadcastMessages.length !== 1 ? 's' : ''}</p>
          {broadcastMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <Mail size={40} style={{ opacity: 0.2, marginBottom: '12px' }}/>
              <p style={{ fontWeight: 600 }}>Nenhum aviso recebido</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {broadcastMessages.map(m => (
                <div key={m.id} style={{ background: '#FFF', border: `1px solid ${m.priority === 'urgent' ? 'rgba(239,68,68,0.3)' : '#E2E8F0'}`, borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.priority === 'urgent' && <span style={{ color: '#EF4444' }}>🚨</span>}
                      {m.title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{new Date(m.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.6 }}>{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'history' && <HistoryPanel unitId={id} propertyId={localStorage.getItem('residentPropertyId')} />}
      {tab === 'settings' && <SettingsPanel unitName={unitName} setUnitName={setUnitName} onSave={saveSettings} unitId={id} propertyId={localStorage.getItem('residentPropertyId')} />}

      <NavBar />
    </div>
  );
}
