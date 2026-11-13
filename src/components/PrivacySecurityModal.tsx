import { CheckCircle2, Lock, LogOut, ShieldCheck, X } from 'lucide-react';

interface PrivacySecurityModalProps {
  open: boolean;
  userEmail: string;
  autoLockEnabled: boolean;
  onToggleAutoLock: (next: boolean) => void;
  onLockAndSignOut: () => void;
  onClose: () => void;
}

export function PrivacySecurityModal({
  open,
  userEmail,
  autoLockEnabled,
  onToggleAutoLock,
  onLockAndSignOut,
  onClose,
}: PrivacySecurityModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Segurança &amp; Proteção LGPD</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A9B99D] hover:text-white cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0b100d] border border-emerald-500/35 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Proteções Ativas</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300/90 truncate max-w-[180px]">
                {userEmail}
              </span>
            </div>

            <ul className="space-y-1.5 text-[11px] text-[#EDE9DE]/90 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Isolamento total na nuvem:</strong> somente sua conta verificada consegue ler ou alterar seus dados no Firestore.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero links corporativos no código:</strong> nenhuma planilha ou URL interna da 99 fica gravada no código público do app.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Planilhas protegidas:</strong> o app lê apenas um código resumido (hash) para detectar alterações — nenhuma célula confidencial fica salva no banco nos canais.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Navegação anônima (No-Referrer) &amp; Cache limpo:</strong> abrir links externos não expõe seu histórico do KISHI e sair da conta apaga os dados locais deste navegador.
                </span>
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0b100d] border border-[#777F89]/40 cursor-pointer">
            <input
              type="checkbox"
              checked={autoLockEnabled}
              onChange={(e) => onToggleAutoLock(e.target.checked)}
              className="h-3.5 w-3.5 mt-0.5 rounded bg-[#151d18] accent-[#C5A66B] cursor-pointer shrink-0"
            />
            <div className="space-y-0.5">
              <span className="font-bold text-[#EDE9DE] block">
                Bloquear sessão após 30 min sem uso
              </span>
              <span className="text-[11px] text-[#A9B99D] block leading-snug">
                Recomendado se você usa o KISHI em computador compartilhado da empresa. Ao bloquear, os dados locais são limpos e pede sua senha novamente.
              </span>
            </div>
          </label>

          <div className="p-3 rounded-xl bg-[#0b100d] border border-[#777F89]/35 text-[11px] text-[#A9B99D] leading-relaxed">
            <strong className="text-[#EDE9DE] block mb-0.5">Boas práticas LGPD:</strong>
            Evite escrever dados pessoais de clientes ou motoristas (CPF, e-mail, telefone) nos títulos de tarefas. Use sempre o link protegido do Google Sheets ou Drive.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#777F89]/40">
          <button
            type="button"
            onClick={onLockAndSignOut}
            className="btn-press px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Limpar cache e sair</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-press px-4 py-2 bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
