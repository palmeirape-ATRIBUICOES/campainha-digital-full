import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Trash2, Home, Building2, TreePine, X, ShieldCheck, LogOut, ChevronRight, Settings, Camera, ScanLine, Clock, User, RefreshCw, Copy, Check, MessageCircle, CreditCard, Users, Send, Zap, Sun, Moon, Phone, PhoneCall, PhoneOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Logo from '../components/Logo';
import UnitManager from '../components/UnitManager';
import BroadcastPanel from '../components/BroadcastPanel';
import ResidentManager from '../components/ResidentManager';
import PlateProductionPanel from '../components/PlateProductionPanel';

import { API } from '../config';


function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function HoverHelp({ text, children, as: Component = 'span', style = {} }) {
  return (
    <Component className="tooltip-wrapper" style={style}>
      {children}
      <span className="tooltip-text">{text}</span>
    </Component>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    const fallbackCopy = (val) => {
      const textArea = document.createElement("textarea");
      textArea.value = val;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } 
      catch (err) { console.error('Fallback copy falhou', err); }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };
  return (
    <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: copied ? '#10B981' : 'var(--primary)', background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(0,229,255,0.1)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
      {copied ? <><Check size={12} /> COPIADO!</> : <><Copy size={12} /> COPIAR</>}
    </button>
  );
}

function WhatsAppButton({ code }) {
  const handleShare = () => {
    const msg = `Esse é o seu login de acesso à Campainha Digital! Só precisa baixar o app, entrar na aba Morador e colocar o seu código de acesso para poder atender aos visitantes.\n\n🔑 *Seu Código:* ${code}\n📱 *Link do App:* ${window.location.origin}/morador-login`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#fff', background: '#25D366', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
      <MessageCircle size={12} /> WHATSAPP
    </button>
  );
}

