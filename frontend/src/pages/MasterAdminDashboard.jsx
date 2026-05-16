import React, { useState, useEffect, useRef } from 'react';
import { Users, Building2, Gift, History, Settings2, LogOut, ChevronRight, RefreshCw, Search, ToggleRight, ToggleLeft, QrCode, Copy, Check, Download, X, Hash, Layers } from 'lucide-react';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { API } from '../config';

export default function MasterAdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModal, setQrModal] = useState(null); // { user, mode: 'option1'|'option2' }
  const [qrImage, setQrImage] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users`, { headers: { 'Authorization': token } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleModule = async (userId, module, currentVal) => {
    try {
      const token = localStorage.getItem('cd_token');
      await fetch(`${API}/api/master/users/${userId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ [module]: !currentVal })
      });
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const giveFreeMonth = async (userId) => {
    if (!window.confirm('Dar 1 mês grátis?')) return;
    const token = localStorage.getItem('cd_token');
    const res = await fetch(`${API}/api/master/users/${userId}/promo`, { method: 'POST', headers: { 'Authorization': token } });
    if (res.ok) { alert('Promoção ativada!'); fetchUsers(); }
  };

  // Gerar QR Code a partir de texto
  const loadQrCode = async (text, isPlate = false) => {
    if (!text) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const finalUrl = isPlate 
      ? `${baseUrl}#/auth?plate=${text}`
      : `${baseUrl}#/chamada/${text}`; // Aqui text será o ID da propriedade/unidade
    
    try {
      const res = await fetch(`${API}/api/qrcode?text=${encodeURIComponent(finalUrl)}`);
      const data = await res.json();
      setQrImage(data.qrcode || '');
    } catch { setQrImage(''); }
  };

  // Opção 2: gerar clientCode para o usuário
  const generateClientCode = async (userId) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users/${userId}/generate-client-code`, {
        method: 'POST', headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (data.clientCode) {
        await fetchUsers();
        const updated = users.map(u => u.id === userId ? { ...u, clientCode: data.clientCode } : u);
        const user = updated.find(u => u.id === userId) || { ...qrModal.user, clientCode: data.clientCode };
        setQrModal(m => ({ ...m, user: { ...m.user, clientCode: data.clientCode } }));
        // Se o usuário tem uma propriedade, usamos o ID dela para o QR de chamada
        const propId = data.propertyId || userId; 
        await loadQrCode(propId, false);
      }
    } catch { alert('Erro ao gerar código.'); }
    finally { setActionLoading(false); }
  };

  // Opção 1: definir plateCode para o usuário
  const setPlateCode = async (userId) => {
    if (!plateInput.trim()) return alert('Digite o código da placa.');
    setActionLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users/${userId}/set-plate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ plateCode: plateInput.trim().toUpperCase() })
      });
      const data = await res.json();
      if (res.ok) {
        setQrModal(m => ({ ...m, user: { ...m.user, plateCode: data.plateCode } }));
        await loadQrCode(data.plateCode, true);
        fetchUsers();
      } else {
        alert(data.error || 'Erro ao definir placa.');
      }
    } catch { alert('Erro de conexão.'); }
    finally { setActionLoading(false); }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const downloadQr = (name) => {
    const a = document.createElement('a');
    a.href = qrImage;
    a.download = `QR_${name}.png`;
    a.click();
  };

  const openQrModal = async (user, mode) => {
    setQrModal({ user, mode });
    setPlateInput('');
    setQrImage('');
    // Se já tem código, carrega o QR automaticamente
    if (mode === 'option2') {
      // Para o cliente, tentamos pegar o ID da propriedade dele
      const propId = user.properties?.[0]?.id || user.id;
      await loadQrCode(propId, false);
    }
    if (mode === 'option1' && user.plateCode) {
      await loadQrCode(user.plateCode, true);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const addressMatch = u.propertiesManaged?.some(p => p.clientAddress?.toLowerCase().includes(q));
    return u.name?.toLowerCase().includes(q) ||
           u.email?.toLowerCase().includes(q) ||
           u.phone?.includes(searchQuery) ||
           addressMatch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: '260px', background: '#FFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '28px 24px' }}><Logo size={32} /></div>
        <nav style={{ padding: '0 12px', flex: 1 }}>
          <SidebarLink icon={Users} label="Usuários & Módulos" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarLink icon={Building2} label="Propriedades" active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} />
          <SidebarLink icon={Gift} label="Promoções" active={activeTab === 'promos'} onClick={() => setActiveTab('promos')} />
          <SidebarLink icon={History} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <SidebarLink icon={Settings2} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={() => { localStorage.clear(); navigate('/auth'); }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', color: '#DC2626', background: '#FEF2F2', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <LogOut size={16} /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px', margin: 0 }}>
              {activeTab === 'users' ? 'Usuários & QR Codes' : 'Controle Master'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '15px', marginTop: '4px' }}>Gerencie permissões, QR Codes e placas dos clientes.</p>
          </div>
          <button onClick={fetchUsers} style={{ padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer' }}>
            <RefreshCw size={20} />
          </button>
        </header>

        {/* SEARCH */}
        <div style={{ marginBottom: '24px', background: '#FFF', padding: '14px 16px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Buscar por nome, email ou celular..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '10px', border: '1px solid #F1F5F9', background: '#F8FAFC', outline: 'none', fontSize: '14px' }} />
          </div>
        </div>

        {/* USERS TABLE */}
        {activeTab === 'users' && (
          <div style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F8FAFC' }}>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuário</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Módulos</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QR Code</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trial</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Carregando...</td></tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{user.email || user.phone}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <ModuleBadge label="Cliente Final" active={user.isResident} onClick={() => toggleModule(user.id, 'isResident', user.isResident)} />
                        <ModuleBadge label="Admin de Vilas" active={user.isAdmin} onClick={() => toggleModule(user.id, 'isAdmin', user.isAdmin)} />
                        <ModuleBadge label="Zelador" active={user.isDoorman} onClick={() => toggleModule(user.id, 'isDoorman', user.isDoorman)} />
                        <ModuleBadge label="Revendedor" active={user.isReseller} onClick={() => toggleModule(user.id, 'isReseller', user.isReseller)} />
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Opção 1: Placa Pré-configurada */}
                        <button onClick={() => openQrModal(user, 'option1')}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${user.plateCode ? '#10B981' : '#E2E8F0'}`, background: user.plateCode ? 'rgba(16,185,129,0.06)' : '#F8FAFC', color: user.plateCode ? '#047857' : '#64748B', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                          <Layers size={13} /> Placa Física {user.plateCode ? '✓' : '—'}
                        </button>
                        {/* Opção 2: QR gerado pelo cliente */}
                        <button onClick={() => openQrModal(user, 'option2')}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${user.clientCode ? '#3B82F6' : '#E2E8F0'}`, background: user.clientCode ? 'rgba(59,130,246,0.06)' : '#F8FAFC', color: user.clientCode ? '#1D4ED8' : '#64748B', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                          <QrCode size={13} /> QR do Cliente {user.clientCode ? '✓' : '—'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: user.trialEndsAt && new Date(user.trialEndsAt) > new Date() ? '#10B981' : '#EF4444' }}>
                        {user.trialEndsAt ? `Exp. ${new Date(user.trialEndsAt).toLocaleDateString('pt-BR')}` : 'Vitalício'}
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <button onClick={() => giveFreeMonth(user.id)}
                        style={{ padding: '8px 14px', borderRadius: '10px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        +1 Mês
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab !== 'users' && (
          <div style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>Seção em construção.</p>
          </div>
        )}
      </main>

      {/* QR CODE MODAL */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setQrModal(null); }}>
          <div style={{ background: '#FFF', borderRadius: '28px', padding: '40px', width: '100%', maxWidth: '520px', boxShadow: '0 40px 100px rgba(0,0,0,0.2)', position: 'relative' }}>

            <button onClick={() => setQrModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#64748B" />
            </button>

            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginBottom: '4px' }}>
                {qrModal.mode === 'option1' ? '📦 Placa Física Pré-configurada' : '📱 QR Code do Cliente'}
              </h3>
              <p style={{ color: '#64748B', fontSize: '14px' }}>
                {qrModal.mode === 'option1'
                  ? 'Defina o código da placa entregue ao cliente. Quando ele escanear, o sistema gera o código único dele.'
                  : 'Gere um código único para o cliente. Ele pode imprimir e usar como QR Code próprio.'}
              </p>
              <div style={{ marginTop: '8px', padding: '8px 14px', background: '#F8FAFC', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{qrModal.user.name}</span>
                <span style={{ color: '#64748B', fontSize: '13px' }}>{qrModal.user.email || qrModal.user.phone}</span>
              </div>
            </div>

            {/* OPÇÃO 1 */}
            {qrModal.mode === 'option1' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Código da Placa Física</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      value={plateInput}
                      onChange={e => setPlateInput(e.target.value.toUpperCase())}
                      placeholder={qrModal.user.plateCode || 'Ex: PLACA-A1B2C3'}
                      style={{ flex: 1, padding: '14px 16px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '15px', fontWeight: 700, letterSpacing: '2px', outline: 'none', textTransform: 'uppercase' }}
                    />
                    <button onClick={() => setPlateCode(qrModal.user.id)} disabled={actionLoading}
                      style={{ padding: '14px 20px', borderRadius: '12px', background: '#10B981', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {actionLoading ? '...' : 'Definir'}
                    </button>
                  </div>
                  {qrModal.user.plateCode && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>✓ Código atual:</span>
                      <code style={{ fontSize: '13px', fontWeight: 800, color: '#047857', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{qrModal.user.plateCode}</code>
                      <button onClick={() => copyText(qrModal.user.plateCode, 'plate')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === 'plate' ? '#10B981' : '#94A3B8' }}>
                        {copiedId === 'plate' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', borderRadius: '16px', border: '1px dashed rgba(16,185,129,0.3)', fontSize: '13px', color: '#047857', lineHeight: 1.6 }}>
                  <strong>Como funciona:</strong> Defina o código acima e grave-o na placa física. Quando o cliente escanear o QR da placa com o app, o sistema vincula automaticamente e gera o código único dele.
                </div>
              </div>
            )}

            {/* OPÇÃO 2 */}
            {qrModal.mode === 'option2' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  {qrModal.user.clientCode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'rgba(59,130,246,0.06)', borderRadius: '14px', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <Hash size={20} color="#3B82F6" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código Único do Cliente</div>
                        <code style={{ fontSize: '22px', fontWeight: 900, color: '#1D4ED8', letterSpacing: '4px' }}>{qrModal.user.clientCode}</code>
                      </div>
                      <button onClick={() => copyText(qrModal.user.clientCode, 'client')}
                        style={{ padding: '8px', borderRadius: '8px', background: copiedId === 'client' ? '#10B981' : '#3B82F6', border: 'none', cursor: 'pointer', color: '#FFF' }}>
                        {copiedId === 'client' ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #E2E8F0', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                      Nenhum código gerado ainda.
                    </div>
                  )}
                </div>

                <button onClick={() => generateClientCode(qrModal.user.id)} disabled={actionLoading}
                  style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                  <QrCode size={20} /> {actionLoading ? 'Gerando...' : (qrModal.user.clientCode ? 'Gerar Novo Código' : 'Gerar Código Único')}
                </button>

                <div style={{ padding: '14px', background: 'rgba(59,130,246,0.05)', borderRadius: '14px', border: '1px dashed rgba(59,130,246,0.2)', fontSize: '13px', color: '#1D4ED8', lineHeight: 1.6 }}>
                  <strong>Como funciona:</strong> Gere o código e compartilhe com o cliente. Ele usa este código para acessar o sistema e pode imprimir o QR Code abaixo.
                </div>
              </div>
            )}

            {/* QR CODE IMAGE */}
            {qrImage && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <div style={{ padding: '20px', background: '#FFF', borderRadius: '16px', border: '2px solid #E2E8F0', display: 'inline-block' }}>
                  <img src={qrImage} alt="QR Code" style={{ width: '200px', height: '200px' }} />
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => downloadQr(qrModal.user.name)}
                    style={{ padding: '12px 24px', borderRadius: '12px', background: '#0F172A', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={16} /> Baixar QR Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: active ? 'rgba(59,130,246,0.08)' : 'transparent', color: active ? '#3B82F6' : '#64748B', border: 'none', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '4px' }}>
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      <span style={{ fontWeight: active ? 700 : 500, fontSize: '14px' }}>{label}</span>
      {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
    </button>
  );
}

function ModuleBadge({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '5px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', background: active ? '#10B98115' : '#F1F5F9', borderColor: active ? '#10B981' : '#E2E8F0', color: active ? '#047857' : '#94A3B8' }}>
      {active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
      {label}
    </button>
  );
}
