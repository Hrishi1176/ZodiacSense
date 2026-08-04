import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation - ZodiacSense astrology favicon
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #05051a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          position: 'relative',
        }}
      >
        {/* Hexagram (six-pointed star) - cosmic balance */}
        <svg
          viewBox="0 0 64 64"
          width="28"
          height="28"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute' }}
        >
          <defs>
            <linearGradient id="p" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          {/* Upward triangle */}
          <polygon
            points="32,8 52,44 12,44"
            fill="none"
            stroke="url(#p)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Downward triangle */}
          <polygon
            points="32,56 52,20 12,20"
            fill="none"
            stroke="url(#p)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Center dot */}
          <circle cx="32" cy="32" r="3" fill="#38bdf8" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
