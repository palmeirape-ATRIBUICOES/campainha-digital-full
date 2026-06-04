import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Logo from './Logo';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const defaultStyle = {
  templateId: 'standard',
  fontFamily: 'Inter',
  shadowDepth: 'none',
  qrRadius: '24px',
  backgroundPattern: 'none',
  borderStyle: 'solid',
  headerBadgeText: '',
  headerBadgeBg: '#3B82F6',
  headerBadgeColor: '#FFFFFF',
  logoPosition: 'top',
  qrBgColor: '#FFFFFF',
  qrFgColor: '#000000',
  titleText: "CAMPAINHA DIGITAL",
  subTitleText: "Para tocar o interfone:",
  instructionText: "Aproxime a câmera do seu celular do QR Code abaixo para chamar o morador",
  primaryColor: "#0F172A",
  secondaryColor: "#00E5FF",
  accentColor: "#F59E0B",
  backgroundColor: "#FFFFFF",
  textColor: "#1E293B",
  showBorder: true,
  borderColor: "#E2E8F0",
  borderWidth: "4px",
  logoColor: "#0F172A"
};

const PrintablePlate = React.forwardRef(({ 
  propertyId = 'TEST-123', 
  propertyName = 'Residência Teste', 
  unitName = '',
  customStyle = null, 
  animateLogo = false 
}, ref) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (customStyle) {
      setStyle({ ...defaultStyle, ...customStyle });
      return;
    }

    const fetchStyle = async () => {
      try {
        const res = await fetch(`${API}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.plate_style) {
            setStyle({ ...defaultStyle, ...data.plate_style });
          } else {
            setStyle(defaultStyle);
          }
        } else {
          setStyle(defaultStyle);
        }
      } catch (err) {
        console.error('Erro ao buscar estilo global da placa:', err);
        setStyle(defaultStyle);
      }
    };

    fetchStyle();
  }, [customStyle]);

  if (!style) {
    return (
      <div style={{ 
        width: '100%', 
        aspectRatio: '1/1.414', 
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

  const targetUrl = `${window.location.origin}/chamada/${propertyId}`;

  // 1. Font Family styling mapping
  const getFontFamily = (font) => {
    switch (font) {
      case 'Outfit': return '"Outfit", sans-serif';
      case 'Montserrat': return '"Montserrat", sans-serif';
      case 'Playfair Display': return '"Playfair Display", serif';
      case 'Fira Code': return '"Fira Code", monospace';
      case 'Space Grotesk': return '"Space Grotesk", sans-serif';
      case 'Cinzel': return '"Cinzel", serif';
      default: return '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    }
  };

  const currentFontFamily = getFontFamily(style.fontFamily);

  // 2. Background pattern styling
  const getBackgroundPatternStyle = (pattern) => {
    switch (pattern) {
      case 'dots':
        return {
          backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.08) 1.5px, transparent 1.5px)',
          backgroundSize: '16px 16px',
        };
      case 'grid':
        return {
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        };
      case 'stripes':
        return {
          backgroundImage: 'linear-gradient(45deg, rgba(0, 0, 0, 0.03) 25%, transparent 25%, transparent 50%, rgba(0, 0, 0, 0.03) 50%, rgba(0, 0, 0, 0.03) 75%, transparent 75%, transparent)',
          backgroundSize: '20px 20px',
        };
      default:
        return {};
    }
  };

  // 3. Shadow styles
  const getShadowStyle = (depth) => {
    switch (depth) {
      case 'soft': return '0 8px 24px rgba(0, 0, 0, 0.06)';
      case 'medium': return '0 16px 40px rgba(0, 0, 0, 0.12)';
      case 'hard': return '8px 8px 0px rgba(0, 0, 0, 0.2)';
      default: return 'none';
    }
  };

  // 4. Default structural mappings (can be modified by templates)
  let containerStyle = {
    width: '100%',
    aspectRatio: '1/1.414',
    padding: '36px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: currentFontFamily,
    boxShadow: getShadowStyle(style.shadowDepth),
    ...getBackgroundPatternStyle(style.backgroundPattern)
  };

  // Base background configuration
  if (style.backgroundColor.startsWith('linear-gradient')) {
    containerStyle.background = style.backgroundColor;
  } else {
    containerStyle.backgroundColor = style.backgroundColor;
  }

  // Base border configuration
  if (style.showBorder) {
    containerStyle.border = `${style.borderWidth || '4px'} ${style.borderStyle || 'solid'} ${style.borderColor || '#E2E8F0'}`;
    containerStyle.borderRadius = '32px';
  } else {
    containerStyle.border = 'none';
    containerStyle.borderRadius = '32px';
  }

  let textPrimaryColor = style.textColor || '#1E293B';
  let accentColorStyle = style.accentColor || '#3B82F6';
  let logoTextColor = style.logoColor || textPrimaryColor;
  let qrContainerBg = style.qrBgColor || '#FFFFFF';
  let qrCodeFgColor = style.qrFgColor || '#000000';
  let qrBoxRadius = style.qrRadius || '24px';

  let hasTopBadge = !!style.headerBadgeText;
  let badgeText = style.headerBadgeText;
  let badgeBg = style.headerBadgeBg || '#3B82F6';
  let badgeTextColor = style.headerBadgeColor || '#FFFFFF';

  let showLogoTop = style.logoPosition === 'top' || !style.logoPosition;
  let showLogoBottom = style.logoPosition === 'bottom';

  let innerContainerStyle = null; // Used for glassmorphism layout

  // ==================== 15 VISUALLY DISTINCT TEMPLATE DEFINITIONS ====================
  switch (style.templateId) {
    case 'minimalist':
      // 2. Minimalist Chic
      containerStyle.backgroundColor = style.backgroundColor === '#FFFFFF' || style.backgroundColor === '#1E293B' ? '#FAF9F6' : style.backgroundColor;
      containerStyle.padding = '44px 32px';
      containerStyle.border = '1px solid rgba(0,0,0,0.15)';
      containerStyle.borderRadius = '16px';
      containerStyle.boxShadow = 'none';
      textPrimaryColor = '#333333';
      accentColorStyle = '#6B7280';
      logoTextColor = '#111111';
      qrBoxRadius = '8px';
      break;

    case 'premiumDark':
      // 3. Premium Dark Theme
      containerStyle.background = 'linear-gradient(135deg, #0F172A 0%, #020617 100%)';
      containerStyle.borderRadius = '32px';
      containerStyle.border = style.showBorder ? `${style.borderWidth || '2px'} solid ${style.borderColor || 'rgba(255,255,255,0.15)'}` : 'none';
      textPrimaryColor = '#F8FAFC';
      accentColorStyle = style.accentColor === '#F59E0B' ? '#00E5FF' : style.accentColor;
      logoTextColor = '#FFFFFF';
      qrContainerBg = '#1E293B';
      qrCodeFgColor = '#FFFFFF';
      break;

    case 'aurora':
      // 4. Aurora Mesh Gradient with Glassmorphism overlay
      containerStyle.background = 'linear-gradient(135deg, #FF007F 0%, #7F00FF 50%, #00F0FF 100%)';
      containerStyle.borderRadius = '36px';
      containerStyle.padding = '12px'; // Outer shell padding
      containerStyle.border = 'none';

      innerContainerStyle = {
        width: '100%',
        height: '100%',
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '28px',
        padding: '28px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      };
      textPrimaryColor = '#FFFFFF';
      accentColorStyle = '#00F0FF';
      logoTextColor = '#FFFFFF';
      qrContainerBg = 'rgba(255, 255, 255, 0.95)';
      qrCodeFgColor = '#0F172A';
      break;

    case 'bento':
      // 5. Bento Grid Modular Structure
      containerStyle.backgroundColor = style.backgroundColor === '#FFFFFF' ? '#F1F5F9' : style.backgroundColor;
      containerStyle.padding = '24px 20px';
      break;

    case 'splitDiagonal':
      // 6. Split Diagonal (contrasting halves)
      containerStyle.background = `linear-gradient(145deg, ${style.primaryColor || '#0F172A'} 42%, ${style.backgroundColor || '#FFFFFF'} 42.2%)`;
      // Dynamically adjust coloring based on where texts sit
      textPrimaryColor = '#1E293B'; // bottom half is white, so text is dark
      accentColorStyle = style.accentColor || '#3B82F6';
      logoTextColor = '#FFFFFF'; // top half is dark, so logo text is white
      break;

    case 'neonCyberpunk':
      // 7. Neon Glow / Cyberpunk Tech
      containerStyle.background = '#05050A';
      containerStyle.borderRadius = '24px';
      containerStyle.border = `2px solid ${style.accentColor || '#00E5FF'}`;
      containerStyle.boxShadow = `0 0 20px rgba(${style.accentColor === '#F59E0B' ? '0, 229, 255' : '59, 130, 246'}, 0.25)`;
      textPrimaryColor = '#F8FAFC';
      accentColorStyle = style.accentColor || '#00E5FF';
      logoTextColor = style.accentColor || '#00E5FF';
      qrContainerBg = '#0B0B14';
      qrCodeFgColor = style.accentColor || '#00E5FF';
      qrBoxRadius = '12px';
      break;

    case 'classicStreet':
      // 8. Classic Street Plaque (double borders, royal style)
      containerStyle.backgroundColor = '#0B3C5D'; // Royal Blue
      containerStyle.borderRadius = '16px';
      containerStyle.border = '8px double #FFFFFF';
      containerStyle.padding = '36px 28px';
      textPrimaryColor = '#FFFFFF';
      accentColorStyle = '#F5D76E'; // Gold tone
      logoTextColor = '#FFFFFF';
      qrContainerBg = '#FFFFFF';
      qrCodeFgColor = '#0B3C5D';
      qrBoxRadius = '8px';
      break;

    case 'luxuryMarble':
      // 9. Luxury Marble/Gold
      containerStyle.background = 'linear-gradient(135deg, #FAF8F5 0%, #FFFDF9 100%)';
      containerStyle.borderRadius = '0px'; // Classical sharp corners
      containerStyle.border = `3px double ${style.borderColor || '#D4AF37'}`;
      textPrimaryColor = '#1A1A1A';
      accentColorStyle = '#D4AF37'; // Luxury Gold
      logoTextColor = '#D4AF37';
      qrContainerBg = '#FFFFFF';
      qrCodeFgColor = '#1A1A1A';
      qrBoxRadius = '0px';
      break;

    case 'carbonFiber':
      // 10. Carbon Fiber/Industrial Safety Vibe
      containerStyle.backgroundColor = '#1C1C1E';
      containerStyle.backgroundImage = 'radial-gradient(#2C2C2E 20%, transparent 20%), radial-gradient(#2C2C2E 20%, transparent 20%)';
      containerStyle.backgroundPosition = '0 0, 8px 8px';
      containerStyle.backgroundSize = '16px 16px';
      containerStyle.borderRadius = '12px';
      containerStyle.border = `6px solid ${style.accentColor || '#F59E0B'}`;
      textPrimaryColor = '#FFFFFF';
      accentColorStyle = style.accentColor || '#F59E0B'; // Safety yellow/orange
      logoTextColor = '#FFFFFF';
      qrContainerBg = '#111';
      qrCodeFgColor = style.accentColor || '#F59E0B';
      qrBoxRadius = '4px';
      break;

    case 'vintage':
      // 11. Retro/Vintage Classic Vibe
      containerStyle.backgroundColor = '#F4EAD4'; // Retro Cream
      containerStyle.borderRadius = '40px';
      containerStyle.border = '3px dashed #6E473B';
      containerStyle.padding = '40px 24px';
      textPrimaryColor = '#4E3629'; // Warm brown
      accentColorStyle = '#8D5B4C';
      logoTextColor = '#4E3629';
      qrContainerBg = '#FAF5E8';
      qrCodeFgColor = '#4E3629';
      qrBoxRadius = '16px';
      break;

    case 'cleanCorporate':
      // 12. Clean Corporate / Professional
      containerStyle.backgroundColor = '#FFFFFF';
      containerStyle.borderRadius = '8px';
      containerStyle.border = `1px solid #E2E8F0`;
      containerStyle.borderTop = `16px solid ${style.primaryColor || '#1E3A8A'}`; // Thick corporate banner on top
      textPrimaryColor = '#0F172A';
      accentColorStyle = style.primaryColor || '#1E3A8A';
      logoTextColor = style.primaryColor || '#1E3A8A';
      qrContainerBg = '#FFFFFF';
      qrCodeFgColor = '#0F172A';
      qrBoxRadius = '4px';
      break;

    case 'abstractGeometric':
      // 13. Abstract Geometric
      containerStyle.background = 'linear-gradient(135deg, #FFEFD5 0%, #E6E6FA 100%)';
      containerStyle.borderRadius = '32px';
      containerStyle.border = 'none';
      textPrimaryColor = '#2D3748';
      accentColorStyle = '#E53E3E'; // Coral red
      logoTextColor = '#2D3748';
      qrContainerBg = '#FFFFFF';
      qrBoxRadius = '30px';
      break;

    case 'giantCenteredQR':
      // 14. Giant Centered QR Code
      containerStyle.backgroundColor = style.backgroundColor || '#FFFFFF';
      containerStyle.padding = '24px 20px';
      break;

    case 'glassmorphism':
      // 15. Frosted Glassmorphism
      containerStyle.background = 'linear-gradient(225deg, #FF3CAC 0%, #784BA0 50%, #2B86C5 100%)';
      containerStyle.borderRadius = '32px';
      containerStyle.border = 'none';
      containerStyle.padding = '14px';

      innerContainerStyle = {
        width: '100%',
        height: '100%',
        background: 'rgba(255, 255, 255, 0.16)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '24px',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      };
      textPrimaryColor = '#FFFFFF';
      accentColorStyle = '#FFFFFF';
      logoTextColor = '#FFFFFF';
      qrContainerBg = 'rgba(255, 255, 255, 0.2)';
      qrCodeFgColor = '#FFFFFF';
      qrBoxRadius = '20px';
      break;

    default:
      break;
  }

  // Helper content element that renders the layout fields
  const renderPlateContent = () => {
    const isGiantQR = style.templateId === 'giantCenteredQR';
    const isBento = style.templateId === 'bento';

    if (isBento) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', height: '100%', justifyContent: 'space-between' }}>
          {/* Header Box */}
          <div style={{ 
            background: 'rgba(255,255,255,0.85)', 
            backdropFilter: 'blur(8px)',
            borderRadius: '16px', 
            padding: '16px', 
            border: '1px solid rgba(0,0,0,0.06)',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
          }}>
            {showLogoTop && (
              <div style={{ marginBottom: '8px' }}>
                <Logo size={32} showText={true} textColor={logoTextColor} animate={animateLogo} />
              </div>
            )}
            <h1 style={{ fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 900, color: '#0F172A', margin: 0, textTransform: 'uppercase' }}>
              {style.titleText || 'CAMPAINHA DIGITAL'}
            </h1>
            <p style={{ fontSize: 'clamp(11px, 2vw, 13px)', fontWeight: 700, color: accentColorStyle, margin: '4px 0 0', textTransform: 'uppercase' }}>
              {style.subTitleText || 'Para tocar o interfone:'}
            </p>
          </div>

          {/* QR Box */}
          <div style={{ 
            background: qrContainerBg, 
            borderRadius: qrBoxRadius, 
            padding: '20px', 
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
            flexGrow: 1
          }}>
            <div style={{ width: '65%', aspectRatio: '1' }}>
              <QRCodeSVG 
                value={targetUrl}
                size={256}
                bgColor={qrContainerBg}
                fgColor={qrCodeFgColor}
                level="H"
                includeMargin={false}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* Instruction & Footer Box */}
          <div style={{ 
            background: 'rgba(255,255,255,0.85)', 
            backdropFilter: 'blur(8px)',
            borderRadius: '16px', 
            padding: '12px 16px', 
            border: '1px solid rgba(0,0,0,0.06)',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
          }}>
            <p style={{ fontSize: 'clamp(9px, 1.8vw, 11px)', lineHeight: 1.3, fontWeight: 500, color: '#475569', margin: '0 0 10px' }}>
              {style.instructionText || 'Aproxime a câmera do seu celular do QR Code'}
            </p>
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '8px' }}>
              <span style={{ fontSize: 'clamp(11px, 2.2vw, 14px)', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', display: 'block' }}>
                {propertyName}
              </span>
              {unitName && (
                <span style={{ fontSize: 'clamp(9px, 1.8vw, 12px)', fontWeight: 700, color: accentColorStyle, textTransform: 'uppercase', display: 'block', marginTop: '2px' }}>
                  {unitName}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Top Badge Tag */}
        {hasTopBadge && (
          <div style={{
            position: 'absolute',
            top: '12px',
            background: badgeBg,
            color: badgeTextColor,
            fontSize: '9px',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: '100px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            zIndex: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
          }}>
            {badgeText}
          </div>
        )}

        {/* HEADER: LOGO */}
        {showLogoTop && (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '6px', marginTop: hasTopBadge ? '16px' : '0' }}>
            <Logo 
              size={36} 
              showText={true} 
              textColor={logoTextColor} 
              animate={animateLogo} 
            />
          </div>
        )}

        {/* BODY TITLE & SUBTITLE */}
        <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={{ 
            fontSize: isGiantQR ? 'clamp(14px, 3vw, 18px)' : 'clamp(18px, 4vw, 24px)', 
            fontWeight: 900, 
            color: textPrimaryColor,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            lineHeight: 1.2
          }}>
            {style.titleText || 'CAMPAINHA DIGITAL'}
          </h1>
          <p style={{ 
            fontSize: isGiantQR ? 'clamp(10px, 2vw, 12px)' : 'clamp(12px, 2.5vw, 15px)', 
            fontWeight: 700, 
            color: accentColorStyle,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {style.subTitleText || 'Para tocar o interfone:'}
          </p>
        </div>

        {/* QR CODE CONTAINER */}
        <div style={{ 
          background: qrContainerBg,
          padding: '16px',
          borderRadius: qrBoxRadius,
          boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(0,0,0,0.06)',
          width: isGiantQR ? '72%' : '56%',
          aspectRatio: '1',
          margin: isGiantQR ? '8px 0' : '14px 0',
          position: 'relative'
        }}>
          <QRCodeSVG 
            value={targetUrl}
            size={256}
            bgColor={qrContainerBg}
            fgColor={qrCodeFgColor}
            level="H"
            includeMargin={false}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* INSTRUCTIONS */}
        <div style={{ 
          textAlign: 'center', 
          maxWidth: '85%', 
          margin: '0 auto 6px',
          color: textPrimaryColor,
          opacity: 0.85
        }}>
          <p style={{ 
            fontSize: 'clamp(9px, 1.8vw, 12px)', 
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
          borderTop: `1px solid ${textPrimaryColor}22`, 
          paddingTop: '10px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}>
          <span style={{ 
            fontSize: 'clamp(11px, 2.5vw, 16px)', 
            fontWeight: 800, 
            color: textPrimaryColor,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%'
          }}>
            {propertyName}
          </span>
          {unitName && (
            <span style={{ 
              fontSize: 'clamp(9px, 2vw, 13px)', 
              fontWeight: 700, 
              color: accentColorStyle,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block'
            }}>
              {unitName}
            </span>
          )}
          
          {showLogoBottom && (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '6px' }}>
              <Logo 
                size={24} 
                showText={false} 
                textColor={logoTextColor} 
                animate={animateLogo} 
              />
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div ref={ref} className="printable-plate-container" style={containerStyle}>
      {innerContainerStyle ? (
        <div style={innerContainerStyle}>
          {renderPlateContent()}
        </div>
      ) : (
        renderPlateContent()
      )}
    </div>
  );
});

export default PrintablePlate;
