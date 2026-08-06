'use client';

import React from 'react';

/**
 * Shared metallic-gold gradient paint servers for zodiac/sign icons.
 *
 * Renders two invisible <linearGradient> defs once per mount:
 *   #zsGold     — rich metallic gold (dark theme)
 *   #zsGoldDeep — deeper antique gold (light theme, keeps contrast on white)
 *
 * Icons opt in with CSS `stroke: url(#zsGold)` (Tabler/react-icons zodiac
 * icons are stroke-based and inherit the stroke from their root <svg>).
 * Fragment-only URLs resolve against the whole document, so any inline SVG
 * icon in the page can reference these gradients.
 *
 * NOTE: kept visible at 0×0 (not display:none) — some browsers ignore
 * paint servers that live inside display:none subtrees.
 */
export default function GoldDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="zsGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbe08a" />
          <stop offset="45%" stopColor="#e8b64c" />
          <stop offset="100%" stopColor="#a3791d" />
        </linearGradient>
        <linearGradient id="zsGoldDeep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c99a2e" />
          <stop offset="50%" stopColor="#a87d1a" />
          <stop offset="100%" stopColor="#7c5a10" />
        </linearGradient>
      </defs>
    </svg>
  );
}
