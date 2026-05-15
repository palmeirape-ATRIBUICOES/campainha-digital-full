import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, ArrowRight, Video, BellRing, Smartphone as PhoneIcon } from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      {/* Navigation */}
      <nav style={{ padding: '24px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#FFF' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={36} />
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link to="/auth" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>Entrar</Link>
            <Link to="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: '12px' }}>
                Começar Grátis
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'inline-flex', padding: '8px 16px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', borderRadius: '100px', fontSize: '13px', fontWeight: 700, marginBottom: '24px' }}>
            <Shield size={16} style={{ marginRight: '8px' }} /> Segurança Inteligente & Simples
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
            Sua campainha agora <br/>
            <span style={{ color: '#3B82F6' }}>está no seu celular.</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#64748B', lineHeight: 1.6, marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            Atenda visitas de qualquer lugar do mundo com vídeo e áudio em tempo real. Sem fios, sem obras, apenas um QR Code.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px' }}>
            <Link to="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '18px 40px', fontSize: '18px', borderRadius: '16px' }}>
                Criar Minha Conta <ArrowRight size={20} />
              </button>
            </Link>
          </div>

          {/* App Mockup Preview */}
          <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', zIndex: 0 }}></div>
             <img 
               src="https://images.unsplash.com/photo-1512428559083-a401c33c9452?w=1000&q=80" 
               alt="App Preview" 
               style={{ width: '100%', borderRadius: '32px', boxShadow: '0 40px 100px rgba(0,0,0,0.1)', position: 'relative', zIndex: 1, border: '8px solid #FFF' }} 
             />
          </div>
        </div>
      </header>

      {/* Features - Minimalist */}
      <section style={{ padding: '100px 0', background: '#FFF' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Video size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Chamada em Vídeo</h3>
              <p style={{ color: '#64748B', lineHeight: 1.6 }}>Veja e fale com quem está no seu portão em tempo real, com total privacidade.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <BellRing size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Aviso Instantâneo</h3>
              <p style={{ color: '#64748B', lineHeight: 1.6 }}>Receba notificações no celular assim que alguém ler o seu QR Code exclusivo.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <PhoneIcon size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Controle de Horário</h3>
              <p style={{ color: '#64748B', lineHeight: 1.6 }}>Escolha quando quer ser incomodado. Programe horários de silêncio facilmente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simplified CTA */}
      <section style={{ padding: '100px 0', textAlign: 'center', background: '#0F172A', color: '#FFF' }}>
        <div className="container">
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '24px' }}>Pronto para modernizar sua casa?</h2>
          <p style={{ color: '#94A3B8', fontSize: '18px', marginBottom: '40px' }}>Cadastre-se com seu celular e senha e comece a usar agora mesmo.</p>
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '18px 48px', fontSize: '18px', background: '#FFF', color: '#0F172A' }}>
              Experimentar Grátis
            </button>
          </Link>
        </div>
      </section>

      <footer style={{ padding: '40px 0', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <p style={{ color: '#64748B', fontSize: '14px' }}>© {new Date().getFullYear()} Campainha Digital. Tecnologia brasileira para sua segurança.</p>
      </footer>
    </div>
  );
}
