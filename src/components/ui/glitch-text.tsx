'use client';

import { useEffect, useState } from 'react';

interface GlitchTextProps {
  text: string;
  /** Tailwind classes for sizing/styling */
  className?: string;
  /** Whether the glitch is always active or only on hover */
  alwaysOn?: boolean;
}

/**
 * Cyberpunk-style glitch text effect.
 * Uses pseudo-element-style layered text with offset RGB channels that
 * randomly skew and shift, creating the classic "glitch" look.
 */
export function GlitchText({ text, className = '', alwaysOn = true }: GlitchTextProps) {
  const [glitching, setGlitching] = useState(true);

  // Randomly toggle the glitch state for a more organic feel
  useEffect(() => {
    if (!alwaysOn) return;
    const interval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 80 + Math.random() * 120);
    }, 1800 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [alwaysOn]);

  return (
    <span
      className={`relative inline-block font-bold ${className}`}
      style={{
        fontFamily: 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace',
        letterSpacing: '0.05em',
      }}
      data-text={text}
    >
      {/* Base text */}
      <span className="relative z-10">{text}</span>

      {/* Cyan layer (offset left) */}
      <span
        aria-hidden
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          color: '#00f2fe',
          textShadow: '0 0 8px rgba(0, 242, 254, 0.7)',
          transform: glitching ? 'translate(-2px, 0)' : 'translate(0, 0)',
          clipPath: glitching
            ? 'polygon(0 0, 100% 0, 100% 33%, 0 33%, 0 50%, 100% 50%, 100% 75%, 0 75%, 0 100%, 100% 100%, 100% 100%)'
            : 'none',
          opacity: glitching ? 1 : 0.4,
          transition: 'opacity 0.1s ease, transform 0.1s ease',
          mixBlendMode: 'screen',
        }}
      >
        {text}
      </span>

      {/* Magenta layer (offset right) */}
      <span
        aria-hidden
        className="absolute inset-0 z-30 pointer-events-none"
        style={{
          color: '#ff0844',
          textShadow: '0 0 8px rgba(255, 8, 68, 0.7)',
          transform: glitching ? 'translate(2px, 0)' : 'translate(0, 0)',
          clipPath: glitching
            ? 'polygon(0 25%, 100% 25%, 100% 30%, 0 30%, 0 60%, 100% 60%, 100% 65%, 0 65%)'
            : 'none',
          opacity: glitching ? 1 : 0.4,
          transition: 'opacity 0.1s ease, transform 0.1s ease',
          mixBlendMode: 'screen',
        }}
      >
        {text}
      </span>

      {/* Scanline flicker overlay */}
      <span
        aria-hidden
        className="absolute inset-0 z-40 pointer-events-none"
        style={{
          background: glitching
            ? 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)'
            : 'none',
          mixBlendMode: 'overlay',
          opacity: glitching ? 0.6 : 0,
          transition: 'opacity 0.1s',
        }}
      />

      <style>{`
        @keyframes subtleSkew {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(0.5deg); }
        }
      `}</style>
    </span>
  );
}
