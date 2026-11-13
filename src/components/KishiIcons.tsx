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

/**
 * Formiga anatômica realista (vista superior) em escala minúscula.
 * As classes `ant-tripod-a` / `ant-tripod-b` animam apenas quando envoltas por `.ant-walking`.
 */
export function RealisticMicroAntSvg({
  className = 'w-3.5 h-3.5 text-[#1b1610]',
  walking = false,
}: {
  className?: string;
  walking?: boolean;
}) {
  return (
    <svg
      className={`${className} ${walking ? 'ant-walking' : ''}`}
      viewBox="0 0 36 28"
      fill="none"
      aria-hidden="true"
    >
      {/* Grupo tripé A (pata frontal esq, média dir, traseira esq) */}
      <g className="ant-tripod-a" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        {/* Frontal esquerda */}
        <path d="M21 12.2 L24.5 7.2 L28.2 5.4" />
        {/* Média direita */}
        <path d="M18.2 15.6 L19.4 20.6 L21.4 24.4" />
        {/* Traseira esquerda */}
        <path d="M15.4 12.6 L11.4 7.6 L6.8 5.2" />
      </g>

      {/* Grupo tripé B (pata frontal dir, média esq, traseira dir) */}
      <g className="ant-tripod-b" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        {/* Frontal direita */}
        <path d="M21 15.8 L24.5 20.8 L28.2 22.6" />
        {/* Média esquerda */}
        <path d="M18.2 12.4 L19.4 7.4 L21.4 3.6" />
        {/* Traseira direita */}
        <path d="M15.4 15.4 L11.4 20.4 L6.8 22.8" />
      </g>

      {/* Antenas geniculadas (escapo + funículo dobrado realista) */}
      <path
        d="M27.4 12.4 L30.8 9.2 L34.2 9.4"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.4 15.6 L30.8 18.8 L34.2 18.6"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Mandíbulas curtas */}
      <path
        d="M28.1 13.3 L29.7 13.8 M28.1 14.7 L29.7 14.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Gáster (abdômen segmentado real) */}
      <ellipse cx="7.4" cy="14" rx="5.1" ry="3.5" fill="currentColor" />
      <path
        d="M5.4 11.2 C6.1 13.1 6.1 14.9 5.4 16.8 M8.1 10.7 C8.8 12.9 8.8 15.1 8.1 17.3"
        stroke="#C5A66B"
        strokeOpacity="0.32"
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* Pecíolo fino (cintura) */}
      <ellipse cx="13.4" cy="14" rx="1.35" ry="0.95" fill="currentColor" />

      {/* Mesossoma / Tórax */}
      <ellipse cx="18.3" cy="14" rx="3.7" ry="2.15" fill="currentColor" />

      {/* Cápsula cefálica */}
      <ellipse cx="24.8" cy="14" rx="3.1" ry="2.55" fill="currentColor" />

      {/* Olhos compostos sutis */}
      <circle cx="25.6" cy="12.3" r="0.55" fill="#C5A66B" fillOpacity="0.45" />
      <circle cx="25.6" cy="15.7" r="0.55" fill="#C5A66B" fillOpacity="0.45" />
    </svg>
  );
}

/**
 * Inscrição cuneiforme suméria discreta (𒆧 = Kiši "formiga", 𒁾 = Dub "tábua/planilha",
 * 𒌓 = Ud "dia", 𒋗 = Šu "tarefa/mão", 𒆠 = Ki "lugar").
 */
export function SumerianGlyphWhisper({
  glyphs = '𒆧  𒁾  𒌓',
  className = '',
  title,
}: {
  glyphs?: string;
  className?: string;
  title?: string;
}) {
  return (
    <span
      aria-hidden={!title}
      title={title}
      className={`select-none pointer-events-none tracking-[0.22em] text-[#C5A66B]/30 font-serif leading-none ${className}`}
    >
      {glyphs}
    </span>
  );
}

