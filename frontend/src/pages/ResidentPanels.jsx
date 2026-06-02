import React, { useState, useEffect, useRef } from 'react';
import { Clock, User, RefreshCw, Calendar, MapPin, Phone, X, ChevronDown, ChevronUp, Bell, BellOff, Share2, Copy, Check, QrCode, Download, Hash, ShieldCheck, Camera, Eye } from 'lucide-react';
import html2canvas from 'html2canvas';

import { API } from '../config';
import QRScanner from '../components/QRScanner';
import PrintablePlate from '../components/PrintablePlate';

// Funções utilitárias mantidas (fmt, groupByDate, VisitorCard...)
// [Conteúdo omitido para brevidade, mas deve ser mantido no arquivo final]

function fmt(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  let ago = '';
  if (mins < 1) ago = 'Agora';
  else if (mins < 60) ago = `${mins}min atrás`;
  else if (hrs < 24) ago = `${hrs}h atrás`;
  else if (days === 1) ago = 'Ontem';
  else ago = `${days} dias atrás`;
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
    ago
  };
}

function groupByDate(visitors) {
  const groups = {};
  visitors.forEach(v => {
    const d = new Date(v.timestamp).toDateString();
    if (!groups[d]) groups[d] = [];
    groups[d].push(v);
  });
  return Object.entries(groups);
}

