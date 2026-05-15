import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Home, Building2, X, ShieldCheck, LogOut, ChevronRight, Settings, User, RefreshCw, Copy, Check, MessageCircle, CreditCard, Users, Activity, History, Settings2, Search, Bell, Briefcase, ExternalLink, PieChart, Database, QrCode, Gift, Smartphone, ToggleRight, ToggleLeft
} from 'lucide-react';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function MasterAdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificação de segurança (legado cd_admin_role para compatibilidade inicial)
    const role = localStorage.getItem('cd_admin_role') || (localStorage.getItem('cd_user_role'));
    if (role !== 'master') {
      // navigate('/auth');
      // return;
    }
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (userId, module, currentVal) => {
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users/${userId}/modules`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ [module]: !currentVal })
      });
      if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  const giveFreeMonth = async (userId) => {
    if (!window.confirm('Dar 1 mês grátis para este usuário?')) return;
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users/${userId}/promo`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        alert('Promoção ativada com sucesso!');
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', background: '#FFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '32px 24px' }}>
          <Logo size={32} />
        </div>

        <nav style={{ padding: '0 16px', flex: 1 }}>
          <SidebarLink icon={Users} label="Gestão de Usuários" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarLink icon={Building2} label="Propriedades" active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} />
          <SidebarLink icon={Gift} label="Promoções & Planos" active={activeTab === 'promos'} onClick={() => setActiveTab('promos')} />
          <SidebarLink icon={History} label="Logs do Sistema" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <SidebarLink icon={Settings2} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={() => { localStorage.clear(); navigate('/auth'); }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', color: '#DC2626', background: '#FEF2F2', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <LogOut size={16} /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '48px' }}>
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px' }}>
              {activeTab === 'users' ? 'Usuários & Módulos' : 'Controle Master'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '16px' }}>Gerencie permissões e promova o crescimento da plataforma.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={fetchUsers} style={{ padding: '12px', borderRadius: '12px', background: '#FFF', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer' }}>
               <RefreshCw size={20} />
             </button>
          </div>
        </header>

        {/* SEARCH & FILTER */}
        <div style={{ marginBottom: '32px', background: '#FFF', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou celular..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '12px', border: '1px solid #F1F5F9', background: '#F8FAFC', outline: 'none' }}
            />
          </div>
        </div>

        {/* USERS TABLE */}
        <div style={{ background: '#FFF', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F8FAFC' }}>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Usuário</th>
                <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Módulos Ativos</th>
                <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Status / Trial</th>
                <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>Carregando...</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{user.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>{user.email || user.phone}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Cadastrado em {new Date(user.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <ModuleBadge label="Residente" active={user.isResident} onClick={() => toggleModule(user.id, 'isResident', user.isResident)} />
                      <ModuleBadge label="Síndico" active={user.isAdmin} onClick={() => toggleModule(user.id, 'isAdmin', user.isAdmin)} />
                      <ModuleBadge label="Porteiro" active={user.isDoorman} onClick={() => toggleModule(user.id, 'isDoorman', user.isDoorman)} />
                      {user.isSuperAdmin && <span style={{ background: '#0F172A', color: '#FFF', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>SUPER ADMIN</span>}
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {user.trialEndsAt ? `Expira em ${new Date(user.trialEndsAt).toLocaleDateString()}` : 'Acesso Vitalício'}
                    </div>
                    {user.promoActive && <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 700 }}>PROMOÇÃO ATIVA</div>}
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => giveFreeMonth(user.id)} 
                        style={{ padding: '8px 16px', borderRadius: '10px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Gift size={14} /> +1 Mês Grátis
                      </button>
                      <button style={{ padding: '8px', borderRadius: '10px', background: '#F1F5F9', border: 'none', cursor: 'pointer' }}><ExternalLink size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: active ? 'rgba(59,130,246,0.08)' : 'transparent', color: active ? '#3B82F6' : '#64748B', border: 'none', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '4px' }}>
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span style={{ fontWeight: active ? 700 : 500, fontSize: '14px' }}>{label}</span>
      {active && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
    </button>
  );
}

function ModuleBadge({ label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        padding: '6px 12px', 
        borderRadius: '8px', 
        fontSize: '11px', 
        fontWeight: 700, 
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: active ? '#10B98115' : '#F1F5F9',
        borderColor: active ? '#10B981' : '#E2E8F0',
        color: active ? '#047857' : '#94A3B8'
      }}
    >
      {active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
      {label.toUpperCase()}
    </button>
  );
}
