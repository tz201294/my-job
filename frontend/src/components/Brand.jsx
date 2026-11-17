import { useId } from 'react';

export const BRAND_NAME = 'Prologue';
export const TAGLINE = 'A story behind every profession';

// The Prologue mark: a "P." (the first letter and first full stop of a story) on a deep teal tile.
// Same drawing as public/icon.svg, inline so it stays crisp at any size. Gradient ids are made unique per
// instance so several marks on one page don't clash.
export function BrandMark({ size = 40, className = '', title }) {
  const raw = useId().replace(/:/g, '');
  const id = (name) => `${name}-${raw}`;
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={id('bg')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#073b38" />
          <stop offset="0.5" stopColor="#0b5f5a" />
          <stop offset="1" stopColor="#0b5a74" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="0.2" cy="0.1" r="0.9">
          <stop offset="0" stopColor="#5eead4" stopOpacity="0.38" />
          <stop offset="0.55" stopColor="#5eead4" stopOpacity="0.05" />
          <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('depth')} cx="0.85" cy="0.95" r="0.7">
          <stop offset="0" stopColor="#021c1b" stopOpacity="0.45" />
          <stop offset="1" stopColor="#021c1b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('edge')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={id('ink')} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cdf7ef" />
        </linearGradient>
        <linearGradient id={id('dot')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a7f3e4" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="118" fill={`url(#${id('bg')})`} />
      <rect width="512" height="512" rx="118" fill={`url(#${id('glow')})`} />
      <rect width="512" height="512" rx="118" fill={`url(#${id('depth')})`} />
      <rect x="2.5" y="2.5" width="507" height="507" rx="115.5" fill="none" stroke={`url(#${id('edge')})`} strokeWidth="5" />
      <rect x="152" y="124" width="48" height="264" rx="24" fill={`url(#${id('ink')})`} />
      <path d="M176 148 H246 A90 90 0 0 1 246 328 H200" fill="none" stroke={`url(#${id('ink')})`} strokeWidth="48" strokeLinejoin="round" />
      <circle cx="336" cy="366" r="22" fill={`url(#${id('dot')})`} />
    </svg>
  );
}

// "Prologue" with "Pro" emphasised — Pro as in professional.
export function Wordmark({ className = '' }) {
  return (
    <span className={`tracking-tight leading-none ${className}`}>
      <span className="font-extrabold text-teal-700">Pro</span>
      <span className="font-light text-slate-800">logue</span>
    </span>
  );
}
