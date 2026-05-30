import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, ArrowRight, Video, BellRing, Smartphone as PhoneIcon, CheckCircle2, ChevronRight, Sparkles, Building, Key, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');
    const extRef = params.get('external_reference');

    if (extRef && (status === 'approved' || status === 'pending')) {
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.hash = `#/payment-success?status=${status}&external_reference=${extRef}`;
    } else if (extRef && status === 'rejected') {
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.hash = `#/payment-failure`;
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#050811', color: '#F8FAFC', overflowX: 'hidden', fontFamily: 'var(--font-body)', position: 'relative' }}>
      
      {/* Cosmic Mesh Gradient Auroras */}
      <div className="cosmic-aurora aurora-1"></div>
      <div className="cosmic-aurora aurora-2"></div>
      <div className="cosmic-aurora aurora-3"></div>

      {/* Navigation */}
      <nav style={{ 
        padding: '16px 0', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
        background: 'rgba(5, 8, 17, 0.65)', 
        backdropFilter: 'blur(20px)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={38} />
          
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
            <Link to="/auth" style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'color 0.2s' }} className="hover-color-white">
              Acessar Conta
            </Link>
            <Link to="/auth?mode=register" style={{ textDecoration: 'none' }}>
              <button className="lux-glow-btn" style={{ fontSize: '13px', padding: '10px 20px', borderRadius: '10px' }}>
                Criar Conta
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '100px 0 140px', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div className="hero-grid">
            
            {/* Hero Text */}
            <div className="animate-fade-up" style={{ textAlign: 'left' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '8px 16px', 
                background: 'rgba(99, 102, 241, 0.1)', 
                color: '#818CF8', 
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '100px', 
                fontSize: '13px', 
                fontWeight: 700, 
                marginBottom: '24px', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <Sparkles size={14} style={{ color: '#818CF8', animation: 'pulse 2s infinite' }} />
                Tecnologia WebRTC & Interfone Inteligente
              </div>
              
              <h1 style={{ 
                fontSize: 'clamp(44px, 5.5vw, 72px)', 
                fontWeight: 900, 
                letterSpacing: '-2.5px', 
                lineHeight: 1.05, 
                marginBottom: '24px', 
                color: '#FFF',
                fontFamily: 'var(--font-heading)'
              }}>
                Sua campainha agora <br/>
                <span style={{ 
                  background: 'linear-gradient(135deg, #6366F1 30%, #10B981 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.15))'
                }}>está no seu celular.</span>
              </h1>
              
              <p style={{ fontSize: '19px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '40px', maxWidth: '540px' }}>
                Atenda visitas, converse com a portaria e libere o acesso ao condomínio de qualquer lugar do mundo. Sem fios, sem aparelhos antigos, apenas segurança na palma da mão.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '48px', alignItems: 'center' }}>
                <Link to="/auth?mode=register" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    Começar Agora <ArrowRight size={18} />
                  </button>
                </Link>
                
                <div className="lux-glass" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 20px', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.06)' 
                }}>
                  <div style={{ display: 'flex', marginLeft: '-4px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ 
                        width: '30px', 
                        height: '30px', 
                        borderRadius: '50%', 
                        border: '2px solid #050811', 
                        background: '#1E293B', 
                        marginLeft: i > 1 ? '-10px' : '0', 
                        overflow: 'hidden' 
                      }}>
                        <img src={`https://i.pravatar.cc/100?u=campainha-${i}`} alt="user" style={{ width: '100%' }} />
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>+1.500 lares protegidos</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>
                  <CheckCircle2 size={16} color="#10B981" /> Sem necessidade de fios
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>
                  <CheckCircle2 size={16} color="#10B981" /> Interfone VoIP integrado
                </div>
              </div>
            </div>

            {/* Hero Visual (Phone + Video Mockup) */}
            <div className="animate-fade-up delay-200" style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                width: '110%', 
                height: '110%', 
                background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', 
                zIndex: 0 
              }}></div>
               
              <div className="iphone-mockup lux-glass" style={{ 
                zIndex: 2, 
                border: '6px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99, 102, 241, 0.1)'
              }}>
                <div className="iphone-notch" style={{ background: 'rgba(255, 255, 255, 0.1)' }}></div>
                <div style={{ width: '100%', height: '100%', background: '#070A13', position: 'relative', overflow: 'hidden' }}>
                  
                  {/* Vídeo do Interfone */}
                  <video 
                    src={`${import.meta.env.BASE_URL}avatar.mp4`} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.15)', opacity: 0.85 }}
                  />
                  
                  {/* Glass Intercom call card */}
                  <div style={{ position: 'absolute', top: '48px', left: '16px', right: '16px', zIndex: 10 }}>
                    <div style={{ 
                      background: 'rgba(13, 20, 38, 0.7)', 
                      backdropFilter: 'blur(16px)', 
                      padding: '12px 16px', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                    }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: '#EF4444', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        animation: 'pulse 1.5s infinite' 
                      }}>
                        <BellRing size={16} color="#FFF" />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ color: '#FFF', fontSize: '10px', fontWeight: 800, margin: 0, letterSpacing: '1px' }}>CHAMANDO DO PORTÃO</p>
                        <p style={{ color: '#94A3B8', fontSize: '11px', margin: 0 }}>Visitante no Portão Social</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons overlay */}
                  <div style={{ position: 'absolute', bottom: '32px', left: '16px', right: '16px', display: 'flex', gap: '10px' }}>
                    <div style={{ 
                      flex: 1, 
                      height: '42px', 
                      borderRadius: '12px', 
                      background: 'rgba(255,255,255,0.06)', 
                      backdropFilter: 'blur(12px)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#FFF', 
                      fontSize: '12px', 
                      fontWeight: 700,
                      cursor: 'pointer' 
                    }}>Ignorar</div>
                    
                    <div style={{ 
                      flex: 1, 
                      height: '42px', 
                      borderRadius: '12px', 
                      background: '#10B981', 
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#FFF', 
                      fontSize: '12px', 
                      fontWeight: 700,
                      cursor: 'pointer' 
                    }}>Atender</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section style={{ padding: '60px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(13, 20, 38, 0.2)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '40px' }}>
          {[
            { val: '0.4s', lab: 'Latência VoIP' },
            { val: '100%', lab: 'Sem Aparelhos na Parede' },
            { val: 'R$ 0', lab: 'Custo de Infraestrutura' },
            { val: '24h', lab: 'Controle Ativo' }
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFF', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>{s.val}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{s.lab}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid - uCondo style adapted to Cosmic Dark */}
      <section style={{ padding: '120px 0', position: 'relative' }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '42px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
              A Solução Completa para Condomínios e Casas
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              Unimos as melhores ferramentas administrativas do mercado com o mais poderoso interfone digital do Brasil.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            
            {/* Card 1 */}
            <div className="lux-glass lux-glass-hover" style={{ padding: '32px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '14px', 
                background: 'rgba(99, 102, 241, 0.1)', 
                color: '#818CF8', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '24px',
                border: '1px solid rgba(99, 102, 241, 0.15)'
              }}>
                <Video size={24} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#FFF', fontFamily: 'var(--font-heading)' }}>Interfone VoIP & Vídeo</h3>
              <p style={{ color: '#94A3B8', lineHeight: 1.6, fontSize: '14px' }}>
                Veja e converse com porteiros e visitantes em tempo real. Nossa telefonia interna roda sobre WebRTC, entregando qualidade de chamada de nível de operadora.
              </p>
            </div>

            {/* Card 2 */}
            <div className="lux-glass lux-glass-hover" style={{ padding: '32px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '14px', 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#34D399', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '24px',
                border: '1px solid rgba(16, 185, 129, 0.15)'
              }}>
                <Smartphone size={24} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#FFF', fontFamily: 'var(--font-heading)' }}>Gestão na Tela Cheia</h3>
              <p style={{ color: '#94A3B8', lineHeight: 1.6, fontSize: '14px' }}>
                Organize reservas de áreas comuns (churrasqueira/salão), receba alertas de encomendas entregues na recepção e abra chamados diretamente ao síndico.
              </p>
            </div>

            {/* Card 3 */}
            <div className="lux-glass lux-glass-hover" style={{ padding: '32px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '14px', 
                background: 'rgba(139, 92, 246, 0.1)', 
                color: '#A78BFA', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '24px',
                border: '1px solid rgba(139, 92, 246, 0.15)'
              }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#FFF', fontFamily: 'var(--font-heading)' }}>Acesso com Chaves QR</h3>
              <p style={{ color: '#94A3B8', lineHeight: 1.6, fontSize: '14px' }}>
                Gere convites temporários para visitantes e prestadores de serviços. O código é validado pelo porteiro no painel flutuante de forma instantânea.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section style={{ padding: '100px 0', position: 'relative' }}>
        <div className="container">
          <div className="lux-glass" style={{ 
            borderRadius: '32px', 
            padding: '60px 48px', 
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(99, 102, 241, 0.05)',
            textAlign: 'left'
          }}>
            <div style={{ maxWidth: '640px', position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '24px', letterSpacing: '-1.5px', color: '#FFF', fontFamily: 'var(--font-heading)' }}>
                Projetado para Múltiplas Casas ou Grandes Condomínios
              </h2>
              <p style={{ fontSize: '18px', color: '#94A3B8', marginBottom: '40px', lineHeight: 1.6 }}>
                Ative o período de avaliação gratuita de 15 dias sem compromisso e comece a controlar acessos e encomendas de forma digital.
              </p>
               
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link to="/auth?mode=register" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '15px' }}>
                    Simular Condomínio
                  </button>
                </Link>
                <Link to="/auth?mode=register" style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary" style={{ padding: '16px 32px', fontSize: '15px' }}>
                    Testar Individualmente
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '80px 0 40px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', background: '#04060d' }}>
        <div className="container">
          <Logo size={36} />
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', margin: '40px 0' }}>
            {['Termos de Uso', 'Privacidade', 'Ajuda', 'Contato'].map(l => (
              <a key={l} href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }} className="hover-color-white">{l}</a>
            ))}
          </div>
          
          <p style={{ color: '#64748B', fontSize: '13px' }}>
            © {new Date().getFullYear()} Campainha Digital. O futuro dos condomínios modernos.
          </p>
        </div>
      </footer>

      {/* Embedded Styles for hover and HMR stability */}
      <style>{`
        .hover-color-white:hover {
          color: #FFF !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
        }
        @media (min-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }
      `}</style>

    </div>
  );
}
