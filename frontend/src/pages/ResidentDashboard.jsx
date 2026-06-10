import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Phone, MicOff, PhoneOff, Bell, ShieldCheck, EyeOff, Download, AlertCircle, Video, VideoOff, LogOut, History, Settings, Home, KeyRound, MessageCircle, Building2, Mail, ShoppingBag, BellOff, BellRing, Users, Camera, Moon, LockOpen, X, User } from 'lucide-react';
import { HistoryPanel, SettingsPanel, DEFAULT_CATEGORIES } from './ResidentPanels';
import Logo from '../components/Logo';
import MessagesPanel from '../components/resident/MessagesPanel';
import IntercomPanel from '../components/resident/IntercomPanel';
import ServicesPanel from '../components/resident/ServicesPanel';
import PaymentModal from '../components/PaymentModal';
import VisitorCodesPanel from '../components/resident/VisitorCodesPanel';
import ResidentsPanel from '../components/resident/ResidentsPanel';
import FamilyChat from '../components/resident/FamilyChat';
import { startDoorbell, stopDoorbell, warmUpAudio, isPending, tryResumePending } from '../hooks/useDoorbellAlert';
import html2canvas from 'html2canvas';
import PrintablePlate from '../components/PrintablePlate';

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



const DEFAULT_LAYOUT = {
  headerStyle: 'clean-white', // 'blue-gradient' | 'clean-white' | 'dark-slate'
  primaryColor: '#004ac6',
  buttonGradientStart: '#004ac6',
  buttonGradientEnd: '#1d4ed8',
  backgroundColor: '#f8f9ff',
  cardBgColor: '#ffffff',
  borderColor: '#E2E8F0',
  borderRadius: '16px', // '0px' | '8px' | '16px' | '24px'
  shadowStyle: 'soft', // 'none' | 'soft' | 'medium' | 'glow'
  mainButtonType: 'circular', // 'circular' | 'rectangular' | 'classic'
  quickAccessType: 'row', // 'row' | 'carousel' | 'hidden'
  qrCodeType: 'modal', // 'modal' | 'embedded'
  preAuthType: 'modal', // 'modal' | 'embedded'
  mailboxType: 'modal', // 'modal' | 'embedded'
  showUpdates: true,
  showSwitches: true
};

const resolveShadowStyle = (shadowStyle, primaryColor = '#004ac6') => {
  if (shadowStyle === 'none') return 'none';
  if (shadowStyle === 'medium') return '0 4px 12px rgba(15, 23, 42, 0.08)';
  if (shadowStyle === 'glow') {
    return `0 8px 24px -4px ${primaryColor}40, 0 4px 12px -2px ${primaryColor}20`;
  }
  return '0 1px 3px rgba(0,0,0,0.05)'; // soft default
};