function VisitorCard({ v }) {
  const [expanded, setExpanded] = useState(false);
  const { date, time, weekday, ago } = fmt(v.timestamp);
  const name = v.callerName || 'Visitante';
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#FFF', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', background: '#F1F5F9', flexShrink: 0, border: '2px solid var(--border-subtle)', position: 'relative' }}>
          {v.photo
            ? <img src={v.photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} style={{ opacity: 0.3 }} /></div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>{name}</span>
            <span style={{ fontSize: '11px', color: 'var(--primary)', background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>{ago}</span>
            {v.status && (
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 800, 
                padding: '2px 6px', 
                borderRadius: '6px',
                background: v.status === 'answered' ? '#DCFCE7' : v.status === 'missed' ? '#FEE2E2' : '#F3F4F6',
                color: v.status === 'answered' ? '#15803D' : v.status === 'missed' ? '#B91C1C' : '#4B5563'
              }}>
                {v.status === 'answered' ? 'Atendida' : v.status === 'missed' ? 'Perdida' : v.status === 'rejected' ? 'Recusada' : 'Chamando'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Clock size={11} /> {time} • {date}
            {v.duration > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px', color: '#0284C7', fontWeight: 600 }}>
                ⏱️ {Math.floor(v.duration / 60)}m {v.duration % 60}s
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ opacity: 0.4 }} /> : <ChevronDown size={16} style={{ opacity: 0.4 }} />}
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {v.photo ? (
            <img src={v.photo} alt={name} style={{ width: '100%', borderRadius: '12px', maxHeight: '240px', objectFit: 'contain', background: '#000' }} />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', background: '#F8FAFC', borderRadius: '12px' }}>
              📷 Foto não disponível para esta visita
            </div>
          )}
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748B' }}>
            <strong>{weekday}</strong>, {date} às {time}
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryPanel({ unitId, propertyId }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);

  // unitId aqui é o ID do usuário logado (da URL /morador/:id)
  // Usamos a nova rota by-user para buscar todos os visitantes das suas unidades
  const load = async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      // Tenta buscar por ID de Unidade diretamente
      let res = await fetch(`${API}/api/visitors/${unitId}`);
      if (!res.ok) {
        // Se falhar (ex: se o ID na rota for o ID do usuário), busca por ID de Usuário
        res = await fetch(`${API}/api/visitors/by-user/${unitId}`);
      }
      if (res.ok) {
        const data = await res.json();
        setVisitors(data);
      }
    } catch { setVisitors([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [unitId]);

  const groups = groupByDate(visitors);

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Histórico de Visitas</h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', marginBottom: 0 }}>{visitors.length} visita{visitors.length !== 1 ? 's' : ''} registrada{visitors.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} disabled={loading} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer' }}>
          <RefreshCw size={16} color="#64748B" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px' }}>Carregando histórico...</p>
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <User size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
          <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Nenhuma visita registrada</p>
          <p style={{ fontSize: '13px' }}>Quando alguém tocar sua campainha, aparecerá aqui com foto e horário.</p>
        </div>
      ) : groups.map(([dateKey, items]) => (
        <div key={dateKey} style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{dateKey}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map(v => <VisitorCard key={v.id} v={v} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsPanel({ unitName, setUnitName, onSave, unitId, propertyId }) {
  const [enabled, setEnabled] = useState(true);
  const [intercomEnabled, setIntercomEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [inviteCode, setInviteCode] = useState('ABCD-123'); // Exemplo
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientCode, setClientCode] = useState('');
  const [plateCode, setPlateCode] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [newPlateInput, setNewPlateInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    // Buscar configurações do usuário do backend
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/user/settings`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.doorbellEnabled);
        setIntercomEnabled(data.intercomEnabled ?? true);
        setQuietStart(data.quietModeStart || '22:00');
        setQuietEnd(data.quietModeEnd || '07:00');
        setClientCode(data.clientCode || '');
        setPlateCode(data.plateCode || '');
        
        const uName = data.unitName || data.propertyName || '';
        if (uName) {
          setUnitName(uName);
          localStorage.setItem('cd_unit_name', uName);
        }
        
        if (data.plateCode) {
          loadQrCode(data.plateCode, true);
        } else if (data.clientCode) {
          loadQrCode(`CAMPAINHA:${data.clientCode}`, false);
        } else {
          const propId = data.propertyId || unitId;
          if (propId) loadQrCode(propId, false);
        }
      }
    } catch {}
  };

  const loadQrCode = async (code, isPlate) => {
    setQrLoading(true);
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const finalUrl = isPlate 
        ? `${baseUrl}#/auth?plate=${code}`
        : `${baseUrl}#/chamada/${code}`;
      const res = await fetch(`${API}/api/qrcode?text=${encodeURIComponent(finalUrl)}&json=true`);
      const data = await res.json();
      setQrImage(data.qrcode || '');
    } catch {
      setQrImage('');
    } finally {
      setQrLoading(false);
    }
  };

  const generateMyCode = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ generateClientCode: true })
      });
      const data = await res.json();
      if (data.clientCode) {
        setClientCode(data.clientCode);
        loadQrCode(`CAMPAINHA:${data.clientCode}`, false);
        alert('Código único gerado com sucesso!');
        window.location.reload(); 
      }
    } catch {
      alert('Erro ao gerar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPlate = async () => {
    if (!newPlateInput.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/auth/scan-plate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ plateCode: newPlateInput.trim(), userId: localStorage.getItem('cd_user_id') })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Placa física vinculada com sucesso ao seu código!');
        setPlateCode(data.plateCode);
        setNewPlateInput('');
      } else {
        alert(data.error || 'Erro ao vincular placa.');
      }
    } catch {
      alert('Erro de conexão ao vincular placa.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanPlate = (code) => {
    if (code.startsWith('CAMPAINHA:')) {
      code = code.split(':')[1];
    }
    setNewPlateInput(code);
    setShowScanner(false);
  };

  const handleDownloadPlate = async () => {
    if (!printRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `Placa_Campainha_${unitName}.png`;
      a.click();
    } catch (e) {
      alert('Erro ao gerar a imagem da placa.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ 
          doorbellEnabled: enabled, 
          intercomEnabled: intercomEnabled,
          quietModeStart: quietStart, 
          quietModeEnd: quietEnd,
          propertyName: unitName
        })
      });
      if (res.ok) {
        onSave();
        alert('Configurações salvas!');
      } else {
        alert('Erro ao salvar as configurações.');
      }
    } catch {
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Horário de Funcionamento */}
      <section>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color="var(--primary)" /> Horário de Funcionamento
        </h3>
        <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Campainha Ativa</span>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Receber chamadas no celular</p>
            </div>
            <button 
              onClick={() => setEnabled(!enabled)}
              style={{ background: enabled ? '#10B981' : '#F1F5F9', border: 'none', width: '50px', height: '26px', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <div style={{ position: 'absolute', top: '3px', left: enabled ? '27px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#FFF', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s' }} />
            </button>
          </div>

          <div style={{ height: '1px', background: '#F1F5F9' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Interfone de Vizinhos</span>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Disponível para receber chamadas de vizinhos</p>
            </div>
            <button 
              onClick={() => setIntercomEnabled(!intercomEnabled)}
              style={{ background: intercomEnabled ? '#10B981' : '#F1F5F9', border: 'none', width: '50px', height: '26px', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <div style={{ position: 'absolute', top: '3px', left: intercomEnabled ? '27px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#FFF', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s' }} />
            </button>
          </div>

          <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', display: 'block', marginBottom: '8px' }}>Modo Silencioso (Não incomodar)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none' }} />
              <span style={{ color: '#94A3B8' }}>até</span>
              <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none' }} />
            </div>
          </div>
        </div>
      </section>

      {/* QR Code do Cliente */}
      <section>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={20} color="var(--primary)" /> Seu QR Code de Acesso
        </h3>
        <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          
          {clientCode || plateCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#FFF', borderRadius: '16px', border: '2px solid #F1F5F9', position: 'relative' }}>
                {qrLoading ? (
                  <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={24} className="animate-spin" color="#94A3B8" />
                  </div>
                ) : (
                  <img src={qrImage} alt="Seu QR Code" style={{ width: '180px', height: '180px' }} />
                )}
              </div>
              
              <div style={{ background: '#F8FAFC', padding: '12px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', width: '100%' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase' }}>
                  {plateCode && !clientCode ? 'Placa Física Vinculada' : 'Seu Código Único'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', letterSpacing: '2px' }}>
                  {clientCode || plateCode}
                </div>
              </div>

              {/* COMPONENTE INVISÍVEL PARA DOWNLOAD */}
              <PrintablePlate ref={printRef} qrImage={qrImage} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <button 
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Eye size={18} /> Visualizar Placa
                </button>

                <button 
                  type="button"
                  onClick={handleDownloadPlate}
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0F172A', color: '#FFF', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                >
                  <Download size={18} /> {loading ? 'Gerando Placa...' : 'Baixar Placa Completa'}
                </button>
              </div>

              <div style={{ marginTop: '16px', width: '100%', borderTop: '1px solid #E2E8F0', paddingTop: '16px', textAlign: 'left' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>Comprou uma placa nova?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Ex: PLACA-123" 
                    value={newPlateInput}
                    onChange={e => setNewPlateInput(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '13px' }}
                  />
                  <button 
                    onClick={() => setShowScanner(true)}
                    style={{ background: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Camera size={18} />
                  </button>
                  <button 
                    onClick={handleLinkPlate}
                    disabled={loading || !newPlateInput.trim()}
                    style={{ background: '#3B82F6', color: '#FFF', border: 'none', borderRadius: '10px', padding: '0 16px', fontWeight: 700, cursor: 'pointer', opacity: (loading || !newPlateInput.trim()) ? 0.5 : 1 }}
                  >
                    Vincular
                  </button>
                </div>
              </div>

              {plateCode && (
                <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(16,185,129,0.05)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start', textAlign: 'left', width: '100%' }}>
                  <ShieldCheck size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '12px', color: '#047857', margin: 0, lineHeight: 1.5 }}>
                    Você possui a Placa Física <strong>{plateCode}</strong> vinculada ao seu QR Code.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                <QrCode size={40} />
              </div>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Você ainda não tem um QR Code gerado para sua unidade.
              </p>
              <button 
                onClick={generateMyCode}
                disabled={loading}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(59,130,246,0.2)' }}
              >
                {loading ? 'Gerando...' : 'Gerar Meu QR Code Agora'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Nome e Salvar */}
      <section>
        <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>NOME DA UNIDADE / CASA</label>
        <input type="text" value={unitName} onChange={e => setUnitName(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }} />
        
        <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </section>

      {showScanner && (
        <QRScanner onScan={handleScanPlate} onClose={() => setShowScanner(false)} />
      )}

      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#F8FAFC',
            borderRadius: '24px',
            padding: '24px',
            position: 'relative',
            maxWidth: '440px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <button 
              type="button"
              onClick={() => setShowPreviewModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#FFF',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '8px 0 0 0' }}>
              Pré-visualização da Placa
            </h3>
            
            {/* Wrapper to scale down the 400x500 plate on small screens */}
            <div style={{
              width: '100%',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px 0'
            }}>
              <div style={{
                transform: 'scale(0.65)',
                transformOrigin: 'center center',
                margin: '-85px 0' // offsets the scaled-down blank margins
              }}>
                <PrintablePlate qrImage={qrImage} isPreview={true} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button 
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  handleDownloadPlate();
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#0F172A',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Download size={18} /> Baixar PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const DEFAULT_CATEGORIES = [
  { id: 'general', label: 'Geral', messages: ['Já abro!', 'Um momento', 'Não estou em casa'] }
];

