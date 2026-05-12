import React from 'react';

export default function Logo({ size = 40, showText = true, light = false, vertical = false }) {
  const primaryColor = light ? '#FFFFFF' : '#0F172A';
  const secondaryColor = '#00E5FF';
  const accentColor = '#F59E0B';

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '12px',
      whiteSpace: 'nowrap',
      flexWrap: 'nowrap',
      userSelect: 'none',
      flexDirection: vertical ? 'column' : 'row',
      textAlign: vertical ? 'center' : 'left'
    }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg 
          width={size * 1.2} 
          height={size} 
          viewBox="0 0 120 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          <circle cx="40" cy="50" r="38" fill={primaryColor} />
          <circle cx="40" cy="50" r="14" fill={accentColor} />
          <circle cx="40" cy="50" r="6" fill="#FFF" opacity="0.4" />
          <path d="M75 25C90 35 90 65 75 75" stroke={secondaryColor} strokeWidth="10" strokeLinecap="round" />
          <path d="M95 10C115 25 115 75 95 90" stroke={secondaryColor} strokeWidth="10" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>
      
      {showText && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          lineHeight: 1
        }}>
          <span style={{ 
            fontSize: `${size * 0.65}px`, 
            fontWeight: 900, 
            color: primaryColor,
            letterSpacing: '-1.5px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            Campainha<span style={{ color: secondaryColor }}>-Digital</span>
          </span>
        </div>
      )}
    </div>
  );
}
