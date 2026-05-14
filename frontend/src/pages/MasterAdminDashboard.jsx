import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Download, Trash2, Home, Building2, TreePine, X, ShieldCheck, LogOut, ChevronRight, Settings, Camera, ScanLine, Clock, User, RefreshCw, Copy, Check, MessageCircle, CreditCard, Users, LayoutDashboard, Database, Activity, History, Settings2, Search, Bell, AlertTriangle, Briefcase, ExternalLink, PieChart, Server, Shield, Globe, FileText, Headphones, BarChart3
} from 'lucide-react';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';



export default function MasterAdminDashboard() {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [newClient, setNewClient] = useState({
    name: '', // Property Name
    type: 'house',
    numUnits: 1,
    clientName: '',
    email: '',
    clientPhone: '',
    clientDocument: '',
    clientAddress: '',
    doormanEmail: '',
    companyName: '',
    plan: 'Basic'
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('cd_admin_role');
    if (role !== 'master') {
      navigate('/auth');
      return;
    }
    fetchClients();
  }, [navigate]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const email = localStorage.getItem('cd_admin_email');
      const res = await fetch(`${API}/api/properties?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setShowScanner(true);
    setScannedId('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Erro ao acessar a câmera.");
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowScanner(false);
  };

  const tick = () => {
    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      canvas.height = videoRef.current.videoHeight;
      canvas.width = videoRef.current.videoWidth;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        const url = code.data;
        const match = url.match(/\/chamada\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          setScannedId(match[1]);
          stopScanner();
          return;
        }
      }
    }
    if (showScanner) requestAnimationFrame(tick);
  };

  const handleRegisterClient = async (e) => {
    e.preventDefault();
    
    // Auto-generate name for houses if empty
    const propertyName = newClient.type === 'house' && !newClient.name 
      ? `Residência ${newClient.clientName}` 
      : newClient.name;

    if (!scannedId || !newClient.email || !newClient.clientName || (!propertyName && newClient.type !== 'house')) {
      alert("Por favor, preencha os campos obrigatórios.");
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch(`${API}/api/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: scannedId,
          adminEmail: newClient.email,
          name: propertyName,
          type: newClient.type,
          clientName: newClient.clientName,
          clientPhone: newClient.clientPhone,
          clientDocument: newClient.clientDocument,
          clientAddress: newClient.clientAddress,
          doormanEmail: newClient.doormanEmail,
          companyName: newClient.companyName,
          plan: newClient.plan,
          units: newClient.type !== 'house' ? Array.from({ length: newClient.numUnits }, (_, i) => ({ name: `Unidade ${i + 1}` })) : []
        })
      });

      if (res.ok) {
        const savedData = await res.json();
        const unitsList = savedData.units.map(u => `${u.name}: ${u.accessCode}`).join('\n');
        alert(`Cliente registrado com sucesso!\n\nACESSO ADMIN (Painel):\nE-mail: ${newClient.email}\nCódigo: ${savedData.clientCode}\n\nACESSO MORADORES (App):\n${unitsList}`);
        setScannedId('');
        setNewClient({
          name: '', type: 'house', numUnits: 1, clientName: '', email: '', clientPhone: '', clientDocument: '', clientAddress: '', doormanEmail: '', companyName: '', plan: 'Basic'
        });
        setActiveTab('clients');
        fetchClients();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao registrar cliente.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const email = localStorage.getItem('cd_admin_email');
      const res = await fetch(`${API}/api/properties/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, adminEmail: email })
      });
      if (res.ok) {
        alert('Dados atualizados com sucesso!');
        setIsEditing(false);
        setSelectedClient(null);
        fetchClients();
      }
    } catch (err) { console.error(err); }
  };

  const deleteClient = async (id) => {
    if (!window.confirm('Excluir este cliente permanentemente?')) return;
    const email = localStorage.getItem('cd_admin_email');
    try {
      await fetch(`${API}/api/properties/${id}?adminEmail=${encodeURIComponent(email)}`, { method: 'DELETE' });
      fetchClients();
    } catch (err) { console.error(err); }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.adminEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.includes(searchQuery)
  );

  const totalUnits = clients.reduce((acc, c) => acc + (c.units ? c.units.length : 0), 0);

  const stats = [
    { label: 'Clientes Ativos', value: clients.length, icon: Users, color: '#3B82F6' },
    { label: 'Total de Unidades', value: totalUnits, icon: Building2, color: '#10B981' },
    { label: 'Status Global', value: 'Operacional', icon: Activity, color: '#6366F1' },
    { label: 'Faturamento Estimado', value: `R$ ${(totalUnits * 15).toLocaleString()}`, icon: CreditCard, color: '#F59E0B' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#1E293B', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', background: '#FFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Logo size={32} />
          <p style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>SISTEMA DE CONTROLE DIGITAL</p>
        </div>

        <nav style={{ padding: '24px 16px', flex: 1, overflowY: 'auto' }}>
          <SidebarLink icon={Users} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <SidebarLink icon={Plus} label="Novo Registro" active={activeTab === 'register'} onClick={() => setActiveTab('register')} />
          <div style={{ height: '1px', background: '#F1F5F9', margin: '16px 0' }} />
          <SidebarLink icon={PieChart} label="Analytics & Uso" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <SidebarLink icon={Shield} label="Equipe / Porteiros" active={activeTab === 'doormen'} onClick={() => setActiveTab('doormen')} />
          <SidebarLink icon={History} label="Logs do Sistema" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <SidebarLink icon={CreditCard} label="Financeiro / Pix" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <SidebarLink icon={Headphones} label="Suporte & Tickets" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
          <SidebarLink icon={MessageCircle} label="Indicações / Vizinho" active={activeTab === 'referrals'} onClick={() => setActiveTab('referrals')} />
          <SidebarLink icon={Settings2} label="Config. Globais" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <SidebarLink icon={Database} label="API / Integrações" active={activeTab === 'api'} onClick={() => setActiveTab('api')} />
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>L</div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Leandro Palmeira</p>
              <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Administrador Master</p>
            </div>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/auth'); }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA', color: '#DC2626', background: '#FFF5F5', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <LogOut size={14} /> Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <main style={{ flex: 1, padding: '40px' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-1.5px' }}>
              {activeTab === 'clients' && "Visão Geral de Clientes"}
              {activeTab === 'register' && "Registrar Nova Placa"}
              {activeTab === 'analytics' && "Analytics de Produção"}
              {activeTab === 'doormen' && "Gestão de Portarias"}
              {activeTab === 'billing' && "Financeiro & Assinaturas"}
              {activeTab === 'support' && "Central de Suporte Mestre"}
              {activeTab === 'referrals' && "Programa de Indicações"}
            </h2>
            <p style={{ color: '#64748B', fontSize: '16px', marginTop: '4px' }}>Controle total sobre a infraestrutura Campainha Digital.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button style={{ padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0', color: '#64748B' }}><Bell size={20}/></button>
             <button onClick={() => setActiveTab('register')} style={{ padding: '0 24px', height: '48px', borderRadius: '12px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
               <Plus size={20} /> Novo Cliente
             </button>
          </div>
        </header>

        {/* STATS GRID */}
        {activeTab === 'clients' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: '#FFF', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ background: `${s.color}15`, padding: '10px', borderRadius: '12px' }}>
                    <s.icon size={24} color={s.color} />
                  </div>
                  <div style={{ color: '#10B981', fontSize: '12px', fontWeight: 700 }}>+12% ↑</div>
                </div>
                <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 600, margin: 0 }}>{s.label}</p>
                <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0' }}>{s.value}</h3>
              </div>
            ))}
          </div>
        )}

        {/* MAIN VIEWS */}
        <div style={{ background: '#FFF', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          
          {activeTab === 'clients' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ position: 'relative', width: '400px' }}>
                  <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, email, empresa ou documento..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', fontSize: '14px' }}
                  />
                </div>
                <button onClick={fetchClients} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#3B82F6', fontWeight: 700, cursor: 'pointer' }}>
                  <RefreshCw size={16} /> Atualizar Lista
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #F1F5F9' }}>
                      <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Informações do Cliente</th>
                      <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Contato & Empresa</th>
                      <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Configuração / Plano</th>
                      <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>QR Code & Códigos</th>
                      <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Status / Pagamento</th>
                      <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Buscando base de dados...</td></tr>
                    ) : filteredClients.map((client) => (
                      <tr key={client.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '20px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>{client.clientName || "Nome não informado"}</div>
                          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{client.clientDocument || "CPF/CNPJ pendente"}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', fontFamily: 'monospace', background: '#F1F5F9', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>{client.id}</div>
                        </td>
                        <td style={{ padding: '20px 16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} color="#6366F1"/> {client.companyName || "N/A"}</div>
                          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{client.adminEmail}</div>
                          <div style={{ fontSize: '13px', color: '#64748B' }}>{client.clientPhone}</div>
                        </td>
                        <td style={{ padding: '20px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                            <Building2 size={14} color="#10B981" /> {client.name}
                          </div>
                          <div style={{ marginTop: '4px' }}>
                             <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>{client.type?.toUpperCase()}</span>
                             <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, marginLeft: '4px' }}>{client.plan || "PRO"}</span>
                          </div>
                        </td>
                        <td style={{ padding: '20px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() => setSelectedClient(client)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                              <QrCode size={14} color="#3B82F6" /> Ver QR Code
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 800 }}>ADMIN</div>
                                <code style={{ fontWeight: 800, color: '#3B82F6', fontSize: '13px' }}>{client.clientCode}</code>
                              </div>
                              <button 
                                onClick={() => { navigator.clipboard.writeText(client.clientCode); alert('Código Admin copiado!'); }}
                                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{new Date(client.nextPaymentDate).toLocaleDateString('pt-BR')}</div>
                          {new Date(client.nextPaymentDate) > new Date() ? (
                            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Faltam {Math.ceil((new Date(client.nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24))} dias
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>STATUS: VENCIDO</div>
                          )}
                          <button onClick={async () => {
                            if (!window.confirm('Liberar mais 15 dias de teste para este cliente?')) return;
                            try {
                              const res = await fetch(`${API}/api/properties/${client.id}/extend-trial`, { method: 'POST' });
                              if (res.ok) { alert('Teste liberado com sucesso!'); fetchClients(); }
                            } catch {}
                          }} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#3B82F6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                            Liberar +15 Dias Teste
                          </button>
                        </td>
                        <td style={{ padding: '20px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setSelectedClient(client)} style={{ padding: '8px', borderRadius: '8px', background: '#F1F5F9', border: 'none', cursor: 'pointer' }} title="Detalhes/Editar"><ExternalLink size={16} /></button>
                            <button onClick={() => deleteClient(client.id)} style={{ padding: '8px', borderRadius: '8px', background: '#FFF1F2', border: 'none', cursor: 'pointer', color: '#E11D48' }} title="Excluir"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'register' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 800 }}>Cadastro Detalhado de Empresa/Cliente</h3>
                <p style={{ color: '#64748B' }}>Vincule a placa física aos dados contratuais do cliente.</p>
              </div>

              <form onSubmit={handleRegisterClient} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                
                {/* Coluna 1: Dados Contratuais */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <SectionTitle icon={Briefcase} title="Dados da Empresa / Cliente" />
                  
                  <div>
                    <Label>Nome Completo ou Razão Social *</Label>
                    <Input type="text" value={newClient.clientName} onChange={e => setNewClient({...newClient, clientName: e.target.value})} required />
                  </div>

                  <div>
                    <Label>Nome da Empresa (Nome Fantasia)</Label>
                    <Input type="text" value={newClient.companyName} onChange={e => setNewClient({...newClient, companyName: e.target.value})} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <Label>E-mail Principal *</Label>
                      <Input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Telefone / WhatsApp *</Label>
                      <Input type="tel" value={newClient.clientPhone} onChange={e => setNewClient({...newClient, clientPhone: e.target.value})} required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <Label>CPF ou CNPJ</Label>
                      <Input type="text" value={newClient.clientDocument} onChange={e => setNewClient({...newClient, clientDocument: e.target.value})} />
                    </div>
                    <div>
                      <Label>Plano Escolhido</Label>
                      <select style={inputStyle} value={newClient.plan} onChange={e => setNewClient({...newClient, plan: e.target.value})}>
                        <option value="Basic">Basic (R$ 49/mês)</option>
                        <option value="Pro">Pro (R$ 149/mês)</option>
                        <option value="Enterprise">Enterprise (Custom)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Endereço de Faturamento</Label>
                    <Input type="text" value={newClient.clientAddress} onChange={e => setNewClient({...newClient, clientAddress: e.target.value})} />
                  </div>
                </div>

                {/* Coluna 2: Configuração Técnica */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <SectionTitle icon={ScanLine} title="Vincular Dispositivo (QR Code)" />
                  
                  <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                    <Label>ID da Placa (Física ou Digital) *</Label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input type="text" value={scannedId} onChange={e => setScannedId(e.target.value)} style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} required placeholder="ID da placa..." />
                      <button type="button" onClick={() => setScannedId(`CD_${Math.random().toString(36).substring(2, 10).toUpperCase()}`)} style={{ padding: '0 16px', borderRadius: '12px', background: '#3B82F6', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Gerar ID</button>
                      <button type="button" onClick={startScanner} style={{ padding: '0 16px', borderRadius: '12px', background: '#0F172A', color: '#FFF', border: 'none', cursor: 'pointer' }}><Camera size={20}/></button>
                    </div>
                  </div>

                  <SectionTitle icon={Building2} title="Instalação Local" />

                  {newClient.type !== 'house' && (
                    <div>
                      <Label>Nome do Condomínio / Local da Instalação *</Label>
                      <Input type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required placeholder="Ex: Edifício Solar das Palmeiras" />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <Label>Tipo de Propriedade</Label>
                      <select style={inputStyle} value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value})}>
                        <option value="house">Casa Simples</option>
                        <option value="village">Vila / Village</option>
                        <option value="condo">Condomínio Vertical</option>
                        <option value="collective">Escritórios / Coworking</option>
                      </select>
                    </div>
                    {newClient.type !== 'house' && (
                      <div>
                        <Label>Quantidade de Unidades</Label>
                        <Input type="number" min="1" value={newClient.numUnits} onChange={e => setNewClient({...newClient, numUnits: parseInt(e.target.value) || 1})} />
                      </div>
                    )}
                  </div>

                  {newClient.type !== 'house' && (
                    <div>
                      <Label>E-mail da Portaria (Acesso Tablet)</Label>
                      <Input type="email" value={newClient.doormanEmail} onChange={e => setNewClient({...newClient, doormanEmail: e.target.value})} placeholder="porteiro@condominio.com" />
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
                    <button type="submit" disabled={isRegistering} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '16px', cursor: 'pointer', opacity: isRegistering ? 0.7 : 1 }}>
                      {isRegistering ? "Processando Registro..." : "FINALIZAR E GERAR ACESSOS"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ padding: '20px' }}>
              <SectionTitle icon={PieChart} title="Analytics de Produção" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '24px' }}>
                <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '16px', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Chamadas Hoje</h4>
                  <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>1.284</div>
                </div>
                <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '16px', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Uptime Servidores</h4>
                  <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#10B981' }}>99.98%</div>
                </div>
                <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '16px', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Clientes Onboarding</h4>
                  <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>14</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'doormen' && (
            <div style={{ padding: '20px' }}>
              <SectionTitle icon={Shield} title="Gerenciamento de Equipes de Portaria" />
              <p style={{ color: '#64748B' }}>Controle centralizado de acessos para porteiros de todos os condomínios.</p>
              <div style={{ marginTop: '24px', padding: '40px', textAlign: 'center', background: '#F8FAFC', borderRadius: '20px', border: '1px dashed #E2E8F0' }}>
                <Users size={48} color="#CBD5E1" style={{ marginBottom: '16px' }} />
                <h3>Nenhum porteiro registrado globalmente</h3>
                <button style={{ padding: '12px 24px', borderRadius: '12px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: '16px' }}>ADICIONAR PORTEIRO MASTER</button>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={{ padding: '20px' }}>
              <SectionTitle icon={History} title="Auditoria e Logs de Segurança" />
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontWeight: 700, color: '#3B82F6' }}>14:0{i}:22</span>
                      <span>Admin Master removeu registro de placa ID: SCAN_99218</span>
                    </div>
                    <span style={{ color: '#94A3B8' }}>IP: 189.12.33.XX</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div style={{ padding: '20px' }}>
              <SectionTitle icon={CreditCard} title="Financeiro & Assinaturas" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderRadius: '24px', color: '#FFF' }}>
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>Receita Mensal Recorrente (MRR)</span>
                  <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px' }}>R$ 142.850</div>
                  <div style={{ marginTop: '20px', fontSize: '12px', color: '#10B981' }}>+8.4% em relação ao mês anterior</div>
                </div>
                <div style={{ padding: '24px', background: '#FFF', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '14px', color: '#64748B' }}>Próximos Pagamentos (7 dias)</span>
                  <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px' }}>42 Clientes</div>
                  <button style={{ marginTop: '20px', color: '#3B82F6', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Gerar Relatório de Inadimplência →</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
             <div style={{ padding: '10px' }}>
               <SectionTitle icon={Headphones} title="Central de Suporte" />
               <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '20px', background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', background: '#EF4444', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>URGENTE</span>
                          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>TICKET #8821</span>
                        </div>
                        <h4 style={{ margin: '0 0 4px', fontWeight: 800 }}>Problema na conexão de áudio - Condomínio Solar</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Aberto há 12 minutos por Porteiro João</p>
                      </div>
                      <button style={{ padding: '10px 20px', borderRadius: '8px', background: '#FFF', border: '1px solid #EF4444', color: '#EF4444', fontWeight: 700, cursor: 'pointer' }}>ASSUMIR TICKET</button>
                    </div>
                    {[1,2].map(i => (
                      <div key={i} style={{ padding: '20px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', background: '#64748B', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>PENDENTE</span>
                            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>TICKET #881{i}</span>
                          </div>
                          <h4 style={{ margin: '0 0 4px', fontWeight: 800 }}>Dúvida sobre cadastro de novas unidades</h4>
                          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Aberto há 2 horas por Admin Maria</p>
                        </div>
                        <button style={{ padding: '10px 20px', borderRadius: '8px', background: '#FFF', border: '1px solid #3B82F6', color: '#3B82F6', fontWeight: 700, cursor: 'pointer' }}>RESPONDER</button>
                      </div>
                    ))}
                 </div>
                 <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', height: 'fit-content' }}>
                    <h5 style={{ margin: '0 0 16px', fontWeight: 800 }}>Resumo de Suporte</h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Tickets Abertos</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>12</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Tempo Médio</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>14 min</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Satisfação</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>98%</span>
                    </div>
                 </div>
               </div>
             </div>
           )}

           {activeTab === 'referrals' && (
             <div style={{ padding: '10px' }}>
               <SectionTitle icon={MessageCircle} title="Programa de Indicações de Vizinhos" />
               <p style={{ color: '#64748B', marginTop: '12px' }}>Acompanhe os vizinhos indicados e coloque-os no sistema sem sair de casa.</p>
               
               <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  <div style={{ padding: '24px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369A1', marginBottom: '8px' }}>TOTAL INDICADOS</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#0C4A6E' }}>84</div>
                  </div>
                  <div style={{ padding: '24px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>CONVERTIDOS</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#064E3B' }}>32</div>
                  </div>
                  <div style={{ padding: '24px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', marginBottom: '8px' }}>EM CONTATO</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#78350F' }}>12</div>
                  </div>
               </div>

               <div style={{ marginTop: '40px' }}>
                 <h4 style={{ fontWeight: 800, marginBottom: '20px' }}>Indicações Recentes</h4>
                 <div style={{ background: '#F8FAFC', borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94A3B8"/></div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Vizinho do {['Apartamento 102', 'Lote 14', 'Bloco B'][i-1]}</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Indicado por: Condomínio Solar das Palmeiras</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button style={{ padding: '8px 16px', borderRadius: '8px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>ATIVAR CLIENTE REMOTAMENTE</button>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
             </div>
           )}

          {activeTab === 'settings' && (
            <div style={{ padding: '20px' }}>
              <SectionTitle icon={Settings2} title="Configurações Globais do SaaS" />
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <Label>Versão do Sistema</Label>
                  <Input value="v2.9.8-stable" disabled />
                </div>
                <div>
                  <Label>Limite de Unidades por Cliente (Global)</Label>
                  <Input type="number" defaultValue={500} />
                </div>
                <button style={{ padding: '14px', borderRadius: '12px', background: '#0F172A', color: '#FFF', border: 'none', fontWeight: 700 }}>SALVAR CONFIGURAÇÕES</button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div style={{ padding: '20px' }}>
              <SectionTitle icon={Database} title="API & Integrações" />
              <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '16px', marginTop: '24px' }}>
                <Label>API KEY MESTRE</Label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Input value="sk_live_51MvVq6L9y1..." readOnly type="password" />
                  <button style={{ padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0' }}><Copy size={18}/></button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* SCANNER MODAL */}
      {showScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#FFF', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Escaneando Placa</h3>
              <button onClick={stopScanner} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24}/></button>
            </div>
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '1' }}>
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: '40px', border: '2px solid #3B82F6', borderRadius: '24px', boxShadow: '0 0 0 1000px rgba(0,0,0,0.5)' }}></div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#64748B', fontSize: '14px' }}>Aproxime a câmera do QR Code da campainha física.</p>
          </div>
        </div>
      )}

      {/* CLIENT DETAIL MODAL */}
      {selectedClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFF', padding: '40px', borderRadius: '32px', width: '90%', maxWidth: '800px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Dossiê do Cliente</h3>
                <p style={{ color: '#64748B', margin: 0 }}>ID Único: {selectedClient.id}</p>
              </div>
              <button onClick={() => { setSelectedClient(null); setIsEditing(false); }} style={{ padding: '8px', borderRadius: '12px', background: '#F1F5F9', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <DetailRow label="NOME COMPLETO" value={selectedClient.clientName} isEdit={isEditing} onChange={v => setEditForm({...editForm, clientName: v})} />
                <DetailRow label="EMPRESA" value={selectedClient.companyName || "Pessoa Física"} isEdit={isEditing} onChange={v => setEditForm({...editForm, companyName: v})} />
                <DetailRow label="CPF / CNPJ" value={selectedClient.clientDocument || "---"} isEdit={isEditing} onChange={v => setEditForm({...editForm, clientDocument: v})} />
                <DetailRow label="CONTATO" value={`${selectedClient.adminEmail} / ${selectedClient.clientPhone}`} isEdit={isEditing} onChange={v => {
                  const [em, ph] = v.split(' / ');
                  setEditForm({...editForm, adminEmail: em, clientPhone: ph});
                }} />
                <DetailRow label="ENDEREÇO" value={selectedClient.clientAddress || "---"} isEdit={isEditing} onChange={v => setEditForm({...editForm, clientAddress: v})} />
              </div>
              <div>
                <DetailRow label="PROPRIEDADE" value={selectedClient.name} isEdit={isEditing} onChange={v => setEditForm({...editForm, name: v})} />
                <DetailRow label="TIPO" value={selectedClient.type?.toUpperCase()} />
                <DetailRow label="UNIDADES" value={selectedClient.units?.length || 0} />
                <DetailRow label="PLANO" value={selectedClient.plan || "PRO"} isEdit={isEditing} onChange={v => setEditForm({...editForm, plan: v})} />
                <DetailRow label="ACESSOS" value={`ADMIN: ${selectedClient.clientCode} | PORTARIA: ${selectedClient.doormanCode || 'N/A'}`} />
                <DetailRow label="ID DA PLACA" value={selectedClient.id} />
                <DetailRow label="URL DE ACESSO" value={`${window.location.origin}/chamada/${selectedClient.id}`} />
                
                <div style={{ marginTop: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '20px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', marginBottom: '12px' }}>QR CODE DA PLACA</div>
                  <div style={{ background: '#FFF', padding: '12px', borderRadius: '16px', display: 'inline-block', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <img src={selectedClient.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/chamada/${selectedClient.id}`)}`} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px' }}>CÓDIGOS DE ACESSO (MORADORES)</div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    {selectedClient.units?.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #F1F5F9' }}>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                        <code style={{ color: '#10B981', fontWeight: 800 }}>{u.accessCode}</code>
                      </div>
                    ))}
                    {!selectedClient.units || selectedClient.units.length === 0 && (
                      <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>Nenhuma unidade cadastrada.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => {
                  const data = `
