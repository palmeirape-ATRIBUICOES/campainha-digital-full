import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, Zap, Clock, Check, X, ArrowRight, Video, MapPin, EyeOff, Lock, Globe2, BellRing, UserCheck, Home } from 'lucide-react';

export default function LandingPage() {
  const advantages = [
    { icon: <Globe2 size={24} />, title: "Atendimento Remoto", desc: "Atenda de qualquer lugar, mesmo estando na rua ou viajando." },
    { icon: <Shield size={24} />, title: "Mais Segurança", desc: "Não precisa ir até o portão. Veja quem é antes de se expor." },
    { icon: <EyeOff size={24} />, title: "Monitoramento Oculto", desc: "Câmera ao vivo em modo furtivo. O visitante não sabe que você está olhando." },
    { icon: <UserCheck size={24} />, title: "Registro Fotográfico", desc: "Foto silenciosa automática de cada pessoa que toca a campainha." },
    { icon: <Clock size={24} />, title: "Instalação em Minutos", desc: "Esqueça obras, quebra-quebra e fios pela casa ou condomínio." },
    { icon: <Lock size={24} />, title: "Criptografia Avançada", desc: "Comunicação de áudio e vídeo blindada ponta a ponta." },
    { icon: <Zap size={24} />, title: "Sistema em Nuvem", desc: "Sem manutenções caras de hardwares analógicos antigos." },
    { icon: <BellRing size={24} />, title: "Notificação Imediata", desc: "Receba alertas no seu smartphone assim que o QR Code for lido." }
  ];

  return (
    <>
      {/* Navigation */}
      <nav style={{ position: 'fixed', top: 0, width: '100%', padding: '16px 0', zIndex: 100, background: 'rgba(5, 11, 20, 0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Campainha Digital" style={{ width: '32px', height: '32px', borderRadius: '6px' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.imgur.com/your-logo.png'; }} />
            <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px' }}>Campainha Digital</span>
          </div>
          <div className="desktop-nav-links" style={{ gap: '24px', alignItems: 'center' }}>
            <a href="#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#fff'} onMouseOut={e => e.target.style.color='var(--text-muted)'}>Recursos</a>
            <a href="#compare" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#fff'} onMouseOut={e => e.target.style.color='var(--text-muted)'}>Comparativo</a>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }}></div>
            <Link to="/auth" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Entrar</Link>
            <Link to="/auth" style={{ textDecoration: 'none' }}>
              <button style={{ background: 'var(--text-main)', color: 'var(--bg-deep)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                Assine Agora
              </button>
            </Link>
          </div>
          {/* Mobile minimal nav CTA */}
          <div style={{ display: 'flex' }} className="desktop-nav-links"></div>
          <div style={{ display: 'flex' }}>
             <Link to="/auth" style={{ textDecoration: 'none' }}>
              <button style={{ background: 'var(--text-main)', color: 'var(--bg-deep)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                Acessar
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '1000px', height: '800px', background: 'radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 60%)', zIndex: -1 }}></div>

        <div className="container hero-grid">
          <div style={{ zIndex: 1, textAlign: 'left' }}>
            <div className="animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '100px', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, marginBottom: '24px', whiteSpace: 'nowrap' }}>
              <Shield size={14} /> Mais segurança para você
            </div>
            
            <h1 className="animate-fade-up delay-100" style={{ fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '24px' }}>
              Atenda o portão de <span className="text-gradient-primary">qualquer lugar.</span>
            </h1>
            
            <p className="animate-fade-up delay-200" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '540px' }}>
              <strong style={{ color: '#fff' }}>Agora você vai poder atender de longe, mesmo estando na rua.</strong> Não precisa ir até o portão para ver quem está chamando. Receba a imagem no seu celular instantaneamente.
            </p>

            <div className="animate-fade-up delay-300" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', color: '#10B981', fontWeight: 600, fontSize: '14px' }}>
              <Home size={16} /> Ideal para casas simples, vilas e grandes condomínios.
            </div>
            
            <div className="animate-fade-up delay-400" style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
              <Link to="/auth" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ padding: '16px 24px', fontSize: '16px' }}>
                  Assinatura Única Anual <ArrowRight size={20} />
                </button>
              </Link>
              <span style={{ color: '#10B981', fontSize: '13px', fontWeight: 600, marginTop: '-8px' }}>* Descontos especiais progressivos para Condomínios e Vilas de casas.</span>
              <a href="#features" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary" style={{ padding: '16px 24px', fontSize: '16px' }}>
                  Conheça as 8 Vantagens
                </button>
              </a>
            </div>
          </div>

          {/* Premium UI Mockup */}
          <div className="animate-fade-up delay-400" style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginTop: '40px' }}>
            <div style={{ position: 'absolute', top: '10%', right: '10%', width: '150px', height: '150px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.3, zIndex: -1 }}></div>
            
            <div className="iphone-mockup">
              <div className="iphone-notch"></div>
              {/* Fake App Screen */}
              <div style={{ width: '100%', height: '100%', background: '#0A111F', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '60px 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '18px' }}>Visita Externa</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> Portão Principal</span>
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }}></div>
                </div>
                {/* Video Area */}
                <div style={{ flex: 1, margin: '0 16px', background: '#111A2C', borderRadius: '24px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
                  <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=500&q=80" alt="Visitante" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                  <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: '100px', fontSize: '11px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                     <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} /> AO VIVO
                  </div>

                  {/* Call Actions */}
                  <div style={{ position: 'absolute', bottom: '24px', left: '0', width: '100%', display: 'flex', justifyContent: 'center', gap: '24px', padding: '0 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <button style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <EyeOff size={24} color="#fff" />
                      </button>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>OCULTAR</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <button style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)', border: 'none', cursor: 'pointer' }}>
                        <Video size={28} color="#000" />
                      </button>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>ATENDER</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Conexão Criptografada Segura
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8 Features Grid */}
      <section id="features" style={{ padding: '100px 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>
              O sistema que traz <span className="text-gradient">paz de espírito.</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(16px, 2vw, 18px)', maxWidth: '700px', margin: '0 auto' }}>
              Ideal para casas simples, vilas e condomínios. Conheça as 8 vantagens cruciais.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {advantages.map((adv, index) => (
              <div key={index} className="premium-card" style={{ padding: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  {adv.icon}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{adv.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '14px' }}>{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="compare" style={{ padding: '100px 0' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>Por que somos a <span className="text-gradient">escolha certa?</span></h2>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Recurso de Segurança</th>
                  <th style={{ width: '30%', textAlign: 'center' }}>Interfone Comum</th>
                  <th className="highlight" style={{ width: '30%', textAlign: 'center' }}>Campainha Digital</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Recurso">Sair de casa para ver quem é</td>
                  <td data-label="Interfone Comum" style={{ textAlign: 'center', color: '#EF4444' }}>Obrigatório</td>
                  <td data-label="Campainha Digital" className="highlight" style={{ textAlign: 'center', color: '#10B981' }}>Nunca Mais</td>
                </tr>
                <tr>
                  <td data-label="Recurso">Visualização Antes de Atender</td>
                  <td data-label="Interfone Comum" style={{ textAlign: 'center', color: 'var(--text-muted)' }}><X size={20} color="#EF4444" style={{ display: 'inline-block' }} /></td>
                  <td data-label="Campainha Digital" className="highlight" style={{ textAlign: 'center' }}><Check size={20} color="#10B981" style={{ display: 'inline-block' }} /> Câmera ao Vivo</td>
                </tr>
                <tr>
                  <td data-label="Recurso">Atender Estando na Rua</td>
                  <td data-label="Interfone Comum" style={{ textAlign: 'center', color: 'var(--text-muted)' }}><X size={20} color="#EF4444" style={{ display: 'inline-block' }} /></td>
                  <td data-label="Campainha Digital" className="highlight" style={{ textAlign: 'center' }}><Check size={20} color="#10B981" style={{ display: 'inline-block' }} /> Global via App</td>
                </tr>
                <tr>
                  <td data-label="Recurso">Registro Automático (Foto)</td>
                  <td data-label="Interfone Comum" style={{ textAlign: 'center', color: 'var(--text-muted)' }}><X size={20} color="#EF4444" style={{ display: 'inline-block' }} /></td>
                  <td data-label="Campainha Digital" className="highlight" style={{ textAlign: 'center' }}><Check size={20} color="#10B981" style={{ display: 'inline-block' }} /> Salvo na Nuvem</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--border-subtle)', background: 'radial-gradient(ellipse at bottom, rgba(0, 229, 255, 0.08) 0%, var(--bg-deep) 100%)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <Shield size={48} color="var(--primary)" style={{ margin: '0 auto 24px', opacity: 0.8 }} />
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '24px' }}>Sua segurança não pode esperar.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(16px, 2vw, 20px)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            Proteja sua casa, vila ou condomínio com uma assinatura única anual. Sem surpresas e sem manutenção.
          </p>
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '18px 40px', fontSize: '18px' }}>
              Assinar Plano Anual <ArrowRight size={20} />
            </button>
          </Link>
          <p style={{ color: '#10B981', fontSize: '14px', fontWeight: 600, marginTop: '24px' }}>
            * Possui múltiplas unidades? Oferecemos descontos exclusivos para Condomínios e Vilas de casas.
          </p>
        </div>
      </section>
      
      <footer style={{ padding: '32px 0', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
         <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '0 24px' }}>© {new Date().getFullYear()} Campainha Digital. O padrão definitivo em segurança inteligente.</p>
      </footer>
    </>
  );
}