export default function AdminPanel() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState(() => {
    return localStorage.getItem('cd_admin_role') === 'doorman' ? 'control_panel' : 'properties';
  }); // 'properties' | 'history'
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [propertyType, setPropertyType]     = useState('');
  const [propertyName, setPropertyName]     = useState('');
  const [unitsList, setUnitsList]   = useState([{ name: '' }]);
  const [scanning, setScanning]     = useState(false);
  const [scannedId, setScannedId]   = useState('');
  const [visitors, setVisitors]     = useState([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Novos estados para Caixa Postal, Alertas de Portão e Grade Visual Interativa
  const [mailboxMessages, setMailboxMessages] = useState([]);
  const [loadingMailbox, setLoadingMailbox]   = useState(false);
  const [activeAlerts, setActiveAlerts]       = useState([]);
  const [onlineStatus, setOnlineStatus]       = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText]             = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [showPaywall, setShowPaywall] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [simulatedUnit, setSimulatedUnit] = useState(null);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [simSubject, setSimSubject] = useState('');
  const [simBody, setSimBody] = useState('');
  const [simVisitorName, setSimVisitorName] = useState('');
  const [simType, setSimType] = useState('release');
  const [simGeneratedCode, setSimGeneratedCode] = useState('');
  const [simCallState, setSimCallState] = useState('idle');
  const [simCallTarget, setSimCallTarget] = useState('portaria');
  const [simSelectedNeighbor, setSimSelectedNeighbor] = useState('');
  const [doormanCallState, setDoormanCallState] = useState('idle');
  const [iaDescription, setIaDescription] = useState('');
  const [iaMessage, setIaMessage] = useState('');
  const [activeControlBlock, setActiveControlBlock] = useState(null);
  const [lastBlockAlertCount, setLastBlockAlertCount] = useState(0);
  const [selectedUnitDetails, setSelectedUnitDetails] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer = null;
    if (activeCall && activeCall.status === 'talking') {
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
  }, [activeCall]);

  const fmtDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const socketRef = useRef(null);

  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const webrtcStartedRef = useRef(false);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callInitiatedRef = useRef(false);

  const DEFAULT_ICE_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    iceCandidatePoolSize: 10
  };

  const fetchIceConfig = async () => {
    try {
      const res = await fetch(`${API}/api/ice-servers`);
      if (res.ok) {
        const data = await res.json();
        return { iceServers: data.iceServers, iceCandidatePoolSize: 10 };
      }
    } catch (e) {
      console.warn('[ICE] Failed to fetch ICE config:', e);
    }
    return DEFAULT_ICE_CONFIG;
  };

  const stopAllCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    webrtcStartedRef.current = false;
    callInitiatedRef.current = false;
  };

  const startOutboundWebRTC = async (residentSocketId) => {
    try {
      stopAllCall();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const iceConfig = await fetchIceConfig();
      const pc = new RTCPeerConnection(iceConfig);
      pcRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (event.streams[0] && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(e => console.warn('[Audio] autoplay blocked:', e));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc_ice_candidate', {
            target: residentSocketId,
            candidate: event.candidate
          });
        }
      };

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      socketRef.current.emit('webrtc_offer', {
        target: residentSocketId,
        offer: pc.localDescription
      });
    } catch (err) {
      console.error('[WebRTC] Outbound connection failed:', err);
    }
  };

  const handleIncomingOffer = async (residentSocketId, offer) => {
    try {
      stopAllCall();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const iceConfig = await fetchIceConfig();
      const pc = new RTCPeerConnection(iceConfig);
      pcRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (event.streams[0] && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(e => console.warn('[Audio] autoplay blocked:', e));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc_ice_candidate', {
            target: residentSocketId,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('webrtc_answer', {
        target: residentSocketId,
        answer: pc.localDescription
      });
    } catch (err) {
      console.error('[WebRTC] Handle offer failed:', err);
    }
  };

  const handleHangup = () => {
    if (socketRef.current && (doormanCallState === 'calling' || doormanCallState === 'talking' || (activeCall && activeCall.status !== 'ended'))) {
      const targetSocket = socketRef.current.targetSocketId || (activeCall && activeCall.residentSocketId);
      if (targetSocket) {
        socketRef.current.emit('call_ended', { target: targetSocket, unitId: activeCall?.unitId, visitId: activeCall?.visitId, duration: callDuration });
      } else if (activeCall && activeCall.unitId) {
        socketRef.current.emit('cancel_call', { unitId: activeCall.unitId, visitId: activeCall?.visitId });
      }
    }
    stopAllCall();
    setDoormanCallState('idle');
    setActiveCall(null);
    setIncomingCall(null);
  };

  const handleCallUnit = (unit) => {
    if (isDemoMode) {
      setSimulatedUnit(unit);
      setSimCallTarget('resident');
      setSimCallState('ringing');
      alert(`[Interfone] Iniciando chamada de voz para o ${unit.name}...`);
      return;
    }
    if (!socketRef.current) {
      alert('Erro: Conexão em tempo real não estabelecida.');
      return;
    }
    stopAllCall();
    setActiveCall({
      residentSocketId: null,
      callerName: unit.name,
      unitId: unit.id,
      isIncoming: false,
      status: 'calling'
    });
    setDoormanCallState('calling');
    
    socketRef.current.emit('doorman_call', {
      unitId: unit.id,
      propertyId: unit.propertyId,
      callerName: 'Portaria'
    });
  };

  const handleAnswerResidentCall = async (incomingCallData) => {
    stopAllCall();
    const residentSocketId = incomingCallData.residentSocketId;
    setActiveCall({
      residentSocketId,
      callerName: incomingCallData.callerName || 'Morador',
      unitId: incomingCallData.unitId,
      isIncoming: true,
      status: 'talking'
    });
    setDoormanCallState('talking');
    setIncomingCall(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
    } catch (e) {
      console.warn('[Media] Falha ao capturar áudio local:', e);
    }

    if (socketRef.current && residentSocketId) {
      console.log('[Socket] Atendendo chamada de morador e enviando answer_call / webrtc_ready para:', residentSocketId);
      socketRef.current.targetSocketId = residentSocketId;
      socketRef.current.emit('answer_call', { visitorSocketId: residentSocketId, mode: 'audio', unitId: incomingCallData.unitId });
      socketRef.current.emit('webrtc_ready', { target: residentSocketId });
    }
  };

  useEffect(() => {
    let ringInterval = null;
    if (incomingCall) {
      const playRing = () => {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.8;
          audio.play().catch(() => {});
        } catch (e) {
          console.warn('[Audio] Failed to play ringtone:', e);
        }
      };
      playRing();
      ringInterval = setInterval(playRing, 2500);
    }
    return () => {
      if (ringInterval) {
        clearInterval(ringInterval);
      }
    };
  }, [incomingCall]);

  useEffect(() => {
    if (isDemoMode || !selectedProperty) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }
    
    const s = io(API, { transports: ['websocket', 'polling'], reconnection: true });
    socketRef.current = s;
    
    s.emit('register_doorman', { propertyId: selectedProperty });
    console.log('[AdminPanel] Socket conectado para propriedade:', selectedProperty);

    s.on('call_answered', ({ residentSocketId }) => {
      console.log('[AdminPanel WS] Call answered by resident:', residentSocketId);
      s.targetSocketId = residentSocketId;
      setDoormanCallState('talking');
      setActiveCall(prev => prev ? { ...prev, status: 'talking', residentSocketId } : null);
    });

    s.on('webrtc_ready', async ({ residentSocketId }) => {
      console.log('[AdminPanel WS] Resident ready for WebRTC:', residentSocketId);
      s.targetSocketId = residentSocketId;
      setDoormanCallState('talking');
      setActiveCall(prev => prev ? { ...prev, status: 'talking', residentSocketId } : null);
      if (webrtcStartedRef.current) return;
      webrtcStartedRef.current = true;
      await startOutboundWebRTC(residentSocketId);
    });

    s.on('incoming_resident_call', ({ callerName, unitId, residentSocketId }) => {
      console.log('[AdminPanel WS] Incoming call from resident:', residentSocketId);
      setIncomingCall({ callerName, unitId, residentSocketId });
      setTimeout(() => setIncomingCall(null), 30000);
    });

    s.on('call_cancelled', ({ callerSocketId }) => {
      console.log('[AdminPanel WS] Call cancelled by caller:', callerSocketId);
      setIncomingCall(prev => (prev && prev.residentSocketId === callerSocketId) ? null : prev);
    });

    s.on('webrtc_offer', async ({ sender, offer }) => {
      console.log('[AdminPanel WS] Received webrtc_offer from resident:', sender);
      s.targetSocketId = sender;
      setDoormanCallState('talking');
      setActiveCall(prev => prev ? { ...prev, status: 'talking', residentSocketId: sender } : {
        residentSocketId: sender,
        callerName: 'Morador',
        unitId: null,
        isIncoming: true,
        status: 'talking'
      });
      await handleIncomingOffer(sender, offer);
    });

    s.on('webrtc_answer', async ({ answer }) => {
      console.log('[AdminPanel WS] Received webrtc_answer');
      if (pcRef.current && pcRef.current.signalingState !== 'stable') {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error('[AdminPanel WebRTC] Error applying answer:', e);
        }
      }
    });

    s.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[AdminPanel WebRTC] Error adding ICE candidate:', e);
        }
      }
    });

    s.on('call_ended', () => {
      console.log('[AdminPanel WS] Call ended by resident');
      stopAllCall();
      setDoormanCallState('idle');
      setActiveCall(null);
      setIncomingCall(null);
    });
    
    return () => {
      s.disconnect();
      socketRef.current = null;
      stopAllCall();
    };
  }, [selectedProperty, isDemoMode]);

  useEffect(() => {
    if (!activeControlBlock || !selectedProperty) {
      if (lastBlockAlertCount !== 0) setLastBlockAlertCount(0);
      return;
    }

    const currentProperty = properties.find(p => p.id === selectedProperty);
    if (!currentProperty) return;

    const blockUnits = currentProperty.units.filter(u => {
      const blockKey = u.block ? `Bloco ${u.block}` : (u.street ? `Rua ${u.street}` : 'Geral');
      return blockKey === activeControlBlock;
    });

    const currentAlertCount = activeAlerts.filter(a => blockUnits.some(u => u.id === a.unitId)).length;

    if (currentAlertCount === 0 && lastBlockAlertCount > 0) {
      // Auto-return!
      setActiveControlBlock(null);
      setLastBlockAlertCount(0);
    } else if (currentAlertCount !== lastBlockAlertCount) {
      setLastBlockAlertCount(currentAlertCount);
    }
  }, [activeAlerts, activeControlBlock, selectedProperty, properties, lastBlockAlertCount]);

  const handleIAGenerate = () => {
    if (!iaDescription.trim()) {
      setIaMessage('⚠️ Por favor, digite uma descrição para a IA estruturar.');
      return;
    }

    const t = iaDescription.toLowerCase();
    
    // 1. Blocks & Floors & Apts
    const blockMatch = t.match(/(\d+)\s*bloco/);
    const floorMatch = t.match(/(\d+)\s*(andar|pavimento|piso)/);
    const aptMatch = t.match(/(\d+)\s*(apartamento|apto|unidade)/);

    if (blockMatch && floorMatch && aptMatch) {
      const blocksCount = parseInt(blockMatch[1], 10);
      const floorsCount = parseInt(floorMatch[1], 10);
      const aptsPerFloor = parseInt(aptMatch[1], 10);
      
      if (blocksCount > 0 && floorsCount > 0 && aptsPerFloor > 0) {
        const generated = [];
        for (let b = 1; b <= blocksCount; b++) {
          for (let f = 1; f <= floorsCount; f++) {
            for (let a = 1; a <= aptsPerFloor; a++) {
              const aptNum = `${f}${String(a).padStart(2, '0')}`;
              generated.push({ name: `B${b}-${aptNum}` });
            }
          }
        }
        setUnitsList(generated);
        setPropertyType('condo');
        setIaMessage(`✨ IA: Gerado com sucesso ${blocksCount} bloco(s) com ${floorsCount} andares e ${aptsPerFloor} apartamentos por andar (Total: ${generated.length} apartamentos).`);
        return;
      }
    }

    // 2. Just Floors & Apts
    if (floorMatch && aptMatch) {
      const floorsCount = parseInt(floorMatch[1], 10);
      const aptsPerFloor = parseInt(aptMatch[1], 10);
      if (floorsCount > 0 && aptsPerFloor > 0) {
        const generated = [];
        for (let f = 1; f <= floorsCount; f++) {
          for (let a = 1; a <= aptsPerFloor; a++) {
            const aptNum = `${f}${String(a).padStart(2, '0')}`;
            generated.push({ name: `Apto ${f}0${a}` });
          }
        }
        setUnitsList(generated);
        setPropertyType('condo');
        setIaMessage(`✨ IA: Gerado com sucesso ${floorsCount} andares e ${aptsPerFloor} apartamentos por andar (Total: ${generated.length} apartamentos).`);
        return;
      }
    }

    // 3. Houses count
    const houseMatch = t.match(/(\d+)\s*(casa|residencia|lote|unidade)/);
    if (houseMatch) {
      const count = parseInt(houseMatch[1], 10);
      if (count > 0) {
        const generated = [];
        for (let i = 1; i <= count; i++) {
          generated.push({ name: `Casa ${i}` });
        }
        setUnitsList(generated);
        setPropertyType('village');
        setIaMessage(`✨ IA: Gerado com sucesso ${count} casas estruturadas para o condomínio/vila.`);
        return;
      }
    }

    // 4. Generic number count (e.g. "120")
    const genericMatch = t.match(/(\d+)/);
    if (genericMatch) {
      const count = parseInt(genericMatch[1], 10);
      if (count > 0) {
        const generated = [];
        const label = propertyType === 'village' ? 'Casa' : 'Apto';
        for (let i = 1; i <= count; i++) {
          generated.push({ name: `${label} ${i}` });
        }
        setUnitsList(generated);
        setIaMessage(`✨ IA: Gerado com sucesso ${count} unidades.`);
        return;
      }
    }

    setIaMessage('⚠️ Não conseguimos entender o formato. Tente usar números claros, ex: "6 blocos, 10 andares, 12 apartamentos" ou "150 casas".');
  };

  const videoRef = useRef(null);
  const navigate = useNavigate();

  const startDemoMode = () => {
    setIsDemoMode(true);

    const demoUnits = [];
    // Gera 20 unidades por Bloco (Blocos 1 e 2)
    const floors = [1, 2, 3, 4];
    const aptos = [1, 2, 3, 4, 5];

    // Bloco 1
    floors.forEach(f => {
      aptos.forEach(a => {
        const aptoNumber = `${f}0${a}`;
        demoUnits.push({
          id: `demo-u-b1-${aptoNumber}`,
          name: `Apto ${aptoNumber}`,
          block: '1',
          number: aptoNumber,
          accessCode: `${aptoNumber}-101`,
          residents: [{ id: `demo-r-b1-${aptoNumber}`, name: `Morador ${aptoNumber}` }]
        });
      });
    });

    // Bloco 2
    floors.forEach(f => {
      aptos.forEach(a => {
        const aptoNumber = `${f}0${a}`;
        demoUnits.push({
          id: `demo-u-b2-${aptoNumber}`,
          name: `Apto ${aptoNumber}`,
          block: '2',
          number: aptoNumber,
          accessCode: `${aptoNumber}-202`,
          residents: [{ id: `demo-r-b2-${aptoNumber}`, name: `Morador ${aptoNumber}` }]
        });
      });
    });

    setProperties([
      {
        id: 'demo-vila-id',
        name: 'Condomínio Residencial das Palmeiras (Demonstração)',
        type: 'collective',
        subdomain: 'palmeiras-demo',
        clientAddress: 'Av. Principal, 500 - Bloco 1 e 2',
        plan: 'ANNUAL_PREMIUM',
        nextPaymentAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        units: demoUnits
      }
    ]);

    setSelectedProperty('demo-vila-id');

    // Mapeia TODOS como online
    const demoOnlineStatus = {};
    demoUnits.forEach(u => {
      u.residents.forEach(r => {
        demoOnlineStatus[r.id] = 'online';
      });
    });
    setOnlineStatus(demoOnlineStatus);

    // Mensagens de caixa postal de teste
    setMailboxMessages([
      {
        id: 'demo-msg1',
        senderName: 'Morador Apto 102 Bloco 1',
        subject: '📦 Aviso de Encomenda Pendente',
        body: 'Prezado síndico, solicito autorização para a entrada do pintor amanhã às 8h no Apto 102 Bloco 1.',
        createdAt: new Date(Date.now() - 3600000),
        status: 'pending',
        unit: { name: 'Apto 102 Bloco 1' }
      },
      {
        id: 'demo-msg2',
        senderName: 'Morador Apto 304 Bloco 2',
        subject: '🔧 Solicitação de Reparo na Garagem',
        body: 'Há um pequeno vazamento de água próximo à vaga 15 do Bloco 2. Favor verificar.',
        createdAt: new Date(Date.now() - 3600000 * 5),
        status: 'resolved',
        unit: { name: 'Apto 304 Bloco 2' }
      }
    ]);

    // Alertas ativos iniciais (Liberações Autorizadas verdes e entregadores laranja)
    setActiveAlerts([
      {
        id: 'demo-alert1',
        unitId: 'demo-u-b1-101',
        type: 'release',
        title: '🔑 Liberação de Visitante Autorizada',
        description: 'Morador liberou a entrada do visitante: Roberto de Souza (RG: 12.345.678-9).',
        timestamp: new Date()
      },
      {
        id: 'demo-alert2',
        unitId: 'demo-u-b2-302',
        type: 'release',
        title: '🔑 Liberação de Visitante Autorizada',
        description: 'Morador liberou a entrada da visitante: Ana Beatriz (CPF: 123.456.789-00).',
        timestamp: new Date()
      },
      {
        id: 'demo-alert3',
        unitId: 'demo-u-b1-204',
        type: 'package',
        title: '📦 Liberação de Entregador Autorizada',
        description: 'Morador autorizou a subida do entregador do Mercado Livre para entrega de pacote.',
        timestamp: new Date()
      },
      {
        id: 'demo-alert4',
        unitId: 'demo-u-b2-405',
        type: 'package',
        title: '📦 Liberação de Entregador Autorizada',
        description: 'Morador autorizou a subida do entregador do IFood para entrega direta na porta.',
        timestamp: new Date()
      }
    ]);

    setOnboardingStep(null);
    setActiveTab('control_panel');
  };

  // ─── Suporte a Modo Noturno (Dark Mode) ───
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('cd_dark_mode');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('cd_dark_mode', 'true');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('cd_dark_mode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    // Auth guard: redirect if not logged in
    const adminEmail = localStorage.getItem('cd_admin_email');
    if (!adminEmail) {
      navigate('/auth');
      return;
    }
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const adminEmail = localStorage.getItem('cd_admin_email');
      if (!adminEmail) return;
      
      const url = `${API}/api/properties?email=${encodeURIComponent(adminEmail)}`;
      const res  = await fetch(url);
      
      if (!res.ok) {
        console.error('Failed to fetch properties:', res.status);
        setProperties([]);
        startDemoMode(); // Fallback para demonstração automática em caso de erro ou sem rede
        return;
      }
      
      const data = await res.json();
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Invalid properties response:', data);
        setProperties([]);
        startDemoMode();
        return;
      }
      
      setProperties(data);

      // Auto-seleciona propriedade salva no login ou a primeira disponível
      const savedPropertyId = localStorage.getItem('cd_admin_propertyId');
      if (data.length === 0) {
        // Se a conta de admin não possui propriedades reais, pré-carrega automaticamente a Vila de Demonstração!
        startDemoMode();
      } else {
        const toSelect = savedPropertyId && data.find(p => p.id === savedPropertyId)
          ? savedPropertyId
          : data[0].id;
        setSelectedProperty(toSelect);
      }
    } catch (err) { console.error('Fetch properties error:', err); }
    finally { setLoading(false); }
  };

  const fetchVisitors = async (propertyId) => {
    if (isDemoMode) return;
    setLoadingVisitors(true);
    const adminEmail = localStorage.getItem('cd_admin_email');
    try {
      const url = adminEmail 
        ? `${API}/api/visitors/property/${propertyId}?adminEmail=${encodeURIComponent(adminEmail)}`
        : `${API}/api/visitors/property/${propertyId}`;
      const res  = await fetch(url);
      const data = await res.json();
      setVisitors(data);
    } catch { setVisitors([]); }
    finally { setLoadingVisitors(false); }
  };

  const fetchMailbox = async (propertyId) => {
    if (isDemoMode) return;
    setLoadingMailbox(true);
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/mailbox`);
      if (res.ok) {
        const data = await res.json();
        setMailboxMessages(data);
      }
    } catch (e) {
      console.error('Mailbox fetch failed:', e);
    } finally {
      setLoadingMailbox(false);
    }
  };

  const fetchAlerts = async (propertyId) => {
    if (isDemoMode) return;
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data);
      }
    } catch (e) {
      console.error('Alerts fetch failed:', e);
    }
  };

  const fetchOnlineStatus = async (propertyId) => {
    if (isDemoMode) return;
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/online-status`);
      if (res.ok) {
        const data = await res.json();
        setOnlineStatus(data);
      }
    } catch (e) {
      console.error('Online status fetch failed:', e);
    }
  };

  const resolveAlert = async (alertId) => {
    if (isDemoMode) {
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
      return;
    }
    if (!selectedProperty) return;
    try {
      const res = await fetch(`${API}/api/properties/${selectedProperty}/alerts/${alertId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAlerts(selectedProperty);
      }
    } catch (e) {
      console.error('Failed to resolve alert:', e);
    }
  };

  const resolveMailboxMessage = async (msgId, currentStatus) => {
    if (isDemoMode) {
      setMailboxMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: currentStatus === 'pending' ? 'resolved' : 'pending' } : m));
      return;
    }
    if (!selectedProperty) return;
    const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    try {
      const res = await fetch(`${API}/api/properties/${selectedProperty}/mailbox/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchMailbox(selectedProperty);
      }
    } catch (e) {
      console.error('Failed to resolve mailbox message:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && selectedProperty) fetchVisitors(selectedProperty);
    if (activeTab === 'mailbox' && selectedProperty) fetchMailbox(selectedProperty);
    if (activeTab === 'control_panel' && selectedProperty) {
      fetchAlerts(selectedProperty);
      fetchOnlineStatus(selectedProperty);
    }
  }, [activeTab, selectedProperty]);

  useEffect(() => {
    const handleDemoBroadcast = (e) => {
      setBroadcastCount(prev => prev + 1);
    };
    window.addEventListener('demo-broadcast-sent', handleDemoBroadcast);
    return () => window.removeEventListener('demo-broadcast-sent', handleDemoBroadcast);
  }, []);

  // Polling automático para alertas de segurança e solicitações de portão na Grade Visual
  useEffect(() => {
    if (!selectedProperty) return;
    
    // Roda a cada 4 segundos se a aba ativa for o painel de controle
    const interval = setInterval(() => {
      fetchAlerts(selectedProperty);
      fetchOnlineStatus(selectedProperty);
    }, 4000);

    // Roda uma vez imediatamente
    fetchAlerts(selectedProperty);
    fetchOnlineStatus(selectedProperty);

    return () => clearInterval(interval);
  }, [selectedProperty, activeTab]);

  const startScan = async () => {
    setScanning(true);
    // Simulating scanning a QR code from a plate
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      
      // Simulation: after 3 seconds, it "finds" a QR code
      setTimeout(() => {
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        setScanning(false);
        const mockScannedId = Math.random().toString(36).substring(2, 10).toUpperCase();
        setScannedId(mockScannedId);
        handleSubmit(mockScannedId);
      }, 3000);
    } catch { 
      setScanning(false); 
      alert('Câmera não disponível. Usando ID de teste para demonstração.');
      const mockScannedId = 'TEST-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setScannedId(mockScannedId);
      handleSubmit(mockScannedId);
    }
  };

  const selectType = (type) => {
    setPropertyType(type);
    setPropertyName(type === 'individual' ? 'Minha Casa' : '');
    setUnitsList([{ name: '' }]);
    setOnboardingStep(type === 'individual' ? 'scan' : 'config');
  };

  const handleUnitChange = (i, v) => { const u = [...unitsList]; u[i].name = v; setUnitsList(u); };
  const addUnit    = () => setUnitsList(prev => [...prev, { name: '' }]);
  const removeUnit = (i) => { if (unitsList.length > 1) setUnitsList(unitsList.filter((_, idx) => idx !== i)); };

  const handleSubmit = async (idFromScanner) => {
    const finalId = idFromScanner || scannedId;
    const units = propertyType !== 'individual' ? unitsList.filter(u => u.name.trim()) : [];
    const adminEmail = localStorage.getItem('cd_admin_email');
    const adminPassword = localStorage.getItem('cd_admin_password');
    
    try {
      const res = await fetch(`${API}/api/properties`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: finalId,
          type: propertyType === 'individual' ? 'individual' : 'collective', 
          name: propertyName, 
          clientName: localStorage.getItem('cd_admin_name') || '',
          units,
          adminEmail,
          adminPassword
        })
      });
      if (res.ok) { 
        // Clear password from local storage after using it
        localStorage.removeItem('cd_admin_password');
        
        setOnboardingStep(null);
        fetchProperties();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao ativar placa.');
        setOnboardingStep('scan');
      }
    } catch (err) { console.error(err); }
  };

  const deleteProperty = async (id) => {
    if (!window.confirm('Excluir esta placa?')) return;
    const adminEmail = localStorage.getItem('cd_admin_email');
    try { 
      const url = adminEmail 
        ? `${API}/api/properties/${id}?adminEmail=${encodeURIComponent(adminEmail)}`
        : `${API}/api/properties/${id}`;
      await fetch(url, { method: 'DELETE' }); 
      fetchProperties(); 
    } catch {}
  };

  const downloadQR = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = `QR_${name}.png`; a.click(); };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Carregando painel...</p>
    </div>
  );

  // ── Onboarding ─────────────────────────────────────────────────────────────
  if (onboardingStep === 'scan') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <div style={{ display: 'inline-flex', padding: '20px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '24px', border: '1px solid var(--border-subtle)', marginBottom: '32px' }}>
          <ScanLine size={56} color="#10B981" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Ativar Placa</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px' }}>
          Agora escaneie o <strong style={{ color: 'var(--text-main)' }}>QR Code da sua placa física</strong> para finalizar a ativação.
        </p>
        {scanning ? (
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '2px solid #10B981', marginBottom: '24px', position: 'relative' }}>
            <video ref={videoRef} style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }} playsInline muted />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translateX(-50%) translateY(-50%)', width: '200px', height: '200px', border: '2px solid #10B981', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
          </div>
        ) : (
          <button onClick={startScan} className="btn-primary" style={{ width: '100%', padding: '18px', fontSize: '18px', marginBottom: '16px', background: '#10B981' }}>
            <Camera size={24} /> Escanear Agora
          </button>
        )}
        <button onClick={() => setOnboardingStep(propertyType === 'individual' ? 'type' : 'config')} style={{ display: 'block', margin: '24px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
      </div>
    </div>
  );

  if (onboardingStep === 'type') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Qual seu tipo de imóvel?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Isso define como sua campainha será configurada.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { val: 'village',   icon: TreePine,   label: 'Vila de Casas',  desc: '1 placa, várias casas',       color: '#F59E0B' },
            { val: 'condo',     icon: Building2,  label: 'Condomínio',     desc: '1 placa, vários apartamentos', color: 'var(--primary)' }
          ].map(t => (
            <button key={t.val} onClick={() => selectType(t.val)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${t.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <t.icon size={26} color={t.color} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '16px', display: 'block' }}>{t.label}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t.desc}</span>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>
        <div style={{ margin: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>OU</div>

        <button onClick={startDemoMode} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px dashed var(--primary)', background: 'rgba(59,130,246,0.05)', color: 'var(--primary)', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'var(--transition-fast)' }}>
          <Zap size={18} /> 🏠 Explorar Vila de Demonstração (Guia)
        </button>

        <button onClick={() => setOnboardingStep('scan')} style={{ display: 'block', margin: '24px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
      </div>
    </div>
  );

  if (onboardingStep === 'config') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            {propertyType === 'individual' ? 'Confirme sua casa' : 'Configure as unidades'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {propertyType === 'individual' ? 'Dê um nome à sua propriedade.' : 'Adicione cada casa ou apartamento.'}
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              {propertyType === 'individual' ? 'Nome da sua casa' : 'Nome do condomínio / vila'}
            </label>
            <input type="text" className="input-glass" placeholder="Ex: Residencial Solar" value={propertyName} onChange={e => setPropertyName(e.target.value)} style={{ width: '100%' }} />
          </div>
          {propertyType !== 'individual' && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔮</span>
                <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>Gerador Inteligente por IA</strong>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
                Descreva sua vila ou condomínio (ex: <em>"são 6 blocos, cada bloco tem 10 andares, cada andar tem 12 apartamentos"</em> ou <em>"temos 150 casas"</em>).
              </p>
              <textarea
                placeholder="Ex: São 6 blocos, cada bloco tem 10 andares, cada andar tem 12 apartamentos..."
                value={iaDescription}
                onChange={e => setIaDescription(e.target.value)}
                style={{
                  width: '100%',
                  height: '75px',
                  borderRadius: '12px',
                  background: 'var(--bg-deep)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '12px',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: '10px',
                  fontFamily: 'inherit',
                  lineHeight: '1.4'
                }}
              />
              <button
                type="button"
                onClick={handleIAGenerate}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #10B981 100%)',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(59, 130, 246, 0.15)'
                }}
              >
                ✨ Gerar Estrutura Instantaneamente
              </button>
              {iaMessage && (
                <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '12px', color: '#10B981', fontWeight: 700 }}>
                  {iaMessage}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ou edite individualmente</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>

              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
                {propertyType === 'village' ? 'Casas da vila' : 'Apartamentos'} ({unitsList.length} gerado{unitsList.length !== 1 ? 's' : ''})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                {unitsList.map((u, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>{i + 1}</span>
                    <input type="text" className="input-glass" placeholder={propertyType === 'village' ? `Casa ${i + 1}` : `Apto ${i + 1}`} value={u.name} onChange={e => handleUnitChange(i, e.target.value)} style={{ flex: 1 }} />
                    <button onClick={() => removeUnit(i)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '10px', borderRadius: '8px', cursor: 'pointer', opacity: unitsList.length === 1 ? 0.3 : 1 }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button onClick={addUnit} style={{ width: '100%', background: 'transparent', border: '1px dashed var(--primary)', color: 'var(--primary)', padding: '12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Plus size={16} /> Adicionar {propertyType === 'village' ? 'Casa' : 'Apartamento'}
              </button>
            </div>
          )}
          <button
            onClick={() => {
              if (propertyType === 'individual') {
                setOnboardingStep('scan');
              } else {
                const generatedId = 'VILA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                handleSubmit(generatedId);
              }
            }}
            className="btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '16px', marginTop: '24px' }}
          >
            {propertyType === 'individual' ? 'Prosseguir para Ativação' : 'Confirmar e Ativar Vila'} <ChevronRight size={20} />
          </button>
        </div>
        <button onClick={() => setOnboardingStep('type')} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Voltar</button>
      </div>
    </div>
  );



  // ── Dashboard Principal ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', paddingBottom: '60px' }}>


      {/* Paywall removido - condomínios gerenciam unidades diretamente */}

      <header style={{ background: 'var(--bg-surface-elevated)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={32} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Botão de Modo Noturno */}
          <button onClick={() => setDarkMode(!darkMode)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '100px', transition: 'all 0.2s' }}>
            {darkMode ? <><Sun size={16} color="#F59E0B" /> Modo Claro</> : <><Moon size={16} color="#3B82F6" /> Modo Noturno</>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', borderRight: '1px solid var(--border-subtle)', paddingRight: '12px' }}>
            <span>👤 {localStorage.getItem('cd_admin_email') || localStorage.getItem('cd_admin_name') || 'Admin'}</span>
          </div>

          <button onClick={() => {
            [
              'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
              'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
              'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
              'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
              'cd_admin_name', 'cd_admin_password', 'cd_property_type'
            ].forEach(k => localStorage.removeItem(k));
            document.body.classList.remove('dark-theme');
            navigate('/');
          }} style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </header>

      {isDemoMode && (
        <div style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', color: '#FFF', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="#FFD700" style={{ animation: 'float 3s infinite' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              ✨ <strong>Modo de Demonstração Ativo!</strong> Explore as abas acima para aprender a gerenciar sua vila/condomínio. Veja as dicas marcadas com 💡.
            </div>
          </div>
          <button onClick={() => {
            setIsDemoMode(false);
            setProperties([]);
            setSelectedProperty(null);
            setMailboxMessages([]);
            setActiveAlerts([]);
            setOnboardingStep(null);
            fetchProperties();
          }} style={{ background: '#FFF', color: '#6D28D9', border: 'none', padding: '8px 16px', borderRadius: '100px', fontWeight: 750, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}>
            Sair da Demonstração
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 24px', gap: '0', overflowX: 'auto' }}>
        {[
          { key: 'properties', label: '🏠 Propriedades', desc: 'Gerencie placas físicas e downloads de QR Codes.' },
          { key: 'production', label: '🖨️ Produção de Placas', desc: 'Gere placas para impressão física (4 por folha A4).' },
          { key: 'units',      label: '🏢 Unidades', desc: 'Cadastre e edite os blocos, ruas e casas da vila.' },
          { key: 'people',     label: '👥 Pessoas', desc: 'Gerencie e vincule moradores aos códigos de acesso.' },
          { key: 'mailbox',    label: '📬 Caixa Postal', desc: 'Veja as mensagens de suporte enviadas pelos moradores.' },
          { key: 'control_panel', label: '🎮 Painel de Controle', desc: 'Visualização interativa das unidades em tempo real.' },
          { key: 'broadcast',  label: '📢 Comunicados', desc: 'Envie avisos gerais para todos os moradores de uma vez.' },
          { key: 'history',    label: '📋 Histórico', desc: 'Lista de visitas completas com foto e data/hora.' }
        ].filter(tab => {
          const isDoorman = localStorage.getItem('cd_admin_role') === 'doorman';
          if (isDoorman) {
            return tab.key === 'control_panel';
          }
          const currentProp = properties.find(p => p.id === selectedProperty);
          const isIndividual = currentProp ? currentProp.type === 'individual' : false;
          if (isIndividual && ['units', 'people', 'broadcast', 'mailbox', 'control_panel'].includes(tab.key)) return false;
          return true;
        }).map(tab => (
          <HoverHelp key={tab.key} text={tab.desc}>
            <button onClick={() => setActiveTab(tab.key)} style={{ padding: '14px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          </HoverHelp>
        ))}
      </div>

      <main className="container fade-in" style={{ marginTop: '32px' }}>

        {/* Painel de Chamada Ativa WebRTC */}
        {activeCall && (
          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '2px solid #3B82F6',
            padding: '20px 24px',
            borderRadius: '24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 10px 30px rgba(59,130,246,0.2)',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: activeCall.status === 'calling' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                color: activeCall.status === 'calling' ? '#F59E0B' : '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: activeCall.status === 'calling' ? 'pulse 1.5s infinite' : 'none'
              }}>
                <Phone size={28} />
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#94A3B8' }}>
                  {activeCall.isIncoming ? 'Interfone Recebido' : 'Chamando Unidade'}
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '2px 0 4px', color: '#fff' }}>
                  {activeCall.callerName}
                </h3>
                <p style={{ fontSize: '13px', margin: 0, color: '#CBD5E1', fontWeight: 600 }}>
                  {activeCall.status === 'calling' ? '🔔 Campainha tocando no celular do morador...' : `🎙️ Comunicação de voz ativa — ${fmtDuration(callDuration)}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleHangup}
              style={{
                background: '#EF4444',
                color: '#FFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(239,68,68,0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Desligar
            </button>
          </div>
        )}

        {/* Notificação de Chamada Recebida do Morador (Modal Prominente) */}
        {incomingCall && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}>
            <div style={{
              width: '90%',
              maxWidth: '440px',
              padding: '40px 30px',
              borderRadius: '28px',
              border: '2px solid #F59E0B',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.2)',
              textAlign: 'center',
              color: '#fff',
              position: 'relative',
              boxSizing: 'border-box'
            }}>
              {/* Linha decorativa no topo */}
              <div style={{
                position: 'absolute',
                top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '120px',
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)',
                borderRadius: '0 0 4px 4px'
              }} />

              {/* Ícone de Telefone Pulsante */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)',
                animation: 'pulse 1.8s infinite'
              }}>
                <PhoneCall size={38} style={{ animation: 'bounce 2s infinite' }} />
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#F59E0B',
                display: 'block',
                marginBottom: '8px'
              }}>
                📞 Chamada do Interfone
              </span>

              <h2 style={{
                fontSize: '28px',
                fontWeight: 900,
                margin: '0 0 8px',
                color: '#fff',
                letterSpacing: '-0.5px'
              }}>
                {incomingCall.callerName}
              </h2>

              <p style={{
                margin: '0 0 32px',
                color: '#94A3B8',
                fontSize: '14px',
                lineHeight: 1.5,
                fontWeight: 500
              }}>
                O morador está interfonando para a portaria.<br />Clique abaixo para atender ou recusar a chamada.
              </p>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={async () => {
                    if (socketRef.current) {
                      socketRef.current.emit('call_ended', { target: incomingCall.residentSocketId });
                    }
                    setIncomingCall(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <PhoneOff size={16} /> Recusar
                </button>
                
                <button
                  onClick={() => handleAnswerResidentCall(incomingCall)}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#10B981',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Phone size={16} /> Atender
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: PROPRIEDADES ── */}
        {activeTab === 'properties' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Minhas Propriedades</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gerencie placas e unidades</p>
              </div>
              {!properties.some(p => p.type === 'individual' && p.id !== 'demo-vila-id') && (
                <HoverHelp text="Cadastre uma nova propriedade de campainha virtual">
                  <button className="btn-primary" onClick={() => {
                    setOnboardingStep('type');
                  }} style={{ padding: '12px 24px' }}>
                    <Plus size={20} /> Nova Propriedade
                  </button>
                </HoverHelp>
              )}
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px' }}>Carregando...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {properties.map(p => (
                  <div key={p.id} className="premium-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{p.name}</h3>
                        <span style={{ fontSize: '12px', padding: '4px 10px', background: p.type === 'individual' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: p.type === 'individual' ? '#10B981' : 'var(--primary)', borderRadius: '100px', fontWeight: 600 }}>
                          {p.type === 'individual' ? 'Casa Única' : `${p.units.length} unidades`}
                        </span>
                      </div>
                      {p.type !== 'individual' && (
                        <button onClick={() => deleteProperty(p.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                      )}
                    </div>

                    {p.type !== 'individual' && (
                      <div style={{ marginBottom: '16px', background: 'var(--bg-deep)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          🔗 Subdomínio da Vila
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text" 
                            placeholder="ex: residencial-solar" 
                            defaultValue={p.subdomain || ''} 
                            onBlur={async (e) => {
                              const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
                              e.target.value = val;
                              if (val === (p.subdomain || '')) return;
                              try {
                                const res = await fetch(`${API}/api/properties/${p.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: p.name, subdomain: val })
                                });
                                if (res.ok) {
                                  alert('Subdomínio da vila atualizado com sucesso!');
                                  fetchProperties();
                                } else {
                                  const err = await res.json();
                                  alert(err.error || 'Erro ao atualizar subdomínio.');
                                }
                              } catch {
                                alert('Erro de conexão com o servidor.');
                              }
                            }}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '13px', outline: 'none', background: 'var(--bg-surface)', fontWeight: 600, color: 'var(--text-main)' }}
                          />
                        </div>
                        {p.subdomain ? (
                          <span style={{ display: 'block', fontSize: '11px', color: '#10B981', marginTop: '6px', fontWeight: 700 }}>
                            ✓ Acesso: {p.subdomain}.campainha.digital
                          </span>
                        ) : (
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                            Toque fora do campo para salvar. Permite acessar sem precisar digitar código.
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ background: 'var(--bg-deep)', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'center', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                      <img src={p.qrCodeUrl} alt="QR" style={{ width: '140px', height: 'auto' }} />
                    </div>

                    <HoverHelp text="Baixa o QR Code em PNG de alta resolução para impressão física" style={{ width: '100%' }}>
                      <button className="btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '13px', marginBottom: '16px' }} onClick={() => downloadQR(p.qrCodeUrl, p.name)}>
                        <Download size={16} /> Baixar QR Code
                      </button>
                    </HoverHelp>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                        Códigos de Acesso — compartilhe com o morador:
                      </span>
                      {p.units.map(u => (
                        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', marginBottom: '6px' }}>
                          <div style={{ flex: 1, paddingRight: '12px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{u.name}</span>
                            <code style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 800, letterSpacing: '2px', background: 'rgba(0,229,255,0.08)', padding: '3px 8px', borderRadius: '4px' }}>{u.accessCode || '---'}</code>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <HoverHelp text="Copia o código do morador para colar">
                              <CopyButton text={u.accessCode || ''} />
                            </HoverHelp>
                            <HoverHelp text="Envia o código de morador diretamente via WhatsApp">
                              <WhatsAppButton code={u.accessCode || ''} />
                            </HoverHelp>
                          </div>
                        </div>
                      ))}
                    </div>

                    <HoverHelp text="Acessa a galeria fotográfica e de horários das visitas desta propriedade" style={{ width: '100%' }}>
                      <button
                        onClick={() => { setSelectedProperty(p.id); setActiveTab('history'); }}
                        style={{ marginTop: '12px', width: '100%', background: 'rgba(59,130,246,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Clock size={14} /> Ver Histórico de Visitantes
                      </button>
                    </HoverHelp>
                  </div>
                ))}

                {/* Vila Teste (Demonstração) Card - Sempre disponível ao lado se não estiver em modo demo */}
                {!isDemoMode && (
                  <div 
                    onClick={() => {
                      if (window.confirm('Deseja abrir o Modo Demonstração para ver a Vila Teste funcionando na prática?')) {
                        startDemoMode();
                      }
                    }}
                    className="premium-card hover-premium" 
                    style={{ 
                      padding: '24px', 
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(109, 40, 217, 0.04) 100%)',
                      border: '2px dashed rgba(139, 92, 246, 0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '260px',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Badge de Demonstração */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#8B5CF6', color: '#FFF', fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Demonstração
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TreePine size={22} color="#8B5CF6" />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Vila Teste</h3>
                          <span style={{ fontSize: '12px', color: '#8B5CF6', fontWeight: 700 }}>Condomínio das Palmeiras</span>
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                        Uma vila interativa simulada com 2 blocos e 40 apartamentos. Ideal para testar chamadas em tempo real, liberar acessos e ver como o painel funciona.
                      </p>
                    </div>

                    <div style={{ 
                      background: 'rgba(139, 92, 246, 0.08)', 
                      padding: '12px', 
                      borderRadius: '12px', 
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#8B5CF6',
                      border: '1px solid rgba(139, 92, 246, 0.15)',
                      transition: 'all 0.2s'
                    }} className="btn-demo-action">
                      ⚡ ABRIR MODO DEMONSTRAÇÃO
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── ABA: PRODUCAO DE PLACAS ── */}
        {activeTab === 'production' && (
          <PlateProductionPanel />
        )}

        {/* ── ABA: UNIDADES ── */}
        {activeTab === 'units' && selectedProperty && (
          <UnitManager propertyId={selectedProperty} adminEmail={localStorage.getItem('cd_admin_email')} onRefresh={fetchProperties} />
        )}
        {activeTab === 'units' && !selectedProperty && properties.length > 0 && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Selecione uma propriedade na aba Propriedades primeiro.</p>
          </div>
        )}

        {/* ── ABA: PESSOAS ── */}
        {activeTab === 'people' && selectedProperty && (
          <ResidentManager propertyId={selectedProperty} property={properties.find(p => p.id === selectedProperty)} adminEmail={localStorage.getItem('cd_admin_email')} onRefresh={fetchProperties} />
        )}

        {/* ── ABA: MENSAGENS ── */}
        {activeTab === 'broadcast' && selectedProperty && (
          <BroadcastPanel propertyId={selectedProperty} adminEmail={localStorage.getItem('cd_admin_email')} />
        )}

        {/* ── ABA: CAIXA POSTAL (MAILBOX) ── */}
        {activeTab === 'mailbox' && selectedProperty && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Caixa Postal da Vila</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Mensagens e solicitações de moradores enviadas ao síndico</p>
              </div>
              <button className="btn-secondary" style={{ padding: '10px 16px', fontSize: '13px' }} onClick={() => fetchMailbox(selectedProperty)}>
                <RefreshCw size={16} /> Atualizar Inbox
              </button>
            </div>

            {loadingMailbox ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px' }}>Carregando caixa postal...</p>
            ) : mailboxMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FFF', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                <Send size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>Sua Caixa Postal está vazia!</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>Nenhum morador enviou mensagens ou solicitações de suporte ainda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mailboxMessages.map(msg => (
                  <div key={msg.id} style={{ background: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '100px' }}>
                          🏢 {msg.unit?.name || 'Unidade'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {fmtDate(msg.createdAt)}
                        </span>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, background: msg.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: msg.status === 'resolved' ? '#10B981' : '#D97706' }}>
                          {msg.status === 'resolved' ? 'RESOLVIDO' : 'PENDENTE'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>{msg.subject}</h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{msg.body}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <HoverHelp text={msg.status === 'resolved' ? 'Reabrir chamado' : 'Marcar solicitação como concluída'}>
                        <button
                          onClick={() => resolveMailboxMessage(msg.id, msg.status)}
                          style={{
                            background: msg.status === 'resolved' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            border: 'none',
                            color: msg.status === 'resolved' ? '#EF4444' : '#10B981',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {msg.status === 'resolved' ? 'Reabrir' : 'Concluir'}
                        </button>
                      </HoverHelp>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: PAINEL DE CONTROLE / GRADE VISUAL (CONTROL_PANEL) ── */}
        {activeTab === 'control_panel' && selectedProperty && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.75px', color: 'var(--text-main)' }}>Centro Operacional</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', fontWeight: 500 }}>Monitoramento em tempo real das unidades e acessos do condomínio.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={alertTypeFilter} onChange={e => setAlertTypeFilter(e.target.value)} className="input-glass" style={{ padding: '10px 16px', fontSize: '13px', width: 'auto', borderRadius: '10px', height: '40px', background: 'var(--bg-surface)' }}>
                  <option value="all">🔍 Todos os Status</option>
                  <option value="active">⚠️ Alertas Ativos</option>
                </select>
                <button className="btn-secondary" style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '10px', height: '40px', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => fetchAlerts(selectedProperty)}>
                  <RefreshCw size={12} /> Recarregar
                </button>
              </div>
            </div>

            {/* Controles de Portão Sonoff / eWelink Premium */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '24px', 
              padding: '24px', 
              marginBottom: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '20px', 
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '16px', 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <Zap size={24} color="#3B82F6" style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                    Rele Sonoff Dual
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      fontSize: '10px', 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      color: '#10B981', 
                      padding: '4px 10px', 
                      borderRadius: '100px', 
                      fontWeight: 800,
                      border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      <span style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: '#10B981', 
                        boxShadow: '0 0 8px #10B981', 
                        display: 'inline-block',
                        animation: 'blink 1.5s infinite' 
                      }} />
                      CONECTADO
                    </span>
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 500 }}>
                    Integração eWelink para abertura remota de portões sociais e de garagem.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <HoverHelp text="Acionar abertura elétrica do portão de pedestres">
                  <button 
                    onClick={() => alert('[Sonoff] Comando de abertura portão SOCIAL enviado com sucesso!')} 
                    style={{ 
                      background: '#10B981', 
                      color: '#FFF', 
                      border: 'none', 
                      padding: '12px 20px', 
                      borderRadius: '12px', 
                      fontSize: '13px', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}
                  >
                    🔓 Portão Social
                  </button>
                </HoverHelp>
                <HoverHelp text="Acionar motor do portão de veículos">
                  <button 
                    onClick={() => alert('[Sonoff] Comando de abertura portão VEÍCULOS enviado com sucesso!')} 
                    style={{ 
                      background: 'var(--primary)', 
                      color: '#FFF', 
                      border: 'none', 
                      padding: '12px 20px', 
                      borderRadius: '12px', 
                      fontSize: '13px', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      boxShadow: '0 4px 12px var(--primary-glow)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}
                  >
                    🚗 Portão Garagem
                  </button>
                </HoverHelp>
              </div>
            </div>

            {/* PAINEL DE ALERTAS URGENTES (AÇÃO RÁPIDA) */}
            {activeAlerts.length > 0 && (
              <div style={{ marginBottom: '32px', animation: 'fadeIn 0.3s' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite', boxShadow: '0 0 8px #EF4444' }} />
                  ⚠️ Notificações & Chamados de Ação Rápida
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeAlerts.map(alertItem => {
                    const unit = properties.flatMap(p => p.units).find(u => u.id === alertItem.unitId);
                    let blockVal = unit ? unit.block : null;
                    if (unit && !blockVal && unit.name) {
                      const match = unit.name.match(/^(?:B|Bloco\s*)(\d+|[A-Z]+)/i);
                      if (match) blockVal = match[1];
                    }
                    const blockKey = blockVal ? `Bloco ${blockVal}` : (unit?.street ? `Rua ${unit.street}` : '');
                    
                    return (
                      <div
                        key={alertItem.id}
                        style={{
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(245, 158, 11, 0.06))',
                          border: '2px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '16px',
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '16px',
                          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.05)',
                          animation: 'pulse-border 2s infinite'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: alertItem.type === 'package' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                          }}>
                            {alertItem.type === 'package' ? '📦' : '🔑'}
                          </div>
                          <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                              {blockKey ? `[${blockKey}] ` : ''}Unidade {unit ? unit.name : 'Morador'} - {alertItem.title}
                            </h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                              {alertItem.description || 'Aguardando liberação ou atendimento na portaria.'}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {alertItem.type === 'release' && (
                            <button
                              onClick={() => {
                                window.alert('[eWelink/Sonoff] Comando de liberação de portão disparado!');
                                resolveAlert(alertItem.id);
                              }}
                              style={{
                                background: '#10B981',
                                color: '#FFF',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              🔑 Autorizar & Abrir Portão
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              if (unit) {
                                handleCallUnit(unit);
                              } else {
                                window.alert('Erro ao identificar unidade para ligação.');
                              }
                            }}
                            style={{
                              background: '#3B82F6',
                              color: '#FFF',
                              border: 'none',
                              padding: '10px 16px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            📞 Ligar para Morador
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Agrupamento e Renderização de Unidades por Subdivisão (Bloco/Rua) */}
            {(() => {
              const currentProperty = properties.find(p => p.id === selectedProperty);
              if (!currentProperty) return <p>Carregando unidades...</p>;

              // Agrupa unidades
              const grouped = {};
              currentProperty.units.forEach(u => {
                let blockVal = u.block;
                if (!blockVal && u.name) {
                  // Try to extract block from formats like "B1-1001", "Bloco 2 - 102", "B3"
                  const match = u.name.match(/^(?:B|Bloco\s*)(\d+|[A-Z]+)/i);
                  if (match) {
                    blockVal = match[1];
                  }
                }
                const blockKey = blockVal ? `Bloco ${blockVal}` : (u.street ? `Rua ${u.street}` : 'Geral');
                if (!grouped[blockKey]) grouped[blockKey] = [];
                grouped[blockKey].push(u);
              });

              const blockKeys = Object.keys(grouped).sort();

              if (blockKeys.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Nenhuma unidade cadastrada. Adicione unidades na aba Unidades.</p>
                  </div>
                );
              }

              // SE HOUVER MAIS DE UM BLOCO E NENHUM BLOCO SELECIONADO, MOSTRA A TELA DOS 6 BLOCOS
              if (blockKeys.length > 1 && activeControlBlock === null) {
                return (
                  <div style={{ marginTop: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏢 Distribuição por Blocos
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                      {blockKeys.map(blockKey => {
                        const blockUnits = grouped[blockKey];
                        const blockAlerts = activeAlerts.filter(a => blockUnits.some(u => u.id === a.unitId));
                        const hasAlert = blockAlerts.length > 0;
                        const onlineCount = blockUnits.filter(u => isDemoMode || (u.residents && u.residents.some(r => onlineStatus[r.id] === 'online'))).length;

                        return (
                          <div
                            key={blockKey}
                            onClick={() => {
                              setActiveControlBlock(blockKey);
                              setLastBlockAlertCount(blockAlerts.length);
                            }}
                            style={{
                              background: 'var(--bg-surface)',
                              border: hasAlert ? '2px solid rgba(245, 158, 11, 0.6)' : '1px solid var(--border-subtle)',
                              borderRadius: '20px',
                              padding: '24px',
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'relative',
                              boxShadow: hasAlert ? '0 0 20px rgba(245, 158, 11, 0.15)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                            className={hasAlert ? 'pulse-border-alert' : 'hover-premium'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>🏢 {blockKey}</span>
                              {hasAlert && (
                                <span style={{
                                  background: '#EF4444',
                                  color: '#FFF',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '4px 10px',
                                  borderRadius: '100px',
                                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                                  animation: 'pulse 2s infinite'
                                }}>
                                  🚨 ALERTA ({blockAlerts.length})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              📊 {blockUnits.length} unidades cadastradas
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                🟢 {onlineCount} Online
                              </span>
                              <span style={{ fontSize: '11px', background: 'var(--bg-deep)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                🔴 {blockUnits.length - onlineCount} Offline
                              </span>
                            </div>
                            
                            <div style={{
                              marginTop: '12px',
                              fontSize: '12px',
                              fontWeight: 800,
                              color: hasAlert ? '#F59E0B' : 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              justifyContent: 'flex-end'
                            }}>
                              {hasAlert ? '⚠️ Resolver Alertas' : 'Entrar no Bloco'} →
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // CASO ESTEJA EXIBINDO UM BLOCO FOCADO
              const visibleBlocks = activeControlBlock ? [activeControlBlock] : blockKeys;

              return visibleBlocks.map(blockKey => {
                const unitsInBlock = grouped[blockKey];
                
                // Filtra se a busca pedir apenas alertas ativos
                const filteredUnits = alertTypeFilter === 'active' 
                  ? unitsInBlock.filter(u => activeAlerts.some(a => a.unitId === u.id))
                  : unitsInBlock;

                if (filteredUnits.length === 0) return null;

                return (
                  <div key={blockKey} style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        🏢 {blockKey} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>({filteredUnits.length} unidade{filteredUnits.length !== 1 ? 's' : ''})</span>
                      </h3>
                      {activeControlBlock && (
                        <button
                          onClick={() => {
                            setActiveControlBlock(null);
                          }}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          className="hover-premium"
                        >
                          ← Voltar para todos os Blocos
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                      {(() => {
                        const sortedUnits = [...filteredUnits].sort((a, b) => {
                          const aHasAlert = activeAlerts.some(al => al.unitId === a.id);
                          const bHasAlert = activeAlerts.some(al => al.unitId === b.id);
                          if (aHasAlert && !bHasAlert) return -1;
                          if (!aHasAlert && bHasAlert) return 1;
                          return 0;
                        });
                        return sortedUnits.map(u => {
                          const unitAlerts = activeAlerts.filter(a => a.unitId === u.id);
                          const hasAlert = unitAlerts.length > 0;
                          const mainAlert = unitAlerts[0];
                          
                          let cardClass = '';
                          let alertBadge = null;

                          if (hasAlert) {
                            if (mainAlert.type === 'package') {
                              cardClass = 'pulse-alert-yellow';
                              alertBadge = '📦 ENCOMENDA';
                            } else if (mainAlert.type === 'release') {
                              cardClass = 'pulse-alert-green';
                              alertBadge = '🔑 LIBERAÇÃO';
                            } else {
                              cardClass = 'pulse-alert-green';
                              alertBadge = '⚠️ ALERTA!';
                            }
                          }

                          const unitResidents = u.residents || [];
                          let onlineResidentsCount = unitResidents.filter(r => onlineStatus[r.id] === 'online').length;
                          let isOnline = onlineResidentsCount > 0;

                          if (isDemoMode) {
                            isOnline = true;
                            onlineResidentsCount = 1;
                          }

                          return (
                            <HoverHelp key={u.id} as="div" style={{ display: 'block', width: '100%' }} text={hasAlert ? `${mainAlert.title}: ${mainAlert.description || ''} (Clique para simular ou resolver)` : `Status: ${isOnline ? 'Online' : 'Offline'} (${onlineResidentsCount} moradores online)`}>
                              <div
                                onClick={() => {
                                  if (hasAlert) {
                                    setSelectedMessage(mainAlert);
                                  } else {
                                    if (isDemoMode && (!u.residents || u.residents.length === 0)) {
                                      const mockUnit = {
                                        ...u,
                                        residents: [
                                          { id: 'demo-res-1', name: 'analice', clientCode: 'B1-1001-ANALICE-IMW' }
                                        ]
                                      };
                                      setSelectedUnitDetails(mockUnit);
                                    } else {
                                      setSelectedUnitDetails(u);
                                    }
                                  }
                                }}
                                style={{
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '16px',
                                  padding: '20px 14px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minHeight: '110px',
                                  width: '100%',
                                  transition: 'all 0.2s',
                                  boxShadow: hasAlert ? 'none' : '0 2px 6px rgba(0,0,0,0.01)'
                                }}
                                className={cardClass}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCallUnit(u);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: '#3B82F6',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    zIndex: 10,
                                    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.15)'
                                  }}
                                  title={`Ligar para ${u.name}`}
                                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.color = '#fff'; }}
                                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.color = '#3B82F6'; }}
                                >
                                  <Phone size={14} />
                                </button>

                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>{u.name}</span>
                                {u.number && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Nº {u.number}</span>}
                                
                                {isOnline ? (
                                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', display: 'inline-block' }} />
                                    {onlineResidentsCount} online
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8', display: 'inline-block' }} />
                                    offline
                                  </span>
                                )}
                                
                                {alertBadge && (
                                  <span style={{
                                    marginTop: '8px',
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    background: mainAlert.type === 'package' ? '#F59E0B' : '#10B981',
                                    color: '#FFF',
                                    padding: '2px 6px',
                                    borderRadius: '100px',
                                    letterSpacing: '0.5px'
                                  }}>
                                    {alertBadge}
                                  </span>
                                )}
                              </div>
                            </HoverHelp>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              });
            })()}

            {isDemoMode && (
              <div style={{ marginTop: '40px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  💡 Guia Prático do Painel de Controle (Para Novos Clientes)
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                  Esse painel permite que você enxergue e controle em tempo real todas as atividades da sua vila ou condomínio. Veja abaixo o que cada elemento faz:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '8px' }}>
                  <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} /> Led Verde (Morador Online)
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      Indica que o morador está com o aplicativo aberto ou em segundo plano no celular, pronto para receber chamadas de voz e vídeo instantâneas.
                    </p>
                  </div>
                  
                  <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8', display: 'inline-block' }} /> Led Cinza (Morador Offline)
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      Indica que o morador está offline. Se um visitante tocar na campainha, o sistema envia automaticamente uma Notificação Push para chamar seu aparelho.
                    </p>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📦 Alerta de Encomenda (Pulsante)
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      Quando uma encomenda chega na portaria, o porteiro ativa o alerta e o morador recebe uma notificação. O card fica pulsando em amarelo até ser resolvido!
                    </p>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🔓 Integração com Portões (Sonoff)
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      Integração total com relés Sonoff/eWelink. O administrador ou o porteiro podem abrir o portão social ou de veículos com apenas 1 clique no painel!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Alerta Ativo */}
            {selectedMessage && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(4px)' }}>
                <div style={{ background: '#FFF', borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                  <button onClick={() => setSelectedMessage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: selectedMessage.type === 'package' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedMessage.type === 'package' ? <Zap size={24} color="#F59E0B" /> : <ShieldCheck size={24} color="#10B981" />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{selectedMessage.title}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Unidade {selectedMessage.unit?.name || 'Morador'}</p>
                    </div>
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                    {selectedMessage.description || 'Nenhuma descrição adicional.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedMessage.type === 'release' && (
                      <button
                        onClick={() => {
                          alert('[eWelink/Sonoff] Comando de liberação de portão disparado!');
                          resolveAlert(selectedMessage.id);
                          setSelectedMessage(null);
                        }}
                        style={{ width: '100%', background: '#10B981', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        🔑 AUTORIZAR E ABRIR PORTÃO
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        resolveAlert(selectedMessage.id);
                        setSelectedMessage(null);
                      }}
                      style={{ width: '100%', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✅ MARCAR COMO RESOLVIDO
                    </button>
                    
                    <button
                      onClick={() => setSelectedMessage(null)}
                      style={{ width: '100%', background: '#F1F5F9', color: 'var(--text-muted)', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA: HISTÓRICO ── */}
        {activeTab === 'history' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Histórico de Visitantes</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Registro de todas as visitas com foto e horário</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {properties.length > 1 && (
                  <select value={selectedProperty || ''} onChange={e => setSelectedProperty(e.target.value)} className="input-glass" style={{ padding: '10px 16px', fontSize: '14px' }}>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <button className="btn-secondary" style={{ padding: '10px 16px', fontSize: '13px' }} onClick={() => selectedProperty && fetchVisitors(selectedProperty)}>
                  <RefreshCw size={16} /> Atualizar
                </button>
              </div>
            </div>

            {loadingVisitors ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px' }}>Carregando histórico...</p>
            ) : visitors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <User size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Nenhum visitante registrado ainda.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>As visitas aparecerão aqui assim que alguém tocar a campainha.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {visitors.map(v => (
                  <div key={v.id} className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ height: '160px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {v.photo
                        ? <img src={v.photo} alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <User size={48} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                      }
                      {v.status && (
                        <span style={{ 
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          fontSize: '10px', 
                          fontWeight: 800, 
                          padding: '3px 8px', 
                          borderRadius: '6px',
                          background: v.status === 'answered' ? '#DCFCE7' : v.status === 'missed' ? '#FEE2E2' : '#F3F4F6',
                          color: v.status === 'answered' ? '#15803D' : v.status === 'missed' ? '#B91C1C' : '#4B5563',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          zIndex: 10
                        }}>
                          {v.status === 'answered' ? 'Atendida' : v.status === 'missed' ? 'Perdida' : v.status === 'rejected' ? 'Recusada' : 'Chamando'}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' }}>
                        <Clock size={11} /> {fmtDate(v.timestamp)}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.callerName || 'Visitante'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>
                          {properties.find(p => p.id === selectedProperty)?.units.find(u => u.id === v.unitId)?.name || 'Unidade'}
                        </span>
                        {v.duration > 0 && (
                          <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            ⏱️ {Math.floor(v.duration / 60)}m {v.duration % 60}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* SMARTPHONE APP SIMULATOR OVERLAY */}
      {simulatedUnit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: '#090D16', width: '375px', height: '760px', borderRadius: '44px', border: '12px solid #1E293B', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6), inset 0 0 12px rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', color: '#E2E8F0' }}>
            
            {/* iPhone Dynamic Island */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '110px', height: '26px', background: '#000', borderRadius: '0 0 16px 16px', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#111', marginRight: '6px' }} />
              <div style={{ width: '40px', height: '4px', borderRadius: '100px', background: '#111' }} />
            </div>

            {/* Status Bar */}
            <div style={{ height: '44px', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#FFF', zIndex: 90, position: 'relative' }}>
              <span>9:41</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px' }}>5G</span>
                <span style={{ width: '16px', height: '8px', border: '1px solid #FFF', borderRadius: '2px', display: 'inline-block', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: '2px', background: '#FFF' }} />
                </span>
              </div>
            </div>

            {/* Smartphone Screen Content */}
            <div style={{ flex: 1, padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'radial-gradient(circle at top, #1E1B4B 0%, #090D16 100%)', position: 'relative' }}>
              
              {/* App Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Logo size={18} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px', color: '#FFF' }}>Campainha Digital</h5>
                    <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} /> Morador Online
                    </span>
                  </div>
                </div>
                <button onClick={() => { setSimulatedUnit(null); setSimCallState('idle'); }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFF', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Welcome Morador Badge */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '12px 14px', marginBottom: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Dispositivo Ativo</span>
                <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#FFF', margin: '4px 0 0' }}>{simulatedUnit.name} (Bloco {simulatedUnit.block})</h4>
                <p style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, margin: '6px 0 0' }}>🔑 Código: {simulatedUnit.accessCode}</p>
              </div>

              {/* Annoucement Notification Indicator */}
              {broadcastCount > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', borderRadius: '12px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'pulse 2s infinite' }}>
                  <span>📢</span>
                  <span><strong>{broadcastCount} Novo Comunicado Coletivo</strong> recebido!</span>
                </div>
              )}

              {/* CALL SIMULATOR (INTERCOM) */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '16px', marginBottom: '20px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 12px' }}>📞 Interfone Integrado</h5>
                
                {simCallState === 'idle' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => {
                      setSimCallState('calling');
                      setSimCallTarget('portaria');
                      try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1657/1657-84.wav');
                        audio.volume = 0.3;
                        audio.play().catch(() => {});
                      } catch {}
                      setTimeout(() => {
                        setSimCallState('talking');
                      }, 2550);
                    }} style={{ width: '100%', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#FFF', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                      Ligar para a Portaria
                    </button>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <select value={simSelectedNeighbor} onChange={e => setSimSelectedNeighbor(e.target.value)} className="input-glass" style={{ padding: '8px 10px', fontSize: '12px', flex: 1, background: 'rgba(0,0,0,0.3)', color: '#FFF' }}>
                        <option value="">-- Selecionar Vizinho --</option>
                        {properties[0]?.units.filter(un => un.id !== simulatedUnit.id).map(un => (
                          <option key={un.id} value={un.name + ' Bloco ' + un.block}>{un.name} Bloco {un.block}</option>
                        ))}
                      </select>
                      <button onClick={() => {
                        if (!simSelectedNeighbor) return alert('Selecione um vizinho.');
                        setSimCallState('calling');
                        setSimCallTarget(simSelectedNeighbor);
                        try {
                          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1657/1657-84.wav');
                          audio.volume = 0.3;
                          audio.play().catch(() => {});
                        } catch {}
                        setTimeout(() => {
                          setSimCallState('talking');
                        }, 2550);
                      }} style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '0 12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>
                        Interfonar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <span style={{ fontSize: '24px', animation: 'bounce 1s infinite', display: 'inline-block' }}>📞</span>
                    <h5 style={{ fontSize: '14px', color: '#FFF', margin: '8px 0 4px', fontWeight: 700 }}>
                      {simCallState === 'calling' ? `Chamando ${simCallTarget === 'portaria' ? 'Portaria' : simCallTarget}...` : `Conversa Ativa com ${simCallTarget === 'portaria' ? 'Portaria' : simCallTarget}`}
                    </h5>
                    
                    {simCallState === 'talking' && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px', margin: '12px 0', fontSize: '12px', color: 'var(--primary)', fontStyle: 'italic', borderLeft: '3px solid var(--primary)', textAlign: 'left' }}>
                        {simCallTarget === 'portaria' 
                          ? '"[Porteiro]: Portaria Palmeiras, boa noite! Em que posso ajudar?"'
                          : `"[Morador do ${simCallTarget}]: Olá! Vizinho? Quem está interfonando?"`
                        }
                      </div>
                    )}

                    <button onClick={() => setSimCallState('idle')} style={{ background: '#EF4444', color: '#FFF', border: 'none', padding: '8px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}>
                      ❌ Desligar Chamada
                    </button>
                  </div>
                )}
              </div>

              {/* ENVIAR MENSAGEM AO SINDICO (CAIXA POSTAL) */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '16px', marginBottom: '20px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 12px' }}>💬 Mensagens ao Síndico</h5>
                <input type="text" value={simSubject} onChange={e => setSimSubject(e.target.value)} placeholder="Assunto (Ex: Vazamento de água)" className="input-glass" style={{ background: 'rgba(0,0,0,0.3)', color: '#FFF', padding: '8px 12px', fontSize: '12px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.08)' }} />
                <textarea value={simBody} onChange={e => setSimBody(e.target.value)} placeholder="Digite sua solicitação ou reclamação..." className="input-glass" style={{ background: 'rgba(0,0,0,0.3)', color: '#FFF', padding: '8px 12px', fontSize: '12px', minHeight: '60px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.08)' }} />
                <button onClick={() => {
                  if (!simBody.trim()) return alert('Digite a mensagem.');
                  const newMailboxMsg = {
                    id: 'sim-msg-' + Date.now(),
                    senderName: `Morador Apto ${simulatedUnit.number} Bloco ${simulatedUnit.block}`,
                    subject: simSubject || 'Solicitação de Morador',
                    body: simBody,
                    createdAt: new Date(),
                    status: 'pending',
                    unit: { name: `Apto ${simulatedUnit.number} Bloco ${simulatedUnit.block}` }
                  };
                  setMailboxMessages(prev => [newMailboxMsg, ...prev]);
                  try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
                    audio.volume = 0.3;
                    audio.play().catch(() => {});
                  } catch {}
                  setSimSubject('');
                  setSimBody('');
                  alert('✅ Sua mensagem foi enviada para a Caixa Postal do Síndico!');
                }} style={{ width: '100%', background: '#F59E0B', color: '#FFF', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>
                  Enviar para Caixa Postal
                </button>
              </div>

              {/* AUTORIZAR VISITANTE (GERAR CODIGO) */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '16px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 12px' }}>🔑 Autorizar Visitante / Entregador</h5>
                <input type="text" value={simVisitorName} onChange={e => setSimVisitorName(e.target.value)} placeholder="Nome do Visitante (Ex: IFood / Pintor)" className="input-glass" style={{ background: 'rgba(0,0,0,0.3)', color: '#FFF', padding: '8px 12px', fontSize: '12px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button onClick={() => setSimType('release')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: simType === 'release' ? '#10B981' : 'rgba(255,255,255,0.05)', color: '#FFF', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                    🔑 Visitante
                  </button>
                  <button onClick={() => setSimType('package')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: simType === 'package' ? '#F59E0B' : 'rgba(255,255,255,0.05)', color: '#FFF', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                    📦 Entregador
                  </button>
                </div>
                
                <button onClick={() => {
                  const code = Math.floor(100000 + Math.random() * 900000).toString();
                  setSimGeneratedCode(code);
                  try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
                    audio.volume = 0.3;
                    audio.play().catch(() => {});
                  } catch {}
                }} style={{ width: '100%', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#FFF', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>
                  Gerar Código Temporário
                </button>

                {simGeneratedCode && (
                  <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>CÓDIGO DE VISITA GERADO</span>
                    <strong style={{ fontSize: '20px', color: '#FFF', letterSpacing: '3px', fontFamily: 'monospace' }}>
                      {simGeneratedCode.substring(0,3)}-{simGeneratedCode.substring(3,6)}
                    </strong>
                    
                    <button onClick={() => {
                      const newAlert = {
                        id: 'sim-alert-' + Date.now(),
                        unitId: simulatedUnit.id,
                        type: simType,
                        title: simType === 'package' ? '📦 Liberação de Entregador Autorizada' : '🔑 Liberação de Visitante Autorizada',
                        description: `Morador gerou o código ${simGeneratedCode} para o visitante: ${simVisitorName || 'Visitante Avulso'}.`,
                        timestamp: new Date()
                      };
                      setActiveAlerts(prev => [newAlert, ...prev]);
                      try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-84.wav');
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                      } catch {}
                      setSimGeneratedCode('');
                      setSimVisitorName('');
                      setSimulatedUnit(null);
                      alert('🚨 BING-BONG! O Visitante chegou na portaria e o alerta de liberação está piscando no painel!');
                    }} style={{ width: '100%', marginTop: '12px', background: '#10B981', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      ⚡ Simular Chegada na Portaria
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Smartphone Home Bar */}
            <div style={{ height: '34px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#090D16', zIndex: 100 }}>
              <div style={{ width: '134px', height: '5px', borderRadius: '100px', background: '#FFF', opacity: 0.8 }} />
            </div>

          </div>
        </div>
      )}

      {/* Modal de Alerta Ativo */}
      {selectedMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-surface)', color: 'var(--text-main)', borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)', position: 'relative' }}>
            <button onClick={() => { setSelectedMessage(null); setDoormanCallState('idle'); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            
            {isDemoMode ? (
              /* MODO DEMONSTRAÇÃO: RESOLUÇÃO DO PORTEIRO */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: selectedMessage.type === 'package' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedMessage.type === 'package' ? <Zap size={24} color="#F59E0B" /> : <ShieldCheck size={24} color="#10B981" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>🎛️ Resolução da Portaria</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Unidade: {properties[0]?.units.find(u => u.id === selectedMessage.unitId)?.name || 'Morador'}</p>
                  </div>
                </div>

                {doormanCallState === 'idle' && (
                  <>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                      {selectedMessage.description || 'Nenhuma descrição adicional.'}
                    </p>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      <button
                        onClick={() => {
                          try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
                            audio.volume = 0.4;
                            audio.play().catch(() => {});
                          } catch {}
                          resolveAlert(selectedMessage.id);
                          setSelectedMessage(null);
                          alert('✅ Portaria autorizou o visitante e o portão social foi liberado!');
                        }}
                        style={{ flex: 1, background: '#10B981', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        🔑 AUTORIZAR / OK
                      </button>

                      <button
                        onClick={() => {
                          setDoormanCallState('calling');
                          try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1657/1657-84.wav');
                            audio.volume = 0.3;
                            audio.play().catch(() => {});
                          } catch {}
                          setTimeout(() => {
                            setDoormanCallState('talking');
                          }, 2550);
                        }}
                        style={{ flex: 1, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        📞 LIGAR PRO MORADOR
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const unitObj = properties[0]?.units.find(un => un.id === selectedMessage.unitId);
                        if (unitObj) {
                          setSimulatedUnit(unitObj);
                          setSelectedMessage(null);
                        }
                      }}
                      style={{ width: '100%', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', marginBottom: '8px' }}
                    >
                      📱 Simular Aplicativo do Morador
                    </button>

                    <button
                      onClick={() => setSelectedMessage(null)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                    >
                      Cancelar
                    </button>
                  </>
                )}

                {doormanCallState === 'calling' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <span style={{ fontSize: '32px', animation: 'bounce 1s infinite', display: 'inline-block' }}>📞</span>
                    <h4 style={{ fontSize: '16px', color: 'var(--text-main)', margin: '16px 0 8px', fontWeight: 800 }}>Chamando Morador...</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Interfone de voz da portaria tocando no smartphone do morador...</p>
                    <button
                      onClick={() => setDoormanCallState('idle')}
                      style={{ background: '#EF4444', color: '#FFF', border: 'none', padding: '10px 24px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ❌ Desligar Chamada
                    </button>
                  </div>
                )}

                {doormanCallState === 'talking' && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <span style={{ fontSize: '32px', display: 'inline-block', animation: 'pulse 1.5s infinite' }}>🗣️</span>
                    <h4 style={{ fontSize: '16px', color: 'var(--text-main)', margin: '12px 0 8px', fontWeight: 800 }}>Conexão de Voz Estabelecida</h4>
                    
                    <div style={{ background: 'rgba(59,130,246,0.05)', borderLeft: '4px solid var(--primary)', borderRadius: '12px', padding: '14px', textAlign: 'left', margin: '16px 0 24px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      <p style={{ margin: '0 0 8px' }}><strong>[Porteiro]:</strong> Olá! Estou com o visitante aqui na portaria. Posso autorizar a entrada?</p>
                      <p style={{ margin: 0 }}><strong>[Morador]:</strong> Sim, claro! Pode autorizar, por favor!</p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
                            audio.volume = 0.4;
                            audio.play().catch(() => {});
                          } catch {}
                          resolveAlert(selectedMessage.id);
                          setDoormanCallState('idle');
                          setSelectedMessage(null);
                          alert('✅ Visitante liberado e portão social aberto pelo porteiro!');
                        }}
                        style={{ flex: 1, background: '#10B981', color: '#FFF', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                      >
                        ✅ AUTORIZAR E DESLIGAR
                      </button>

                      <button
                        onClick={() => setDoormanCallState('idle')}
                        style={{ flex: 1, background: '#EF4444', color: '#FFF', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                      >
                        ❌ DESLIGAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* MODO REAL: MENSAGEM DO SISTEMA PADRÃO */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: selectedMessage.type === 'package' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedMessage.type === 'package' ? <Zap size={24} color="#F59E0B" /> : <ShieldCheck size={24} color="#10B981" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>{selectedMessage.title}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Unidade {selectedMessage.unit?.name || 'Morador'}</p>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                  {selectedMessage.description || 'Nenhuma descrição adicional.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        if (selectedMessage.type === 'release') alert('[eWelink/Sonoff] Comando de liberação de portão disparado!');
                        resolveAlert(selectedMessage.id);
                        setSelectedMessage(null);
                      }}
                      style={{ flex: 1, background: '#10B981', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center' }}
                    >
                      {selectedMessage.type === 'package' ? '📦 CIENTE / ENCOMENDA' : '🔑 AUTORIZAR E ABRIR'}
                    </button>

                    <button
                      onClick={() => {
                        const unit = properties.flatMap(p => p.units).find(u => u.id === selectedMessage.unitId);
                        if (unit) {
                          handleCallUnit(unit);
                          resolveAlert(selectedMessage.id);
                          setSelectedMessage(null);
                        } else {
                          alert('Erro ao identificar unidade.');
                        }
                      }}
                      style={{ flex: 1, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#FFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center' }}
                    >
                      📞 LIGAR PRO MORADOR
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      resolveAlert(selectedMessage.id);
                      setSelectedMessage(null);
                    }}
                    style={{ width: '100%', background: '#F1F5F9', color: 'var(--text-muted)', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Fechar / Descartar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedUnitDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#0F172A', color: '#E2E8F0', borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid #1E293B', position: 'relative' }}>
            <button onClick={() => setSelectedUnitDetails(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20} /></button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={24} color="#00E5FF" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFF' }}>{selectedUnitDetails.name}</h3>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                  {selectedUnitDetails.block && `Bloco ${selectedUnitDetails.block} `}
                  {selectedUnitDetails.street && `${selectedUnitDetails.street} `}
                  {selectedUnitDetails.number && `Nº ${selectedUnitDetails.number}`}
                </p>
              </div>
            </div>

            {/* Código Geral da Unidade */}
            <div style={{ background: '#090D16', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', border: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código Geral da Unidade</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#00E5FF', marginTop: '2px' }}>{selectedUnitDetails.inviteCode || 'N/A'}</div>
              </div>
              {selectedUnitDetails.inviteCode && <CopyButton text={selectedUnitDetails.inviteCode} />}
            </div>

            {/* Moradores Cadastrados */}
            <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moradores Cadastrados</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
              {(selectedUnitDetails.residents || []).length === 0 ? (
                <div style={{ padding: '16px', background: '#090D16', borderRadius: '12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                  Nenhum morador cadastrado nesta unidade.
                </div>
              ) : (
                (selectedUnitDetails.residents || []).map(resident => {
                  const isOnline = onlineStatus[resident.id] === 'online' || isDemoMode;
                  return (
                    <div key={resident.id} style={{ background: '#090D16', borderRadius: '12px', padding: '12px 14px', border: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#FFF' }}>{resident.name}</span>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: isOnline ? '#10B981' : '#94A3B8',
                            boxShadow: isOnline ? '0 0 6px #10B981' : 'none'
                          }} />
                        </div>
                        {resident.clientCode && (
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            Código: <strong style={{ color: '#00E5FF' }}>{resident.clientCode}</strong>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {resident.clientCode && <CopyButton text={resident.clientCode} />}
                        <button
                          onClick={() => {
                            if (isDemoMode) {
                              alert(`📞 Ligação simulada para o morador ${resident.name} iniciada!`);
                            } else if (socketRef.current) {
                              if (callInitiatedRef.current) return;
                              callInitiatedRef.current = true;
                              stopAllCall();
                              setActiveCall({
                                residentSocketId: null,
                                callerName: resident.name,
                                unitId: selectedUnitDetails.id,
                                isIncoming: false,
                                status: 'calling'
                              });
                              setDoormanCallState('calling');
                              socketRef.current.emit('doorman_call', {
                                unitId: selectedUnitDetails.id,
                                propertyId: selectedUnitDetails.propertyId,
                                callerName: 'Portaria',
                                targetUserId: resident.id
                              });
                            } else {
                              alert('Erro: Painel não conectado ao servidor em tempo real.');
                            }
                          }}
                          style={{
                            background: 'transparent',
                            color: '#3B82F6', border: '1px solid #3B82F6', borderRadius: '8px',
                            padding: '6px 10px', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.color = '#FFF'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3B82F6'; }}
                        >
                          📞
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  if (isDemoMode) {
                    alert('📞 Chamada simulada iniciada para toda a unidade!');
                  } else if (socketRef.current) {
                    if (callInitiatedRef.current) return;
                    callInitiatedRef.current = true;
                    stopAllCall();
                    setActiveCall({
                      residentSocketId: null,
                      callerName: selectedUnitDetails.name,
                      unitId: selectedUnitDetails.id,
                      isIncoming: false,
                      status: 'calling'
                    });
                    setDoormanCallState('calling');
                    socketRef.current.emit('doorman_call', {
                      unitId: selectedUnitDetails.id,
                      propertyId: selectedUnitDetails.propertyId,
                      callerName: 'Portaria'
                    });
                  } else {
                    alert('Erro: Conexão em tempo real não estabelecida.');
                  }
                }}
                style={{ flex: 1, background: 'linear-gradient(135deg,#10B981,#059669)', color: '#FFF', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                📞 INTERFONAR UNIDADE (TODOS)
              </button>
              
              <button
                onClick={() => setSelectedUnitDetails(null)}
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid #1E293B', padding: '12px 18px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
    </div>
  );
}
