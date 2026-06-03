import React from 'react';
import { Bell } from 'lucide-react';

/**
 * Logo component — global stylized brand.
 * Props:
 *   size      {number}  Height/scale in px of the logo box (default 40)
 *   light     {boolean} If true, uses white/light text suitable for dark backgrounds
 *   vertical  {boolean} If true, renders icon and text in a column layout
 *   showText  {boolean} If true, renders the brand name alongside the icon
 */
export default function Logo({ size = 40, light = false, vertical = false, showText = true, animate = true, textColor = null }) {
  // Map size to icon and text dimensions
  const iconSize = Math.max(14, Math.floor(size * 0.5));
  const boxSize = Math.max(26, Math.floor(size * 0.95));
  const mainFontSize = Math.max(12, Math.floor(size * 0.42));
  const subFontSize = Math.max(8, Math.floor(size * 0.28));
  
  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      justifyContent: vertical ? 'center' : 'flex-start',
      flexDirection: vertical ? 'column' : 'row',
      gap: vertical ? '8px' : '10px',
      userSelect: 'none',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Glowing Bell Icon with animated shine */}
      <div style={{
        width: `${boxSize}px`,
        height: `${boxSize}px`,
        borderRadius: Math.max(6, Math.floor(boxSize * 0.3)) + 'px',
        background: textColor ? textColor : 'linear-gradient(135deg, #4F46E5, #8B5CF6, #EC4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: textColor ? 'none' : (light ? '0 4px 16px rgba(255, 255, 255, 0.15)' : '0 4px 14px rgba(79, 70, 229, 0.35)'),
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Bell size={iconSize} color="#FFF" style={{ transform: 'rotate(15deg)' }} />
        {/* Shine effect */}
        {animate && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'logo-shine 2.5s infinite'
          }} />
        )}
      </div>
      
      {showText && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          lineHeight: '1',
          alignItems: vertical ? 'center' : 'flex-start',
          textAlign: vertical ? 'center' : 'left'
        }}>
          <span style={{ 
            fontSize: `${mainFontSize}px`, 
            fontWeight: 900, 
            letterSpacing: '-0.3px',
            background: textColor ? 'none' : (light ? '#FFF' : 'linear-gradient(135deg, #4F46E5, #8B5CF6)'),
            WebkitBackgroundClip: textColor ? 'none' : (light ? 'none' : 'text'),
            WebkitTextFillColor: textColor ? 'none' : (light ? 'none' : 'transparent'),
            color: textColor || (light ? '#FFF' : 'transparent'),
            textTransform: 'uppercase'
          }}>
            Campainha
          </span>
          <span style={{ 
            fontSize: `${subFontSize}px`, 
            fontWeight: 800, 
            letterSpacing: '1.2px',
            color: textColor || (light ? 'rgba(255,255,255,0.7)' : '#64748B'),
            textTransform: 'uppercase',
            marginTop: '1px'
          }}>
            Digital
          </span>
        </div>
      )}
      
      {/* Inject keyframes locally */}
      {animate && (
        <style>{`
          @keyframes logo-shine {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
          }
        `}</style>
      )}
    </div>
  );
}
