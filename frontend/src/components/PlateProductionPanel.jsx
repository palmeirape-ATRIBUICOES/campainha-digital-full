import React, { useState, useRef } from 'react';
import { Printer, Download, QrCode } from 'lucide-react';
import { API } from '../config';

export default function PlateProductionPanel() {
  const [startNum, setStartNum] = useState(1);
  const [quantity, setQuantity] = useState(4);
  const [prefix, setPrefix] = useState('CD-');
  const [plates, setPlates] = useState([]);
  const [generating, setGenerating] = useState(false);
  
  const printAreaRef = useRef(null);

  const generatePlates = async () => {
    setGenerating(true);
    const newPlates = [];
    const baseUrl = window.location.origin + window.location.pathname;
    
    for (let i = 0; i < quantity; i++) {
      const numStr = String(startNum + i).padStart(5, '0');
      const plateCode = `${prefix}${numStr}`;
      const url = `${baseUrl}#/auth?plate=${plateCode}`;
      
      try {
        const res = await fetch(`${API}/api/qrcode?text=${encodeURIComponent(url)}&json=true`);
        const data = await res.json();
        newPlates.push({ code: plateCode, qr: data.qrcode, url });
      } catch (e) {
        console.error('Error generating QR', e);
      }
    }
    setPlates(newPlates);
    setGenerating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Divide plates into pages of 4
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
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Produção de Placas</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gere QR Codes sequenciais formatados para folha A4 (4 por folha)</p>
        </div>
      </div>

      <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '24px', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Prefixo</label>
          <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} className="input-glass" style={{ width: '100%', padding: '12px' }} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Número Inicial</label>
          <input type="number" value={startNum} onChange={e => setStartNum(Number(e.target.value))} className="input-glass" style={{ width: '100%', padding: '12px' }} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Quantidade</label>
          <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input-glass" style={{ width: '100%', padding: '12px' }} />
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', gap: '12px' }}>
          <button onClick={generatePlates} disabled={generating} className="btn-primary" style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <QrCode size={18} /> {generating ? 'Gerando...' : 'Gerar Placas'}
          </button>
          {plates.length > 0 && (
            <button onClick={handlePrint} className="btn-secondary" style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Printer size={18} /> Imprimir
            </button>
          )}
        </div>
      </div>

      <div id="print-area">
        {pages.map((pagePlates, pageIndex) => (
          <div key={pageIndex} className="a4-page" style={{ 
            width: '210mm', minHeight: '297mm', background: '#FFF', 
            margin: '0 auto 32px', padding: '10mm', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '10mm'
          }}>
            {pagePlates.map(plate => (
              <div key={plate.code} style={{ 
                border: '2px dashed #CBD5E1', borderRadius: '16px', padding: '20px', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4"/><path d="M2 10h20"/><path d="M4 10v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10"/><path d="M12 10v4"/><path d="M9 10v4"/><path d="M15 10v4"/></svg>
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Campainha Digital</h3>
                </div>
                
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px', fontWeight: 600 }}>
                  Aponte a câmera do celular para acessar a campainha.
                </p>

                <img src={plate.qr} alt={plate.code} style={{ width: '180px', height: '180px', marginBottom: '20px' }} />
                
                <div style={{ background: '#F8FAFC', padding: '10px 24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>CÓDIGO DA PLACA</span>
                  <strong style={{ fontSize: '18px', color: '#0F172A', letterSpacing: '2px' }}>{plate.code}</strong>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}
