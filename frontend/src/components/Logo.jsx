import React from 'react';

/**
 * Logo component — uses the real brand PNG.
 * Props:
 *   size      {number}  Height in px of the logo image (default 40)
 *   light     {boolean} If true, applies a white brightness filter for dark backgrounds
 *   vertical  {boolean} Unused – kept for API compatibility
 *   showText  {boolean} Unused – text is baked into the PNG
 */
export default function Logo({ size = 40, light = false, vertical = false, showText = true }) {
  // Aspect ratio of the logo image (approx 3:1 wide)
  const width = size * 3.5;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: vertical ? 'center' : 'flex-start',
        userSelect: 'none',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt="Campainha Digital — Acesso Residencial Inteligente"
        height={size}
        width={width}
        style={{
          height: size,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          filter: light ? 'brightness(0) invert(1)' : 'none',
          display: 'block',
        }}
      />
    </div>
  );
}
