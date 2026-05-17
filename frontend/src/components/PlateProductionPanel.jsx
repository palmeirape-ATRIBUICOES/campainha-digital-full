import React, { useState, useRef } from 'react';
import { Printer, QrCode, Smartphone, Bell } from 'lucide-react';
import { API } from '../config';
import Logo from './Logo';

export default function PlateProductionPanel() {
  const [quantity, setQuantity] = useState(4);
  const [plates, setPlates] = useState([]);
  const [generating, setGenerating] = useState(false);
  
  const generatePlates = async () => {
    setGenerating(true);
    const newPlates = [];
    const baseUrl = window.location.origin + window.location.pathname;
    
    try {
      const token = localStorage.getItem('cd_token');
      const seqRes = await fetch(`${API}/api/master/plates/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ quantity })
      });
      
      if (!seqRes.ok) {
        throw new Error('Erro ao buscar numeração do servidor.');
      }
      
      const { startNum } = await seqRes.json();
      
      for (let i = 0; i < quantity; i++) {
        const numStr = String(startNum + i).padStart(5, '0');
        const plateCode = `CD-${numStr}`;
        const url = `${baseUrl}#/auth?plate=${plateCode}`;
        
        const res = await fetch(`${API}/api/qrcode?text=${encodeURIComponent(url)}&json=true`);
        const data = await res.json();
        newPlates.push({ code: plateCode, qr: data.qrcode, url });
      }
      
      setPlates(newPlates);
    } catch (e) {
      console.error('Error generating plates:', e);
      alert('Ocorreu um erro ao gerar as placas. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const pages = [];
  for (let i = 0; i < plates.length; i += 4) {
    pages.push(plates.slice(i, i + 4));
  }

  return (
    <div>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .a4-page {
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              page-break-after: always;
            }
          }
        `}
      </style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px', margin: 0 }}>Produção de Placas Oficiais</h2>
          <p style={{ color: '#64748B', fontSize: '15px', marginTop: '4px' }}>Geração automática de numeração única, anti-repetição.</p>
        </div>
      </div>

      <div style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantidade de Placas</label>
          <input type="number" min="1" max="100" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input-glass" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '16px', fontWeight: 800, color: '#1E293B', outline: 'none' }} />
        </div>
        <div style={{ flex: '1 1 300px', display: 'flex', gap: '12px' }}>
          <button onClick={generatePlates} disabled={generating} className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
            <QrCode size={20} /> {generating ? 'Processando (Mantenha Aberto)...' : 'Gerar Nova Sequência Única'}
          </button>
          {plates.length > 0 && (
            <button onClick={handlePrint} className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', background: '#0F172A', color: '#FFF', border: 'none' }}>
              <Printer size={20} /> Imprimir A4
            </button>
          )}
        </div>
      </div>

      <div id="print-area">
        {pages.map((pagePlates, pageIndex) => (
          <div key={pageIndex} className="a4-page" style={{ 
            width: '210mm', minHeight: '297mm', background: '#FFF', 
            margin: '0 auto 32px', padding: '10mm', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '10mm'
          }}>
            {pagePlates.map(plate => (
              <div key={plate.code} style={{ 
                position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column'
              }}>
                {/* Indicador de corte com a numeração fora da área útil */}
                <div style={{ position: 'absolute', top: '-15px', left: 0, width: '100%', textAlign: 'center', fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px' }}>
                  CORTE AQUI ✂️ --- {plate.code} --- ✂️
                </div>

                {/* Área real da placa (aquela que será recortada) */}
                <div style={{ 
                  flex: 1, border: '1px solid #102E4A', background: '#F8F9FA', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '20px', fontFamily: 'Montserrat, sans-serif'
                }}>
                  
                  {/* LOGO AREA */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                    <Logo size={80} hideText={true} />
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#31697E', marginTop: '10px', letterSpacing: '-0.5px', textTransform: 'none' }}>
                      Campainha-Digital
                    </h2>
                  </div>

                  {/* ICONS AND QR */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '30px', width: '100%' }}>
                    {/* Telefone */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <svg width="100" height="180" viewBox="0 0 24 40" fill="#102E4A" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="20" height="36" rx="4" fill="#102E4A"/>
                        <rect x="4" y="6" width="16" height="24" fill="#FFFFFF"/>
                        <circle cx="12" cy="34" r="2" fill="#FFFFFF"/>
                      </svg>
                    </div>
                    
                    {/* QR Code */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', position: 'relative' }}>
                      <img src={plate.qr} alt={plate.code} style={{ width: '160px', height: '160px', mixBlendMode: 'multiply' }} />
                      <div style={{ position: 'absolute', top: '50%', left: '80px', transform: 'translate(-50%, -50%)', background: '#FFF', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bell size={30} color="#102E4A" fill="#102E4A" />
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM TEXT */}
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#102E4A', lineHeight: 1.4, margin: 0 }}>
                      ESCANEIE AQUI COM<br/>O SEU TELEFONE E<br/>FALE COM O MORADOR
                    </h3>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
