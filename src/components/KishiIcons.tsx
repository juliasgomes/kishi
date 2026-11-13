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
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Antenas dobradas (típicas de formiga) */}
      <path
        d="M8.5 8.5 L6.8 4.4 L3.6 3.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 8.4 L11.8 4.2 L14.8 3.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3 pares de patinhas articuladas */}
      <path
        d="M14.2 16.2 L11.8 21.4 L9.2 25.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.2 16.8 L16.2 22 L15 26.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.4 16.4 L21.4 21.4 L23.8 25.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Conectores (cintura fina de formiga) */}
      <path
        d="M11.8 12.6 L14.2 14.2 M18.4 15.2 L20.4 16"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />

      {/* Cabeça */}
      <circle cx="9.6" cy="11.6" r="3.6" fill="currentColor" />
      <circle cx="8.4" cy="10.8" r="0.85" fill="#0b100d" />

      {/* Tórax */}
      <ellipse cx="16.2" cy="14.6" rx="3" ry="2.4" fill="currentColor" />

      {/* Abdômen (gáster) empinado */}
      <ellipse
        cx="24"
        cy="17.6"
        rx="5.2"
        ry="4.1"
        transform="rotate(-18 24 17.6)"
        fill="currentColor"
      />
    </svg>
  );
}
