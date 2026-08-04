'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleOffset: number;
  twinkleSpeed: number;
}

interface ConstellationLine {
  from: number;
  to: number;
  baseAlpha: number;
  twinkleOffset: number;
}

// 12 zodiac constellation points positioned around the screen
const ZODIAC_POSITIONS = [
  { x: 0.08, y: 0.18, name: 'Aries' },
  { x: 0.22, y: 0.08, name: 'Taurus' },
  { x: 0.38, y: 0.05, name: 'Gemini' },
  { x: 0.55, y: 0.10, name: 'Cancer' },
  { x: 0.72, y: 0.18, name: 'Leo' },
  { x: 0.88, y: 0.32, name: 'Virgo' },
  { x: 0.95, y: 0.50, name: 'Libra' },
  { x: 0.90, y: 0.70, name: 'Scorpio' },
  { x: 0.78, y: 0.86, name: 'Sagittarius' },
  { x: 0.58, y: 0.93, name: 'Capricorn' },
  { x: 0.38, y: 0.92, name: 'Aquarius' },
  { x: 0.18, y: 0.80, name: 'Pisces' },
];

// 12 zodiac symbols (Unicode)
const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

export default function ZodiacOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;
    let time = 0;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Generate random stars
    const starCount = window.innerWidth < 768 ? 70 : 160;
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.4,
      baseAlpha: Math.random() * 0.6 + 0.2,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
    }));

    // Build constellation connection lines (each zodiac connects to its neighbors)
    const connections: ConstellationLine[] = [];
    for (let i = 0; i < ZODIAC_POSITIONS.length; i++) {
      // Connect to next neighbor
      connections.push({
        from: i,
        to: (i + 1) % ZODIAC_POSITIONS.length,
        baseAlpha: 0.06,
        twinkleOffset: i * 0.5,
      });
      // Connect 2 steps away
      connections.push({
        from: i,
        to: (i + 5) % ZODIAC_POSITIONS.length,
        baseAlpha: 0.04,
        twinkleOffset: i * 0.3 + 2,
      });
    }

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      const zodiacRadius = isMobile ? 18 : 22;

      // ===== 1. Draw Constellation Lines =====
      connections.forEach((line) => {
        const p1 = ZODIAC_POSITIONS[line.from];
        const p2 = ZODIAC_POSITIONS[line.to];
        const x1 = p1.x * width;
        const y1 = p1.y * height;
        const x2 = p2.x * width;
        const y2 = p2.y * height;

        const twinkle = Math.sin(time * 0.01 + line.twinkleOffset) * 0.5 + 0.5;
        const alpha = line.baseAlpha * (0.3 + twinkle * 0.7);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
        ctx.shadowBlur = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // ===== 2. Draw Random Twinkling Stars =====
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
        const alpha = star.baseAlpha * (0.3 + twinkle * 0.7);

        // Mouse proximity glow
        const dx = star.x - mouseRef.current.x;
        const dy = star.y - mouseRef.current.y;
        const dist = Math.hypot(dx, dy);
        const mouseBoost = dist < 150 ? (1 - dist / 150) * 0.6 : 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.min(1, alpha + mouseBoost)})`;
        if (mouseBoost > 0) {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 6 * mouseBoost;
        } else {
          ctx.shadowColor = 'rgba(139, 92, 246, 0.3)';
          ctx.shadowBlur = 2;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ===== 3. Draw Zodiac Wheel Markers (12 positions) =====
      ZODIAC_POSITIONS.forEach((pos, i) => {
        const cx = pos.x * width;
        const cy = pos.y * height;
        const symbol = ZODIAC_SYMBOLS[i];

        // Pulse animation per marker
        const pulse = Math.sin(time * 0.015 + i * 0.5) * 0.5 + 0.5;
        const size = zodiacRadius + pulse * 3;
        const alpha = 0.5 + pulse * 0.35;

        // Outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.shadowBlur = 8 + pulse * 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner glow circle
        const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, zodiacRadius * 0.7);
        innerGrad.addColorStop(0, `rgba(167, 139, 250, ${alpha * 0.5})`);
        innerGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, zodiacRadius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = innerGrad;
        ctx.fill();

        // Zodiac symbol
        const fontSize = isMobile ? 14 : 18;
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(196, 181, 253, ${alpha})`;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText(symbol, cx, cy);
        ctx.shadowBlur = 0;
      });

      // ===== 4. Subtle Astrology Rune Center Symbol (subtle, only on large screens) =====
      if (!isMobile) {
        const cx = width * 0.92;
        const cy = height * 0.05;
        const runeAlpha = 0.15 + Math.sin(time * 0.02) * 0.05;
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(196, 181, 253, ${runeAlpha})`;
        ctx.fillText('☥', cx, cy);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
          opacity: 0.95,
        }}
      />
    </div>
  );
}
