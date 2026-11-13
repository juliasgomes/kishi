export function KishiLogoSvg({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <rect x="44" y="35" width="5.5" height="15" rx="1.5" fill="#A9B99D" />
      <rect x="54" y="27" width="5.5" height="23" rx="1.5" fill="#A9B99D" />
      <rect x="64" y="18" width="5.5" height="32" rx="1.5" fill="#C5A66B" />
      <path
        d="M20 31 L32 31 L38 43 L52 48 L68 55"
        fill="none"
        stroke="#EDE9DE"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M38 43 L22 70" fill="none" stroke="#EDE9DE" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M52 48 L37 72" fill="none" stroke="#EDE9DE" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M63 43 L70 43 L74 50"
        fill="none"
        stroke="#EDE9DE"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M52 48 L71 78" fill="none" stroke="#EDE9DE" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20" cy="31" r="3.5" fill="#EDE9DE" />
      <circle cx="22" cy="70" r="3.5" fill="#EDE9DE" />
      <circle cx="37" cy="72" r="3.5" fill="#EDE9DE" />
      <circle cx="71" cy="78" r="3.5" fill="#EDE9DE" />
      <circle cx="74" cy="50" r="3.2" fill="#EDE9DE" />
      <circle cx="33" cy="47" r="9" fill="#EDE9DE" />
      <circle cx="52" cy="48" r="8" fill="#EDE9DE" />
      <circle cx="70" cy="56" r="8.5" fill="#EDE9DE" />
    </svg>
  );
}

export function ChatDotAntSvg({ className = 'w-4 h-4 text-[#C5A66B]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="17" rx="3.5" ry="4.5" fill="currentColor" opacity="0.85" />
      <ellipse cx="12" cy="10.5" rx="2.5" ry="3" fill="currentColor" />
      <circle cx="12" cy="5" r="2.2" fill="currentColor" />
      <path d="M10 3.5 L7 1" />
      <path d="M14 3.5 L17 1" />
      <path d="M9.5 9.5 L4 7" />
      <path d="M14.5 9.5 L20 7" />
      <path d="M9.5 12 L3 13.5" />
      <path d="M14.5 12 L21 13.5" />
      <path d="M10 16 L5 20.5" />
      <path d="M14 16 L19 20.5" />
    </svg>
  );
}
