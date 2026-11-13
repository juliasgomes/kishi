import { useState } from 'react';
import { Download, Smartphone, Share, X } from 'lucide-react';
import { usePWAInstall } from '@/src/hooks/usePWAInstall';
import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          compact
            ? 'btn-press px-2.5 py-1.5 rounded-xl bg-[#C5A66B]/15 hover:bg-[#C5A66B]/25 border border-[#C5A66B]/45 text-[#C5A66B] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap'
            : 'w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#C5A66B] font-semibold flex items-center gap-2 cursor-pointer'
        }
        title="Instalar KISHI no dispositivo"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'btn-press px-2.5 py-1.5 rounded-xl bg-[#151d18] hover:bg-[#1b251f] border border-[#777F89]/50 text-[#EDE9DE] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap'
              : 'w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer'
          }
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C5A66B] shrink-0" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-[#151d18] border border-[#777F89]/60 p-5 space-y-3.5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#777F89]/40 pb-2.5">
                <h3 className="text-sm font-bold text-[#EDE9DE]">Instalar KISHI no iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-[#A9B99D] hover:text-white cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs text-[#A9B99D] leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[#C5A66B]">1.</span>
                  <span>
                    Abra o KISHI no <strong className="text-[#EDE9DE]">Safari</strong> e toque no botão{' '}
                    <strong className="text-[#EDE9DE] inline-flex items-center gap-1">
                      Compartilhar <Share className="w-3 h-3 inline" />
                    </strong>.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[#C5A66B]">2.</span>
                  <span>
                    Role e toque em <strong className="text-[#EDE9DE]">Adicionar à Tela de Início</strong>.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[#C5A66B]">3.</span>
                  <span>
                    Toque em <strong className="text-[#EDE9DE]">Adicionar</strong> para abrir em tela cheia como aplicativo.
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full btn-press py-2 rounded-xl bg-[#C5A66B] text-[#0f1512] font-bold text-xs cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#151d18] border border-amber-500/50 px-3 py-1.5 text-[11px] font-medium text-amber-300 shadow-lg">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      <span>Modo offline — sincroniza assim que voltar a conexão</span>
    </div>
  );
}
