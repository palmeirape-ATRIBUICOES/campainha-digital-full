import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Logo from './Logo';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PrintablePlate({ 
  propertyId = 'TEST-123', 
  propertyName = 'Residência Teste', 
  unitName = '',
  customStyle = null, 
  animateLogo = false 
}) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    // If customStyle is provided, we don't need to fetch
    if (customStyle) {
      setStyle(customStyle);
      return;
    }

    // Fetch the global style settings
    const fetchStyle = async () => {
      try {
        const res = await fetch(`${API}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.plate_style) {
            setStyle(data.plate_style);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar estilo global da placa:', err);
      }
    };

    fetchStyle();
  }, [customStyle]);

  if (!style) {
    return (
      <div style={{ 
        width: '100%', 
        aspectRatio: '1/1.4', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#F8FAFC',
        borderRadius: '16px',
        color: '#64748B',
        fontSize: '14px',
        fontWeight: 600,
        border: '1px dashed #CBD5E1'
      }}>
        Carregando visual da placa...
      </div>
    );
  }

  // Generate the target URL for the QR code
  const targetUrl = `${window.location.origin}/chamada/${propertyId}`;

  // Styles configuration
  const bgStyle = style.backgroundColor.startsWith('linear-gradient')
    ? { background: style.backgroundColor }
    : { backgroundColor: style.backgroundColor };

  const borderStyle = style.showBorder 
    ? { border: `${style.borderWidth || '4px'} solid ${style.borderColor || '#E2E8F0'}`, borderRadius: '32px' }
    : { border: 'none', borderRadius: '32px' };

  return (
    <div 
      className="printable-plate-container"
      style={{
        width: '100%',
        aspectRatio: '1/1.414', // Standard A4 ratio
        ...bgStyle,
        ...borderStyle,
        padding: '36px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden'
      }}
    >
      {/* HEADER: LOGO */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '12px' }}>
        <Logo 
          size={38} 
          showText={true} 
          textColor={style.logoColor || style.textColor} 
          animate={animateLogo} 
        />
      </div>

      {/* BODY TITLE & SUBTITLE */}
      <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ 
          fontSize: 'clamp(18px, 4vw, 24px)', 
          fontWeight: 900, 
          color: style.textColor,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          lineHeight: 1.2
        }}>
          {style.titleText || 'CAMPAINHA DIGITAL'}
        </h1>
        <p style={{ 
          fontSize: 'clamp(12px, 2.5vw, 15px)', 
          fontWeight: 700, 
          color: style.accentColor || '#3B82F6',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {style.subTitleText || 'Para tocar o interfone:'}
        </p>
      </div>

      {/* QR CODE CONTAINER */}
      <div style={{ 
        background: '#FFFFFF',
        padding: '16px',
        borderRadius: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(0,0,0,0.06)',
        width: '56%',
        aspectRatio: '1',
        margin: '16px 0'
      }}>
        <QRCodeSVG 
          value={targetUrl}
          size={256}
          bgColor="#FFFFFF"
          fgColor="#000000"
          level="H"
          includeMargin={false}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* INSTRUCTIONS */}
      <div style={{ 
        textAlign: 'center', 
        maxWidth: '85%', 
        margin: '0 auto 8px',
        color: style.textColor,
        opacity: 0.85
      }}>
        <p style={{ 
          fontSize: 'clamp(10px, 2vw, 12px)', 
          lineHeight: 1.4, 
          fontWeight: 500, 
          margin: 0 
        }}>
          {style.instructionText || 'Aproxime a câmera do seu celular do QR Code abaixo para chamar o morador'}
        </p>
      </div>

      {/* FOOTER: PROPERTY NAME / UNIT NAME */}
      <div style={{ 
        width: '90%', 
        borderTop: `1px solid ${style.textColor}22`, 
        paddingTop: '12px',
        textAlign: 'center' 
      }}>
        <span style={{ 
          fontSize: 'clamp(12px, 2.5vw, 16px)', 
          fontWeight: 800, 
          color: style.textColor,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {propertyName}
        </span>
        {unitName && (
          <span style={{ 
            fontSize: 'clamp(10px, 2vw, 13px)', 
            fontWeight: 700, 
            color: style.accentColor || '#3B82F6',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            display: 'block',
            marginTop: '2px'
          }}>
            {unitName}
          </span>
        )}
      </div>
    </div>
  );
}
