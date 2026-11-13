import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Mail, MailCheck, RefreshCw, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';
import { KishiLogoSvg } from '@/src/components/KishiIcons';

interface LoginScreenProps {
  pendingVerificationUser: User | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onResendVerification: () => Promise<void>;
  onCheckVerification: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

function translateAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (
    raw.includes('auth/invalid-credential') ||
    raw.includes('auth/wrong-password') ||
    raw.includes('auth/user-not-found') ||
    raw.includes('auth/invalid-email')
  ) {
    return 'E-mail ou senha incorretos. Apenas contas autorizadas podem entrar.';
  }
  if (raw.includes('auth/operation-not-allowed')) {
    return 'Ative o provedor E-mail/Senha no Firebase Console (Authentication → Sign-in method).';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
  }
  if (raw.includes('auth/network-request-failed')) {
    return 'Sem conexão no momento. Verifique sua internet e tente novamente.';
  }
  if (raw.includes('auth/unauthorized-domain')) {
    return 'Adicione este endereço em Domínios Autorizados no Firebase Authentication.';
  }
  return 'Não foi possível entrar agora. Confira seus dados e tente novamente.';
}

export function LoginScreen({
  pendingVerificationUser,
  onSignIn,
  onResetPassword,
  onResendVerification,
  onCheckVerification,
  onSignOut,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Preencha seu e-mail e sua senha para entrar.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await onSignIn(email, password);
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setErrorMsg('Digite seu e-mail acima primeiro para receber o link de redefinição.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await onResetPassword(email);
      setInfoMsg('Se este e-mail estiver autorizado, você receberá o link para redefinir a senha.');
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckClick() {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await onCheckVerification();
    } catch {
      setErrorMsg('Ainda não identificamos a confirmação. Abra o link enviado no seu e-mail.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendClick() {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await onResendVerification();
      setInfoMsg('Link de confirmação enviado para o seu e-mail!');
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1512] text-[#EDE9DE] flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-[#151d18] border border-[#777F89]/45 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-[#0b100d] border border-[#C5A66B]/45 flex items-center justify-center shadow-md">
            <KishiLogoSvg className="h-9 w-9 text-[#C5A66B]" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-[0.25em] text-[#EDE9DE] font-['Montserrat',sans-serif]">
              KISHI
            </h1>
            <p className="text-xs text-[#A9B99D] mt-1">
              {pendingVerificationUser ? 'Confirmação de e-mail' : 'Acesso privado'}
            </p>
          </div>
        </div>

        {pendingVerificationUser ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#0b100d] border border-[#777F89]/40 text-xs text-[#EDE9DE] leading-relaxed">
              Para liberar a sincronização automática entre computador e celular, confirme uma única vez o e-mail{' '}
              <strong className="text-[#C5A66B]">{pendingVerificationUser.email}</strong>.
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}
            {infoMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200">
                {infoMsg}
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleCheckClick()}
                className="btn-press w-full py-2.5 px-4 rounded-xl bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-60 text-[#0f1512] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Já confirmei, entrar</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleResendClick()}
                className="btn-press w-full py-2.5 px-4 rounded-xl bg-[#0b100d] hover:bg-[#1b251f] disabled:opacity-60 text-[#EDE9DE] border border-[#777F89]/50 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <MailCheck className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Enviar link de confirmação</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void onSignOut()}
                className="w-full py-2 text-xs text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="kishi-login-email" className="block text-xs font-semibold text-[#A9B99D]">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#777F89] absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  id="kishi-login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="kishi-login-password" className="block text-xs font-semibold text-[#A9B99D]">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#777F89] absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  id="kishi-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-2.5 text-[#777F89] hover:text-[#EDE9DE] cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 leading-relaxed">
                {errorMsg}
              </div>
            )}
            {infoMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 leading-relaxed">
                {infoMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-press w-full py-2.5 px-4 rounded-xl bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-60 text-[#0f1512] text-xs font-extrabold cursor-pointer"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#777F89]">Salvo neste dispositivo</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleForgotPassword()}
                className="text-[11px] font-semibold text-[#A9B99D] hover:text-[#C5A66B] cursor-pointer"
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
