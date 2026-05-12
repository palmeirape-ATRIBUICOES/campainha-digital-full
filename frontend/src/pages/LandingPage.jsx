import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, Zap, Clock, Check, X, ArrowRight, Video, MapPin, EyeOff, Lock, Globe2, BellRing, UserCheck, Home } from 'lucide-react';
import Logo from '../components/Logo';

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
          <Logo size={36} light={true} />
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
      <section style={{ paddingTop: '64px', paddingBottom: '48px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '1000px', height: '800px', background: 'radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 60%)', zIndex: -1 }}></div>

        <div className="container hero-grid">
          <div style={{ zIndex: 1, textAlign: 'left' }}>
            <h1 className="animate-fade-up delay-100" style={{ fontSize: 'clamp(40px, 5vw, 56px)', lineHeight: 1.1, fontWeight: 900, letterSpacing: '-2px', marginBottom: '32px', textTransform: 'uppercase' }}>
              Atenda o portão de <br/>
              <span className="text-gradient-primary">qualquer lugar.</span>
            </h1>

            {/* Avatar Video - Positioned IMMEDIATELY BELOW heading */}
            <div className="animate-fade-up delay-200" style={{ marginBottom: '32px', position: 'relative' }}>
              <div style={{ 
                width: '100%', 
                maxWidth: '540px', 
                borderRadius: '2px', 
                overflow: 'hidden', 
                background: '#000',
                position: 'relative',
                aspectRatio: '16/9',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 80px rgba(0, 229, 255, 0.15)'
              }}>
                <video 
                  autoPlay 
                  loop 
                  playsInline 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transform: 'scale(1.4)' 
                  }}
                  onMouseOver={(e) => { e.target.volume = 1.0; e.target.play(); }}
                  id="hero-video"
                >
                  <source src="/avatar.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            <div className="animate-fade-up delay-300" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '100px', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, marginBottom: '24px', whiteSpace: 'nowrap' }}>
              <Shield size={14} /> Mais segurança para você
            </div>
            
            <p className="animate-fade-up delay-400" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px', maxWidth: '600px', fontWeight: 500 }}>
              <strong>Segurança definitiva sem fios ou obras.</strong> Receba chamadas de vídeo instantâneas no seu celular.
            </p>

            <div className="animate-fade-up delay-500" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px', color: '#10B981', fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10B981', boxShadow: '0 0 10px #10B981' }}></div>
              IDEAL PARA CASAS, VILAS E CONDOMÍNIOS
            </div>
            
            <div className="animate-fade-up delay-600" style={{ display: 'flex', gap: '16px', flexDirection: 'row', alignItems: 'center' }}>
              <Link to="/auth" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ padding: '18px 36px', fontSize: '16px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Assinar R$ 39,90/ano <ArrowRight size={20} />
                </button>
              </Link>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: 1.3, fontWeight: 600 }}>
                 Pagamento único anual. Condomínios: assinatura mensal por unidade.
              </div>
            </div>
          </div>
          </div>

          {/* Premium UI Mockup (iPhone) */}
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

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '100px 0', background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-deep) 100%)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '48px' }}>Planos <span className="text-gradient-primary">Acessíveis</span></h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Simple House */}
            <div className="premium-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Casa Simples</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Ideal para quem busca segurança e praticidade individual.</p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '48px', fontWeight: 800 }}>R$ 39,90</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>/ano</span>
              </div>
              <div style={{ marginBottom: '32px', background: 'rgba(16,185,129,0.1)', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', color: '#10B981', fontWeight: 700 }}>
                💰 Pagamento único anual — sem mensalidade!
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> 1 Placa QR Code Premium</li>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> Chamadas de Vídeo Ilimitadas</li>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> App PWA Gratuito</li>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> 12 meses de acesso completo</li>
              </ul>
              <Link to="/auth" style={{ textDecoration: 'none' }}>
                <button className="btn-primary w-full">Assinar Agora</button>
              </Link>
            </div>

            {/* Condos */}
            <div className="premium-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', border: '2px solid var(--primary)', transform: 'scale(1.05)' }}>
              <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--primary)', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>MELHOR CUSTO-BENEFÍCIO</div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Condomínios & Vilas</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Assinatura mensal com valores atrativos por unidade.</p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'line-through' }}>R$ 39,90/un</span>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800 }}>A partir de R$ 9,90</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>/un/mês</span>
                </div>
              </div>
              <div style={{ marginBottom: '32px', background: 'rgba(0,229,255,0.1)', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>
                📊 Quanto mais unidades, menor o valor por unidade!
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> Placas por Unidade ou Portão</li>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> Painel Admin para Síndico</li>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> Suporte 24/7 Prioritário</li>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> Cobrança mensal por unidade</li>
                <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10B981" /> Descontos progressivos por volume</li>
              </ul>
              <Link to="/auth" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary w-full" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>Falar com Consultor</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8 Features Grid */}
      <section id="features" style={{ padding: '48px 0', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
      <section id="compare" style={{ padding: '48px 0', borderTop: '1px solid var(--border-subtle)' }}>
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

      {/* Product Photo Section */}
      <section style={{ padding: '48px 0', background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(0, 229, 255, 0.06) 0%, transparent 60%)', zIndex: 0 }}></div>
        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>
              Veja como fica <span className="text-gradient">no muro da sua casa.</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Uma placa elegante e discreta. O visitante só precisa escanear.
            </p>
          </div>

          {/* Photo */}
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)', marginBottom: '32px' }}>
            <img src="/placa-muro.jpg" alt="Placa Campainha Digital instalada no muro" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>

          {/* Privacy Info - Simple horizontal items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <Lock size={22} color="#10B981" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#10B981', fontSize: '14px' }}>Zero Dados Expostos</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block' }}>Ao escanear, nenhuma informação do morador é revelada.</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'rgba(0, 229, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.12)' }}>
              <EyeOff size={22} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>Privacidade Total</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block' }}>QR Code criptografado. Apenas você decide se quer se identificar.</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
              <Shield size={22} color="#F59E0B" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#F59E0B', fontSize: '14px' }}>Foto Automática</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block' }}>Câmera captura o visitante antes mesmo de você decidir atender.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section style={{ padding: '48px 0', borderTop: '1px solid var(--border-subtle)', background: 'radial-gradient(ellipse at bottom, rgba(0, 229, 255, 0.08) 0%, var(--bg-deep) 100%)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <Shield size={48} color="var(--primary)" style={{ margin: '0 auto 24px', opacity: 0.8 }} />
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '24px' }}>Sua segurança não pode esperar.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(16px, 2vw, 20px)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            Casa simples? Pagamento único de R$ 39,90/ano. Condomínio? Assinatura mensal com valores imbatíveis por unidade.
          </p>
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '18px 40px', fontSize: '18px' }}>
              Começar Agora <ArrowRight size={20} />
            </button>
          </Link>
          <p style={{ color: '#10B981', fontSize: '14px', fontWeight: 600, marginTop: '24px' }}>
            * Condomínios e vilas: quanto mais unidades, menor o valor mensal por unidade. Consulte!
          </p>
        </div>
      </section>
      
      <footer style={{ padding: '32px 0', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
         <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '0 24px' }}>© {new Date().getFullYear()} Campainha Digital. O padrão definitivo em segurança inteligente.</p>
      </footer>
    </>
  );
}
