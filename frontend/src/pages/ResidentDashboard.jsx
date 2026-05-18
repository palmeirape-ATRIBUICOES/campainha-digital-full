import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Phone, MicOff, PhoneOff, Bell, ShieldCheck, EyeOff, Download, AlertCircle, Video, VideoOff, LogOut, History, Settings, Home, KeyRound, MessageCircle, Building2, Mail, ShoppingBag, BellOff, BellRing, Users } from 'lucide-react';
import { HistoryPanel, SettingsPanel, DEFAULT_CATEGORIES } from './ResidentPanels';
import Logo from '../components/Logo';
import MessagesPanel from '../components/resident/MessagesPanel';
import IntercomPanel from '../components/resident/IntercomPanel';
import ServicesPanel from '../components/resident/ServicesPanel';
import PaymentModal from '../components/PaymentModal';
import VisitorCodesPanel from '../components/resident/VisitorCodesPanel';
import ResidentsPanel from '../components/resident/ResidentsPanel';

import { API } from '../config';
const DEFAULT_ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};
let _cachedIce = null;
async function fetchIceConfig() {
  if (_cachedIce) return _cachedIce;
  try {
    const res = await fetch(`${API}/api/ice-servers`);
    if (res.ok) {
      const data = await res.json();
      _cachedIce = { iceServers: data.iceServers };
      return _cachedIce;
    }
  } catch (e) {
    console.warn('[ICE] Fallback to default config:', e);
  }
  return DEFAULT_ICE;
}

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
  const location = useLocation();
  
  const savedUnitId = localStorage.getItem('residentUnitId');
  const token = localStorage.getItem('cd_token');

  const [tab, setTab] = useState('home'); // home | history | messages
  const [showMenu, setShowMenu] = useState(false);
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState('idle'); // idle|ringing|active|monitoring
  const [audioError, setAudioError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [unitName, setUnitName] = useState(() => localStorage.getItem('cd_unit_name') || 'Minha Casa');
  const [accessCode, setAccessCode] = useState('');
  const [visitorSocketId, setVisitorSocketId] = useState(null);
  const isHouseResident = localStorage.getItem('cd_is_house_resident') === 'true';
  const HOUSE_QUICK_MSGS = [
    { id: 'general', label: 'Geral', messages: ['Já estou indo', 'Já está Aberto', 'Pode entrar'] },
    { id: 'services', label: 'Serviços', messages: ['Pode entrar pra marcar a luz', 'Pode entrar para marcar a água'] },
    { id: 'delivery', label: 'Delivery', messages: ['Pode deixar no portão', 'Já estou descendo'] }
  ];
  const CONDO_QUICK_MSGS = [
    { id: 'general', label: 'Geral', messages: ['Já estou descendo', 'Um momento', 'Pode subir', 'Deixar na portaria'] },
    { id: 'services', label: 'Serviços', messages: ['Prestador autorizado', 'Aguarde na portaria'] },
    { id: 'delivery', label: 'Delivery', messages: ['Pode deixar com o porteiro', 'Deixar no Locker'] }
  ];

  const [quickMsgs] = useState(() => {
    return isHouseResident ? HOUSE_QUICK_MSGS : CONDO_QUICK_MSGS;
  });
  const [activeMsgCat, setActiveMsgCat] = useState('general');
  const [sentMsg, setSentMsg] = useState('');
  const [neighborBlock, setNeighborBlock] = useState('');
  const [neighborNumber, setNeighborNumber] = useState('');
  const [neighborResults, setNeighborResults] = useState([]);
  const [neighborSearching, setNeighborSearching] = useState(false);
  const [neighborError, setNeighborError] = useState('');
  const [propertyId, setPropertyId] = useState(() => localStorage.getItem('residentPropertyId'));
  const [propertyName, setPropertyName] = useState(() => localStorage.getItem('residentPropertyName') || '');
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [userContact, setUserContact] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [visitorOrPackageName, setVisitorOrPackageName] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [planPrice, setPlanPrice] = useState('39.90');

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };


  // Novos estados para Caixa Postal de Moradores e Despacho de Alertas
  const [supportSubject, setSupportSubject] = useState('');
  const [supportBody, setSupportBody]       = useState('');
  const [supportSending, setSupportSending]   = useState(false);
  const [dispatchAlertLoading, setDispatchAlertLoading] = useState(false);
  const [openGateLoading, setOpenGateLoading] = useState(false);

  const audioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);

  const checkPushSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      
      const swUrl = import.meta.env.BASE_URL + 'sw.js';
      const reg = await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
      await navigator.serviceWorker.ready;
      
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        setPushEnabled(true);
      } else {
        setPushEnabled(false);
      }
    } catch (err) {
      console.warn('[Push] Erro ao verificar sub:', err);
    }
  }, []);

  const enablePushNotifications = async () => {
    setPushLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Este dispositivo não suporta notificações Push.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permissão de notificações negada. Por favor, ative nas configurações do Safari/Aparelho.');
        return;
      }

      const swUrl = import.meta.env.BASE_URL + 'sw.js';
      const reg = await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
      await navigator.serviceWorker.ready;

      const vapidRes = await fetch(`${API}/api/push/vapid-public-key`);
      const { publicKey } = await vapidRes.json();

      const urlBase64ToUint8 = (base64) => {
        const pad = '='.repeat((4 - base64.length % 4) % 4);
        const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(b64);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
      };

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8(publicKey)
        });
      }

      const token = localStorage.getItem('cd_token');
      if (token) {
        const saveRes = await fetch(`${API}/api/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token },
          body: JSON.stringify(sub.toJSON())
        });
        if (saveRes.ok) {
          setPushEnabled(true);
          alert('Notificações ativadas com sucesso!');
        } else {
          alert('Falha ao registrar no servidor.');
        }
      } else {
        alert('Faça login primeiro para ativar as notificações.');
      }
    } catch (err) {
      console.error('[Push] Erro ao ativar:', err);
      alert('Erro ao ativar notificações: ' + err.message);
    } finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        if (data.plan_price) setPlanPrice(data.plan_price);
      } catch (err) {
        console.error('[ResidentDashboard] Erro ao buscar preco:', err);
      }
    };
    fetchSettings();

    // Auth guard: redirect if not logged in
    if (!savedUnitId && !token) {
      navigate('/morador-login');
      return;
    }

    // Busca informações salvas localmente para evitar consultas inseguras
    const savedCode = localStorage.getItem('residentAccessCode');
    const savedPropId = localStorage.getItem('residentPropertyId');
    if (savedCode) setAccessCode(savedCode);

    const s = io(API, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 20 });
    socketRef.current = s;
    const userIdToRegister = localStorage.getItem('cd_user_id') || id;
    s.emit('register_user', { userId: userIdToRegister });

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

    const fetchUserProfile = async (activeToken) => {
      try {
        const tokenToUse = activeToken || localStorage.getItem('cd_token');
        if (!tokenToUse) return;
        const res = await fetch(`${API}/api/user/settings`, {
          headers: { 'Authorization': tokenToUse }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.clientCode) setAccessCode(data.clientCode);
          else if (data.plateCode) setAccessCode(data.plateCode);
          if (data.name) setUnitName(data.name);
          if (data.trialEndsAt) setTrialEndsAt(data.trialEndsAt);
          if (data.propertyId) {
            setPropertyId(data.propertyId);
            localStorage.setItem('residentPropertyId', data.propertyId);
          }
          if (data.propertyName) {
            setPropertyName(data.propertyName);
            localStorage.setItem('residentPropertyName', data.propertyName);
          }
          setUserContact(data.email || data.phone || data.clientCode || data.plateCode || '');
        }
      } catch {}
    };

    // Auto-healer: se o usuário já estiver logado mas não tiver o token de segurança na sessão
    const healSession = async () => {
      const token = localStorage.getItem('cd_token');
      if (savedCode && !token) {
        try {
          const res = await fetch(`${API}/api/resident/login-by-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode: savedCode.trim().toUpperCase() })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              localStorage.setItem('cd_token', data.token);
              localStorage.setItem('cd_user_id', data.userId || data.token);
              s.emit('register_user', { userId: data.userId || data.token });
              fetchUserProfile(data.token);
            }
          }
        } catch (e) {
          console.error('[Session Healer] Erro:', e);
        }
      }
    };

    fetchMessages();
    fetchUserProfile();
    healSession();

    checkPushSubscription();


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

    return () => { s.disconnect(); window.removeEventListener('beforeinstallprompt', bip); stopAll(); };
  }, [id]);

  useEffect(() => {
    const checkActiveCallParam = async () => {
      const hashPart = window.location.hash;
      const queryPart = hashPart.includes('?') ? hashPart.split('?')[1] : '';
      const params = new URLSearchParams(queryPart);
      const hasCallParam = params.get('call') === 'true';
      const paramVisitorSocket = params.get('visitorSocketId');

      if (hasCallParam && paramVisitorSocket) {
        setVisitorSocketId(paramVisitorSocket);
        setStatus('ringing');
        setTab('home');
        setSentMsg('');
        
        try {
          const res = await fetch(`${API}/api/units/${id}/visitors`);
          if (res.ok) {
            const visitors = await res.json();
            if (visitors && visitors.length > 0) {
              const latest = visitors[0];
              setCall({
                visitorSocketId: paramVisitorSocket,
                callerName: latest.callerName || 'Visitante',
                photo: latest.photo,
                timestamp: latest.timestamp,
                visitId: latest.id
              });
            } else {
              setCall({ visitorSocketId: paramVisitorSocket, callerName: 'Visitante', photo: null });
            }
          } else {
            setCall({ visitorSocketId: paramVisitorSocket, callerName: 'Visitante', photo: null });
          }
        } catch {
          setCall({ visitorSocketId: paramVisitorSocket, callerName: 'Visitante', photo: null });
        }
      }
    };

    checkActiveCallParam();
  }, [location, id]);

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
    const iceConfig = await fetchIceConfig();
    console.log('[ICE] Resident using', iceConfig.iceServers.length, 'ICE servers');
    const pc = new RTCPeerConnection(iceConfig);
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
    // Sinaliza ao visitante que pode criar a offer WebRTC
    socketRef.current.emit('webrtc_ready', { target: call.visitorSocketId });
  };

  const handleAnswer = async (withCamera = false) => {
    stopRing(); setStatus('active'); setCamOn(withCamera);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withCamera });
      localStreamRef.current = stream;
      if (withCamera && localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.play().catch(() => {}); }
    } catch (e) { console.warn('[Media]', e); }
    
    // Se a chamada for da Portaria (que não tem WebRTC configurado na web), não espere a oferta WebRTC.
    if (call?.callerName === 'Portaria') {
      alert('Conectado à Portaria (Modo Áudio Simples).');
      return;
    }

    // Primeiro notifica o visitante que a chamada foi atendida
    socketRef.current.emit('answer_call', { visitorSocketId: call.visitorSocketId, mode: 'active', unitId: id });
    // Depois sinaliza que a mídia local está pronta e pode criar a offer
    socketRef.current.emit('webrtc_ready', { target: call.visitorSocketId });
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
      visitorId: visitorSocketId || call.visitorSocketId 
    });
    sendQuickMsg("Portão Aberto! Pode entrar.");
    alert('Entrada autorizada!');
    setTimeout(() => {
      handleEnd();
    }, 3000);
  };

  const sendQuickMsg = (msg) => {
    if (!visitorSocketId) return;
    socketRef.current.emit('send_quick_message', { target: visitorSocketId, message: msg });
    setSentMsg(msg);
    setTimeout(() => setSentMsg(''), 3000);
  };

  const saveSettings = () => { localStorage.setItem('cd_unit_name', unitName); };

  const sendSupportMessage = async (e) => {
    e.preventDefault();
    if (!supportSubject || !supportBody) {
      alert('Por favor, preencha o assunto e a mensagem.');
      return;
    }
    setSupportSending(true);
    try {
      const propId = propertyId || localStorage.getItem('residentPropertyId');
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/properties/${propId}/mailbox`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({
          subject: supportSubject,
          body: supportBody,
          unitId: id
        })
      });
      if (res.ok) {
        alert('Mensagem enviada com sucesso para a administração!');
        setSupportSubject('');
        setSupportBody('');
      } else {
        alert('Erro ao enviar mensagem.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar mensagem.');
    } finally {
      setSupportSending(false);
    }
  };

  const dispatchAlert = async (type, title, baseDescription) => {
    if (!savedUnitId) return;
    const finalDescription = visitorOrPackageName.trim() ? `${baseDescription} (Nome: ${visitorOrPackageName})` : baseDescription;
    setDispatchAlertLoading(true);
    try {
      const propId = propertyId || localStorage.getItem('residentPropertyId');
      const res = await fetch(`${API}/api/properties/${propId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: savedUnitId,
          type,
          title,
          description: finalDescription
        })
      });
      if (res.ok) {
        setVisitorOrPackageName(''); // clear input on success
        alert('Notificação enviada com sucesso para a portaria/zelador!');
      } else {
        alert('Erro ao despachar alerta.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar alerta.');
    } finally {
      setDispatchAlertLoading(false);
    }
  };

  const openGateSonoff = async () => {
    setOpenGateLoading(true);
    try {
      const res = await fetch(`${API}/api/units/${id}/open-gate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(`[Sonoff eWelink Dual Relay]: Abertura acionada via contato seco! ${data.message || ''}`);
      } else {
        alert('Erro ao acionar abertura do portão.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com o dispositivo.');
    } finally {
      setOpenGateLoading(false);
    }
  };

  const activeC = quickMsgs.find(c => c.id === activeMsgCat);

  // ── Bottom Nav (Only Essentials) ──────────────────────────────────────────
  const NavBar = () => (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-subtle)', display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {[
        { key: 'home', icon: <Home size={22} />, label: 'Início' },
        ...(!isHouseResident ? [{ key: 'messages', icon: <Mail size={22} />, label: 'Avisos', badge: unreadCount }] : []),
        { key: 'history', icon: <History size={22} />, label: 'Atividade' },
      ].map(n => (
        <button key={n.key} onClick={() => { setTab(n.key); if (n.key === 'messages') markMessagesRead(); }} style={{ flex: 1, padding: '12px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: tab === n.key ? 'var(--primary)' : '#94A3B8', fontSize: '11px', fontWeight: 700, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative' }}>
          <div style={{ transform: tab === n.key ? 'translateY(-2px)' : 'none', transition: 'transform 0.3s' }}>{n.icon}</div>
          {n.badge > 0 && <div style={{ position:'absolute',top:'8px',right:'calc(50% - 18px)',width:'16px',height:'16px',borderRadius:'50%',background:'#EF4444',color:'#fff',fontSize:'9px',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center', border: '2px solid #fff' }}>{n.badge}</div>}
          <span style={{ opacity: tab === n.key ? 1 : 0.8 }}>{n.label}</span>
          {tab === n.key && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '20px', height: '3px', background: 'var(--primary)', borderRadius: '0 0 4px 4px' }} />}
        </button>
      ))}
    </nav>
  );

  // ── Side Menu (Hamburger) ──────────────────────────────────────────────────
  const HamburgerMenu = () => (
    <>
      <div 
        onClick={() => setShowMenu(false)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, opacity: showMenu ? 1 : 0, visibility: showMenu ? 'visible' : 'hidden', transition: 'all 0.3s' }} 
      />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#FFF', zIndex: 1001, transform: showMenu ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)', padding: '32px 24px', display: 'flex', flexDirection: 'column', boxShadow: '8px 0 32px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <Logo size={32} />
          <button onClick={() => setShowMenu(false)} style={{ background: '#F1F5F9', border: 'none', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}><Settings size={20} color="#64748B" /></button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', marginBottom: '8px' }}>FUNCIONALIDADES</p>
          
          {!isHouseResident && (
            <button onClick={() => { setTab('intercom'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'intercom' ? '#F0F9FF' : 'transparent', color: tab === 'intercom' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
              <Building2 size={20} color={tab === 'intercom' ? '#0369A1' : '#64748B'} /> Interfone Digital
            </button>
          )}

          <button onClick={() => { setTab('services'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'services' ? '#F0F9FF' : 'transparent', color: tab === 'services' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
            <ShoppingBag size={20} color={tab === 'services' ? '#0369A1' : '#64748B'} /> Parceiros da Região
          </button>

          <button onClick={() => { setTab('visitor-codes'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'visitor-codes' ? '#F0F9FF' : 'transparent', color: tab === 'visitor-codes' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
            <KeyRound size={20} color={tab === 'visitor-codes' ? '#0369A1' : '#64748B'} /> Códigos de Visitante
          </button>

          <button onClick={() => { setTab('residents'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'residents' ? '#F0F9FF' : 'transparent', color: tab === 'residents' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
            <Users size={20} color={tab === 'residents' ? '#0369A1' : '#64748B'} /> Moradores & Acessos
          </button>

          <div style={{ height: '1px', background: '#F1F5F9', margin: '8px 0' }} />
          
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', marginBottom: '8px' }}>CONTA</p>
          
          <button onClick={() => { setTab('settings'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'settings' ? '#F8FAFC' : 'transparent', color: '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
            <Settings size={20} color="#64748B" /> Configurações
          </button>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {userContact && (
            <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Logado como:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', wordBreak: 'break-all' }}>{userContact}</span>
            </div>
          )}

          <button onClick={() => {
            [
              'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
              'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
              'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
              'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
              'cd_admin_name', 'cd_admin_password', 'cd_property_type'
            ].forEach(k => localStorage.removeItem(k));
            navigate('/');
          }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: '#FFF1F2', color: '#E11D48', fontWeight: 700, fontSize: '15px', cursor: 'pointer', width: '100%' }}>
            <LogOut size={20} /> Sair do App
          </button>
        </div>
      </div>
    </>
  );

  // Condominium contract-based approach: subscription/trials completely bypassed (always active, no payment prompt)
  const trialEndsDate = null;
  const isTrialExpired = false;
  const isTrialExpiringSoon = false;
  const formattedExpiryDate = '';
  const daysRemaining = 0;

  if (!savedUnitId && !token) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', paddingBottom: '72px' }} onClick={() => { if (audioRef.current) audioRef.current.play().then(() => audioRef.current.pause()).catch(() => {}); }}>
      <audio ref={audioRef} loop preload="auto"><source src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" type="audio/mpeg" /></audio>

      {/* Header (Premium Sticky) */}
      <div style={{ 
        padding: '16px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(12px)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 90,
        borderBottom: '1px solid #F1F5F9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setShowMenu(true)} style={{ background: '#0F172A', color: '#FFF', border: 'none', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '20px' }}>
              <div style={{ height: '2px', width: '100%', background: '#FFF', borderRadius: '2px' }} />
              <div style={{ height: '2px', width: '100%', background: '#FFF', borderRadius: '2px' }} />
              <div style={{ height: '2px', width: '60%', background: '#FFF', borderRadius: '2px' }} />
            </div>
          </button>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0F172A' }}>{unitName}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isTrialExpired ? '#94A3B8' : (status === 'idle' ? '#10B981' : '#EF4444') }} />
              <span style={{ fontSize: '11px', color: isTrialExpired ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                {isTrialExpired ? 'Campainha OFF' : (status === 'idle' ? 'Disponível' : 'Em Chamada')}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {installPrompt && (
            <button onClick={async () => { installPrompt.prompt(); const r = await installPrompt.userChoice; if (r.outcome === 'accepted') setInstallPrompt(null); }}
              style={{ background: '#F1F5F9', color: '#1E293B', border: 'none', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Instalar
            </button>
          )}
        </div>
      </div>

      {audioError && <div style={{ margin: '12px 24px 0', background: '#EF4444', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={16} />Toque na tela para ativar o som!</div>}



      {/* ── HOME TAB ── */}
      {tab === 'home' && (
        <>
          {/* IDLE */}
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 32px', gap: '20px', width: '100%' }}>

              {/* Banners de Assinatura Premium / Trial */}
              {isTrialExpired && (
                <div style={{ width: '100%', maxWidth: '380px', background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', border: '1px solid #FCA5A5', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.08)' }}>
                  {/* Badge OFF */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ background: '#EF4444', color: '#fff', fontWeight: 900, fontSize: '13px', letterSpacing: '2px', padding: '4px 16px', borderRadius: '100px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>⛔ CAMPAINHA OFF</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#EF4444', color: '#FFF', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}>
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#991B1B', margin: '0 0 4px' }}>Campainha Inativa!</h4>
                      <p style={{ fontSize: '12px', color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>
                        Seu período de teste grátis expirou em <strong>{formattedExpiryDate}</strong>. Ative o plano anual para continuar recebendo chamadas.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 15px rgba(239, 68, 68, 0.25)', transition: 'all 0.2s' }}
                  >
                    🔔 Renovar Agora — R$ {planPrice.replace('.', ',')}/ano
                  </button>
                </div>
              )}

              {isTrialExpiringSoon && (
                <div style={{ width: '100%', maxWidth: '380px', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FCD34D', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.08)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#F59E0B', color: '#FFF', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)' }}>
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#92400E', margin: '0 0 4px' }}>Renovação Pendente</h4>
                      <p style={{ fontSize: '12px', color: '#B45309', margin: 0, lineHeight: 1.4 }}>
                        Falta{daysRemaining !== 1 ? 'm' : ''} apenas <strong>{daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}</strong> de testes grátis (expira em {formattedExpiryDate}). Assine o plano anual premium.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleUpgrade}
                    disabled={upgradeLoading}
                    style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 15px rgba(245, 158, 11, 0.2)', transition: 'all 0.2s' }}
                  >
                    {upgradeLoading ? 'Gerando Pagamento...' : `Garantir Acesso Premium — R$ ${planPrice.replace('.', ',')}/ano`}
                  </button>
                </div>
              )}

              {trialEndsDate && !isTrialExpired && !isTrialExpiringSoon && (
                <div style={{ width: '100%', maxWidth: '380px', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1px solid #A7F3D0', borderRadius: '18px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.04)' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ background: '#10B981', color: '#FFF', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', margin: 0 }}>Plano Premium Ativo</h4>
                      <p style={{ fontSize: '11px', color: '#047857', margin: 0 }}>Válido até {formattedExpiryDate}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '100px' }}>ANUAL</span>
                </div>
              )}

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

                {/* Status de notificações push */}
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pushEnabled ? '#10B981' : '#94A3B8', background: pushEnabled ? 'rgba(16,185,129,0.08)' : 'rgba(148,163,184,0.1)', padding: '5px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>
                    {pushEnabled ? <BellRing size={12} /> : <BellOff size={12} />}
                    {pushEnabled ? 'Push Ativo' : 'Push Inativo'}
                  </div>
                  {pushEnabled ? (
                    <button
                      onClick={async () => {
                        setPushLoading(true);
                        try {
                          const token = localStorage.getItem('cd_token');
                          await fetch(`${API}/api/push/test`, { method: 'POST', headers: { 'Authorization': token } });
                        } catch {} finally { setPushLoading(false); }
                      }}
                      disabled={pushLoading}
                      style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(59,130,246,0.1)', border: 'none', color: '#3B82F6', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {pushLoading ? '...' : '🔔 Testar'}
                    </button>
                  ) : (
                    <button
                      onClick={enablePushNotifications}
                      disabled={pushLoading}
                      style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10B981', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {pushLoading ? '...' : '🔔 Ativar Notificações'}
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code de Campainha Digital */}
              {propertyId && (
                <div style={{ width: '100%', maxWidth: '380px', background: '#FFF', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', margin: 0 }}>SUA CAMPAINHA DIGITAL</p>
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Compartilhe com visitantes ou imprima para colar no portão!</span>
                  </div>
                  
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
                    <img 
                      src={`${API}/api/qrcode?text=${encodeURIComponent(`${window.location.origin + window.location.pathname}#/chamada/${propertyId}`)}`} 
                      alt="QR Code Campainha Digital" 
                      style={{ width: '180px', height: '180px', display: 'block', borderRadius: '12px' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <button 
                      onClick={() => {
                        const url = `${window.location.origin + window.location.pathname}#/chamada/${propertyId}`;
                        const shareText = `Toque a minha Campainha Digital online quando chegar:\n👉 ${url}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Minha Campainha Digital',
                            text: shareText,
                            url: url
                          }).catch(() => {});
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                        }
                      }}
                      style={{ flex: 1, padding: '12px', borderRadius: '14px', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                    >
                      <MessageCircle size={16} /> Compartilhar
                    </button>
                    <button 
                      onClick={() => {
                        const url = `${API}/api/qrcode?text=${encodeURIComponent(`${window.location.origin + window.location.pathname}#/chamada/${propertyId}`)}`;
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Campainha_Digital_${unitName}.png`;
                        a.click();
                      }}
                      style={{ padding: '12px 16px', borderRadius: '14px', background: '#F1F5F9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      title="Baixar QR Code"
                    >
                      <Download size={16} /> Baixar
                    </button>
                  </div>
                </div>
              )}

              {/* Código de Acesso */}
              <div style={{ width: '100%', maxWidth: '380px', background: '#FFF', borderRadius: '16px', padding: '16px 18px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', margin: '0 0 8px' }}>SEU CÓDIGO DE ACESSO</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#3B82F6', letterSpacing: '4px', fontFamily: 'monospace' }}>{accessCode || '...'}</span>
                  <button onClick={() => { const m = `Código de acesso Campainha Digital: ${accessCode}\nApp: ${window.location.origin + window.location.pathname}#/auth`; window.open(`https://wa.me/?text=${encodeURIComponent(m)}`,'_blank'); }}

                    style={{ padding: '8px 14px', borderRadius: '10px', background: '#25D366', border: 'none', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MessageCircle size={14}/> Compartilhar
                  </button>
                </div>
              </div>

              {/* Botões Rápidos e Dispositivos Sonoff */}
              {!isHouseResident && (
                <div style={{ width: '100%', maxWidth: '380px', background: '#FFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', margin: '0 0 12px' }}>⚡ DISPOSITIVOS & AÇÕES RÁPIDAS</p>
                  
                  {/* Sonoff gate release button */}
                  <button
                    onClick={openGateSonoff}
                    disabled={openGateLoading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFF',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                    }}
                  >
                    <KeyRound size={18} />
                    {openGateLoading ? 'Acionando...' : '🔓 ABRIR PORTÃO DE PEDESTRES'}
                  </button>

                  {/* Grid for alert dispatchers */}
                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>Notificar Portaria / Zelador na Grade Visual:</p>
                  
                  <input
                    type="text"
                    placeholder="Nome do Visitante / Entregador (Opcional)"
                    value={visitorOrPackageName}
                    onChange={e => setVisitorOrPackageName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      fontSize: '12px',
                      outline: 'none',
                      marginBottom: '8px',
                      background: '#F8FAFC'
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <button
                      onClick={() => dispatchAlert('release', '🔑 Solicitação de Liberação', 'Morador solicita liberação de visitante na portaria.')}
                      disabled={dispatchAlertLoading}
                      style={{
                        background: '#F0FDF4',
                        border: '1px solid #DCFCE7',
                        color: '#15803D',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>🔑</span>
                      <span>Liberação</span>
                    </button>
                    
                    <button
                      onClick={() => dispatchAlert('package', '📦 Retirar Encomenda', 'Morador avisa que irá retirar encomenda na portaria.')}
                      disabled={dispatchAlertLoading}
                      style={{
                        background: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        color: '#B45309',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>📦</span>
                      <span>Encomenda</span>
                    </button>
                  </div>

                  <button
                    onClick={() => dispatchAlert('alert', '⚠️ Pedido de Ajuda / Suporte', 'Morador solicita assistência urgente do zelador ou administração.')}
                    disabled={dispatchAlertLoading}
                    style={{
                      width: '100%',
                      background: '#FEF2F2',
                      border: '1px solid #FEE2E2',
                      color: '#991B1B',
                      padding: '10px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>⚠️</span>
                    <span>Solicitar Assistência / Suporte Urgente</span>
                  </button>

                  <button
                    onClick={() => dispatchAlert('alert', '📞 Chamada de Voz da Unidade', 'Morador está solicitando que a portaria interfone para ele.')}
                    disabled={dispatchAlertLoading}
                    style={{
                      width: '100%',
                      background: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      color: '#1D4ED8',
                      padding: '10px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '8px'
                    }}
                  >
                    <span>📞</span>
                    <span>Interfonar para Portaria</span>
                  </button>
                </div>
              )}

              {/* Caixa Postal (Fale com o Síndico) */}
              {!isHouseResident && (
                <>
                  <div style={{ width: '100%', maxWidth: '380px', background: '#FFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', margin: '0 0 12px' }}>📬 FALAR COM A ADMINISTRAÇÃO (CAIXA POSTAL)</p>
                    <form onSubmit={sendSupportMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Assunto (ex: Vazamento, Sugestão...)"
                        value={supportSubject}
                        onChange={e => setSupportSubject(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                      <textarea
                        placeholder="Descreva detalhadamente sua solicitação..."
                        value={supportBody}
                        onChange={e => setSupportBody(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          fontSize: '13px',
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={supportSending}
                        style={{
                          width: '100%',
                          background: 'var(--primary)',
                          color: '#000',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {supportSending ? 'Enviando...' : 'Enviar Mensagem ao Síndico'}
                      </button>
                    </form>
                  </div>

                  {/* Mensagens do condomínio - colapssável */}
                  <MessagesPanel messages={broadcastMessages} unreadCount={unreadCount} onClear={markMessagesRead}/>
                </>
              )}

            </div>
          )}

          {/* RINGING */}
          {status === 'ringing' && call && (
            <div style={{ padding: '16px 24px' }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#EF4444', fontWeight: 800, fontSize: '13px', letterSpacing: '1px' }}>CHAMADA RECEBIDA</span>
              </div>

              {/* Foto visitante */}
              <div style={{ borderRadius: '24px', overflow: 'hidden', background: '#000', aspectRatio: '4/3', position: 'relative', marginBottom: '24px', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                {call.photo ? <img src={call.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}><Bell size={48} color="#FFF" style={{ opacity: 0.2 }} /></div>}
                <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(15,23,42,0.8)', color: '#FFF', padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                  Visitante no local
                </div>
              </div>

              {/* Título e Status */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px' }}>{call.callerName === 'Visitante' ? 'Chamada do Portão' : call.callerName}</h3>
                <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Câmera e áudio capturados para sua segurança.</p>
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
                {!isHouseResident && (
                  <button onClick={authorizeEntry} style={{ flex: 1, padding: '14px', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid #10B981', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}>
                    <KeyRound size={18} /> Abrir
                  </button>
                )}
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

              {!isHouseResident && (
                <button onClick={handleOpenGate} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <KeyRound size={24} /> LIBERAR ENTRADA
                </button>
              )}
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
      
      {tab === 'intercom' && (
        <div style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Interfone Digital</h2>
          {propertyId && <IntercomPanel propertyId={propertyId} unitId={id} socketRef={socketRef} unitName={unitName}/>}
        </div>
      )}

      {tab === 'services' && (
        <div style={{ padding: '20px' }}>
          <ServicesPanel/>
        </div>
      )}

      {tab === 'visitor-codes' && (
        <div style={{ padding: '20px' }}>
          <VisitorCodesPanel unitId={id} propertyName={propertyName} />
        </div>
      )}

      {tab === 'history' && <HistoryPanel unitId={id} propertyId={localStorage.getItem('residentPropertyId')} />}
      {tab === 'residents' && (
        <div style={{ padding: '20px' }}>
          <ResidentsPanel unitId={savedUnitId || id} propertyId={propertyId} />
        </div>
      )}
      {tab === 'settings' && <SettingsPanel unitName={unitName} setUnitName={setUnitName} onSave={saveSettings} unitId={id} propertyId={localStorage.getItem('residentPropertyId')} />}

      <HamburgerMenu />
      <NavBar />
      
      {showPaymentModal && (
        <PaymentModal 
          userId={localStorage.getItem('cd_user_id')}
          userEmail={localStorage.getItem('cd_user_contact') || ''}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            // Recarrega para refletir o novo status ativo
            window.location.reload();
          }}
          onPaymentFailed={() => {
            // No dashboard, apenas fecha o modal — usuário vê o status OFF e pode tentar de novo
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
}
