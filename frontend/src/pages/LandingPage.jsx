import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, ArrowRight, Video, BellRing, Smartphone as PhoneIcon, Play, CheckCircle2, ChevronRight } from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', overflowX: 'hidden' }}>
      {/* Aurora Background Decor */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'fixed', bottom: '10%', left: '-5%', width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>

      {/* Navigation */}
      <nav style={{ padding: '20px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={36} />
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Link to="/morador-login" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'color 0.2s' }}>Acesso Morador</Link>
            <Link to="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px' }}>
                Entrar Admin
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '80px 0 120px', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div className="hero-grid">
            {/* Hero Text */}
            <div className="animate-fade-up">
              <div style={{ display: 'inline-flex', padding: '8px 16px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', borderRadius: '100px', fontSize: '13px', fontWeight: 700, marginBottom: '24px', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', background: '#3B82F6', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                Tecnologia WebRTC de Baixa Latência
              </div>
              <h1 style={{ fontSize: 'clamp(42px, 5vw, 68px)', fontWeight: 900, letterSpacing: '-2.5px', lineHeight: 1, marginBottom: '24px', color: '#0F172A' }}>
                Sua campainha agora <br/>
                <span style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>está no seu celular.</span>
              </h1>
              <p style={{ fontSize: '20px', color: '#64748B', lineHeight: 1.6, marginBottom: '40px', maxWidth: '540px' }}>
                Atenda visitas de qualquer lugar do mundo com vídeo e áudio em tempo real. Sem fios, sem obras, apenas um QR Code inteligente.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '48px' }}>
                <Link to="/auth" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ padding: '18px 36px', fontSize: '17px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(59,130,246,0.25)' }}>
                    Começar Agora <ArrowRight size={20} />
                  </button>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', background: '#FFF' }}>
                  <div style={{ display: 'flex', marginLeft: '-8px' }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #FFF', background: '#E2E8F0', marginLeft: '-10px', overflow: 'hidden' }}>
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" style={{ width: '100%' }} />
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>+1.200 casas protegidas</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '14px', fontWeight: 500 }}>
                  <CheckCircle2 size={18} color="#10B981" /> Sem Mensalidade*
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '14px', fontWeight: 500 }}>
                  <CheckCircle2 size={18} color="#10B981" /> Instalação em 2 min
                </div>
              </div>
            </div>

            {/* Hero Visual (Phone + Video) */}
            <div className="animate-fade-up delay-200" style={{ position: 'relative' }}>
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120%', height: '120%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', zIndex: 0 }}></div>
               
               <div className="iphone-mockup" style={{ zIndex: 2 }}>
                  <div className="iphone-notch"></div>
                  <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
                    {/* Vídeo de Apresentação */}
                    <video 
                      src="/avatar.mp4" 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', scale: '1.2' }}
                    />
                    
                    {/* Overlay UI elements on phone */}
                    <div style={{ position: 'absolute', top: '50px', left: '20px', right: '20px', zIndex: 10 }}>
                       <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
                             <BellRing size={16} color="#FFF" />
                          </div>
                          <div>
                            <p style={{ color: '#FFF', fontSize: '11px', fontWeight: 700, margin: 0 }}>VISITANTE NO PORTÃO</p>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', margin: 0 }}>Deseja atender agora?</p>
                          </div>
                       </div>
                    </div>
                    
                    <div style={{ position: 'absolute', bottom: '40px', left: '20px', right: '20px', display: 'flex', gap: '10px' }}>
                       <div style={{ flex: 1, height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 700 }}>Ignorar</div>
                       <div style={{ flex: 1, height: '44px', borderRadius: '12px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 700 }}>Atender</div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats / Proof */}
      <section style={{ padding: '60px 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '40px' }}>
          {[
            { val: '0.5s', lab: 'Latência Média' },
            { val: '100%', lab: 'Sem Fios' },
            { val: '24/7', lab: 'Monitoramento' },
            { val: '4.9/5', lab: 'Avaliação App' }
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', marginBottom: '4px' }}>{s.val}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.lab}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features - Premium Cards */}
      <section style={{ padding: '120px 0', background: '#F8FAFC' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '16px' }}>Por que ser Digital?</h2>
            <p style={{ color: '#64748B', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>A campainha física é coisa do passado. Bem-vindo à era da conveniência e segurança total.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <div className="premium-card">
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Video size={28} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Vídeo HD Nativo</h3>
              <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>Não apenas ouça, veja quem está lá. Nossa tecnologia WebRTC garante imagem fluida mesmo em conexões 4G instáveis.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                Saiba mais <ChevronRight size={16} />
              </div>
            </div>

            <div className="premium-card">
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(16,185,129,0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <BellRing size={28} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Smart Push</h3>
              <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>Mesmo com o app fechado, receba notificações críticas no seu celular. Nunca perca uma entrega ou uma visita importante.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                Saiba mais <ChevronRight size={16} />
              </div>
            </div>

            <div className="premium-card">
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <PhoneIcon size={28} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Modo Silêncio</h3>
              <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>Controle total sobre seu descanso. Programe horários onde a campainha apenas notifica visualmente, sem sons.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                Saiba mais <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Calculator Placeholder */}
      <section style={{ padding: '100px 0', background: '#FFF' }}>
        <div className="container">
          <div style={{ background: '#0F172A', borderRadius: '40px', padding: '60px', color: '#FFF', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.1))', pointerEvents: 'none' }}></div>
             
             <div style={{ maxWidth: '600px', position: 'relative', zIndex: 1 }}>
               <h2 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '24px', letterSpacing: '-1.5px' }}>Planos para Casas e Condomínios</h2>
               <p style={{ fontSize: '18px', color: '#94A3B8', marginBottom: '40px', lineHeight: 1.6 }}>Seja uma casa individual ou um condomínio de 500 unidades, temos o plano ideal para sua segurança.</p>
               
               <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                 <Link to="/auth" style={{ textDecoration: 'none' }}>
                   <button style={{ padding: '16px 32px', borderRadius: '12px', background: '#FFF', color: '#0F172A', border: 'none', fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}>
                     Simular Condomínio
                   </button>
                 </Link>
                 <Link to="/auth" style={{ textDecoration: 'none' }}>
                   <button style={{ padding: '16px 32px', borderRadius: '12px', background: 'transparent', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}>
                     Ver Planos Individuais
                   </button>
                 </Link>
               </div>
             </div>
          </div>
        </div>
      </section>

      <footer style={{ padding: '80px 0 40px', textAlign: 'center', background: '#F8FAFC' }}>
        <div className="container">
          <Logo size={32} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', margin: '40px 0' }}>
            {['Termos', 'Privacidade', 'Ajuda', 'Contato'].map(l => (
              <a key={l} href="#" style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>{l}</a>
            ))}
          </div>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            © {new Date().getFullYear()} Campainha Digital. Desenvolvido com ❤️ no Brasil.
          </p>
        </div>
      </footer>

      {/* Global CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
