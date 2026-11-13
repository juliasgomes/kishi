import { useEffect, useState } from 'react';
import { RealisticMicroAntSvg } from '@/src/components/KishiIcons';

interface AntBurst {
  id: string;
  x: number;
  y: number;
  startRot: number;
  midX: number;
  midY: number;
  midRot: number;
  endX: number;
  endY: number;
  endRot: number;
  exitX: number;
  exitY: number;
  durationMs: number;
  sizeClass: string;
}

export function triggerAntScurry(x?: number, y?: number, count = 2) {
  if (typeof window === 'undefined') return;
  const cx =
    typeof x === 'number' && Number.isFinite(x) && x > 0
      ? x
      : Math.round(window.innerWidth * 0.5);
  const cy =
    typeof y === 'number' && Number.isFinite(y) && y > 0
      ? y
      : Math.round(window.innerHeight * 0.35);

  window.dispatchEvent(
    new CustomEvent('kishi:ant-scurry', {
      detail: { x: cx, y: cy, count },
    }),
  );
}

export function AntTrailOverlay() {
  const [ants, setAnts] = useState<AntBurst[]>([]);

  useEffect(() => {
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const handleBurst = (event: Event) => {
      const custom = event as CustomEvent<{ x?: number; y?: number; count?: number }>;
      const baseX = custom.detail?.x ?? window.innerWidth * 0.5;
      const baseY = custom.detail?.y ?? window.innerHeight * 0.4;
      const count = Math.min(Math.max(custom.detail?.count ?? 2, 1), 3);

      const batch: AntBurst[] = Array.from({ length: count }).map((_, idx) => {
        const angle = (Math.random() * 260 - 130 + idx * 95) * (Math.PI / 180);
        const curve = (idx % 2 === 0 ? 1 : -1) * (24 + Math.random() * 18);
        const reach = 34 + Math.random() * 26;

        const midX = Math.round(Math.cos(angle) * (reach * 0.52) - Math.sin(angle) * (curve * 0.45));
        const midY = Math.round(Math.sin(angle) * (reach * 0.52) + Math.cos(angle) * (curve * 0.45));
        const endX = Math.round(Math.cos(angle) * reach);
        const endY = Math.round(Math.sin(angle) * reach);
        const exitX = Math.round(Math.cos(angle) * (reach + 14));
        const exitY = Math.round(Math.sin(angle) * (reach + 14));

        const startRot = Math.round((Math.atan2(midY, midX) * 180) / Math.PI);
        const midRot = Math.round((Math.atan2(endY - midY, endX - midX) * 180) / Math.PI);
        const endRot = Math.round((Math.atan2(exitY - endY, exitX - endX) * 180) / Math.PI);

        return {
          id: `ant_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          x: Math.round(baseX + (idx - 0.5) * 10),
          y: Math.round(baseY + (idx % 2 === 0 ? -6 : 6)),
          startRot,
          midX,
          midY,
          midRot,
          endX,
          endY,
          endRot,
          exitX,
          exitY,
          durationMs: 1550 + idx * 240,
          sizeClass: idx === 0 ? 'w-3.5 h-3.5' : 'w-3 h-3',
        };
      });

      setAnts((prev) => [...prev.slice(-4), ...batch]);

      const maxDur = Math.max(...batch.map((b) => b.durationMs)) + 150;
      const batchIds = new Set(batch.map((b) => b.id));
      window.setTimeout(() => {
        setAnts((prev) => prev.filter((item) => !batchIds.has(item.id)));
      }, maxDur);
    };

    window.addEventListener('kishi:ant-scurry', handleBurst);
    return () => window.removeEventListener('kishi:ant-scurry', handleBurst);
  }, []);

  if (ants.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    >
      {ants.map((ant) => (
        <div
          key={ant.id}
          style={
            {
              left: `${ant.x}px`,
              top: `${ant.y}px`,
              '--ant-start-rot': `${ant.startRot}deg`,
              '--ant-mid-x': `${ant.midX}px`,
              '--ant-mid-y': `${ant.midY}px`,
              '--ant-mid-rot': `${ant.midRot}deg`,
              '--ant-end-x': `${ant.endX}px`,
              '--ant-end-y': `${ant.endY}px`,
              '--ant-end-rot': `${ant.endRot}deg`,
              '--ant-exit-x': `${ant.exitX}px`,
              '--ant-exit-y': `${ant.exitY}px`,
              '--ant-dur': `${ant.durationMs}ms`,
            } as React.CSSProperties
          }
          className="fixed -translate-x-1/2 -translate-y-1/2 ant-scurry-runner"
        >
          <RealisticMicroAntSvg
            walking
            className={`${ant.sizeClass} text-[#C5A66B] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]`}
          />
        </div>
      ))}
    </div>
  );
}
