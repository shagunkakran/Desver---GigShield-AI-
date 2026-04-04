import * as React from "react";

/*
  Cartoon-style illustrations for the HomePage.
  - HeroIllustration: friendly rider on a scooter with soft blobs.
  - MapWalletIllustration: wallet with coins and a small map pin accent.
*/

export const HeroIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 800 520"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <defs>
      <linearGradient id="c1" x1="0" x2="1">
        <stop offset="0" stopColor="#60A5FA" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
      <linearGradient id="c2" x1="0" x2="1">
        <stop offset="0" stopColor="#FCA5A5" />
        <stop offset="1" stopColor="#FB923C" />
      </linearGradient>
    </defs>

    {/* background soft blobs */}
    <ellipse cx="620" cy="80" rx="160" ry="90" fill="url(#c2)" opacity="0.14" />
    <ellipse cx="140" cy="420" rx="200" ry="120" fill="url(#c1)" opacity="0.12" />

    {/* cartoon rider on scooter */}
    <g transform="translate(120,120)">
      {/* scooter body */}
      <rect x="0" y="140" rx="16" ry="16" width="360" height="52" fill="#111827" opacity="0.08" />
      <path d="M40 120 q40 -36 120 0 l80 0 q28 0 48 20 l12 12" fill="#F3F4F6" />
      <rect x="68" y="92" rx="10" width="160" height="28" fill="#60A5FA" />
      <rect x="140" y="92" rx="8" width="120" height="24" fill="#1E293B" opacity="0.08" />
      {/* wheels */}
      <circle cx="80" cy="200" r="28" fill="#374151" />
      <circle cx="280" cy="200" r="28" fill="#374151" />
      <circle cx="80" cy="200" r="12" fill="#F8FAFC" />
      <circle cx="280" cy="200" r="12" fill="#F8FAFC" />
      {/* rider */}
      <circle cx="120" cy="56" r="28" fill="#FFD29F" />
      <rect x="98" y="80" rx="10" width="44" height="48" fill="#0EA5A9" />
      <rect x="142" y="90" rx="8" width="64" height="40" fill="#7C3AED" />
      {/* helmet */}
      <path d="M100 40 q20 -26 40 0" fill="#111827" transform="translate(0,-6)" />
      {/* parcel box on scooter */}
      <rect x="240" y="60" width="80" height="56" rx="8" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
      <text x="280" y="95" textAnchor="middle" fontSize="14" fill="#92400E" fontFamily="sans-serif">BOX</text>
      {/* motion lines */}
      <path d="M8 120 q40 -8 80 0" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M360 140 q24 0 40 -8" stroke="#FB923C" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45" />
    </g>

    {/* small accents: map pin + wallet icon */}
    <g transform="translate(520,320)">
      <circle cx="36" cy="36" r="36" fill="#EEF2FF" />
      <path d="M36 18 a18 18 0 1 0 .001 0" fill="#4F46E5" />
      <rect x="12" y="44" width="48" height="22" rx="6" fill="#A78BFA" />
      <rect x="18" y="48" width="20" height="6" rx="3" fill="#FFF" />
    </g>
  </svg>
);

export const MapWalletIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 360 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <defs>
      <linearGradient id="w1" x1="0" x2="1">
        <stop offset="0" stopColor="#F59E0B" />
        <stop offset="1" stopColor="#F97316" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="360" height="140" rx="12" fill="#FFFFFF" stroke="#F1F5F9" />

    {/* wallet */}
    <g transform="translate(20,16)">
      <rect width="110" height="88" rx="10" fill="#FEF3C7" stroke="#FDE68A" />
      <rect x="12" y="18" width="86" height="46" rx="6" fill="#FFF7ED" />
      <circle cx="94" cy="26" r="6" fill="#F59E0B" />
      <path d="M12 68 h86 v8 a8 8 0 0 1 -8 8 h-70 a8 8 0 0 1 -8 -8 z" fill="#FDBA74" />
      <text x="56" y="53" textAnchor="middle" fontSize="16" fill="#92400E" fontFamily="sans-serif">₹</text>
    </g>

    {/* coins stack */}
    <g transform="translate(150,28)">
      <ellipse cx="40" cy="20" rx="40" ry="12" fill="#FEF3C7" />
      <ellipse cx="40" cy="32" rx="40" ry="12" fill="#FDE68A" />
      <ellipse cx="40" cy="44" rx="40" ry="12" fill="#F59E0B" />
      <text x="40" y="34" textAnchor="middle" fontSize="12" fill="#92400E" fontFamily="sans-serif">₹</text>
    </g>

    {/* small map pin */}
    <g transform="translate(260,18)">
      <circle cx="28" cy="28" r="28" fill="#EFF6FF" />
      <path d="M28 16 a12 12 0 1 0 .001 0" fill="#3B82F6" />
      <path d="M28 34 c-8 -8 0 -18 0 -18 s8 10 0 18 z" fill="#60A5FA" opacity="0.9" />
    </g>

    {/* caption */}
    <text x="20" y="122" fontSize="12" fill="#475569" fontFamily="sans-serif">Wallet & quick earnings overview</text>
  </svg>
);
