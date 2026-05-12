import React from 'react';

export default function Logo({ size = 40, showText = true, light = false }) {
  // Cores oficiais extraídas da imagem original
  const primaryColor = light ? '#FFFFFF' : '#0F172A'; // Azul escuro
  const secondaryColor = '#00E5FF'; // Ciano/Azul claro
  const accentColor = '#F59E0B'; // Laranja

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '12px',
      whiteSpace: 'nowrap',
      flexWrap: 'nowrap',
      userSelect: 'none',
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Icon Group - SVG otimizado para não cortar */}
      <div style={{ flexShrink: 0 }}>
        <svg 
          width={size * 1.3} 
          height={size} 
          viewBox="0 0 130 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Círculo Principal (Base da Campainha) */}
          <circle cx="45" cy="50" r="38" fill={primaryColor} />
          
          {/* Centro Laranja */}
          <circle cx="45" cy="50" r="14" fill={accentColor} />
          
          {/* Brilho interno no centro */}
          <circle cx="45" cy="50" r="6" fill="#FFF" opacity="0.4" />

          {/* Ondas Sonoras à Direita */}
          <path 
            d="M85 30C95 38 95 62 85 70" 
            stroke={secondaryColor} 
            strokeWidth="10" 
            strokeLinecap="round" 
          />
          <path 
            d="M105 15C125 30 125 70 105 85" 
            stroke={secondaryColor} 
            strokeWidth="10" 
            strokeLinecap="round" 
            opacity="0.6"
          />
        </svg>
      </div>
      
      {showText && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          lineHeight: 1
        }}>
          <span style={{ 
            fontSize: `${size * 0.7}px`, 
            fontWeight: 900, 
            color: primaryColor,
            letterSpacing: '-1.5px',
            margin: 0
          }}>
            Campainha<span style={{ color: secondaryColor }}>-Digital</span>
          </span>
        </div>
      )}
    </div>
  );
}
