import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { clearSensitiveLocalCaches } from '@/src/services/kishiApi';
import App from './App.tsx';
import './index.css';

try {
  registerSW({ immediate: true });
} catch {
  // Ignore SW registration failures in unsupported contexts
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Erro inesperado ao carregar o KISHI.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KISHI runtime error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1512] text-[#EDE9DE] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#151d18] border border-[#777F89]/50 rounded-2xl p-6 space-y-4 text-center shadow-2xl">
            <h1 className="text-base font-extrabold tracking-widest text-[#C5A66B]">KISHI</h1>
            <p className="text-xs text-[#A9B99D] leading-relaxed">
              Ocorreu um erro ao carregar os dados locais nesta tela ({this.state.message}).
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-[#0b100d] border border-[#777F89]/50 text-xs font-semibold text-[#EDE9DE] cursor-pointer"
              >
                Recarregar
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSensitiveLocalCaches();
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-[#C5A66B] text-[#0f1512] text-xs font-bold cursor-pointer"
              >
                Restaurar cache e abrir
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
