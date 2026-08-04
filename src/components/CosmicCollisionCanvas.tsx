'use client';

import React, { useEffect, useRef } from 'react';

interface Planet {
  id: string;
  name: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  depthFactor: number;
  colorStart: string;
  colorEnd: string;
  glowColor: string;
  hasRing?: boolean;
  ringColor?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  sparkle: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export default function CosmicCollisionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let currentScrollY = window.scrollY;

    const handleScroll = () => {
      currentScrollY = window.scrollY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // Spread the 9 Planets across full screen quadrants with Ultra Slow-Motion velocities
    const planets: Planet[] = [
      {
        id: 'sun',
        name: 'Sun',
        x: width * 0.12,
        y: height * 0.15,
        baseX: width * 0.12,
        baseY: height * 0.15,
        vx: 0.12,
        vy: 0.08,
        radius: 34,
        baseRadius: 34,
        depthFactor: 0.25,
        colorStart: '#fff7ed',
        colorEnd: '#f97316',
        glowColor: 'rgba(249, 115, 22, 0.85)',
      },
      {
        id: 'mercury',
        name: 'Mercury',
        x: width * 0.88,
        y: height * 0.15,
        baseX: width * 0.88,
        baseY: height * 0.15,
        vx: -0.15,
        vy: 0.1,
        radius: 20,
        baseRadius: 20,
        depthFactor: 0.15,
        colorStart: '#f1f5f9',
        colorEnd: '#475569',
        glowColor: 'rgba(148, 163, 184, 0.65)',
      },
      {
        id: 'venus',
        name: 'Venus',
        x: width * 0.50,
        y: height * 0.12,
        baseX: width * 0.50,
        baseY: height * 0.12,
        vx: 0.1,
        vy: 0.14,
        radius: 26,
        baseRadius: 26,
        depthFactor: 0.35,
        colorStart: '#fef3c7',
        colorEnd: '#b45309',
        glowColor: 'rgba(245, 158, 11, 0.75)',
      },
      {
        id: 'earth',
        name: 'Earth',
        x: width * 0.92,
        y: height * 0.48,
        baseX: width * 0.92,
        baseY: height * 0.48,
        vx: -0.13,
        vy: -0.11,
        radius: 28,
        baseRadius: 28,
        depthFactor: 0.45,
        colorStart: '#60a5fa',
        colorEnd: '#16a34a',
        glowColor: 'rgba(56, 189, 248, 0.8)',
      },
      {
        id: 'mars',
        name: 'Mars',
        x: width * 0.08,
        y: height * 0.52,
        baseX: width * 0.08,
        baseY: height * 0.52,
        vx: 0.14,
        vy: -0.12,
        radius: 24,
        baseRadius: 24,
        depthFactor: 0.3,
        colorStart: '#fca5a5',
        colorEnd: '#991b1b',
        glowColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        id: 'jupiter',
        name: 'Jupiter',
        x: width * 0.45,
        y: height * 0.48,
        baseX: width * 0.45,
        baseY: height * 0.48,
        vx: -0.09,
        vy: 0.13,
        radius: 38,
        baseRadius: 38,
        depthFactor: 0.5,
        colorStart: '#fed7aa',
        colorEnd: '#c2410c',
        glowColor: 'rgba(249, 115, 22, 0.75)',
      },
      {
        id: 'saturn',
        name: 'Saturn',
        x: width * 0.86,
        y: height * 0.84,
        baseX: width * 0.86,
        baseY: height * 0.84,
        vx: -0.11,
        vy: -0.14,
        radius: 32,
        baseRadius: 32,
        depthFactor: 0.4,
        colorStart: '#fef08a',
        colorEnd: '#a16207',
        glowColor: 'rgba(234, 179, 8, 0.75)',
        hasRing: true,
        ringColor: 'rgba(234, 179, 8, 0.7)',
      },
      {
        id: 'uranus',
        name: 'Uranus',
        x: width * 0.14,
        y: height * 0.86,
        baseX: width * 0.14,
        baseY: height * 0.86,
        vx: 0.13,
        vy: -0.1,
        radius: 26,
        baseRadius: 26,
        depthFactor: 0.2,
        colorStart: '#a5f3fc',
        colorEnd: '#0891b2',
        glowColor: 'rgba(6, 182, 212, 0.8)',
        hasRing: true,
        ringColor: 'rgba(165, 243, 252, 0.65)',
      },
      {
        id: 'neptune',
        name: 'Neptune',
        x: width * 0.52,
        y: height * 0.88,
        baseX: width * 0.52,
        baseY: height * 0.88,
        vx: -0.1,
        vy: -0.15,
        radius: 25,
        baseRadius: 25,
        depthFactor: 0.35,
        colorStart: '#93c5fd',
        colorEnd: '#1d4ed8',
        glowColor: 'rgba(37, 99, 235, 0.8)',
      },
    ];

    let particles: Particle[] = [];
    let shockwaves: Shockwave[] = [];

    // Trigger Cosmic Fireworks Explosion
    const createFireworks = (cx: number, cy: number, colorA: string, colorB: string, isMobile: boolean) => {
      const numParticles = isMobile ? 24 : 48;
      const palette = [colorA, colorB, '#ffffff', '#38bdf8', '#f59e0b', '#ec4899', '#a78bfa'];

      for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (isMobile ? 3.5 : 6) + 1.5;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * (isMobile ? 2 : 3.5) + 1,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 1,
          decay: Math.random() * 0.025 + 0.015,
          sparkle: Math.random() > 0.4,
        });
      }

      // Add shockwave expansion ring
      shockwaves.push({
        x: cx,
        y: cy,
        radius: 4,
        maxRadius: isMobile ? 45 : 75,
        color: colorA,
        alpha: 0.95,
      });
    };

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      const mobileScaleFactor = isMobile ? 0.55 : 1.0;
      const scrollOffset = currentScrollY;

      // 1. Update & Draw Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.radius += isMobile ? 1.8 : 2.8;
        s.alpha -= 0.025;

        if (s.alpha <= 0 || s.radius >= s.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y - scrollOffset * 0.2, s.radius, 0, Math.PI * 2);
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.lineWidth = isMobile ? 2 : 3;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = isMobile ? 10 : 18;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Update & Draw Fireworks Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y - scrollOffset * 0.2, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.sparkle ? (isMobile ? 8 : 14) : 4;
        ctx.fill();
        ctx.restore();
      }

      // 3. Update & Draw Planets with Slow Motion & Mobile Scaling
      for (let i = 0; i < planets.length; i++) {
        const p1 = planets[i];

        // Mobile responsive scaling & scroll parallax
        const scrollParallaxY = scrollOffset * p1.depthFactor;
        p1.radius = (p1.baseRadius * mobileScaleFactor) * (1 + (scrollOffset / height) * 0.2);

        // Move planet across full screen axes in slow motion
        p1.x += p1.vx;
        p1.y += p1.vy;

        const renderY = p1.y - scrollParallaxY;

        // Screen boundary rebound across full width & height
        const padding = p1.radius + (isMobile ? 8 : 15);
        const topBoundary = isMobile ? 60 : 75;

        if (p1.x < padding) {
          p1.x = padding;
          p1.vx *= -1;
        } else if (p1.x > width - padding) {
          p1.x = width - padding;
          p1.vx *= -1;
        }

        if (renderY < topBoundary + p1.radius) {
          p1.y = topBoundary + p1.radius + scrollParallaxY;
          p1.vy *= -1;
        } else if (renderY > height - padding) {
          p1.y = height - padding + scrollParallaxY;
          p1.vy *= -1;
        }

        // Collision Check with other planets
        for (let j = i + 1; j < planets.length; j++) {
          const p2 = planets[j];
          const renderY2 = p2.y - scrollOffset * p2.depthFactor;
          const dx = p2.x - p1.x;
          const dy = renderY2 - renderY;
          const distance = Math.hypot(dx, dy);
          const minDistance = p1.radius + p2.radius;

          if (distance < minDistance) {
            // Collision point
            const collisionX = (p1.x + p2.x) / 2;
            const collisionY = (renderY + renderY2) / 2;

            // Trigger fireworks!
            createFireworks(collisionX, collisionY, p1.glowColor, p2.glowColor, isMobile);

            // Gentle elastic bounce physics response
            const angle = Math.atan2(dy, dx);
            const targetX = p1.x + Math.cos(angle) * minDistance;
            const targetY = renderY + Math.sin(angle) * minDistance;
            const ax = (targetX - p2.x) * 0.025;
            const ay = (targetY - renderY2) * 0.025;

            p1.vx -= ax;
            p1.vy -= ay;
            p2.vx += ax;
            p2.vy += ay;
          }
        }

        // Render 3D Planet at renderY
        ctx.save();

        // Planet Glow
        ctx.shadowColor = p1.glowColor;
        ctx.shadowBlur = isMobile ? 12 : 20;

        // Radial 3D Gradient
        const grad = ctx.createRadialGradient(
          p1.x - p1.radius * 0.3,
          renderY - p1.radius * 0.3,
          p1.radius * 0.1,
          p1.x,
          renderY,
          p1.radius
        );
        grad.addColorStop(0, p1.colorStart);
        grad.addColorStop(0.65, p1.colorEnd);
        grad.addColorStop(1, '#05051a');

        // Draw Sphere
        ctx.beginPath();
        ctx.arc(p1.x, renderY, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw Rings if applicable (Saturn / Uranus)
        if (p1.hasRing && p1.ringColor) {
          ctx.beginPath();
          ctx.ellipse(p1.x, renderY, p1.radius * 1.6, p1.radius * 0.4, Math.PI / 6, 0, Math.PI * 2);
          ctx.strokeStyle = p1.ringColor;
          ctx.lineWidth = isMobile ? 2.5 : 4;
          ctx.stroke();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
