import React from 'react';

interface SparkleProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Sparkle({ size = 14, color = '#F4F1EA', style = {} }: SparkleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden className="sparkle">
      <path
        d="M12 0 L13.5 10.5 L24 12 L13.5 13.5 L12 24 L10.5 13.5 L0 12 L10.5 10.5 Z"
        fill={color}
      />
    </svg>
  );
}

interface LuneraMarkProps {
  size?: number;
}

export function LuneraMark({ size = 28 }: LuneraMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="silver-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E8E6E1" />
          <stop offset="70%" stopColor="#9A9DA8" />
          <stop offset="100%" stopColor="#4A4D58" />
        </linearGradient>
      </defs>
      <path d="M44 8 A26 26 0 1 0 44 56 A20 20 0 1 1 44 8 Z" fill="url(#silver-grad)" />
      <circle cx="48" cy="14" r="1.2" fill="#F4F1EA" />
      <circle cx="52" cy="22" r="0.8" fill="#F4F1EA" />
      <circle cx="40" cy="20" r="0.6" fill="#F4F1EA" />
      <circle cx="46" cy="32" r="0.7" fill="#F4F1EA" />
    </svg>
  );
}
