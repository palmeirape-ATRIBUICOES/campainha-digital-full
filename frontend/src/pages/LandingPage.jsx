import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, EyeOff, Globe2, Camera, Zap, ArrowRight, UserCheck, Smartphone } from 'lucide-react';

export default function LandingPage() {
  const vantagens = [
    {
      icon: <Zap size={32} color="var(--accent-cyan)" />,
      title: "Instalação Sem Fios",
      desc: "Zero obras, zero cabos. Basta fixar a placa elegante de QR Code na parede e seu sistema já está funcionando imediatamente."
    },
    {
      icon: <EyeOff size={32} color="var(--accent-cyan)" />,
      title: "Monitoramento Oculto",
      desc: "Veja quem está na sua porta em tempo real sem que o visitante saiba que está sendo observado ou ouvido."
    },
    {
      icon: <Globe2 size={32} color="var(--accent-cyan)" />,
      title: "Atendimento Remoto",
      desc: "Não está em casa? Atenda a sua porta de qualquer lugar do mundo, direto da tela do seu smartphone como uma chamada de vídeo."
    },
    {
      icon: <Camera size={32} color="var(--accent-cyan)" />,
      title: "Captura Automática",
      desc: "Registramos silenciosamente uma foto do rosto de cada pessoa que toca a campainha. Total rastreabilidade e segurança."
    },
    {
      icon: <ShieldCheck size={32} color="var(--accent-cyan)" />,
      title: "Custo-Benefício Imbatível",
      desc: "Esqueça a manutenção cara de interfones velhos e com ruídos. Uma solução em nuvem, mais barata e infinitamente superior."
    }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.imgur.com/your-logo.png'; }} />
            <h2 className="text-gradient" style={{ fontSize: '20px', margin: 0 }}>Campainha-Digital</h2>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link to="/auth" style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: 500, fontSize: '15px' }}>
              Entrar
            </Link>
            <Link to="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '100px' }}>Cadastre-se</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '100px 24px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '80vw', maxWidth: '800px', maxHeight: '800px', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: -1 }}></div>

        <div className="container" style={{ maxWidth: '900px', zIndex: 1 }}>
          <div className="fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '100px', color: 'var(--accent-cyan)', fontSize: '14px', fontWeight: 600, marginBottom: '32px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }} className="pulse-btn"></span>
            A Nova Geração de Interfones
          </div>
          
          <h1 className="fade-in" style={{ fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-2px', animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
            Atenda sua porta de <br/><span className="text-gradient">Qualquer Lugar do Mundo.</span>
          </h1>
          
          <p className="text-muted fade-in" style={{ fontSize: 'clamp(18px, 2vw, 22px)', marginBottom: '40px', lineHeight: 1.6, maxWidth: '700px', margin: '0 auto 40px', animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            Substitua seu interfone antigo, ruidoso e com fios por uma placa inteligente e minimalista de QR Code. Instalação em 1 minuto, segurança 24h.
          </p>
          
          <div className="fade-in" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
            <Link to="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '18px 40px', fontSize: '18px', borderRadius: '12px' }}>
                Criar Conta Grátis <ArrowRight size={20} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>Como a mágica acontece?</h2>
            <p className="text-muted" style={{ fontSize: '18px' }}>Em 3 passos simples você transforma a segurança do seu imóvel.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', position: 'relative' }}>
            {[
              { icon: <UserCheck size={40} />, title: '1. Crie sua Placa', desc: 'Acesse o painel e gere um QR Code exclusivo para sua casa ou condomínio.' },
              { icon: <Smartphone size={40} />, title: '2. Visitante Escaneia', desc: 'O visitante aponta a câmera do celular, sem precisar baixar nenhum aplicativo.' },
              { icon: <ShieldCheck size={40} />, title: '3. Você Atende', desc: 'O seu celular toca onde você estiver, exibindo a foto de quem está na porta.' }
            ].map((step, idx) => (
              <div key={idx} style={{ textAlign: 'center', padding: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '80px', height: '80px', margin: '0 auto 24px', background: 'linear-gradient(135deg, var(--bg-dark), var(--bg-darker))', border: '1px solid var(--accent-cyan)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)', boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2)' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>{step.title}</h3>
                <p className="text-muted" style={{ lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vantagens Section */}
      <section style={{ padding: '100px 24px', background: 'linear-gradient(180deg, transparent, rgba(6, 182, 212, 0.05))' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>Por que escolher a <span className="text-gradient">Campainha-Digital?</span></h2>
            <p className="text-muted" style={{ fontSize: '18px' }}>As 5 grandes vantagens frente aos interfones tradicionais.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {vantagens.map((vantagem, index) => (
              <div key={index} className="glass-panel fade-in" style={{ padding: '40px', transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'default', animationDelay: `${index * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                  {vantagem.icon}
                </div>
                <h3 style={{ fontSize: '22px', marginBottom: '16px', letterSpacing: '-0.5px' }}>{vantagem.title}</h3>
                <p className="text-muted" style={{ lineHeight: 1.6, fontSize: '16px' }}>{vantagem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Final */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 32px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(6, 182, 212, 0.1))' }}>
          <h2 style={{ fontSize: '40px', marginBottom: '24px', letterSpacing: '-1px' }}>Pronto para modernizar sua portaria?</h2>
          <p className="text-muted" style={{ fontSize: '20px', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>Junte-se ao futuro hoje mesmo. O cadastro leva menos de 1 minuto.</p>
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '18px 48px', fontSize: '20px', borderRadius: '12px' }}>
              Criar Conta e Gerar QR Code
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid var(--glass-border)', textAlign: 'center', background: 'var(--bg-darker)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.imgur.com/your-logo.png'; }} />
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Campainha-Digital</span>
        </div>
        <p className="text-muted" style={{ fontSize: '14px' }}>© {new Date().getFullYear()} Campainha-Digital. Inovação em Segurança Residencial e Condominial.</p>
      </footer>
    </div>
  );
}