CLIENTE: ${selectedClient.clientName}
CPF/CNPJ: ${selectedClient.clientDocument}
EMPRESA: ${selectedClient.companyName}
EMAIL: ${selectedClient.adminEmail}
TELEFONE: ${selectedClient.clientPhone}
ENDEREÇO: ${selectedClient.clientAddress}

PROPRIEDADE: ${selectedClient.name}
TIPO: ${selectedClient.type}
PLANO: ${selectedClient.plan}

CÓDIGO ADMIN: ${selectedClient.clientCode}
CÓDIGO PORTARIA: ${selectedClient.doormanCode || 'N/A'}
ID PLACA: ${selectedClient.id}
URL: ${selectedClient.url}
                  `;
                  navigator.clipboard.writeText(data);
                  alert('Todos os dados foram copiados para a área de transferência!');
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#0F172A', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Copy size={18} /> COPIAR TODOS OS DADOS
              </button>
              {isEditing ? (
                <button onClick={handleSaveEdit} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#10B981', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}>SALVAR ALTERAÇÕES</button>
              ) : (
                <button onClick={() => { setIsEditing(true); setEditForm(selectedClient); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}>EDITAR DADOS</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: active ? '#3B82F610' : 'transparent', color: active ? '#3B82F6' : '#64748B', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s', marginBottom: '4px', textAlign: 'left' }}>
      <Icon size={18} color={active ? '#3B82F6' : '#94A3B8'} /> {label}
    </button>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
      <Icon size={18} color="#3B82F6" />
      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</label>;
}

const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFF', outline: 'none', fontSize: '14px', color: '#1E293B' };
function Input(props) { return <input {...props} style={inputStyle} />; }

function DetailRow({ label, value, isEdit, onChange }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', marginBottom: '4px' }}>{label}</div>
      {isEdit && onChange ? (
        <input 
          type="text" 
          defaultValue={value === '---' || value === 'Pessoa Física' ? '' : value} 
          onChange={e => onChange(e.target.value)} 
          style={{ ...inputStyle, padding: '8px 12px' }}
        />
      ) : (
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B' }}>{value || "---"}</div>
      )}
    </div>
  );
}
