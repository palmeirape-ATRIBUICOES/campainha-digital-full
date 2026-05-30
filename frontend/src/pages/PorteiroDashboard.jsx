import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, Building2, Phone, PhoneCall, PhoneOff, Search, KeyRound, CheckCircle2, MessageSquare, Send, X, ShieldCheck, Sun, Moon, Package } from 'lucide-react';
import Logo from '../components/Logo';

import { API } from '../config';

export default function PorteiroDashboard() {
  const [properties, setProperties] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [showCodeValidator, setShowCodeValidator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [authorizedEntry, setAuthorizedEntry] = useState(null);
  const [msgUnit, setMsgUnit] = useState(null);   // unitId sendo enviada msg
  const [msgText, setMsgText] = useState('');     // texto da mensagem
  const [msgSent, setMsgSent] = useState(false);  // feedback de enviado
  const [residentMsg, setResidentMsg] = useState(null); // Mensagem recebida do morador
  const [incomingCall, setIncomingCall] = useState(null); // Chamada recebida do morador
  const [preAuthorized, setPreAuthorized] = useState({}); // { unitId: true }
  const [onlineStatus, setOnlineStatus] = useState({}); // { unitId: 'online' | 'offline' }
  
  // Acesso via código de visitante
  // Acesso via código de visitante
  const [validatedCode, setValidatedCode] = useState(null);
  const [visitorCodeInput, setVisitorCodeInput] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  // ─── Suporte a Modo Noturno (Dark Mode) ───
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('cd_dark_mode') === 'true');

  // ─── Novos Recursos uCondo v3.0 (Encomendas e Reservas) ───
  const [pkgUnit, setPkgUnit] = useState(null);
  const [pkgText, setPkgText] = useState('');
  const [pkgLoading, setPkgLoading] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);

  const fetchBookings = React.useCallback(async () => {
    if (!propertyId) return;
    setBookingLoading(true);
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/bookings`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('[Doorman] Error fetching bookings:', err);
    } finally {
      setBookingLoading(false);
    }
  }, [propertyId]);

  const logPackage = async (unit) => {
    if (!pkgText.trim()) return;
    setPkgLoading(true);
    try {
      const res = await fetch(`${API}/api/properties/${propertyId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          type: 'package',
          title: '📦 Nova Encomenda Recebida!',
          description: pkgText.trim()
        })
      });
      if (res.ok) {
        alert('Encomenda registrada e morador notificado em tempo real!');
        setPkgText('');
        setPkgUnit(null);
      } else {
        alert('Erro ao registrar encomenda.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao registrar encomenda.');
    } finally {
      setPkgLoading(false);
    }
  };

  const [activeCall, setActiveCall] = useState(null); // { residentSocketId, callerName, unitId, isIncoming, status: 'calling'|'talking'|'ended' }
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer = null;
    setCallDuration(0);
    if (activeCall && (activeCall.status === 'talking' || activeCall.status === 'calling')) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall && activeCall.status]);

  const fmtDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const webrtcStartedRef = useRef(false);
  const remoteAudioRef = useRef(null);

  const navigate = useNavigate();
  const socketRef = useRef(null);

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
      pcRef.current.close();
      pcRef.current = null;
    }
    webrtcStartedRef.current = false;
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
    if (activeCall && socketRef.current) {
      const targetSocket = activeCall.residentSocketId;
      if (targetSocket) {
        socketRef.current.emit('call_ended', { target: targetSocket, unitId: activeCall?.unitId, visitId: activeCall?.visitId, duration: callDuration });
      }
    }
    stopAllCall();
    setActiveCall(null);
    setIncomingCall(null);
  };

  const handleAnswerResidentCall = async (incomingCallData) => {
    stopAllCall();
    const residentSocketId = incomingCallData.residentSocketId;
    setActiveCall({
      residentSocketId,
      callerName: incomingCallData.callerName || 'Morador',
      unitId: incomingCallData.unitId,
      isIncoming: true,
      status: 'talking',
      visitId: incomingCallData.visitId
    });
    setIncomingCall(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
    } catch (e) {
      console.warn('[Media] Falha ao capturar áudio local:', e);
    }

    if (socketRef.current && residentSocketId) {
      console.log('[Socket] Atendendo chamada de morador e enviando answer_call / webrtc_ready para:', residentSocketId);
      socketRef.current.emit('answer_call', { visitorSocketId: residentSocketId, mode: 'audio', unitId: incomingCallData.unitId, visitId: incomingCallData.visitId });
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
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('cd_dark_mode', 'true');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('cd_dark_mode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    const role = localStorage.getItem('cd_admin_role');
    const adminEmail = localStorage.getItem('cd_admin_email') || localStorage.getItem('cd_doorman_email');
    const singlePropertyId = localStorage.getItem('cd_doorman_propertyId');

    if (!singlePropertyId && !adminEmail && role !== 'master') {
      navigate('/portaria-login');
      return;
    }

    const fetchData = async () => {
      try {
        let url = `${API}/api/properties`;
        if (role !== 'master') {
          url += `?email=${encodeURIComponent(adminEmail || '')}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        const propsData = Array.isArray(data) ? data : [data];
        setProperties(propsData);

        // Fetch online status initially
        const statusMap = {};
        for (const p of propsData) {
          try {
            const stRes = await fetch(`${API}/api/properties/${p.id}/online-status`);
            const stData = await stRes.json();
            Object.keys(stData).forEach(k => statusMap[k] = stData[k]);
          } catch (e) {}
        }
        setOnlineStatus(statusMap);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Poll online status every 5 seconds
    const statusInterval = setInterval(async () => {
      setProperties(prevProps => {
        prevProps.forEach(async p => {
          try {
            const stRes = await fetch(`${API}/api/properties/${p.id}/online-status`);
            const stData = await stRes.json();
            setOnlineStatus(prev => ({ ...prev, ...stData }));
          } catch (e) {}
        });
        return prevProps;
      });
    }, 5000);

    const s = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = s;
    
    if (singlePropertyId) {
      s.emit('register_doorman', { propertyId: singlePropertyId });
    } else {
      // For master doormen, we might need a global register or register for all
      properties.forEach(p => s.emit('register_doorman', { propertyId: p.id }));
    }

    s.on('entry_authorized', ({ unitId, visitorId, timestamp }) => {
      let uName = 'Morador';
      setProperties(prev => {
        prev.forEach(p => {
          const unit = p.units?.find(u => u.id === unitId);
          if (unit) uName = `${p.name} - ${unit.name}`;
        });
        return prev;
      });
      setAuthorizedEntry({ unitName: uName, timestamp });
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      setTimeout(() => setAuthorizedEntry(null), 15000);
    });

    s.on('resident_message', ({ message, senderName, timestamp, authorizeEntry, unitId }) => {
      setResidentMsg({ message, senderName, timestamp, authorizeEntry, unitId });
      if (authorizeEntry && unitId) {
        setPreAuthorized(prev => ({ ...prev, [unitId]: true }));
      }
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      setTimeout(() => setResidentMsg(null), 20000); 
    });

    s.on('incoming_resident_call', ({ callerName, unitId, residentSocketId }) => {
      setIncomingCall({ callerName, unitId, residentSocketId });
      setTimeout(() => setIncomingCall(null), 30000);
    });

    s.on('incoming_visitor_code', ({ propertyId, visitorName, unitName, code, timestamp }) => {
      const singlePropertyId = localStorage.getItem('cd_doorman_propertyId');
      if (!singlePropertyId || singlePropertyId === propertyId) {
        setValidatedCode({ visitorName, unitName, code, timestamp });
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
        setTimeout(() => setValidatedCode(null), 20000);
      }
    });

    s.on('call_answered', ({ residentSocketId }) => {
      console.log('[Porteiro WS] Call answered by resident:', residentSocketId);
      setActiveCall(prev => prev ? { ...prev, status: 'talking', residentSocketId } : null);
    });

    s.on('webrtc_ready', async ({ residentSocketId }) => {
      console.log('[Porteiro WS] Resident is ready for WebRTC:', residentSocketId);
      if (webrtcStartedRef.current) return;
      webrtcStartedRef.current = true;
      setActiveCall(prev => prev ? { ...prev, status: 'talking', residentSocketId } : null);
      await startOutboundWebRTC(residentSocketId);
    });

    s.on('webrtc_offer', async ({ sender, offer }) => {
      console.log('[Porteiro WS] Received webrtc_offer from resident:', sender);
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
      console.log('[Porteiro WS] webrtc_answer received');
      if (pcRef.current && pcRef.current.signalingState !== 'stable') {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error('[Porteiro WebRTC] Error setting remote description:', e);
        }
      }
    });

    s.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[Porteiro WebRTC] Error adding ICE candidate:', e);
        }
      }
    });

    s.on('call_ended', () => {
      console.log('[Porteiro WS] Call ended');
      stopAllCall();
      setActiveCall(null);
      setIncomingCall(null);
    });

    return () => {
      s.disconnect();
      clearInterval(statusInterval);
      stopAllCall();
    };
  }, [navigate, properties]);

  const handleValidateCode = async (e) => {
    e.preventDefault();
    if (!visitorCodeInput.trim()) return;
    const singlePropertyId = localStorage.getItem('cd_doorman_propertyId') || (properties[0] && properties[0].id);
    if (!singlePropertyId) {
      alert('Selecione uma vila/condomínio primeiro.');
      return;
    }
    setValidatingCode(true);
    setCodeError('');
    try {
      const res = await fetch(`${API}/api/properties/${singlePropertyId}/validate-visitor-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: visitorCodeInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setValidatedCode({
          visitorName: data.visitorName,
          unitName: data.unitName,
          code: visitorCodeInput.trim(),
          timestamp: new Date()
        });
        setVisitorCodeInput('');
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      } else {
        setCodeError(data.error || 'Código inválido ou expirado.');
      }
    } catch {
      setCodeError('Erro ao conectar com o servidor.');
    }
    setValidatingCode(false);
  };

  const sendMessage = (unit) => {
    if (!msgText.trim() || !socketRef.current) return;
    socketRef.current.emit('doorman_message', {
      unitId: unit.id,
      propertyId: unit.propertyId,
      message: msgText.trim(),
      senderName: 'Portaria'
    });
    setMsgSent(true);
    setTimeout(() => { setMsgSent(false); setMsgUnit(null); setMsgText(''); }, 2000);
  };

  const callUnit = async (unit) => {
    if (activeCall) return;
    setActiveCall({
      residentSocketId: null,
      callerName: unit.name,
      unitId: unit.id,
      isIncoming: false,
      status: 'calling'
    });

    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/voip/call/apartamento`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ unitId: unit.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          console.log('[VoIP Control] Chamada VoIP iniciada para o grupo:', data.ramal_grupo);
          setActiveCall({
            residentSocketId: null,
            callerName: `${unit.name} (Grupo ${data.ramal_grupo})`,
            unitId: unit.id,
            isIncoming: false,
            status: 'calling',
            callId: data.callId
          });
        }
      } else {
        if (socketRef.current) {
          socketRef.current.emit('doorman_call', {
            unitId: unit.id,
            propertyId: unit.propertyId,
            callerName: 'Portaria'
          });
        }
      }
    } catch (err) {
      console.warn('[VoIP Control] Erro ao chamar via VoIP, usando chamada socket legada...', err);
      if (socketRef.current) {
        socketRef.current.emit('doorman_call', {
          unitId: unit.id,
          propertyId: unit.propertyId,
          callerName: 'Portaria'
        });
      }
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando painel de controle...</div>;

  const allUnits = properties.flatMap(p => (p.units || []).map(u => ({ ...u, propertyName: p.name, propertyId: p.id })));
  
  // Agrupar unidades por blocos (de Bloco 1 a Bloco 6)
  const getBlockName = (unit) => {
    if (unit.block) {
      const b = String(unit.block).trim();
      return b.toLowerCase().startsWith('bloco') ? b : `Bloco ${b}`;
    }
    if (unit.name) {
      const match = unit.name.match(/^B([1-6])[-]/i);
      if (match) {
        return `Bloco ${match[1]}`;
      }
    }
    return 'Bloco 1'; // fallback padrão
  };

  const availableBlocks = ['Bloco 1', 'Bloco 2', 'Bloco 3', 'Bloco 4', 'Bloco 5', 'Bloco 6'];

  const getUnitsForBlock = (blockName) => {
    return allUnits.filter(u => getBlockName(u) === blockName);
  };

  // Se um bloco estiver selecionado, filtra as unidades desse bloco pelo campo de busca
  const blockUnits = selectedBlock ? getUnitsForBlock(selectedBlock) : [];
  const filteredUnits = blockUnits.filter(u => {
    return !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.number || '').toLowerCase().includes(search.toLowerCase());
  });

  const triggerSocial = async () => {
    const unit = allUnits.find(u => getBlockName(u) === 'Bloco 1') || allUnits[0];
    if (unit) {
      try {
        await fetch(`${API}/api/units/${unit.id}/open-gate`, { method: 'POST' });
      } catch (e) {
        console.warn('Erro ao acionar abertura via API:', e);
      }
    }
    alert('[Sonoff] Comando de abertura portão SOCIAL enviado com sucesso!');
  };

  const triggerGarage = async () => {
    const unit = allUnits.find(u => getBlockName(u) === 'Bloco 2') || allUnits[0];
    if (unit) {
      try {
        await fetch(`${API}/api/units/${unit.id}/open-gate`, { method: 'POST' });
      } catch (e) {
        console.warn('Erro ao acionar abertura via API:', e);
      }
    }
    alert('[Sonoff] Comando de abertura portão VEÍCULOS enviado com sucesso!');
  };

  const bgDeep = darkMode ? '#090D16' : '#F8FAFC';
  const bgSurface = darkMode ? '#0F172A' : '#FFFFFF';
  const bgSurfaceElevated = darkMode ? '#1E293B' : '#F1F5F9';
  const borderSubtle = darkMode ? '#1E293B' : '#E2E8F0';
  const textMain = darkMode ? '#F8FAFC' : '#0F172A';
  const textMuted = darkMode ? '#94A3B8' : '#64748B';

  return (
    <div style={{ minHeight: '100vh', background: bgDeep, color: textMain, transition: 'all 0.2s ease', fontFamily: "'Outfit', sans-serif" }}>
      {/* HEADER */}
      <header style={{ 
        padding: '20px 40px', 
        background: bgSurface, 
        borderBottom: `1px solid ${borderSubtle}`, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={28} showText={false} />
          <span style={{ fontSize: '18px', fontWeight: 800, color: textMain }}>Campainha Digital</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Botão de Validar Código */}
          <button 
            onClick={() => setShowCodeValidator(true)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '13px', 
              fontWeight: 700, 
              color: '#8B5CF6', 
              background: darkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', 
              border: '1px solid rgba(139, 92, 246, 0.2)', 
              cursor: 'pointer', 
              padding: '8px 16px', 
              borderRadius: '100px', 
              transition: 'all 0.2s' 
            }}
          >
            <KeyRound size={14} /> Validar Código
          </button>

          {/* Alternador de Tema */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px', 
              fontWeight: 700, 
              color: textMuted, 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '6px 12px', 
              borderRadius: '100px', 
              transition: 'all 0.2s' 
            }}
          >
            {darkMode ? <><Sun size={16} color="#F59E0B" /> Modo Claro</> : <><Moon size={16} color="#3B82F6" /> Modo Noturno</>}
          </button>

          {/* Email / Status do Porteiro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: textMuted, fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span>{localStorage.getItem('cd_doorman_email') || localStorage.getItem('cd_admin_email') || 'porteiroliber@hotmail.com'}</span>
          </div>

          {/* Sair */}
          <button 
            onClick={() => {
              [
                'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
                'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
                'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
                'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
                'cd_admin_name', 'cd_admin_password', 'cd_property_type'
              ].forEach(k => localStorage.removeItem(k));
              document.body.classList.remove('dark-theme');
              navigate('/');
            }} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: textMuted, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer', 
              fontWeight: 700, 
              fontSize: '13px' 
            }}
          >
            <LogOut size={16}/> Sair
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Banner de Chamada Ativa WebRTC */}
        {activeCall && (
          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '2px solid #3B82F6',
            padding: '24px',
            borderRadius: '24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 10px 30px rgba(59,130,246,0.2)',
            animation: activeCall.status === 'calling' ? 'pulse 2.5s infinite' : 'none',
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
                  {activeCall.status === 'calling' 
                    ? `🔔 Chamando morador... (${fmtDuration(callDuration)})` 
                    : `🎙️ Comunicação de voz ativa — ${fmtDuration(callDuration)}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleHangup}
              style={{
                background: '#EF4444',
                color: '#FFF',
                border: 'none',
                padding: '14px 28px',
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

        {/* Alerta de Acesso por Código Validado */}
        {validatedCode && (
          <div style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', padding: '24px', borderRadius: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(139,92,246,0.25)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Visitante Pré-Autorizado!</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Visitante: <strong>{validatedCode.visitorName}</strong> para a unidade <strong>{validatedCode.unitName}</strong> (Código: {validatedCode.code}).</p>
            </div>
            <button onClick={() => setValidatedCode(null)} style={{ background: '#FFF', border: 'none', color: '#6D28D9', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
              Confirmar Entrada
            </button>
          </div>
        )}

        {/* Alerta de Acesso Liberado */}
        {authorizedEntry && (
          <div style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', padding: '24px', borderRadius: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Acesso Liberado!</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Morador de <strong>{authorizedEntry.unitName}</strong> autorizou a entrada.</p>
            </div>
          </div>
        )}

        {/* Notificação de Mensagem Recebida do Morador */}
        {residentMsg && (
          <div style={{ background: bgSurface, border: '2px solid #3B82F6', padding: '20px', borderRadius: '20px', marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 8px 24px rgba(59,130,246,0.15)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: textMain }}>Mensagem de: {residentMsg.senderName}</h2>
              <p style={{ margin: 0, color: textMuted, fontSize: '14px', lineHeight: 1.5 }}>"{residentMsg.message}"</p>
              {residentMsg.authorizeEntry && (
                <div style={{ marginTop: '8px', background: '#DCFCE7', color: '#166534', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, display: 'inline-block' }}>
                  🔓 ACESSO ANTECIPADO LIBERADO
                </div>
              )}
              <div style={{ marginTop: '12px' }}>
                <button onClick={() => setResidentMsg(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: '#FFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Ciente</button>
              </div>
            </div>
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
              <div style={{
                position: 'absolute',
                top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '120px',
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)',
                borderRadius: '0 0 4px 4px'
              }} />

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
                <PhoneCall size={38} />
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

        {/* MODAL: VALIDAÇÃO DE CÓDIGO DE VISITANTE */}
        {showCodeValidator && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}>
            <div style={{
              background: bgSurface,
              border: `2px solid ${borderSubtle}`,
              borderRadius: '24px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
              <button 
                onClick={() => { setShowCodeValidator(false); setCodeError(''); setVisitorCodeInput(''); }} 
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
              >
                ✕
              </button>

              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: textMain }}>
                <KeyRound size={20} color="#8B5CF6"/> Validar Código do Visitante
              </h3>

              <form onSubmit={handleValidateCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: textMuted, marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>CÓDIGO DE 6 DÍGITOS</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="Ex: 582491" 
                    value={visitorCodeInput} 
                    onChange={e => setVisitorCodeInput(e.target.value.replace(/[^0-9]/g, ''))} 
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      fontSize: '24px', 
                      fontWeight: 800, 
                      letterSpacing: '6px', 
                      textAlign: 'center',
                      borderRadius: '14px', 
                      border: `1px solid ${borderSubtle}`, 
                      background: bgDeep, 
                      color: textMain,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={validatingCode || visitorCodeInput.length !== 6}
                  style={{ 
                    padding: '16px', 
                    borderRadius: '14px', 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', 
                    color: '#FFF', 
                    fontWeight: 800, 
                    fontSize: '15px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '8px', 
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)', 
                    opacity: visitorCodeInput.length === 6 ? 1 : 0.6 
                  }}
                >
                  {validatingCode ? 'Validando...' : 'Validar Acesso'}
                </button>
              </form>
              
              {codeError && (
                <p style={{ color: '#EF4444', fontSize: '13px', fontWeight: 600, marginTop: '14px', textAlign: 'center' }}>✗ {codeError}</p>
              )}
            </div>
          </div>
        )}

        {/* MODAL: QUADRO DE RESERVAS (Inspirado no uCondo) */}
        {showBookingsModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}>
            <div style={{
              background: bgSurface,
              border: `1px solid ${borderSubtle}`,
              borderRadius: '24px',
              padding: '32px',
              width: '90%',
              maxWidth: '650px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              position: 'relative'
            }} className="lux-glass">
              <button 
                onClick={() => setShowBookingsModal(false)} 
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>

              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF' }}>
                📅 Quadro de Reservas de Áreas Comuns
              </h3>
              <p style={{ fontSize: '12px', color: textMuted, marginBottom: '20px' }}>
                Consulte a lista de agendamentos autorizados para Churrasqueira, Piscina e Salão de Festas.
              </p>

              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bookingLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: textMuted }}>Buscando reservas...</div>
                ) : bookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: textMuted, fontSize: '13px' }}>
                    Nenhuma reserva ativa registrada no condomínio.
                  </div>
                ) : (
                  bookings.map(b => (
                    <div 
                      key={b.id} 
                      style={{ 
                        padding: '14px 20px', 
                        background: 'rgba(255,255,255,0.02)', 
                        border: `1px solid ${borderSubtle}`, 
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>{b.areaName}</div>
                        <div style={{ fontSize: '11px', color: textMuted, marginTop: '4px' }}>
                          Unidade: <strong>{b.unit ? b.unit.name : 'Morador'}</strong>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>
                        {new Date(b.bookingDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 1: PAINEL SONOFF DUAL */}
        <div style={{
          background: bgSurface,
          border: `1px solid ${borderSubtle}`,
          borderRadius: '24px',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${darkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)'}`
            }}>
              <span style={{ fontSize: '20px', color: '#3B82F6' }}>⚡</span>
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: textMain }}>
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
                    display: 'inline-block' 
                  }} />
                  CONECTADO
                </span>
              </h4>
              <p style={{ fontSize: '13px', color: textMuted, margin: '4px 0 0', fontWeight: 500 }}>
                Integração eWelink para abertura remota de portões sociais e de garagem.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={triggerSocial} 
              style={{ 
                background: '#10B981', 
                color: '#FFF', 
                border: 'none', 
                padding: '14px 24px', 
                borderRadius: '12px', 
                fontSize: '14px', 
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
            
            <button 
              onClick={triggerGarage} 
              style={{ 
                background: '#4F46E5', 
                color: '#FFF', 
                border: 'none', 
                padding: '14px 24px', 
                borderRadius: '12px', 
                fontSize: '14px', 
                fontWeight: 800, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}
            >
              🚗 Portão Garagem
            </button>

            <button 
              onClick={() => { setShowBookingsModal(true); fetchBookings(); }} 
              style={{ 
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', 
                color: '#FFF', 
                border: 'none', 
                padding: '14px 24px', 
                borderRadius: '12px', 
                fontSize: '14px', 
                fontWeight: 800, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}
            >
              📅 Ver Reservas
            </button>
          </div>
        </div>

        {/* SEÇÃO 2: DISTRIBUIÇÃO POR BLOCOS (TELA PRINCIPAL) OU VISÃO DETALHADA DO BLOCO */}
        {!selectedBlock ? (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: textMain }}>
              🏢 Distribuição por Blocos
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {availableBlocks.map(blockName => {
                const unitsInBlock = getUnitsForBlock(blockName);
                const totalUnits = unitsInBlock.length > 0 ? unitsInBlock.length : 132;
                
                const onlineCount = unitsInBlock.length > 0 
                  ? unitsInBlock.filter(u => onlineStatus[u.id] === 'online').length 
                  : (blockName === 'Bloco 1' ? 1 : 0);
                const offlineCount = unitsInBlock.length > 0 
                  ? Math.max(0, unitsInBlock.length - onlineCount) 
                  : (blockName === 'Bloco 1' ? 131 : 132);

                return (
                  <div 
                    key={blockName}
                    onClick={() => { setSelectedBlock(blockName); setSearch(''); }}
                    style={{ 
                      background: bgSurface, 
                      border: `1px solid ${borderSubtle}`, 
                      borderRadius: '20px', 
                      padding: '24px', 
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease-in-out',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = '#4F46E5';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.borderColor = borderSubtle;
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: textMain, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏢 {blockName}
                      </h4>
                      <p style={{ fontSize: '13px', color: textMuted, margin: 0, fontWeight: 500 }}>
                        📊 {totalUnits} unidades cadastradas
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ 
                        background: '#062F24', 
                        color: '#10B981', 
                        padding: '4px 12px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                        {onlineCount} Online
                      </span>
                      
                      <span style={{ 
                        background: '#2D161A', 
                        color: '#EF4444', 
                        padding: '4px 12px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                        {offlineCount} Offline
                      </span>
                    </div>

                    <div style={{ 
                      alignSelf: 'flex-end', 
                      fontSize: '13px', 
                      color: '#3B82F6', 
                      fontWeight: 800, 
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      Entrar no Bloco →
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SUB-TELA DETALHADA DO BLOCO */
          <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: textMain, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🏢 {selectedBlock}
                </h3>
                <p style={{ fontSize: '13px', color: textMuted, margin: '4px 0 0', fontWeight: 500 }}>
                  Exibindo moradores e apartamentos cadastrados neste bloco.
                </p>
              </div>

              <button 
                onClick={() => setSelectedBlock(null)}
                style={{ 
                  background: bgSurface, 
                  border: `1px solid ${borderSubtle}`, 
                  color: textMain, 
                  padding: '12px 24px', 
                  borderRadius: '12px', 
                  fontWeight: 800, 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = bgSurfaceElevated}
                onMouseLeave={e => e.currentTarget.style.background = bgSurface}
              >
                ← Voltar para os Blocos
              </button>
            </div>

            {/* Barra de busca específica do bloco */}
            <div style={{ 
              marginBottom: '32px', 
              background: bgSurface, 
              borderRadius: '20px', 
              padding: '24px', 
              border: `1px solid ${borderSubtle}`, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)' 
            }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: textMuted }}><Search size={20} /></span>
                <input 
                  type="text" 
                  placeholder="Buscar por apartamento ou número..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '16px 16px 16px 48px', 
                    fontSize: '16px', 
                    fontWeight: 600,
                    borderRadius: '12px', 
                    border: `1px solid ${borderSubtle}`, 
                    background: bgDeep, 
                    color: textMain,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>
            </div>

            {/* Lista de unidades filtradas no bloco */}
            {filteredUnits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: textMuted, background: bgSurface, borderRadius: '20px', border: `1px solid ${borderSubtle}` }}>
                <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Nenhum apartamento encontrado correspondente à busca.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredUnits.map(unit => (
                  <div 
                    key={`${unit.propertyId}-${unit.id}`} 
                    style={{ 
                      background: bgSurface, 
                      padding: '24px', 
                      borderRadius: '20px', 
                      border: `1px solid ${borderSubtle}`, 
                      boxShadow: '0 2px 4px rgba(0,0,0,0.01)', 
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '160px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {unit.propertyName}
                        </span>
                        
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: onlineStatus[unit.id] === 'online' ? '#10B981' : textMuted
                        }}>
                          <span style={{ 
                            display: 'inline-block', 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: onlineStatus[unit.id] === 'online' ? '#10B981' : '#94A3B8',
                            boxShadow: onlineStatus[unit.id] === 'online' ? '0 0 8px rgba(16,185,129,0.6)' : 'none'
                          }} />
                          {onlineStatus[unit.id] === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 12px', color: textMain }}>
                        {unit.name}
                      </h3>
                    </div>

                    <div>
                      {/* Botões de Ação Táteis */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => callUnit(unit)} 
                          style={{ 
                            flex: 1, 
                            padding: '12px 14px', 
                            borderRadius: '10px', 
                            background: 'linear-gradient(135deg,#10B981,#059669)', 
                            border: 'none', 
                            color: '#fff', 
                            fontWeight: 800, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            cursor: 'pointer', 
                            fontSize: '12px', 
                            boxShadow: '0 4px 12px rgba(16,185,129,0.2)' 
                          }}
                        >
                          <Phone size={13} /> Chamar
                        </button>
                        
                        <button 
                          onClick={() => { setMsgUnit(msgUnit === unit.id ? null : unit.id); setMsgText(''); setPkgUnit(null); }} 
                          style={{ 
                            flex: 1, 
                            padding: '12px 14px', 
                            borderRadius: '10px', 
                            background: msgUnit === unit.id ? bgSurfaceElevated : 'linear-gradient(135deg,#3B82F6,#2563EB)', 
                            border: 'none', 
                            color: msgUnit === unit.id ? textMuted : '#fff', 
                            fontWeight: 800, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            cursor: 'pointer', 
                            fontSize: '12px' 
                          }}
                        >
                          {msgUnit === unit.id ? <><X size={12}/>Fechar</> : <><MessageSquare size={13}/>Mensagem</>}
                        </button>

                        <button 
                          onClick={() => { setPkgUnit(pkgUnit === unit.id ? null : unit.id); setPkgText(''); setMsgUnit(null); }} 
                          style={{ 
                            flex: 1, 
                            padding: '12px 14px', 
                            borderRadius: '10px', 
                            background: pkgUnit === unit.id ? bgSurfaceElevated : 'linear-gradient(135deg,#F59E0B,#D97706)', 
                            border: 'none', 
                            color: pkgUnit === unit.id ? textMuted : '#fff', 
                            fontWeight: 800, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            cursor: 'pointer', 
                            fontSize: '12px',
                            boxShadow: pkgUnit === unit.id ? 'none' : '0 4px 12px rgba(245,158,11,0.2)'
                          }}
                        >
                          {pkgUnit === unit.id ? <><X size={12}/>Fechar</> : <><Package size={13}/>Encomenda</>}
                        </button>
                      </div>

                      {/* Área de Mensagem Inline */}
                      {msgUnit === unit.id && (
                        <div style={{ marginTop: '12px', animation: 'fadeIn 0.2s ease-out' }}>
                          <textarea
                            placeholder="Digite a mensagem..."
                            value={msgText}
                            onChange={e => setMsgText(e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '10px', 
                              borderRadius: '8px', 
                              border: `1px solid ${borderSubtle}`, 
                              fontSize: '13px', 
                              color: textMain,
                              outline: 'none', 
                              resize: 'none', 
                              minHeight: '60px', 
                              fontFamily: 'inherit', 
                              background: bgDeep,
                              boxSizing: 'border-box'
                            }}
                          />
                          <button 
                            onClick={() => sendMessage(unit)} 
                            disabled={!msgText.trim()} 
                            style={{ 
                              width: '100%', 
                              marginTop: '6px', 
                              padding: '10px', 
                              borderRadius: '8px', 
                              background: msgSent ? '#10B981' : '#3B82F6', 
                              border: 'none', 
                              color: '#fff', 
                              fontWeight: 800, 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '6px', 
                              fontSize: '12px', 
                              opacity: msgText.trim() ? 1 : 0.5 
                            }}
                          >
                            {msgSent ? '✓ Enviada' : <><Send size={12}/>Enviar</>}
                          </button>
                        </div>
                      )}

                      {/* Área de Encomenda Inline */}
                      {pkgUnit === unit.id && (
                        <div style={{ marginTop: '12px', animation: 'fadeIn 0.2s ease-out' }}>
                          <input
                            type="text"
                            placeholder="Ex: Amazon / Pacote / Correspondência"
                            value={pkgText}
                            onChange={e => setPkgText(e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '10px 12px', 
                              borderRadius: '8px', 
                              border: `1px solid ${borderSubtle}`, 
                              fontSize: '13px', 
                              color: textMain,
                              outline: 'none', 
                              background: bgDeep,
                              boxSizing: 'border-box'
                            }}
                          />
                          <button 
                            onClick={() => logPackage(unit)} 
                            disabled={!pkgText.trim() || pkgLoading} 
                            style={{ 
                              width: '100%', 
                              marginTop: '6px', 
                              padding: '10.5px', 
                              borderRadius: '8px', 
                              border: 'none', 
                              background: 'linear-gradient(135deg,#F59E0B,#D97706)', 
                              color: '#fff', 
                              fontWeight: 800, 
                              fontSize: '12.5px', 
                              cursor: pkgText.trim() ? 'pointer' : 'default', 
                              opacity: pkgText.trim() ? 1 : 0.6 
                            }}
                          >
                            {pkgLoading ? 'Registrando...' : 'Confirmar Encomenda'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}

