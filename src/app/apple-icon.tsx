import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Apple touch icon for iOS home screen
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #05051a 60%, #0a0a2a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          position: 'relative',
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width="140"
          height="140"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="p" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <radialGradient id="bg2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#05051a" />
            </radialGradient>
            <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          {/* Outer ring */}
          <circle cx="32" cy="32" r="28" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.4" />
          {/* Tick marks at 4 cardinals */}
          <g stroke="#a78bfa" strokeWidth="1" opacity="0.6">
            <line x1="32" y1="3" x2="32" y2="7" />
            <line x1="32" y1="57" x2="32" y2="61" />
            <line x1="3" y1="32" x2="7" y2="32" />
            <line x1="57" y1="32" x2="61" y2="32" />
          </g>
          {/* Hexagram */}
          <polygon
            points="32,8 52,44 12,44"
            fill="none"
            stroke="url(#p)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="32,56 52,20 12,20"
            fill="none"
            stroke="url(#p)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Saturn ring */}
          <ellipse cx="32" cy="32" rx="16" ry="4.5" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.85" transform="rotate(-20 32 32)" />
          {/* Center planet */}
          <circle cx="32" cy="32" r="7" fill="url(#p)" />
          <circle cx="30" cy="30" r="2" fill="#fff" opacity="0.6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