export default function ResidentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const savedUnitId = localStorage.getItem('residentUnitId');
  const savedPropId = localStorage.getItem('residentPropertyId');
  const token = localStorage.getItem('cd_token');

  const [tab, setTab] = useState('home'); // home | history | messages
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false);
  const [tempQuietStart, setTempQuietStart] = useState('22:00');
  const [tempQuietEnd, setTempQuietEnd] = useState('07:00');
  const [messagesSubTab, setMessagesSubTab] = useState('board'); // 'board' | 'chat'
  const [rawVilaMessages, setRawVilaMessages] = useState([]);
  const [newReplyMsg, setNewReplyMsg] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const chatEndRef = useRef(null);
  const residentIsVila = localStorage.getItem('residentIsVila') === 'true';

  const [showMenu, setShowMenu] = useState(false);
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState('idle'); // idle|ringing|active|monitoring
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const [audioError, setAudioError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [unitName, setUnitName] = useState(() => localStorage.getItem('cd_unit_name') || 'Minha Casa');
  const [accessCode, setAccessCode] = useState('');
  const [visitorSocketId, setVisitorSocketId] = useState(null);
  const [isHouseResident, setIsHouseResident] = useState(() => localStorage.getItem('cd_is_house_resident') === 'true');
  const isDependent = localStorage.getItem('cd_is_dependent') === 'true';
  // Apenas quem logou por email pode gerenciar moradores e criar códigos de visitante
  // Usa useState para atualizar quando fetchUserProfile detectar o tipo (sessões antigas)
  const [isEmailResident, setIsEmailResident] = useState(
    () => localStorage.getItem('cd_login_type') === 'email'
  );
  const [downloadingPlate, setDownloadingPlate] = useState(false);
  const [showQuickMsgs, setShowQuickMsgs] = useState(false);
  const plateRef = useRef(null);
  const fileInputRef = useRef(null);
  const HOUSE_QUICK_MSGS = [
    { id: 'general', label: 'Geral', messages: ['Já estou indo', 'Já está Aberto', 'Pode entrar', 'Um momento, por favor', 'Não posso atender agora', 'Por favor, aguarde um minuto'] },
    { id: 'services', label: 'Serviços', messages: ['Pode entrar pra marcar a luz', 'Pode entrar para marcar a água', 'Entrada autorizada', 'Por favor, aguarde o morador', 'Serviço cancelado/reagendar'] },
    { id: 'delivery', label: 'Delivery', messages: ['Pode deixar no portão', 'Já estou descendo', 'Deixar na caixa de correio', 'Deixe com o vizinho, por favor', 'Por favor, jogue por cima do portão'] }
  ];
  const CONDO_QUICK_MSGS = [
    { id: 'general', label: 'Geral', messages: ['Já estou descendo', 'Um momento', 'Pode subir', 'Deixar na portaria', 'Não posso atender agora', 'Estou em reunião, favor aguardar'] },
    { id: 'services', label: 'Serviços', messages: ['Prestador autorizado', 'Aguarde na portaria', 'Pode subir para o apartamento', 'Aguardando liberação da administração', 'Serviço concluído'] },
    { id: 'delivery', label: 'Delivery', messages: ['Pode deixar com o porteiro', 'Deixar no Locker', 'Deixar na recepção', 'Já estou descendo para retirar', 'Por favor, suba para entregar'] }
  ];

  const quickMsgs = isHouseResident ? HOUSE_QUICK_MSGS : CONDO_QUICK_MSGS;
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
  const [userPhoto, setUserPhoto] = useState(() => localStorage.getItem('residentUserPhoto') || '');
  const [doorbellEnabled, setDoorbellEnabled] = useState(true);
  const [intercomEnabled, setIntercomEnabled] = useState(true);
  const [quietModeStart, setQuietModeStart] = useState('22:00');
  const [quietModeEnd, setQuietModeEnd] = useState('07:00');
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [visitorOrPackageName, setVisitorOrPackageName] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [planPrice, setPlanPrice] = useState('39.90');

  useEffect(() => {
    if (trialEndsAt) {
      const expiry = new Date(trialEndsAt);
      if (expiry < new Date()) {
        setShowPaymentModal(true);
      }
    }
  }, [trialEndsAt]);

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };


  // Novos estados para Caixa Postal de Moradores e Despacho de Alertas
  const [supportSubject, setSupportSubject] = useState('');
  const [supportBody, setSupportBody]       = useState('');
  const [supportSending, setSupportSending]   = useState(false);
  const [dispatchAlertLoading, setDispatchAlertLoading] = useState(false);
  const [openGateLoading, setOpenGateLoading] = useState(false);
  const [entryNotification, setEntryNotification] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showQrAccordion, setShowQrAccordion] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPreAuthModal, setShowPreAuthModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState(() => {
    const saved = localStorage.getItem('cd_resident_layout_style');
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
  });

  useEffect(() => {
    let timer = null;
    if (status === 'active') {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  const fmtDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Auto-close doorman release notification after 12 seconds
  useEffect(() => {
    if (entryNotification) {
      const timer = setTimeout(() => {
        setEntryNotification(null);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [entryNotification]);

  const audioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const doorbellStartedRef = useRef(false);
  const lastCallIdRef = useRef(null); // Dedup: evita processar o mesmo incoming_call duas vezes
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => console.warn('[Video] play failed:', e));
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.warn('[Audio] play failed:', e));
      }
    }
  }, [remoteStream, remoteVideoRef.current, remoteAudioRef.current]);

  // Redireciona Vila Admin imediatamente
  useEffect(() => {
    if (localStorage.getItem('cd_vila_property_id')) {
      navigate('/vila-admin', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (messagesSubTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawVilaMessages, messagesSubTab]);

  const triggerDoorbell = useCallback(() => {
    // Sempre reseta e reinicia — garante que cada nova chamada toca o som
    console.log('[Dashboard] Disparando campainha...');
    doorbellStartedRef.current = true;
    startDoorbell();
  }, []);

  const markVilaMessagesAsRead = useCallback(async () => {
    const currentPropId = propertyId || localStorage.getItem('residentPropertyId');
    const currentUnitId = savedUnitId || localStorage.getItem('residentUnitId');
    if (!currentPropId || !currentUnitId) return;
    try {
      await fetch(`${API}/api/vila/${currentPropId}/messages/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: currentUnitId, isFromAdmin: false })
      });
      setUnreadCount(0);
    } catch (e) {
      console.warn('[Read] Falha ao marcar mensagens como lidas:', e);
    }
  }, [propertyId, savedUnitId]);

  useEffect(() => {
    if (tab === 'messages') {
      markVilaMessagesAsRead();
    }
  }, [tab, messagesSubTab, markVilaMessagesAsRead]);

  const checkPushSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      
      const swUrl = import.meta.env.BASE_URL + 'sw.js';
      const reg = await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
      await navigator.serviceWorker.ready;
      
      // Força a atualização do Service Worker para carregar a versão mais recente
      try {
        await reg.update();
        console.log('[SW] Service Worker atualizado programaticamente.');
      } catch (e) {
        console.warn('[SW] Erro ao atualizar SW programaticamente:', e);
      }
      
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        setPushEnabled(true);
        // SEMPRE re-envia a subscription ao servidor para garantir sincronização
        // (o servidor pode ter perdido a subscription por restart, limpeza de DB, etc.)
        const token = localStorage.getItem('cd_token');
        if (token) {
          try {
            await fetch(`${API}/api/push/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': token },
              body: JSON.stringify(sub.toJSON())
            });
            console.log('[Push] Subscription re-sincronizada com o servidor');
          } catch (e) {
            console.warn('[Push] Falha ao re-sincronizar subscription:', e);
          }
        }
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

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.userAgent && navigator.userAgent.includes('Macintosh') && 'ontouchend' in document);
      const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

      if (isIOS && !isStandalone) {
        alert('No iOS (iPhone/iPad), as notificações push PWA REQUEREM que o aplicativo seja adicionado à Tela de Início:\n\n1. Toque no botão de Compartilhar (ícone de quadrado com seta para cima no Safari).\n2. Selecione "Adicionar à Tela de Início".\n3. Abra o aplicativo por essa nova tela e ative as notificações por lá.');
        setPushLoading(false);
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

      // Garante a versão mais nova do Service Worker antes de subscrever
      try {
        await reg.update();
      } catch {}

      const vapidRes = await fetch(`${API}/api/push/vapid-public-key`);
      const { publicKey } = await vapidRes.json();

      const urlBase64ToUint8 = (base64) => {
        const pad = '='.repeat((4 - base64.length % 4) % 4);
        const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(b64);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
      };

      // Limpa qualquer assinatura anterior para evitar chaves VAPID incompatíveis
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        try {
          await sub.unsubscribe();
          console.log('[Push] Assinatura anterior removida com sucesso.');
        } catch (e) {
          console.warn('[Push] Erro ao desinscrever assinatura anterior:', e);
        }
      }

      // Cria uma assinatura limpa, nova e 100% alinhada com as chaves atuais do servidor
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8(publicKey)
      });

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
        if (data.layout_style) {
          setLayoutStyle(data.layout_style);
          localStorage.setItem('cd_resident_layout_style', JSON.stringify(data.layout_style));
        }
      } catch (err) {
        console.error('[ResidentDashboard] Erro ao buscar configuracoes:', err);
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
    if (savedCode) setAccessCode(savedCode);

    const s = io(API, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
    socketRef.current = s;
    
    // Registra o usuário em TODAS as salas possíveis para garantir que o evento chegue
    // O backend emite para user_${resident.id} (userId) — mas o URL tem unitId
    // Registramos nos 3 para redundância total
    const registerSocket = () => {
      const currentUserId = localStorage.getItem('cd_user_id');
      const currentUnitId = localStorage.getItem('residentUnitId') || savedUnitId || id;
      const currentToken  = localStorage.getItem('cd_token');

      const registered = new Set();

      const doRegister = (uid) => {
        if (uid && !registered.has(uid)) {
          registered.add(uid);
          console.log('[Socket] Registrando na sala:', uid);
          s.emit('register_user', { userId: uid });
        }
      };

      // 1. userId real do banco de dados (mais importante — é o que o backend usa)
      doRegister(currentUserId);
      // 2. token (que é igual ao userId no sistema atual)
      doRegister(currentToken);
      // 3. unitId (fallback — backend também emite para user_${unitId})
      doRegister(currentUnitId);
      // 4. id da URL (pode ser unitId ou userId dependendo da rota)
      doRegister(id);
    };
    
    // Registra no connect E já está conectado (socket.io conecta rapidamente)
    s.on('connect', () => {
      console.log('[Socket] Conectado — registrando salas...');
      registerSocket();
      
      const currentPropId = savedPropId || localStorage.getItem('residentPropertyId');
      if (currentPropId) {
        s.emit('join_room', { room: `vila_${currentPropId}` });
      }
    });
    // Se já está conectado no momento do mount, registra imediatamente
    if (s.connected) {
      registerSocket();
      const currentPropId = savedPropId || localStorage.getItem('residentPropertyId');
      if (currentPropId) {
        s.emit('join_room', { room: `vila_${currentPropId}` });
      }
    }

    // Fetch broadcast messages
    const fetchMessages = async () => {
      const currentPropId = savedPropId || localStorage.getItem('residentPropertyId');
      if (!currentPropId) return;
      try {
        const isVila = localStorage.getItem('residentIsVila') === 'true';
        const url = isVila
          ? `${API}/api/vila/${currentPropId}/messages?unitId=${savedUnitId || localStorage.getItem('residentUnitId') || ''}`
          : `${API}/api/properties/${currentPropId}/messages?unitId=${savedUnitId || localStorage.getItem('residentUnitId') || ''}&userId=${localStorage.getItem('cd_user_id') || ''}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isVila) {
            setRawVilaMessages(data);
            const formatted = data.map(m => ({
              id: m.id,
              title: m.unitId ? `✉️ Mensagem de ${m.senderName}` : `📢 Aviso de ${m.senderName}`,
              body: m.content,
              createdAt: m.createdAt,
              priority: m.unitId ? 'normal' : 'urgent'
            }));
            setBroadcastMessages([...formatted].reverse());
            // Para Vila, as mensagens não lidas são as vindas do admin com read = false
            const unread = data.filter(m => m.isFromAdmin && !m.read).length;
            setUnreadCount(unread);
          } else {
            setBroadcastMessages(data);
            const readIds = JSON.parse(localStorage.getItem('cd_read_msgs') || '[]');
            setUnreadCount(data.filter(m => !readIds.includes(m.id)).length);
          }
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
          if (data.isVilaAdmin) {
            localStorage.setItem('cd_vila_property_id', data.propertyId || '');
            localStorage.setItem('cd_vila_admin_name', data.name || '');
            navigate('/vila-admin', { replace: true });
            return;
          }
          if (data.clientCode) setAccessCode(data.clientCode);
          else if (data.plateCode) setAccessCode(data.plateCode);
          let uName = data.unitName || data.propertyName || data.name || '';
          if (!data.isHouseResident && data.unitName && data.name) {
            uName = `${data.unitName} / ${data.name}`;
          }
          if (uName) {
            setUnitName(uName);
            localStorage.setItem('cd_unit_name', uName);
          }
          if (data.trialEndsAt) setTrialEndsAt(data.trialEndsAt);
          if (data.propertyId) {
            setPropertyId(data.propertyId);
            localStorage.setItem('residentPropertyId', data.propertyId);
            if (s && s.connected) {
              s.emit('join_room', { room: `vila_${data.propertyId}` });
            }
          }
          if (data.propertyName) {
            setPropertyName(data.propertyName);
            localStorage.setItem('residentPropertyName', data.propertyName);
          }
          if (data.isVila !== undefined) {
            localStorage.setItem('residentIsVila', data.isVila ? 'true' : 'false');
          }
          if (data.isHouseResident !== undefined) {
            localStorage.setItem('cd_is_house_resident', data.isHouseResident ? 'true' : 'false');
            setIsHouseResident(data.isHouseResident);
          }
          if (data.units?.[0]?.id) {
            localStorage.setItem('residentUnitId', data.units[0].id);
            localStorage.setItem('residentUnitBlock', data.units[0].block || '');
          }
          if (data.photo !== undefined) {
            localStorage.setItem('residentUserPhoto', data.photo || '');
            setUserPhoto(data.photo || '');
          }
          if (data.doorbellEnabled !== undefined) setDoorbellEnabled(data.doorbellEnabled);
          if (data.intercomEnabled !== undefined) setIntercomEnabled(data.intercomEnabled);
          if (data.quietModeStart !== undefined) setQuietModeStart(data.quietModeStart || '22:00');
          if (data.quietModeEnd !== undefined) setQuietModeEnd(data.quietModeEnd || '07:00');
          fetchMessages();
          setUserContact(data.email || data.phone || data.clientCode || data.plateCode || '');

          // AUTO-DETECT para sessões existentes sem cd_login_type:
          // Se o perfil tem email, é um morador cadastrado por email (morador principal)
          // Se só tem clientCode/plateCode, é um morador cadastrado por código (dependente)
          if (!localStorage.getItem('cd_login_type')) {
            const detectedType = data.email ? 'email' : 'code';
            localStorage.setItem('cd_login_type', detectedType);
            setIsEmailResident(detectedType === 'email'); // Atualiza o estado e re-renderiza
          }
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
      // Se já estivermos em uma chamada ativa ou monitorando, ignora novas chamadas para evitar tocar o som
      if (statusRef.current === 'active' || statusRef.current === 'monitoring') {
        console.log('[Socket] Ignorando incoming_call pois já estamos em uma chamada ativa/monitoramento (status:', statusRef.current, ')');
        return;
      }

      // DEDUP: o backend emite para 2 salas (user_userId e user_unitId).
      // Se o socket está nas 2 salas, o evento chega 2x. Ignoramos duplicatas.
      if (data.callId && data.callId === lastCallIdRef.current) {
        console.log('[Socket] incoming_call duplicado ignorado (callId:', data.callId, ')');
        return;
      }
      lastCallIdRef.current = data.callId || null;
      console.log('[Socket] incoming_call recebido:', data.callerName, data.visitorSocketId);
      // Reseta o estado da campainha para garantir que toca sempre
      doorbellStartedRef.current = false;
      setCall(data);
      setStatus('ringing');
      setVisitorSocketId(data.visitorSocketId);
      setTab('home');
      setSentMsg('');
      // Som de campainha
      startDoorbell();
      doorbellStartedRef.current = true;
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const isDoorman = /portaria|porteiro|admin|administra/i.test(data.callerName || '');
          const localTitle = isDoorman ? '📞 PORTARIA INTERFONANDO!' : '🔔 CAMPAINHA!';
          const localBody = isDoorman ? 'A portaria está interfonando. Toque para atender.' : `${unitName} — alguém está na porta!`;
          new Notification(localTitle, { body: localBody, icon: '/logo.png' });
        } catch {}
      }
    });

    s.on('webrtc_offer', async ({ sender, offer }) => handleOffer(sender, offer));
    s.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
    
    // Listeners para o morador quando ele é o chamador (Interfone com Vizinho)
    s.on('call_answered', ({ residentSocketId }) => {
      console.log('[Intercom] Outbound call answered by:', residentSocketId);
      setVisitorSocketId(residentSocketId);
      setStatus('active');
    });

    s.on('webrtc_ready', async ({ residentSocketId }) => {
      console.log('[Intercom] Target is ready, starting WebRTC outbound...');
      await startOutboundWebRTC(residentSocketId);
    });

    s.on('webrtc_answer', async ({ answer }) => {
      console.log('[Intercom] WebRTC answer received from target');
      if (pcRef.current && pcRef.current.signalingState !== 'stable') {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error('[WebRTC] Erro ao aplicar remote description (answer):', e);
        }
      }
    });

    // BUG FIX: call_ended deve chamar stopRing() para resetar doorbellStartedRef
    // sem isso, a próxima chamada não toca som
    s.on('call_ended', () => {
      stopDoorbell();
      doorbellStartedRef.current = false;
      setStatus('idle');
      setCall(null);
      stopAll();
    });

    s.on('call_answered_elsewhere', ({ answeredBy }) => {
      console.log('[Socket] Chamada atendida em outro dispositivo/aba:', answeredBy);
      stopDoorbell();
      doorbellStartedRef.current = false;
      setStatus('idle');
      setCall(null);
      stopAll();
    });

    s.on('call_cancelled', () => {
      console.log('[Socket] Chamada cancelada pelo visitante/porteiro.');
      stopDoorbell();
      doorbellStartedRef.current = false;
      setStatus('idle');
      setCall(null);
      stopAll();
    });

    // Receber mensagens broadcast do condomínio
    s.on('broadcast_message', (msg) => {
      const currentUnitId = savedUnitId || localStorage.getItem('residentUnitId');
      const currentUserId = localStorage.getItem('cd_user_id');
      const currentUnitBlock = localStorage.getItem('residentUnitBlock') || '';

      if (msg.targetType && msg.targetType !== 'all') {
        let isTarget = false;
        if (msg.targetType === 'unit' && msg.targetValue === currentUnitId) {
          isTarget = true;
        } else if (msg.targetType === 'resident' && msg.targetValue === currentUserId) {
          isTarget = true;
        } else if (msg.targetType === 'block' && msg.targetValue && currentUnitBlock && 
                   msg.targetValue.trim().toLowerCase() === currentUnitBlock.trim().toLowerCase()) {
          isTarget = true;
        }
        if (!isTarget) return;
      }

      setBroadcastMessages(prev => [msg, ...prev]);
      setUnreadCount(prev => prev + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(`📢 ${msg.title}`, { body: msg.body, icon: '/logo.png' }); } catch {}
      }
    });

    // Receber mensagem da Vila (Vila Admin)
    s.on('vila_message', (msg) => {
      const currentUnitId = savedUnitId || localStorage.getItem('residentUnitId');
      // Ignora mensagens direcionadas a outras unidades (privacidade)
      if (msg.unitId && msg.unitId !== currentUnitId) {
        return;
      }

      setRawVilaMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const tempIndex = prev.findIndex(m => m.sending && m.content === msg.content && m.isFromAdmin === msg.isFromAdmin);
        if (tempIndex >= 0) {
          const updated = [...prev];
          updated[tempIndex] = msg;
          return updated;
        }
        return [...prev, msg];
      });
      const formattedMsg = {
        id: msg.id,
        title: msg.unitId ? `✉️ Mensagem de ${msg.senderName}` : `📢 Aviso de ${msg.senderName}`,
        body: msg.content,
        priority: msg.unitId ? 'normal' : 'urgent',
        createdAt: msg.createdAt
      };
      setBroadcastMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [formattedMsg, ...prev];
      });
      
      // Apenas incrementa não lidas e notifica se a mensagem vier do Admin
      if (msg.isFromAdmin) {
        setUnreadCount(prev => prev + 1);
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification(formattedMsg.title, { body: formattedMsg.body, icon: '/logo.png' }); } catch {}
        }
      }
    });

    s.on('vila_messages_read', ({ unitId, isFromAdmin }) => {
      const currentUnitId = savedUnitId || localStorage.getItem('residentUnitId');
      if (isFromAdmin && unitId === currentUnitId) {
        setRawVilaMessages(prev => prev.map(m => !m.isFromAdmin ? { ...m, read: true } : m));
      } else if (!isFromAdmin && (unitId === currentUnitId || !unitId)) {
        setUnreadCount(0);
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

    // Receber aviso de liberação em tempo real (visitante pré-autorizado validado)
    s.on('visitor_arrived', (data) => {
      console.log('[Socket] visitor_arrived recebido:', data);
      setEntryNotification({
        type: 'visitor',
        title: '🔑 Entrada Liberada (Código Validado)',
        message: `O porteiro validou o código e liberou a entrada de ${data.visitorName || 'visitante'}.`,
        timestamp: data.timestamp || new Date()
      });

      // Tocar som de notificação
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}

      // Se houver chamada em andamento (ou tocando), encerra ela
      stopRing();
      setStatus('idle');
      setCall(null);
      stopAll();
    });

    // Receber aviso de liberação manual pela portaria
    s.on('doorman_authorized_entry', (data) => {
      console.log('[Socket] doorman_authorized_entry recebido:', data);
      const isPackage = data.type === 'package';
      setEntryNotification({
        type: data.type || 'visitor',
        title: isPackage ? '📦 Encomenda / Entrega Liberada!' : '🔑 Entrada Liberada pela Portaria!',
        message: data.description || data.title || 'A portaria autorizou e liberou o acesso.',
        timestamp: data.timestamp || new Date()
      });

      // Tocar som de notificação
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}

      // Se houver chamada em andamento (ou tocando), encerra ela
      stopRing();
      setStatus('idle');
      setCall(null);
      stopAll();
    });


    const bip = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', bip);

    // Listener para mensagens do Service Worker (quando push chega com app em background)
    const handleSWMessage = (event) => {
      if (event.data?.type === 'INCOMING_CALL') {
        const payload = event.data.payload || {};
        let callIdVal = payload.callId;
        
        if (!callIdVal && payload.url) {
          try {
            const urlPart = payload.url.split('?')[1] || '';
            const urlParams = new URLSearchParams(urlPart);
            callIdVal = urlParams.get('callId');
          } catch {}
        }
        
        if (callIdVal && callIdVal === lastCallIdRef.current) {
          console.log('[SW Message] Chamada duplicada já processada pelo Socket, ignorando:', callIdVal);
          return;
        }
        
        if (statusRef.current !== 'idle') {
          console.log('[SW Message] Ignorando pois o status atual já é:', statusRef.current);
          return;
        }
        
        lastCallIdRef.current = callIdVal || null;
        console.log('[SW Message] Push recebido via Service Worker — ativando campainha:', callIdVal);
        let visitorSocketIdVal = payload.visitorSocketId;
        
        // Fallback: extrai visitorSocketId da URL do push
        if (!visitorSocketIdVal && payload.url) {
          try {
            const urlPart = payload.url.split('?')[1] || '';
            const urlParams = new URLSearchParams(urlPart);
            visitorSocketIdVal = urlParams.get('visitorSocketId');
          } catch (e) {
            console.warn('[SW Message] Erro ao extrair socket da URL:', e);
          }
        }
        
        // Reseta campainha e dispara (sem verificar status — o SW message é sempre uma nova chamada)
        doorbellStartedRef.current = false;
        startDoorbell();
        doorbellStartedRef.current = true;
        setStatus('ringing');
        setTab('home');
        
        // Sempre seta call — mesmo sem visitorSocketId, a UI de ringing deve aparecer
        setVisitorSocketId(visitorSocketIdVal || null);
        setCall({
          visitorSocketId: visitorSocketIdVal || null,
          callerName: payload.callerName || 'Visitante',
          photo: payload.photo || null,
          propertyId: payload.propertyId || null
        });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      s.disconnect();
      window.removeEventListener('beforeinstallprompt', bip);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      stopRing();
      stopAll();
    };
  }, [id]);

  // ─── iOS Audio Warm-up: Desbloqueia áudio no primeiro gesto do usuário ──────
  useEffect(() => {
    let warmedUp = false;
    const handleFirstInteraction = () => {
      if (!warmedUp) {
        warmedUp = true;
        warmUpAudio();
        console.log('[iOS] Áudio desbloqueado via interação global');
      }
      // Se há campainha pendente, toca agora
      if (isPending()) {
        tryResumePending();
      }
    };

    // Escuta qualquer toque/click no documento inteiro
    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('click', handleFirstInteraction, { passive: true });

    // Keep-alive: quando o app volta ao foreground, re-conecta socket e verifica pendências
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('[iOS] App voltou ao foreground');
        // Resume AudioContext se estava suspended
        warmUpAudio();
        // Se há campainha pendente, toca
        if (isPending()) {
          tryResumePending();
        }
        // Força reconexão do socket se desconectado
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // ─── Zoom and Gesture Prevention: Blocks pinch-to-zoom and double-tap zoom ───
  useEffect(() => {
    const handleTouchMove = (e) => {
      if (e.scale !== undefined && e.scale !== 1) {
        e.preventDefault();
      }
    };
    const handleGestureStart = (e) => {
      e.preventDefault();
    };
    const handleGestureChange = (e) => {
      e.preventDefault();
    };

    // Prevent double-tap zoom (except on input/textarea fields)
    let lastTouchEnd = 0;
    const handleTouchEnd = (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
          return;
        }
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });
    document.addEventListener('gesturechange', handleGestureChange, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureChange);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const checkActiveCallParam = async () => {
      const hashPart = window.location.hash;
      const queryPart = hashPart.includes('?') ? hashPart.split('?')[1] : '';
      const params = new URLSearchParams(queryPart);
      
      const tabParam = params.get('tab');
      if (tabParam) {
        setTab(tabParam);
      }

      const hasCallParam = params.get('call') === 'true';
      const paramVisitorSocket = params.get('visitorSocketId');
      const paramCallId = params.get('callId');
      const paramCallerName = params.get('callerName') || 'Visitante';
      const paramPropertyId = params.get('propertyId');

      if (hasCallParam && paramVisitorSocket) {
        if (paramCallId && paramCallId === lastCallIdRef.current) {
          console.log('[URL Param] Chamada duplicada já processada pelo Socket/SW, ignorando:', paramCallId);
          return;
        }
        if (status !== 'idle') {
          console.log('[URL Param] Ignorando carregamento de chamada pois status atual já é:', status);
          return;
        }
        
        lastCallIdRef.current = paramCallId || null;
        setVisitorSocketId(paramVisitorSocket);
        setStatus('ringing');
        setTab('home');
        setSentMsg('');
        
        // Define o estado de chamada de forma síncrona/instantânea com os dados do push
        setCall({
          visitorSocketId: paramVisitorSocket,
          callerName: paramCallerName,
          photo: null,
          propertyId: paramPropertyId
        });
        
        triggerDoorbell(); // Toca a campainha imediatamente ao carregar via push
        
        try {
          let res = await fetch(`${API}/api/visitors/${id}`);
          if (!res.ok) {
            res = await fetch(`${API}/api/visitors/by-user/${id}`);
          }
          if (res.ok) {
            const visitors = await res.json();
            if (visitors && visitors.length > 0) {
              const latest = visitors[0];
              // Atualiza com foto e informações adicionais em segundo plano
              setCall(prev => prev ? {
                ...prev,
                callerName: latest.callerName || prev.callerName,
                photo: latest.photo,
                timestamp: latest.timestamp,
                visitId: latest.id
              } : null);
            }
          }
        } catch (err) {
          console.warn('[URL Param] Erro ao buscar detalhes em background:', err);
        }
      }
    };

    checkActiveCallParam();
  }, [location, id]);

  const stopRing = () => { 
    stopDoorbell(); 
    doorbellStartedRef.current = false; 
    statusRef.current = 'idle';
    setAudioError(false); 
  };

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

  const startOutboundWebRTC = useCallback(async (targetSocketId) => {
    if (!localStreamRef.current) {
      console.warn('[WebRTC] Sem stream local para iniciar a conexão');
      return;
    }
    const iceConfig = await fetchIceConfig();
    console.log('[ICE] Caller using', iceConfig.iceServers.length, 'ICE servers');
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        console.log('[WebRTC] Outbound remote stream received:', event.streams[0].id);
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', {
          target: targetSocketId,
          candidate: event.candidate
        });
      }
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      socketRef.current.emit('webrtc_offer', {
        target: targetSocketId,
        offer: pc.localDescription
      });
    } catch (err) {
      console.error('[WebRTC] Erro ao criar offer para vizinho:', err);
    }
  }, []);

  const handleIntercomCall = async (neighbor) => {
    if (!socketRef.current || !propertyId) return;
    
    setStatus('calling');
    setCall({ callerName: neighbor.name || 'Vizinho', propertyId, unitId: neighbor.id });
    setVisitorSocketId(null);
    setTab('home');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
    } catch (e) {
      console.warn('[Intercom Media] Sem acesso ao microfone:', e.message);
    }

    socketRef.current.emit('initiate_call', {
      unitId: neighbor.id,
      propertyId: propertyId,
      callerName: unitName,
      photoBase64: null
    });
  };

  const handleCallDoorman = async () => {
    if (!socketRef.current || !propertyId) return;
    
    setStatus('calling');
    setCall({ callerName: 'Portaria', propertyId, _isDoorman: true });
    setVisitorSocketId(null);
    setTab('home');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
    } catch (e) {
      console.warn('[Intercom Media] Sem acesso ao microfone:', e.message);
    }

    socketRef.current.emit('resident_call_doorman', {
      propertyId: propertyId,
      unitId: id,
      callerName: unitName
    });
  };

  const markMessagesRead = () => {
    const ids = broadcastMessages.map(m => m.id);
    localStorage.setItem('cd_read_msgs', JSON.stringify(ids));
    setUnreadCount(0);
  };

  const handleOffer = useCallback(async (senderSocketId, offer) => {
    // Fecha qualquer PeerConnection anterior antes de criar um novo
    if (pcRef.current) {
      console.log('[WebRTC] Fechando PC anterior antes de criar novo');
      pcRef.current.close();
      pcRef.current = null;
    }
    const iceConfig = await fetchIceConfig();
    console.log('[ICE] Resident using', iceConfig.iceServers.length, 'ICE servers');
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    pc.ontrack = (e) => {
      if (e.streams[0]) {
        console.log('[WebRTC] Inbound remote stream received:', e.streams[0].id);
        setRemoteStream(e.streams[0]);
      }
    };
    pc.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit('webrtc_ice_candidate', { target: senderSocketId, candidate: e.candidate }); };
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit('webrtc_answer', { target: senderSocketId, answer: pc.localDescription });
  }, []);

  const handleMonitor = () => {
    stopRing();
    statusRef.current = 'monitoring';
    setStatus('monitoring'); localStreamRef.current = null;
    socketRef.current.emit('answer_call', { visitorSocketId: call.visitorSocketId, mode: 'monitor', unitId: id });
    // Sinaliza ao visitante que pode criar a offer WebRTC
    socketRef.current.emit('webrtc_ready', { target: call.visitorSocketId });
  };

  const handleAnswer = async (withCamera = false) => {
    stopRing();
    stopAll();
    
    // Se estiver no modo de monitoramento (oculto), fecha a conexão antiga para evitar conflito de hardware
    if (statusRef.current === 'monitoring') {
      console.log('[WebRTC] Transição de Monitor -> Falar: limpando conexão antiga');
      if (pcRef.current) {
        try { pcRef.current.close(); } catch {}
        pcRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
    
    statusRef.current = 'active';
    setStatus('active');
    setCamOn(withCamera);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withCamera });
      localStreamRef.current = stream;
      if (withCamera && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.warn('[Media] Falha ao capturar mídia local:', e);
    }

    const targetSocket = call?.visitorSocketId || visitorSocketId;
    if (socketRef.current && targetSocket) {
      console.log('[Socket] Enviando answer_call e webrtc_ready para:', targetSocket);
      // Primeiro notifica o visitante que a chamada foi atendida
      socketRef.current.emit('answer_call', { visitorSocketId: targetSocket, mode: 'active', unitId: id, visitId: call?.visitId });
      // Depois sinaliza que a mídia local está pronta e pode criar a offer
      socketRef.current.emit('webrtc_ready', { target: targetSocket });
    }
  };

  const handleEnd = () => {
    stopDoorbell();
    doorbellStartedRef.current = false;
    if (visitorSocketId) {
      socketRef.current?.emit('call_ended', { target: visitorSocketId, unitId: id, visitId: call?.visitId, duration: callDuration });
    } else if (statusRef.current === 'calling' && call && call._isDoorman) {
      socketRef.current?.emit('cancel_call', { propertyId: call.propertyId, visitId: call?.visitId });
    } else if (statusRef.current === 'calling' && call && call.unitId) {
      socketRef.current?.emit('cancel_call', { unitId: call.unitId, visitId: call?.visitId });
    }
    statusRef.current = 'idle';
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

  const toggleHomeSetting = async (field, value) => {
    let updatedDoorbell = doorbellEnabled;
    let updatedIntercom = intercomEnabled;
    let updatedQuietStart = quietModeStart;
    let updatedQuietEnd = quietModeEnd;
    let updatedPhoto = userPhoto;

    if (field === 'doorbellEnabled') {
      setDoorbellEnabled(value);
      updatedDoorbell = value;
    } else if (field === 'intercomEnabled') {
      setIntercomEnabled(value);
      updatedIntercom = value;
    } else if (field === 'quietModeStart') {
      setQuietModeStart(value);
      updatedQuietStart = value;
    } else if (field === 'quietModeEnd') {
      setQuietModeEnd(value);
      updatedQuietEnd = value;
    } else if (field === 'quietHours') {
      setQuietModeStart(value.start);
      setQuietModeEnd(value.end);
      updatedQuietStart = value.start;
      updatedQuietEnd = value.end;
    } else if (field === 'photo') {
      setUserPhoto(value);
      updatedPhoto = value;
    }

    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ 
          doorbellEnabled: updatedDoorbell, 
          intercomEnabled: updatedIntercom,
          quietModeStart: updatedQuietStart, 
          quietModeEnd: updatedQuietEnd,
          photo: updatedPhoto
        })
      });
      if (res.ok) {
        if (field === 'photo') {
          localStorage.setItem('residentUserPhoto', value);
        }
      } else {
        console.error('Erro ao salvar configuração rápida no servidor.');
      }
    } catch (err) {
      console.error('Erro de rede ao salvar configuração rápida.', err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        toggleHomeSetting('photo', compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPlate = async () => {
    if (!plateRef.current) return;
    setDownloadingPlate(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(plateRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });

      const propName = localStorage.getItem('residentPropertyName') || 'campainha';
      const fileName = `placa_${propName.replace(/\s+/g, '_')}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Erro ao gerar imagem.');
          return;
        }

        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Placa ${propName}`,
              text: `Placa da Campainha Digital para ${propName}`
            });
          } catch (shareErr) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
          }
        } else {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Erro ao fazer download da placa:', err);
      alert('Houve um erro ao gerar o arquivo de imagem.');
    } finally {
      setDownloadingPlate(false);
    }
  };

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
      
      const isVila = localStorage.getItem('residentIsVila') === 'true';
      if (isVila) {
        const currentUnitId = savedUnitId || localStorage.getItem('residentUnitId');
        const currentUserId = localStorage.getItem('cd_user_id');
        const contentText = `[CAIXA POSTAL] Assunto: ${supportSubject.trim()}\n\nMensagem: ${supportBody.trim()}`;

        const res = await fetch(`${API}/api/vila/${propId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderName: unitName || 'Morador',
            content: contentText,
            unitId: currentUnitId,
            isFromAdmin: false
          })
        });

        if (res.ok) {
          const msg = await res.json();
          setRawVilaMessages(prev => [...prev, msg]);
          alert('✅ Sua mensagem foi enviada com sucesso para o Administrador da Vila!');
          setSupportSubject('');
          setSupportBody('');
        } else {
          alert('Erro ao enviar mensagem.');
        }
      } else {
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
        alert('Notificação enviada com sucesso para a portaria!');
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
    <nav style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-subtle)', display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {[
        { key: 'home', icon: <Home size={22} />, label: 'Início' },
        ...((!isHouseResident || residentIsVila) ? [{ key: 'messages', icon: <Mail size={22} />, label: 'Avisos', badge: unreadCount }] : []),
        { key: 'family', icon: <MessageCircle size={22} />, label: 'Família' },
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
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, opacity: showMenu ? 1 : 0, visibility: showMenu ? 'visible' : 'hidden', transition: 'all 0.3s' }} 
      />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '280px', background: '#FFF', zIndex: 1001, transform: showMenu ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)', padding: '32px 24px', display: 'flex', flexDirection: 'column', boxShadow: '8px 0 32px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Logo size={32} />
          <button onClick={() => setShowMenu(false)} style={{ background: '#F1F5F9', border: 'none', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}><X size={20} color="#64748B" /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F1F5F9', marginBottom: '20px' }}>
          {userPhoto ? (
            <img src={userPhoto} alt="Perfil" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3B82F6', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', border: '1px solid #E2E8F0', flexShrink: 0 }}>
              <User size={24} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unitName}</span>
            <span style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userContact}</span>
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', marginBottom: '8px' }}>FUNCIONALIDADES</p>
          
          {(!isHouseResident || residentIsVila) && (
            <button onClick={() => { setTab('intercom'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'intercom' ? '#F0F9FF' : 'transparent', color: tab === 'intercom' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
              <Building2 size={20} color={tab === 'intercom' ? '#0369A1' : '#64748B'} /> Interfone Digital
            </button>
          )}

          <button onClick={() => { setTab('services'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'services' ? '#F0F9FF' : 'transparent', color: tab === 'services' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
            <ShoppingBag size={20} color={tab === 'services' ? '#0369A1' : '#64748B'} /> Parceiros da Região
          </button>

          {/* Códigos de Visitante: todos exceto dependentes e moradores de casas */}
          {!isDependent && !isHouseResident && (
            <button onClick={() => { setTab('visitor-codes'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'visitor-codes' ? '#F0F9FF' : 'transparent', color: tab === 'visitor-codes' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
              <KeyRound size={20} color={tab === 'visitor-codes' ? '#0369A1' : '#64748B'} /> Códigos de Visitante
            </button>
          )}

          {/* Moradores & Acessos: todos exceto dependentes */}
          {!isDependent && (
            <button onClick={() => { setTab('residents'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'residents' ? '#F0F9FF' : 'transparent', color: tab === 'residents' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
              <Users size={20} color={tab === 'residents' ? '#0369A1' : '#64748B'} /> Moradores & Acessos
            </button>
          )}

          <button onClick={() => { setTab('plate'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'plate' ? '#F0F9FF' : 'transparent', color: tab === 'plate' ? '#0369A1' : '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
            <Download size={20} color={tab === 'plate' ? '#0369A1' : '#64748B'} /> Baixar Placa Completa
          </button>

          <div style={{ height: '1px', background: '#F1F5F9', margin: '8px 0' }} />
          
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', marginBottom: '8px' }}>CONTA</p>
          
          <button onClick={() => { setTab('settings'); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: tab === 'settings' ? '#F8FAFC' : 'transparent', color: '#1E293B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}>
            <Settings size={20} color="#64748B" /> Configurações
          </button>


          <button onClick={() => { setShowPaymentModal(true); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', color: '#B45309', fontWeight: 700, fontSize: '15px', cursor: 'pointer', textAlign: 'left', border: '1px solid #FCD34D', marginTop: '8px' }}>
            <span>👑 Torne-se Pro</span>
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
              'residentIsVila', 'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
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

  // Condominium contract-based approach: subscription/trials dynamic check
  const trialEndsDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const isTrialExpired = trialEndsDate ? trialEndsDate < new Date() : false;
  const daysRemaining = trialEndsDate 
    ? Math.ceil((trialEndsDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;
  const isTrialExpiringSoon = trialEndsDate && daysRemaining >= 0 && daysRemaining <= 3 && !isTrialExpired;
  const formattedExpiryDate = trialEndsDate ? trialEndsDate.toLocaleDateString('pt-BR') : '';

  if (!savedUnitId && !token) {
    return null;
  }

  const handleUserInteraction = (e) => {
    // Evita reiniciar a campainha se o usuário clicou em botões de ação ou inputs
    if (e && e.target && (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select'))) {
      return;
    }
    // Desbloqueia áudio no iOS no primeiro toque do usuário
    warmUpAudio();
    // Se há campainha pendente (chegou antes da interação), toca agora
    if (isPending()) {
      tryResumePending();
    }
    // Se está tocando e o Web Audio falhou, re-tenta com interação
    // Usamos statusRef.current para evitar leitura stale durante o bubbling do clique em "Atender"
    if (statusRef.current === 'ringing') {
      triggerDoorbell();
    }
  };

  const currentPropId = propertyId || savedPropId || localStorage.getItem('residentPropertyId');
  const currentUnitId = savedUnitId || localStorage.getItem('residentUnitId');
  const isVilaUser = residentIsVila || localStorage.getItem('residentIsVila') === 'true';

  const qrCodeUrl = (isVilaUser && currentUnitId)
    ? `${window.location.origin + window.location.pathname}#/chamada/${currentPropId}?unitId=${currentUnitId}`
    : `${window.location.origin + window.location.pathname}#/chamada/${currentPropId}`;




  return (
    <div 
      className="app-shell"
      onClick={handleUserInteraction}
      onTouchStart={handleUserInteraction}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; vertical-align: middle; line-height: 1; }
        .active-ring { animation: ring 2s infinite; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ring {
            0% { box-shadow: 0 0 0 0 rgba(0, 74, 198, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(0, 74, 198, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 74, 198, 0); }
        }
        .glass { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.3); }
        .video-container { aspect-ratio: 16/10; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse-blue {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          100% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
        }
        @keyframes pulse-green {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          100% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #CBD5E1;
          transition: .3s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        input:checked + .slider {
          background-color: #3B82F6;
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
      `}</style>

      <div className="app-container">

        {/* OVERLAY DE BLOQUEIO POR EXPIRAÇÃO DO TRIAL */}
        {isTrialExpired && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(15,23,42,0.92)',
            backdropFilter: 'blur(12px)',
            zIndex: 9998,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{
              background: '#FFF', borderRadius: '24px', padding: '36px 32px',
              width: '100%', maxWidth: '400px', textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', flexDirection: 'column', gap: '24px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                  border: '2px solid #FCA5A5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.15)'
                }}>
                  <span style={{ fontSize: '28px' }}>⛔</span>
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Período de Testes Expirado</h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                  Sua campainha digital está inativa. O período de 15 dias grátis terminou em <strong>{formattedExpiryDate}</strong>.
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Plano Anual Premium</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>R$ {planPrice.replace('.', ',')}/ano</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                    color: '#fff', border: 'none', fontWeight: 800, fontSize: '15px',
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  💳 Ativar Assinatura Pro
                </button>

                <button
                  onClick={() => {
                    [
                      'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
                      'residentIsVila', 'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
                      'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
                      'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
                      'cd_admin_name', 'cd_admin_password', 'cd_property_type'
                    ].forEach(k => localStorage.removeItem(k));
                    navigate('/');
                  }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    background: '#F1F5F9', color: '#475569', border: 'none',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hamburger Menu Drawer */}
        <HamburgerMenu />

        {tab === 'home' ? (
          (() => {
            const hStyle = layoutStyle.headerStyle || 'clean-white';
            
            if (hStyle === 'blue-gradient') {
              return (
                <header style={{
                  background: `linear-gradient(135deg, ${layoutStyle.buttonGradientStart || '#004ac6'} 0%, ${layoutStyle.buttonGradientEnd || '#1d4ed8'} 100%)`,
                  color: '#ffffff',
                  padding: '32px 20px 24px',
                  borderRadius: '0 0 1.5rem 1.5rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 74, 198, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  zIndex: 90,
                  flexShrink: 0,
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {/* Title & Top Icons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Logo size={32} light={true} />
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {/* Indicador de Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isTrialExpired ? '#ba1a1a' : 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '99px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isTrialExpired ? '#ffffff' : (doorbellEnabled ? '#10B981' : '#F59E0B') }} />
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#ffffff' }}>
                          {isTrialExpired ? 'Inativa' : (doorbellEnabled ? 'Online' : 'Silenciada')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Info & Menu Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ 
                          position: 'relative', 
                          width: '56px', 
                          height: '56px', 
                          borderRadius: '50%', 
                          border: '2px solid rgba(255,255,255,0.5)', 
                          overflow: 'hidden', 
                          cursor: 'pointer',
                          flexShrink: 0 
                        }}
                      >
                        {userPhoto ? (
                          <img src={userPhoto} alt="User Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>
                            {unitName ? unitName.slice(0, 2).toUpperCase() : 'M'}
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0, 0, 0, 0.4)', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '8px' }}>photo_camera</span>
                        </div>
                      </div>
                      <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                          Olá, {localStorage.getItem('residentName') || 'Morador'}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#d3e4fe', margin: '2px 0 0', opacity: 0.9 }}>
                          {unitName} • {isHouseResident ? 'Residência' : 'Condomínio'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowMenu(true)} 
                      style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8, padding: '8px', display: 'flex', alignItems: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>more_vert</span>
                    </button>
                  </div>
                </header>
              );
            }

            if (hStyle === 'dark-slate') {
              return (
                <header style={{
                  background: '#0F172A',
                  color: '#ffffff',
                  padding: '24px 20px 16px',
                  borderBottom: '2px solid #D97706',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  zIndex: 90,
                  flexShrink: 0,
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {/* Title & Top Icons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Logo size={32} light={true} />
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {/* Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(217, 119, 6, 0.15)', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isTrialExpired ? '#EF4444' : (doorbellEnabled ? '#F59E0B' : '#64748B') }} />
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#F59E0B' }}>
                          {isTrialExpired ? 'Inativa' : (doorbellEnabled ? 'Online' : 'Silenciada')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Info & Menu Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ 
                          position: 'relative', 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%', 
                          border: '1px solid #334155', 
                          overflow: 'hidden', 
                          cursor: 'pointer',
                          flexShrink: 0 
                        }}
                      >
                        {userPhoto ? (
                          <img src={userPhoto} alt="User Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', fontWeight: 'bold', fontSize: '14px' }}>
                            {unitName ? unitName.slice(0, 2).toUpperCase() : 'M'}
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0, 0, 0, 0.6)', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '8px' }}>photo_camera</span>
                        </div>
                      </div>
                      <div>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                          Olá, {localStorage.getItem('residentName') || 'Morador'}
                        </h2>
                        <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                          {unitName} • {isHouseResident ? 'Residência' : 'Condomínio'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowMenu(true)} 
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>more_vert</span>
                    </button>
                  </div>
                </header>
              );
            }

            // Fallback default clean-white
            return (
              <header style={{
                background: '#ffffff',
                color: '#0F172A',
                padding: '24px 20px 16px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                zIndex: 90,
                flexShrink: 0,
                fontFamily: "'Inter', sans-serif"
              }}>
                {/* Title & Top Icons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Logo size={32} light={false} />
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isTrialExpired ? '#FEE2E2' : '#ECFDF5', padding: '4px 10px', borderRadius: '99px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isTrialExpired ? '#EF4444' : (doorbellEnabled ? '#10B981' : '#F59E0B') }} />
                      <span style={{ fontSize: '10px', fontWeight: 800, color: isTrialExpired ? '#B91C1C' : (doorbellEnabled ? '#047857' : '#B45309') }}>
                        {isTrialExpired ? 'Inativa' : (doorbellEnabled ? 'Online' : 'Silenciada')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Info & Menu Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ 
                        position: 'relative', 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        border: '1px solid #E2E8F0', 
                        overflow: 'hidden', 
                        cursor: 'pointer',
                        flexShrink: 0 
                      }}
                    >
                      {userPhoto ? (
                        <img src={userPhoto} alt="User Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'rgba(0, 74, 198, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: layoutStyle.primaryColor || '#004ac6', fontWeight: 'bold', fontSize: '14px' }}>
                          {unitName ? unitName.slice(0, 2).toUpperCase() : 'M'}
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0, 0, 0, 0.4)', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '8px' }}>photo_camera</span>
                      </div>
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                        Olá, {localStorage.getItem('residentName') || 'Morador'}
                      </h2>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                        {unitName} • {isHouseResident ? 'Residência' : 'Condomínio'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowMenu(true)} 
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>more_vert</span>
                  </button>
                </div>
              </header>
            );
          })()
        ) : (
          /* Compact Header for other tabs */
          <div style={{ 
            padding: '16px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            background: 'rgba(255, 255, 255, 0.85)', 
            backdropFilter: 'blur(16px)', 
            zIndex: 90,
            borderBottom: '1px solid #E2E8F0',
            flexShrink: 0,
            fontFamily: "'Inter', sans-serif"
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
                  style={{ background: '#F1F5F9', color: '#1E293B', border: 'none', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Instalar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Area (Scrollable internally) */}
        <div className="app-content-area">
          {audioError && (
            <div style={{ margin: '12px 20px 0', background: '#EF4444', color: '#fff', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff' }}>info</span> Toque na tela para ativar o som!
            </div>
          )}

          {/* ── HOME TAB ── */}
          {tab === 'home' && (
            <>
              {/* IDLE */}
              {status === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0 32px', gap: '24px', width: '100%', fontFamily: "'Inter', sans-serif" }}>

                  {/* File input invisível para foto de perfil */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />

                  {/* Banners de Assinatura Premium / Trial Compactos */}
                  {isTrialExpired && (
                    <div style={{ margin: '0 20px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: layoutStyle.borderRadius || '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#EF4444', fontSize: '18px' }}>error</span>
                        <span style={{ fontSize: '12px', color: '#991B1B', fontWeight: 600 }}>Campainha Inativa (Teste Expirou)</span>
                      </div>
                      <button 
                        onClick={() => setShowPaymentModal(true)}
                        style={{ background: '#EF4444', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Assinar
                      </button>
                    </div>
                  )}

                  {isTrialExpiringSoon && (
                    <div style={{ margin: '0 20px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: layoutStyle.borderRadius || '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#F59E0B', fontSize: '18px' }}>warning</span>
                        <span style={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>Faltam {daysRemaining} dias de teste</span>
                      </div>
                      <button 
                        onClick={handleUpgrade}
                        style={{ background: '#F59E0B', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Assinar
                      </button>
                    </div>
                  )}

                  {/* Banner de Push compactado */}
                  {!pushEnabled && (
                    <div style={{ margin: '0 20px', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: layoutStyle.borderRadius || '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <span className="material-symbols-outlined" style={{ color: '#3B82F6', fontSize: '18px' }}>notifications_off</span>
                        <span style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>Ative as notificações para receber chamadas</span>
                      </div>
                      <button
                        onClick={enablePushNotifications}
                        disabled={pushLoading}
                        style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                      >
                        {pushLoading ? '...' : 'Ativar'}
                      </button>
                    </div>
                  )}

                  {/* Ação Principal: Botão de Abertura do Portão */}
                  {(() => {
                    const btnType = layoutStyle.mainButtonType || 'circular';
                    
                    if (btnType === 'rectangular') {
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                          <button
                            onClick={openGateSonoff}
                            disabled={openGateLoading || isTrialExpired}
                            style={{
                              width: 'calc(100% - 40px)',
                              margin: '0 20px',
                              padding: '16px',
                              borderRadius: layoutStyle.borderRadius || '16px',
                              background: openGateLoading ? '#F8FAFC' : (isTrialExpired ? '#F1F5F9' : `linear-gradient(135deg, ${layoutStyle.buttonGradientStart || '#004ac6'} 0%, ${layoutStyle.buttonGradientEnd || '#1d4ed8'} 100%)`),
                              border: openGateLoading ? '2px solid #004ac6' : `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`,
                              color: openGateLoading ? '#004ac6' : (isTrialExpired ? '#94A3B8' : '#ffffff'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '12px',
                              cursor: (openGateLoading || isTrialExpired) ? 'default' : 'pointer',
                              boxShadow: (openGateLoading || isTrialExpired) ? 'none' : resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor),
                              fontWeight: 800,
                              fontSize: '15px',
                              transition: 'all 0.3s',
                              outline: 'none'
                            }}
                          >
                            {openGateLoading ? (
                              <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(0, 74, 198, 0.1)', borderTop: `2px solid ${layoutStyle.primaryColor || '#004ac6'}`, borderRadius: '50%' }} />
                            ) : (
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
                            )}
                            <span>{openGateLoading ? 'Abrindo Portão...' : 'Liberar Portão de Pedestres'}</span>
                          </button>
                        </div>
                      );
                    }

                    if (btnType === 'classic') {
                      return (
                        <div 
                          onClick={(!openGateLoading && !isTrialExpired) ? openGateSonoff : undefined}
                          style={{
                            margin: '0 20px',
                            background: layoutStyle.cardBgColor || '#ffffff',
                            border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`,
                            borderRadius: layoutStyle.borderRadius || '16px',
                            padding: '20px',
                            boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: (openGateLoading || isTrialExpired) ? 'default' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{
                            background: 'rgba(0, 74, 198, 0.08)',
                            color: layoutStyle.primaryColor || '#004ac6',
                            padding: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {openGateLoading ? (
                              <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(0, 74, 198, 0.1)', borderTop: `3px solid ${layoutStyle.primaryColor || '#004ac6'}`, borderRadius: '50%' }} />
                            ) : (
                              <span className="material-symbols-outlined" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>key</span>
                            )}
                          </div>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                              {openGateLoading ? 'Abrindo Portão...' : 'Liberar Portão'}
                            </h4>
                            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
                              Toque para abrir o portão de entrada
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Default: circular
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: '16px' }}>
                        <button
                          onClick={openGateSonoff}
                          disabled={openGateLoading || isTrialExpired}
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: openGateLoading ? '#F8FAFC' : (isTrialExpired ? '#F1F5F9' : `linear-gradient(135deg, ${layoutStyle.buttonGradientStart || '#004ac6'} 0%, ${layoutStyle.buttonGradientEnd || '#1d4ed8'} 100%)`),
                            border: openGateLoading ? '4px solid #004ac6' : '4px solid #E2E8F0',
                            color: openGateLoading ? '#004ac6' : (isTrialExpired ? '#94A3B8' : '#ffffff'),
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: (openGateLoading || isTrialExpired) ? 'default' : 'pointer',
                            boxShadow: (openGateLoading || isTrialExpired) ? 'none' : resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor),
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            outline: 'none'
                          }}
                        >
                          {openGateLoading ? (
                            <div className="spinner" style={{
                              width: '32px', height: '32px',
                              border: '3px solid rgba(0, 74, 198, 0.1)',
                              borderTop: `3px solid ${layoutStyle.primaryColor || '#004ac6'}`,
                              borderRadius: '50%'
                            }} />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '36px', fontVariationSettings: "'FILL' 1" }}>key</span>
                          )}
                        </button>
                        <div style={{ textAlign: 'center' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            {openGateLoading ? 'Abrindo...' : 'Liberar Portão'}
                          </h4>
                          <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0' }}>
                            Toque para abrir o portão de pedestres
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Linha de Ações Secundárias (Row vs Carousel vs Hidden) */}
                  {(() => {
                    const accessType = layoutStyle.quickAccessType || 'row';
                    if (accessType === 'hidden') return null;

                    const actions = [];
                    if (!isHouseResident) {
                      actions.push({
                        id: 'doorman',
                        label: 'Portaria',
                        icon: 'call',
                        onClick: handleCallDoorman
                      });
                      actions.push({
                        id: 'preauth',
                        label: 'Autorizar',
                        icon: 'person_add',
                        onClick: () => {
                          if (layoutStyle.preAuthType === 'embedded') {
                            // Focus on the input instead of opening modal
                            document.getElementById('cd-preauth-input')?.focus();
                          } else {
                            setShowPreAuthModal(true);
                          }
                        }
                      });
                    }
                    if (propertyId) {
                      actions.push({
                        id: 'qrcode',
                        label: 'QR Code/Senha',
                        icon: 'qr_code_2',
                        onClick: () => {
                          if (layoutStyle.qrCodeType === 'embedded') {
                            window.scrollTo({ top: document.getElementById('cd-qrcode-card')?.offsetTop - 80, behavior: 'smooth' });
                          } else {
                            setShowQrModal(true);
                          }
                        }
                      });
                    }
                    actions.push({
                      id: 'plate',
                      label: 'Baixar Placa',
                      icon: 'download',
                      onClick: () => setTab('plate')
                    });

                    if (!isHouseResident && !isDependent && layoutStyle.mailboxType === 'modal') {
                      actions.push({
                        id: 'support',
                        label: 'Suporte/Admin',
                        icon: 'mail',
                        onClick: () => setShowSupportModal(true)
                      });
                    }

                    if (accessType === 'carousel') {
                      return (
                        <div style={{ width: '100%', padding: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px 20px' }}>Acesso Rápido</h3>
                          <div className="hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 20px 8px', width: '100%' }}>
                            {actions.map(act => (
                              <div 
                                key={act.id}
                                onClick={act.onClick}
                                style={{
                                  flexShrink: 0,
                                  width: '240px',
                                  background: layoutStyle.cardBgColor || '#ffffff',
                                  padding: '16px',
                                  borderRadius: layoutStyle.borderRadius || '16px',
                                  border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`,
                                  boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor),
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '16px',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ background: 'rgba(0, 74, 198, 0.06)', color: layoutStyle.primaryColor || '#004ac6', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>{act.icon}</span>
                                </div>
                                <div>
                                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', margin: 0 }}>{act.label}</h4>
                                  <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>Acesso rápido inteligente</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Default: row of buttons
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%', padding: '0 20px', gap: '12px' }}>
                        {actions.map(act => (
                          <button
                            key={act.id}
                            onClick={act.onClick}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              background: layoutStyle.cardBgColor || '#ffffff',
                              border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`,
                              borderRadius: layoutStyle.borderRadius || '16px',
                              padding: '12px 6px',
                              cursor: 'pointer',
                              boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor),
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                          >
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 74, 198, 0.05)', color: layoutStyle.primaryColor || '#004ac6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>{act.icon}</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>{act.label}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* QR Code & Access Code (Embedded) */}
                  {layoutStyle.qrCodeType === 'embedded' && propertyId && (
                    <div id="cd-qrcode-card" style={{ margin: '0 20px', background: layoutStyle.cardBgColor || '#ffffff', border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`, borderRadius: layoutStyle.borderRadius || '16px', padding: '20px', boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor), display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0, width: '100%' }}>🔑 Código QR da Campainha</h4>
                      <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: layoutStyle.borderRadius || '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'center' }}>
                        <img src={`${API}/api/qrcode?text=${encodeURIComponent(qrCodeUrl)}`} alt="QR Code" style={{ width: '140px', height: '140px', borderRadius: '8px' }} />
                      </div>
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '10px 14px', borderRadius: layoutStyle.borderRadius || '12px', border: '1px solid #E2E8F0' }}>
                        <div>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Código de Acesso</span>
                          <h4 style={{ fontSize: '18px', fontWeight: 800, color: layoutStyle.primaryColor || '#004ac6', margin: '2px 0 0', fontFamily: 'monospace', letterSpacing: '1px' }}>{accessCode || '...'}</h4>
                        </div>
                        <button onClick={() => {
                          const m = `Código de acesso Campainha Digital: ${accessCode}\nApp: ${window.location.origin + window.location.pathname}#/auth`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(m)}`,'_blank');
                        }} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                          WhatsApp
                        </button>
                      </div>
                      {pushEnabled && (
                        <button
                          onClick={async () => {
                            setPushLoading(true);
                            try {
                              const token = localStorage.getItem('cd_token');
                              if (!token) return;
                              await fetch(`${API}/api/push/test`, { method: 'POST', headers: { 'Authorization': token } });
                              alert('Sinal enviado!');
                            } catch (e) {} finally { setPushLoading(false); }
                          }}
                          style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Testar Notificação Push
                        </button>
                      )}
                    </div>
                  )}

                  {/* Aviso Prévio Portaria (Embedded) */}
                  {layoutStyle.preAuthType === 'embedded' && !isHouseResident && (
                    <div style={{ margin: '0 20px', background: layoutStyle.cardBgColor || '#ffffff', border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`, borderRadius: layoutStyle.borderRadius || '16px', padding: '20px', boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor) }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>Aviso Prévio para Portaria</h4>
                      <input
                        id="cd-preauth-input"
                        type="text"
                        placeholder="Nome do Visitante / Entregador (Opcional)"
                        value={visitorOrPackageName}
                        onChange={e => setVisitorOrPackageName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #E2E8F0',
                          borderRadius: layoutStyle.borderRadius || '12px',
                          fontSize: '13px',
                          outline: 'none',
                          marginBottom: '12px',
                          background: '#F8FAFC',
                          fontFamily: 'inherit'
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
                            padding: '12px',
                            borderRadius: layoutStyle.borderRadius || '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#15803D' }}>key</span>
                          <span>Solicitar Liberação</span>
                        </button>
                        <button
                          onClick={() => dispatchAlert('package', '📦 Retirar Encomenda', 'Morador avisa que irá retirar encomenda na portaria.')}
                          disabled={dispatchAlertLoading}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #DBEAFE',
                            color: '#1D4ED8',
                            padding: '12px',
                            borderRadius: layoutStyle.borderRadius || '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1D4ED8' }}>local_shipping</span>
                          <span>Retirar Encomenda</span>
                        </button>
                      </div>
                      <button
                        onClick={() => dispatchAlert('alert', '⚠️ Pedido de Ajuda / Suporte', 'Morador solicita assistência urgente da portaria ou administração.')}
                        disabled={dispatchAlertLoading}
                        style={{
                          width: '100%',
                          background: '#FEF2F2',
                          border: '1px solid #FEE2E2',
                          color: '#991B1B',
                          padding: '12px',
                          borderRadius: layoutStyle.borderRadius || '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#991B1B' }}>warning</span>
                        <span>Solicitar Assistência Urgente</span>
                      </button>
                    </div>
                  )}

                  {/* Controle da Unidade (Switches) */}
                  {layoutStyle.showSwitches && (
                    <div style={{ margin: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 2px 4px' }}>Controles</h3>
                      <div style={{
                        background: layoutStyle.cardBgColor || '#ffffff',
                        border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`,
                        borderRadius: layoutStyle.borderRadius || '16px',
                        padding: '8px 16px',
                        boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor),
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {/* Item Campainha */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: doorbellEnabled ? '#10B981' : '#94A3B8' }}>
                              {doorbellEnabled ? 'notifications_active' : 'notifications_off'}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Campainha Ativa</span>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                {doorbellEnabled ? 'Receber chamadas de visitantes' : 'Chamadas silenciadas'}
                              </span>
                            </div>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={doorbellEnabled} 
                              onChange={(e) => toggleHomeSetting('doorbellEnabled', e.target.checked)} 
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>

                        {/* Item Interfone */}
                        {!isHouseResident && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: intercomEnabled ? '#3B82F6' : '#94A3B8' }}>phone_in_talk</span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Interfone Interno</span>
                                <span style={{ fontSize: '11px', color: '#64748B' }}>
                                  {intercomEnabled ? 'Receber chamadas de vizinhos' : 'Bloqueado'}
                                </span>
                              </div>
                            </div>
                            <label className="switch">
                              <input 
                                type="checkbox" 
                                checked={intercomEnabled} 
                                onChange={(e) => toggleHomeSetting('intercomEnabled', e.target.checked)} 
                              />
                              <span className="slider round"></span>
                            </label>
                          </div>
                        )}

                        {/* Item Modo Silencioso */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                          <div 
                            onClick={() => {
                              setTempQuietStart(quietModeStart || '22:00');
                              setTempQuietEnd(quietModeEnd || '07:00');
                              setShowQuietHoursModal(true);
                            }}
                            style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', flex: 1 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: (quietModeStart && quietModeEnd) ? '#F59E0B' : '#94A3B8' }}>dark_mode</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Modo Silencioso</span>
                              <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {(quietModeStart && quietModeEnd) 
                                  ? `Ativo das ${quietModeStart} às ${quietModeEnd} ✎` 
                                  : 'Desativado ✎'}
                              </span>
                            </div>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={!!(quietModeStart && quietModeEnd)} 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  toggleHomeSetting('quietHours', { start: '22:00', end: '07:00' });
                                } else {
                                  toggleHomeSetting('quietHours', { start: '', end: '' });
                                }
                              }} 
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Caixa Postal / Suporte (Embedded) */}
                  {layoutStyle.mailboxType === 'embedded' && !isHouseResident && !isDependent && (
                    <div style={{ margin: '0 20px', background: layoutStyle.cardBgColor || '#ffffff', border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`, borderRadius: layoutStyle.borderRadius || '16px', padding: '20px', boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor) }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>📬 Falar com a Administração</h4>
                      <form onSubmit={sendSupportMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                          type="text"
                          placeholder="Assunto (ex: Vazamento, Dúvida...)"
                          value={supportSubject}
                          onChange={e => setSupportSubject(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '1px solid #E2E8F0',
                            borderRadius: layoutStyle.borderRadius || '12px',
                            fontSize: '13px',
                            outline: 'none',
                            background: '#F8FAFC'
                          }}
                        />
                        <textarea
                          placeholder="Descreva detalhadamente sua solicitação..."
                          value={supportBody}
                          onChange={e => setSupportBody(e.target.value)}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '1px solid #E2E8F0',
                            borderRadius: layoutStyle.borderRadius || '12px',
                            fontSize: '13px',
                            outline: 'none',
                            background: '#F8FAFC',
                            fontFamily: 'inherit',
                            resize: 'none'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={supportSending}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: layoutStyle.borderRadius || '12px',
                            background: `linear-gradient(135deg, ${layoutStyle.buttonGradientStart || '#004ac6'} 0%, ${layoutStyle.buttonGradientEnd || '#1d4ed8'} 100%)`,
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: `0 4px 12px rgba(0, 74, 198, 0.2)`
                          }}
                        >
                          {supportSending ? 'Enviando...' : 'Enviar Mensagem'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Tira de Aviso / Última Atualização e Links Adicionais */}
                  <div style={{ margin: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    
                    {layoutStyle.showUpdates && (
                      broadcastMessages.filter(m => !JSON.parse(localStorage.getItem('cd_deleted_msgs') || '[]').includes(m.id)).length > 0 ? (
                        (() => {
                          const activeAnnouncements = broadcastMessages.filter(m => !JSON.parse(localStorage.getItem('cd_deleted_msgs') || '[]').includes(m.id));
                          const latestAnn = activeAnnouncements[0];
                          return (
                            <div 
                              onClick={() => {
                                setTab('messages');
                                setMessagesSubTab('board');
                              }}
                              style={{
                                background: layoutStyle.cardBgColor || '#ffffff',
                                borderRadius: layoutStyle.borderRadius || '12px',
                                padding: '12px 16px',
                                border: `1px solid ${layoutStyle.borderColor || '#E2E8F0'}`,
                                boxShadow: resolveShadowStyle(layoutStyle.shadowStyle, layoutStyle.primaryColor),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: layoutStyle.primaryColor || '#004ac6' }}>campaign</span>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{latestAnn.title || 'Aviso'}: </span>
                                  <span style={{ fontSize: '12px', color: '#64748B' }}>{latestAnn.body}</span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94A3B8', flexShrink: 0 }}>chevron_right</span>
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#94A3B8',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          Nenhum comunicado recente
                        </div>
                      )
                    )}
                  </div>

                </div>
              )}
            </>
          )}

          {tab === 'messages' && (
            residentIsVila ? (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Sub-tab Selector */}
                <div style={{ display: 'flex', background: '#E2E8F0', padding: '4px', borderRadius: '14px', marginBottom: '16px', flexShrink: 0 }}>
                  <button 
                    onClick={() => setMessagesSubTab('board')} 
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: messagesSubTab === 'board' ? '#FFF' : 'transparent', color: messagesSubTab === 'board' ? '#0F172A' : '#64748B', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    📢 Quadro de Avisos
                  </button>
                  <button 
                    onClick={() => setMessagesSubTab('chat')} 
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: messagesSubTab === 'chat' ? '#FFF' : 'transparent', color: messagesSubTab === 'chat' ? '#0F172A' : '#64748B', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    💬 Chat com o Admin
                  </button>
                </div>

                {messagesSubTab === 'board' ? (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Quadro de Avisos</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
                          {broadcastMessages.filter(m => !JSON.parse(localStorage.getItem('cd_deleted_msgs') || '[]').includes(m.id) && m.priority === 'urgent').length} aviso(s) ativo(s)
                        </p>
                      </div>
                      {broadcastMessages.some(m => !JSON.parse(localStorage.getItem('cd_read_msgs') || '[]').includes(m.id) && m.priority === 'urgent') && (
                        <button 
                          onClick={markMessagesRead} 
                          style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#1D4ED8', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Ler todos
                        </button>
                      )}
                    </div>

                    {broadcastMessages.filter(m => !JSON.parse(localStorage.getItem('cd_deleted_msgs') || '[]').includes(m.id) && m.priority === 'urgent').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                        <Mail size={40} style={{ opacity: 0.2, marginBottom: '12px' }}/>
                        <p style={{ fontWeight: 600 }}>Nenhum aviso recebido</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {broadcastMessages
                          .filter(m => !JSON.parse(localStorage.getItem('cd_deleted_msgs') || '[]').includes(m.id) && m.priority === 'urgent')
                          .map(m => {
                            const isRead = JSON.parse(localStorage.getItem('cd_read_msgs') || '[]').includes(m.id);
                            return (
                              <div key={m.id} style={{ background: '#FFF', border: `1px solid ${m.priority === 'urgent' ? 'rgba(239, 68, 68, 0.3)' : '#E2E8F0'}`, borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
                                {!isRead && (
                                  <div style={{ position: 'absolute', top: '22px', left: '8px', width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }} />
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', paddingLeft: isRead ? '0' : '8px' }}>
                                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                                    {m.title}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
                                    {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                
                                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.6, paddingLeft: isRead ? '0' : '8px' }}>{m.body}</p>
                                
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                                  {!isRead && (
                                    <button 
                                      onClick={() => {
                                        const readIds = JSON.parse(localStorage.getItem('cd_read_msgs') || '[]');
                                        localStorage.setItem('cd_read_msgs', JSON.stringify([...readIds, m.id]));
                                        setUnreadCount(prev => Math.max(0, prev - 1));
                                      }}
                                      style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      ✓ Lida
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => {
                                      const deletedIds = JSON.parse(localStorage.getItem('cd_deleted_msgs') || '[]');
                                      localStorage.setItem('cd_deleted_msgs', JSON.stringify([...deletedIds, m.id]));
                                      if (!isRead) {
                                        setUnreadCount(prev => Math.max(0, prev - 1));
                                      }
                                      setBroadcastMessages(prev => prev.filter(item => item.id !== m.id));
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FFF1F2', color: '#E11D48', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    🗑️ Apagar
                                  </button>
                                  {m.priority !== 'urgent' && (
                                    <button 
                                      onClick={() => setMessagesSubTab('chat')}
                                      style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      💬 Responder
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>Chat Direto com Admin da Vila</span>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {rawVilaMessages.filter(m => m.unitId !== null).length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', paddingTop: '40px' }}>
                          Nenhuma mensagem individual com o admin ainda.
                        </div>
                      ) : (
                        rawVilaMessages
                          .filter(m => m.unitId !== null)
                          .map(m => {
                            const isMine = !m.isFromAdmin;
                            return (
                              <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                  maxWidth: '75%',
                                  padding: '10px 14px',
                                  borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                  background: isMine ? 'linear-gradient(135deg,#3B82F6,#1D4ED8)' : '#F1F5F9',
                                  color: isMine ? '#FFF' : '#1E293B',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  boxShadow: isMine ? '0 4px 12px rgba(59,130,246,0.1)' : 'none',
                                  border: isMine ? 'none' : '1px solid #E2E8F0',
                                  opacity: m.sending ? 0.6 : 1
                                }}>
                                  <p style={{ margin: '0 0 4px 0', lineHeight: 1.4 }}>{m.content}</p>
                                  <span style={{ fontSize: '9px', opacity: 0.6, display: 'block', textAlign: 'right' }}>
                                    {m.sending ? 'Enviando...' : m.error ? '⚠️ Falha' : new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const textContent = newReplyMsg.trim();
                        if (!textContent) return;

                        const currentPropId = savedPropId || localStorage.getItem('residentPropertyId');
                        const currentUnitId = savedUnitId || localStorage.getItem('residentUnitId');
                        const currentUserId = localStorage.getItem('cd_user_id');

                        setNewReplyMsg('');

                        const tempId = 'temp-' + Date.now();
                        const optimisticMsg = {
                          id: tempId,
                          senderId: currentUserId,
                          senderName: unitName || 'Morador',
                          content: textContent,
                          unitId: currentUnitId,
                          isFromAdmin: false,
                          createdAt: new Date().toISOString(),
                          sending: true
                        };

                        setRawVilaMessages(prev => [...prev, optimisticMsg]);
                        
                        setTimeout(() => {
                          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }, 50);

                        try {
                          const res = await fetch(`${API}/api/vila/${currentPropId}/messages`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              senderId: currentUserId,
                              senderName: unitName || 'Morador',
                              content: textContent,
                              unitId: currentUnitId,
                              isFromAdmin: false
                            })
                          });
                          if (res.ok) {
                            const msg = await res.json();
                            setRawVilaMessages(prev => prev.map(m => m.id === tempId ? msg : m));
                          } else {
                            setRawVilaMessages(prev => prev.map(m => m.id === tempId ? { ...m, error: true, sending: false } : m));
                          }
                        } catch (err) {
                          console.error(err);
                          setRawVilaMessages(prev => prev.map(m => m.id === tempId ? { ...m, error: true, sending: false } : m));
                        }
                      }} 
                      style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: '#FFF', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}
                    >
                      <input
                        value={newReplyMsg}
                        onChange={e => setNewReplyMsg(e.target.value)}
                        placeholder="Escreva uma resposta..."
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', background: '#F8FAFC', fontFamily: 'inherit' }}
                      />
                      <button
                        type="submit"
                        disabled={!newReplyMsg.trim() || sendingReply}
                        style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: newReplyMsg.trim() ? '#3B82F6' : '#E2E8F0', color: newReplyMsg.trim() ? '#FFF' : '#94A3B8', cursor: newReplyMsg.trim() ? 'pointer' : 'default', fontWeight: 700, fontSize: '13px' }}
                      >
                        Enviar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '20px 24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>📢 Avisos do Condomínio</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>{broadcastMessages.length} mensagem(ns)</p>
                {broadcastMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    <Mail size={40} style={{ opacity: 0.2, marginBottom: '12px' }}/>
                    <p style={{ fontWeight: 600 }}>Nenhum aviso recebido</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {broadcastMessages.map(m => (
                      <div key={m.id} style={{ background: '#FFF', border: `1px solid ${m.priority === 'urgent' ? 'rgba(239,68,68,0.3)' : '#E2E8F0'}`, borderRadius: '16px', padding: '16px' }}>
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
            )
          )}
          
          {tab === 'intercom' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Interfone Digital</h2>
              {propertyId && <IntercomPanel propertyId={propertyId} unitId={id} socketRef={socketRef} unitName={unitName} onCall={handleIntercomCall}/>}
            </div>
          )}

          {tab === 'services' && (
            <div style={{ padding: '20px' }}>
              <ServicesPanel/>
            </div>
          )}

          {tab === 'visitor-codes' && isEmailResident && (
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
          
          {tab === 'family' && (
            <div style={{ padding: '20px' }}>
              <FamilyChat
                userId={localStorage.getItem('cd_user_id')}
                userName={localStorage.getItem('residentName') || 'Morador'}
                socket={socketRef?.current}
              />
            </div>
          )}

          {tab === 'settings' && <SettingsPanel unitName={unitName} setUnitName={setUnitName} onSave={saveSettings} unitId={id} propertyId={localStorage.getItem('residentPropertyId')} />}

          {tab === 'plate' && (
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Sua Placa da Campainha</h2>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0' }}>Salve e imprima a placa de identificação oficial da sua unidade.</p>
              </div>

              <div style={{ width: '100%', maxWidth: '320px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%' }}>
                  <PrintablePlate 
                    propertyId={propertyId || localStorage.getItem('residentPropertyId')} 
                    propertyName={localStorage.getItem('residentPropertyName') || 'Minha Casa'} 
                    unitName={unitName !== 'Principal' && unitName !== 'Minha Casa' ? unitName : ''}
                    animateLogo={false} 
                  />
                </div>
              </div>

              <button 
                onClick={handleDownloadPlate} 
                disabled={downloadingPlate}
                style={{ width: '100%', maxWidth: '320px', padding: '14px', borderRadius: '12px', border: 'none', background: '#10B981', color: '#FFF', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(16,185,129,0.2)', opacity: downloadingPlate ? 0.7 : 1 }}
              >
                <Download size={18} /> {downloadingPlate ? 'Gerando PNG...' : 'Baixar Imagem da Placa'}
              </button>
            </div>
          )}
        </div>

        {/* Fixed Navigation Bar at the bottom */}
        <NavBar />

        {/* FaceTime / WhatsApp Style Calling Overlays */}
        {status !== 'idle' && call && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 500,
            background: '#f8f9ff',
            color: '#0b1c30',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fade-in 0.3s ease-out',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden'
          }}>
            {/* TopAppBar */}
            <header style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '12px 20px',
              background: '#f8f9ff',
              zIndex: 40
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Logo size={32} light={false} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={() => setShowMenu(true)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span className="material-symbols-outlined" style={{ color: '#434655', fontSize: '28px' }}>settings</span>
                </button>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  border: '2px solid #2563eb' 
                }}>
                  {userPhoto ? (
                    <img src={userPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: '#eff4ff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#004ac6',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {unitName ? unitName.slice(0, 2).toUpperCase() : 'M'}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <div style={{ 
              flex: 1, 
              padding: '0 20px 24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px', 
              overflowY: 'auto',
              paddingBottom: '96px'
            }}>
              {/* Main Video Feed Section */}
              <section className="video-container" style={{
                position: 'relative',
                width: '100%',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                background: '#cbdbf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {status === 'ringing' && (
                  call.photo ? (
                    <img src={call.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#0b1c30', opacity: 0.5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'bounce 2s infinite', display: 'block', margin: '0 auto 12px' }}>doorbell</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Câmera sem imagem</span>
                    </div>
                  )
                )}

                {(status === 'active' || status === 'monitoring') && call.callerName !== 'Portaria' && (
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                )}

                {status === 'calling' && (
                  <div style={{ textAlign: 'center', color: '#0b1c30' }}>
                    <div className="active-ring" style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'rgba(0, 74, 198, 0.1)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      border: '2px solid rgba(0, 74, 198, 0.3)',
                      margin: '0 auto 16px'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#004ac6' }}>call</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.7 }}>Chamando...</span>
                  </div>
                )}

                {status === 'active' && call.callerName === 'Portaria' && (
                  <div style={{ textAlign: 'center', color: '#0b1c30' }}>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.1)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px',
                      border: '2px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#006242' }}>location_city</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.7 }}>Ligação Conectada</span>
                  </div>
                )}

                {status === 'active' && camOn && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      width: '70px',
                      aspectRatio: '3/4',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '2px solid #FFF',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 20
                    }}
                  />
                )}

                {/* Live Badge */}
                <div className="glass" style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  padding: '4px 12px',
                  borderRadius: '99px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ba1a1a',
                    animation: 'pulse 1s infinite'
                  }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0b1c30' }}>
                    {status === 'ringing' ? 'Chamada Recebida' : 
                     status === 'active' ? 'Ao Vivo: Portão Principal' : 
                     status === 'monitoring' ? 'Monitoramento Oculto' : 
                     'Conectando'}
                  </span>
                </div>

                {/* Clock / Timer Badge */}
                <div className="glass" style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  padding: '4px 12px',
                  borderRadius: '99px',
                  zIndex: 10
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#0b1c30' }}>
                    {status === 'active' ? fmtDuration(callDuration) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Interaction Hint (Fullscreen overlay icon) */}
                {(status === 'active' || status === 'monitoring') && call.callerName !== 'Portaria' && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 5
                  }}>
                    <div className="glass" style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.6
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#0b1c30' }}>fullscreen</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Visitor Profile Card */}
              <section style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #c3c6d7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      border: '2px solid #006242' 
                    }}>
                      {call.photo ? (
                        <img src={call.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', background: '#eff4ff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004ac6'
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>person</span>
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-4px', 
                      right: '-4px', 
                      background: '#006242', 
                      color: '#ffffff', 
                      borderRadius: '50%', 
                      padding: '2px', 
                      border: '2px solid #FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                  </div>
                  <div>
                    <p style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: '#434655', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      margin: '0 0 4px' 
                    }}>
                      Visitante Identificado
                    </p>
                    <h2 style={{ 
                      fontSize: '20px', 
                      fontWeight: 600, 
                      color: '#0b1c30', 
                      margin: 0 
                    }}>
                      {call.callerName === 'Visitante' ? 'Portão Principal' : call.callerName} <span style={{ color: '#434655', fontWeight: 'normal', fontSize: '14px' }}>
                        {call.callerName === 'Portaria' ? '(Segurança)' : '(Entregador)'}
                      </span>
                    </h2>
                  </div>
                </div>
                <button style={{ background: 'none', border: 'none', color: '#004ac6', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>info</span>
                </button>
              </section>

              {/* Actions Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                width: '100%',
                marginBottom: '10px'
              }}>
                {status === 'ringing' ? (
                  <>
                    {/* Atender com Vídeo */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
                      style={{
                        background: '#006242', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', border: 'none', minHeight: '120px', transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>video_call</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Com Vídeo</span>
                    </button>

                    {/* Atender Oculto */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMonitor(); }}
                      style={{
                        background: '#475569', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', border: 'none', minHeight: '120px', transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>visibility_off</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Atender Oculto</span>
                    </button>

                    {/* Atender Apenas Áudio */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
                      style={{
                        background: '#4F46E5', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', border: 'none', minHeight: '120px', transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>call</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Apenas Áudio</span>
                    </button>

                    {/* Recusar */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEnd(); }}
                      style={{
                        background: '#ba1a1a', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', border: 'none', minHeight: '120px', transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>call_end</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Recusar</span>
                    </button>

                    {/* Abrir Portão */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenGate(); }}
                      disabled={isHouseResident}
                      style={{
                        background: '#004ac6', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: isHouseResident ? 'not-allowed' : 'pointer', border: 'none', minHeight: '120px',
                        opacity: isHouseResident ? 0.5 : 1, transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(0.95)' }}
                      onMouseUp={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(1)' }}
                      onMouseLeave={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>key</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>
                        {openGateLoading ? 'Abrindo...' : 'Abrir Portão'}
                      </span>
                    </button>

                    {/* Mensagem Rápida */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQuickMsgs(!showQuickMsgs); }}
                      disabled={!visitorSocketId}
                      style={{
                        background: '#fea619', color: '#684000', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: !visitorSocketId ? 'not-allowed' : 'pointer', border: 'none', minHeight: '120px',
                        opacity: !visitorSocketId ? 0.5 : 1, transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(0.95)' }}
                      onMouseUp={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(1)' }}
                      onMouseLeave={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>
                        Msg Rápida
                      </span>
                    </button>
                  </>
                ) : status === 'monitoring' ? (
                  <>
                    {/* Ativar Vídeo */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
                      style={{
                        background: '#006242', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', border: 'none', minHeight: '120px', transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>videocam</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Ativar Vídeo</span>
                    </button>

                    {/* Ativar Áudio */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
                      style={{
                        background: '#4F46E5', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', border: 'none', minHeight: '120px', transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>mic</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Ativar Áudio</span>
                    </button>

                    {/* Desligar */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEnd(); }}
                      style={{
                        background: '#ba1a1a', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', border: 'none', minHeight: '120px', transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>call_end</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Desligar</span>
                    </button>

                    {/* Abrir Portão */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenGate(); }}
                      disabled={isHouseResident}
                      style={{
                        background: '#004ac6', color: '#ffffff', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: isHouseResident ? 'not-allowed' : 'pointer', border: 'none', minHeight: '120px',
                        opacity: isHouseResident ? 0.5 : 1, transition: 'all 0.1s', outline: 'none'
                      }}
                      onMouseDown={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(0.95)' }}
                      onMouseUp={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(1)' }}
                      onMouseLeave={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>key</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>
                        {openGateLoading ? 'Abrindo...' : 'Abrir Portão'}
                      </span>
                    </button>

                    {/* Mensagem Rápida */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQuickMsgs(!showQuickMsgs); }}
                      disabled={!visitorSocketId}
                      style={{
                        background: '#fea619', color: '#684000', borderRadius: '16px', padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: !visitorSocketId ? 'not-allowed' : 'pointer', border: 'none', minHeight: '120px',
                        opacity: !visitorSocketId ? 0.5 : 1, transition: 'all 0.1s', outline: 'none',
                        gridColumn: 'span 2'
                      }}
                      onMouseDown={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(0.95)' }}
                      onMouseUp={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(1)' }}
                      onMouseLeave={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>
                        Mensagem Rápida
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Button 1: Conversar / Mutar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (status === 'active') {
                          toggleMute();
                        }
                      }}
                      disabled={status === 'calling'}
                      className={(status === 'ringing') ? 'active-ring shadow-lg' : 'shadow-lg'}
                      style={{
                        background: status === 'active' && isMuted ? '#ba1a1a' : '#006242',
                        color: '#ffffff',
                        borderRadius: '16px',
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: status === 'calling' ? 'default' : 'pointer',
                        border: 'none',
                        minHeight: '120px',
                        transition: 'all 0.1s',
                        outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: (status === 'active' && isMuted) ? "'FILL' 0" : "'FILL' 1" }}>
                        {(status === 'active' && isMuted) ? 'mic_off' : 'call'}
                      </span>
                      <span style={{ fontSize: '20px', fontWeight: 600 }}>
                        {status === 'active' ? (isMuted ? 'Mutado' : 'Mutar') : 'Chamando'}
                      </span>
                    </button>

                    {/* Button 2: Recusar / Desligar */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEnd(); }}
                      className="shadow-lg"
                      style={{
                        background: '#ba1a1a',
                        color: '#ffffff',
                        borderRadius: '16px',
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        border: 'none',
                        minHeight: '120px',
                        transition: 'all 0.1s',
                        outline: 'none'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>call_end</span>
                      <span style={{ fontSize: '20px', fontWeight: 600 }}>
                        Desligar
                      </span>
                    </button>

                    {/* Button 3: Abrir Portão */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenGate(); }}
                      disabled={isHouseResident}
                      className="shadow-lg"
                      style={{
                        background: '#004ac6',
                        color: '#ffffff',
                        borderRadius: '16px',
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: isHouseResident ? 'not-allowed' : 'pointer',
                        border: 'none',
                        minHeight: '120px',
                        opacity: isHouseResident ? 0.5 : 1,
                        transition: 'all 0.1s',
                        outline: 'none'
                      }}
                      onMouseDown={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(0.95)' }}
                      onMouseUp={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(1)' }}
                      onMouseLeave={(e) => { if(!isHouseResident) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>key</span>
                      <span style={{ fontSize: '20px', fontWeight: 600 }}>
                        {openGateLoading ? 'Abrindo...' : 'Abrir Portão'}
                      </span>
                    </button>

                    {/* Button 4: Mensagem Rápida */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQuickMsgs(!showQuickMsgs); }}
                      disabled={!visitorSocketId}
                      className="shadow-lg"
                      style={{
                        background: '#fea619',
                        color: '#684000',
                        borderRadius: '16px',
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: !visitorSocketId ? 'not-allowed' : 'pointer',
                        border: 'none',
                        minHeight: '120px',
                        opacity: !visitorSocketId ? 0.5 : 1,
                        transition: 'all 0.1s',
                        outline: 'none'
                      }}
                      onMouseDown={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(0.95)' }}
                      onMouseUp={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(1)' }}
                      onMouseLeave={(e) => { if(visitorSocketId) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                      <span style={{ fontSize: '20px', fontWeight: 600, textAlign: 'center', lineHeight: 1.1 }}>
                        Mensagem Rápida
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Quick Messages Drawer */}
              {showQuickMsgs && visitorSocketId && (status === 'ringing' || status === 'active' || status === 'monitoring') && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #c3c6d7',
                  borderRadius: '20px',
                  padding: '16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                  width: '100%',
                  animation: 'fade-in 0.2s ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {/* Category Filter Chips */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {quickMsgs.map(cat => (
                      <button
                        key={cat.id}
                        onClick={(e) => { e.stopPropagation(); setActiveMsgCat(cat.id); }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '100px',
                          fontSize: '11px',
                          fontWeight: 800,
                          border: 'none',
                          background: activeMsgCat === cat.id ? (layoutStyle.primaryColor || '#004ac6') : '#eff4ff',
                          color: activeMsgCat === cat.id ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px' }}>Selecione uma resposta rápida:</p>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {quickMsgs.find(c => c.id === activeMsgCat)?.messages.map((msg, i) => (
                      <button
                        key={i}
                        onClick={() => sendQuickMsg(msg)}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '8px 14px',
                          borderRadius: '100px',
                          fontSize: '12px',
                          border: '1px solid #c3c6d7',
                          background: sentMsg === msg ? '#006242' : '#eff4ff',
                          color: sentMsg === msg ? '#FFF' : '#0b1c30',
                          cursor: 'pointer',
                          fontWeight: 700,
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                      >
                        {sentMsg === msg ? '✓ Enviado' : msg}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BottomNavBar */}
            <nav style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              zIndex: 50,
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              padding: '0 16px',
              height: '80px',
              background: '#e5eeff',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
              borderRadius: '16px 16px 0 0'
            }}>
              <button 
                onClick={() => { handleEnd(); setTab('home'); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tab === 'home' ? '#2563eb' : 'none',
                  color: tab === 'home' ? '#ffffff' : '#434655',
                  borderRadius: '12px',
                  padding: '6px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: tab === 'home' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>Início</span>
              </button>
              
              <button 
                onClick={() => { handleEnd(); setTab('history'); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tab === 'history' ? '#2563eb' : 'none',
                  color: tab === 'history' ? '#ffffff' : '#434655',
                  borderRadius: '12px',
                  padding: '6px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: tab === 'history' ? "'FILL' 1" : "'FILL' 0" }}>history</span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>Histórico</span>
              </button>

              <button 
                onClick={() => { handleEnd(); setTab('intercom'); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tab === 'intercom' ? '#2563eb' : 'none',
                  color: tab === 'intercom' ? '#ffffff' : '#434655',
                  borderRadius: '12px',
                  padding: '6px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: tab === 'intercom' ? "'FILL' 1" : "'FILL' 0" }}>doorbell</span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>Dispositivos</span>
              </button>

              <button 
                onClick={() => { handleEnd(); setTab('settings'); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tab === 'settings' ? '#2563eb' : 'none',
                  color: tab === 'settings' ? '#ffffff' : '#434655',
                  borderRadius: '12px',
                  padding: '6px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: tab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>Perfil</span>
              </button>
            </nav>
          </div>
        )}

        {/* Payment Modal & Entry Notifications */}
        {showPaymentModal && (
          <PaymentModal 
            userId={localStorage.getItem('cd_user_id')}
            userEmail={localStorage.getItem('cd_user_contact') || ''}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={() => {
              setShowPaymentModal(false);
              window.location.reload();
            }}
            onPaymentFailed={() => {
              setShowPaymentModal(false);
            }}
          />
        )}

        {/* QR Code & Access Code Modal */}
        {showQrModal && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fade-in 0.3s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative'
            }}>
              {/* Fechar Button */}
              <button 
                onClick={() => setShowQrModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px', right: '16px',
                  background: '#F1F5F9',
                  border: 'none',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Código QR & Acesso</h3>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0' }}>Compartilhe com visitantes autorizados</p>
              </div>

              {/* QR Code Image */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
                <img 
                  src={`${API}/api/qrcode?text=${encodeURIComponent(qrCodeUrl)}`} 
                  alt="QR Code" 
                  style={{ width: '160px', height: '160px', display: 'block', borderRadius: '12px' }} 
                />
              </div>

              {/* Access Code Display */}
              <div style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código da Unidade</span>
                  <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#004ac6', margin: '2px 0 0', fontFamily: 'monospace', letterSpacing: '2px' }}>{accessCode || '...'}</h4>
                </div>
                <button
                  onClick={() => {
                    const m = `Código de acesso Campainha Digital: ${accessCode}\nApp: ${window.location.origin + window.location.pathname}#/auth`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(m)}`,'_blank');
                  }}
                  style={{
                    background: '#25D366',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#ffffff',
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chat</span> WhatsApp
                </button>
              </div>

              {/* Sharing & Download Options */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button 
                  onClick={() => {
                    const shareText = `Para tocar a minha Campainha Digital online clique aqui:\n👉 ${qrCodeUrl}`;
                    if (navigator.share) {
                      navigator.share({
                        title: 'Minha Campainha Digital',
                        text: shareText,
                        url: qrCodeUrl
                      }).catch(() => {});
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                    }
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #004ac6 0%, #1d4ed8 100%)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>share</span> Link Direto
                </button>
                <button 
                  onClick={() => {
                    const url = `${API}/api/qrcode?text=${encodeURIComponent(qrCodeUrl)}`;
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Campainha_Digital_${unitName}.png`;
                    a.click();
                  }}
                  style={{ padding: '12px', borderRadius: '12px', background: '#F1F5F9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Download
                </button>
              </div>

              {/* Push Testing in QrModal */}
              {pushEnabled && (
                <div style={{ width: '100%', borderTop: '1px solid #F1F5F9', paddingTop: '16px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={async () => {
                      setPushLoading(true);
                      try {
                        const token = localStorage.getItem('cd_token');
                        if (!token) {
                          alert('Erro: Token não encontrado.');
                          return;
                        }
                        const res = await fetch(`${API}/api/push/test`, { method: 'POST', headers: { 'Authorization': token } });
                        if (res.ok) {
                          const resData = await res.json().catch(() => ({}));
                          if (resData.success === false) {
                            alert(`⚠️ Alerta: ${resData.message}`);
                          } else {
                            alert(`Sinal enviado com sucesso!\n\nSe a notificação não aparecer, certifique-se de que o PWA está instalado e você autorizou as notificações.`);
                          }
                        } else {
                          alert('Falha ao enviar sinal de teste.');
                        }
                      } catch (e) {
                        alert(`Erro: ${e.message}`);
                      } finally { setPushLoading(false); }
                    }}
                    disabled={pushLoading}
                    style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>notifications_active</span> Testar Notificação Push
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pre-Authorization Modal */}
        {showPreAuthModal && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fade-in 0.3s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative'
            }}>
              {/* Fechar Button */}
              <button 
                onClick={() => setShowPreAuthModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px', right: '16px',
                  background: '#F1F5F9',
                  border: 'none',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Autorizar Entrada</h3>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0' }}>Avise a portaria sobre visitas ou encomendas</p>
              </div>

              <input
                type="text"
                placeholder="Nome do Visitante / Entregador (Opcional)"
                value={visitorOrPackageName}
                onChange={e => setVisitorOrPackageName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC',
                  fontFamily: 'inherit'
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => {
                    dispatchAlert('release', '🔑 Solicitação de Liberação', 'Morador solicita liberação de visitante na portaria.');
                    setShowPreAuthModal(false);
                  }}
                  disabled={dispatchAlertLoading}
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #DCFCE7',
                    color: '#15803D',
                    padding: '14px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#15803D' }}>key</span>
                  <span>Liberar Visitante</span>
                </button>
                <button
                  onClick={() => {
                    dispatchAlert('package', '📦 Retirar Encomenda', 'Morador avisa que irá retirar encomenda na portaria.');
                    setShowPreAuthModal(false);
                  }}
                  disabled={dispatchAlertLoading}
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    color: '#1D4ED8',
                    padding: '14px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#1D4ED8' }}>local_shipping</span>
                  <span>Avisar Encomenda</span>
                </button>
              </div>

              <button
                onClick={() => {
                  dispatchAlert('alert', '⚠️ Pedido de Ajuda / Suporte', 'Morador solicita assistência urgente da portaria ou administração.');
                  setShowPreAuthModal(false);
                }}
                disabled={dispatchAlertLoading}
                style={{
                  width: '100%',
                  background: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  color: '#991B1B',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#991B1B' }}>warning</span>
                <span>Solicitar Assistência Urgente</span>
              </button>
            </div>
          </div>
        )}

        {/* Support Modal (📬 Falar com a Administração) */}
        {showSupportModal && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fade-in 0.3s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative'
            }}>
              {/* Fechar Button */}
              <button 
                onClick={() => setShowSupportModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px', right: '16px',
                  background: '#F1F5F9',
                  border: 'none',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Falar com a Administração</h3>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0' }}>Sua mensagem será enviada diretamente para a caixa postal</p>
              </div>

              <form 
                onSubmit={async (e) => {
                  await sendSupportMessage(e);
                  setShowSupportModal(false);
                }} 
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}
              >
                <input
                  type="text"
                  placeholder="Assunto (ex: Vazamento, Dúvida...)"
                  value={supportSubject}
                  onChange={e => setSupportSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8FAFC',
                    fontFamily: 'inherit'
                  }}
                />
                <textarea
                  placeholder="Descreva detalhadamente sua solicitação..."
                  value={supportBody}
                  onChange={e => setSupportBody(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8FAFC',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={supportSending}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #004ac6 0%, #1d4ed8 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                  }}
                >
                  {supportSending ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            </div>
          </div>
        )}

        {entryNotification && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fade-in 0.3s ease-out'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              backdropFilter: 'blur(16px)',
              transform: 'scale(1)',
              animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              color: '#1E293B'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: entryNotification.type === 'package' ? '#FEF3C7' : '#DCFCE7',
                color: entryNotification.type === 'package' ? '#D97706' : '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                animation: 'bounce 2s infinite'
              }}>
                {entryNotification.type === 'package' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                )}
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#0F172A',
                margin: '0 0 8px',
                letterSpacing: '-0.5px'
              }}>
                {entryNotification.title}
              </h3>

              <p style={{
                fontSize: '14px',
                color: '#475569',
                lineHeight: 1.6,
                margin: '0 0 24px',
                fontWeight: 500
              }}>
                {entryNotification.message}
              </p>

              <button
                onClick={() => setEntryNotification(null)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Quiet Hours Modal */}
        {showQuietHoursModal && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fade-in 0.3s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '340px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative'
            }}>
              {/* Fechar Button */}
              <button 
                onClick={() => setShowQuietHoursModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px', right: '16px',
                  background: '#F1F5F9',
                  border: 'none',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#F59E0B' }}>dark_mode</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Modo Silencioso</h3>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>Configure o horário de silêncio</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Horário de Início</label>
                  <input 
                    type="time" 
                    value={tempQuietStart}
                    onChange={(e) => setTempQuietStart(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#0F172A',
                      outline: 'none',
                      background: '#F8FAFC',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Horário de Término</label>
                  <input 
                    type="time" 
                    value={tempQuietEnd}
                    onChange={(e) => setTempQuietEnd(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#0F172A',
                      outline: 'none',
                      background: '#F8FAFC',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowQuietHoursModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    background: '#ffffff',
                    color: '#64748B',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    toggleHomeSetting('quietHours', { start: tempQuietStart, end: tempQuietEnd });
                    setShowQuietHoursModal(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: layoutStyle.primaryColor || '#004ac6',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Container invisivel para garantir download da placa completa em qualquer aba */}
        <div style={{ 
          position: 'absolute', 
          width: '0px', 
          height: '0px', 
          overflow: 'hidden', 
          opacity: 0,
          pointerEvents: 'none' 
        }}>
          <div ref={plateRef} style={{ width: '320px' }}>
            <PrintablePlate 
              propertyId={propertyId || localStorage.getItem('residentPropertyId')} 
              propertyName={localStorage.getItem('residentPropertyName') || 'Minha Casa'} 
              unitName={unitName !== 'Principal' && unitName !== 'Minha Casa' ? unitName : ''}
              animateLogo={false} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}
