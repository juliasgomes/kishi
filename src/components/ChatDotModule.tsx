import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatDotAntSvg } from '@/src/components/KishiIcons';
import type { KishiState } from '@/src/types/kishi';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

interface ChatDotModuleProps {
  state: KishiState;
}

export function ChatDotModule({ state }: ChatDotModuleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'bot',
      text: `Olá, ${state.user.name || 'Júlia'}! Eu sou a Dot. Como posso te ajudar hoje?`,
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function generateResponse(query: string): string {
    const q = query.toLowerCase();
    const userName = state.user.name || 'Júlia';

    if (
      q.includes('que horas') ||
      q.includes('horario') ||
      q.includes('horário') ||
      q.includes('terminei') ||
      q.includes('conclui')
    ) {
      if (!state.history.length) {
        return `Você ainda não concluiu nenhuma tarefa hoje, ${userName}. Assim que você marcar um checkbox, eu gravo o horário exato aqui!`;
      }
      const list = state.history
        .slice(0, 5)
        .map((t) => `• ${t.title}: concluída às ${t.time} em ${t.dateStr}`)
        .join('\n');
      return `Aqui estão os horários em que você terminou suas tarefas recentemente:\n\n${list}`;
    }

    if (
      q.includes('externo') ||
      q.includes('externos') ||
      q.includes('logan') ||
      q.includes('uol') ||
      q.includes('netflix') ||
      q.includes('spotify') ||
      q.includes('canal') ||
      q.includes('canais')
    ) {
      const ridesExt =
        state.channels.rides.externos.map((c) => c.name).join(', ') || 'nenhum cadastrado ainda';
      const foodExt =
        state.channels.food.externos.map((c) => c.name).join(', ') || 'nenhum cadastrado ainda';
      return `Canais Externos cadastrados na sua operação:\n• 99 Rides: ${ridesExt}\n• 99 Food: ${foodExt}\nVocê pode adicionar ou editar canais diretamente na aba 99 (Rides & Food).`;
    }

    if (
      q.includes('portal') ||
      q.includes('portais') ||
      q.includes('app') ||
      q.includes('planilha') ||
      q.includes('sheet') ||
      q.includes('link')
    ) {
      const portalsText =
        state.portals.length > 0
          ? `Portais & Apps (${state.portals.length}):\n${state.portals
              .map((p) => `• ${p.name} (${p.kind} · ${p.category})`)
              .join('\n')}`
          : '';
      const sheetsText =
        state.sheets.length > 0
          ? `Planilhas & Arquivos (${state.sheets.length}):\n${state.sheets
              .map((s) => `• ${s.name} (${s.category})`)
              .join('\n')}`
          : '';
      if (!portalsText && !sheetsText) {
        return 'Nenhum portal ou planilha cadastrado no momento.';
      }
      return [portalsText, sheetsText].filter(Boolean).join('\n\n');
    }

    if (q.includes('resta') || q.includes('pendente') || q.includes('hoje') || q.includes('fazer')) {
      const pend = state.tasks.filter((t) => t.status !== 'concluido');
      const andam = state.tasks.filter((t) => t.status === 'andamento');
      if (pend.length === 0) {
        return `Você não tem nenhuma tarefa pendente hoje, ${userName}.`;
      }
      const top = pend.slice(0, 5).map((t) => `• ${t.title} (${t.product})`).join('\n');
      return `Você tem ${pend.length} tarefa(s) pendente(s) hoje (${andam.length} em andamento):\n\n${top}`;
    }

    if (q.includes('historico') || q.includes('histórico') || q.includes('ontem')) {
      return `Você tem ${state.history.length} tarefa(s) gravada(s) no Histórico Permanente, com opção de restauração rápida para o dia ativo.`;
    }

    return `Estou conectada a toda a sua operação, ${userName}! Posso te informar os horários das tarefas concluídas, listar seus canais externos, planilhas salvas ou o que falta fazer hoje.`;
  }

  function handleSend(customPrompt?: string) {
    const text = (customPrompt ?? input).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
    };
    const botMsg: ChatMessage = {
      id: `b_${Date.now() + 1}`,
      sender: 'bot',
      text: generateResponse(text),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    if (!customPrompt) setInput('');
  }

  return (
    <section className="h-[calc(100vh-12rem)] md:h-[calc(100vh-7rem)] flex flex-col min-h-0">
      <div className="shrink-0 mb-3">
        <h1 className="text-xl font-bold tracking-tight text-[#EDE9DE] flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#0b100d] border border-[#777F89]/40 flex items-center justify-center text-[#C5A66B]">
            <ChatDotAntSvg className="w-4 h-4 text-[#C5A66B]" />
          </div>
          <span>ChatDot</span>
        </h1>
        <p className="text-xs text-[#A9B99D] mt-0.5">
          Assistente operacional conectada ao KISHI.
        </p>
      </div>

      <div className="flex-1 min-h-0 max-w-2xl w-full mx-auto bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 flex flex-col">
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2">
          {messages.map((msg) =>
            msg.sender === 'bot' ? (
              <div key={msg.id} className="flex gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-[#0b100d] border border-[#777F89]/40 text-[#C5A66B] flex items-center justify-center shrink-0">
                  <ChatDotAntSvg className="w-4 h-4 text-[#C5A66B]" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-[#0d1310] border border-[#777F89]/40 text-xs text-[#EDE9DE] leading-relaxed max-w-[85%] whitespace-pre-line">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-end">
                <div className="p-3 rounded-2xl rounded-tr-sm bg-[#C5A66B] text-[#0f1512] font-semibold text-xs leading-relaxed max-w-[85%] whitespace-pre-line">
                  {msg.text}
                </div>
              </div>
            ),
          )}
        </div>

        <div className="shrink-0 flex flex-wrap gap-1.5 py-2.5 border-t border-[#777F89]/40 mt-2">
          <button
            type="button"
            onClick={() => handleSend('Que horas terminei tarefas hoje?')}
            className="btn-press text-[11px] px-2.5 py-1 rounded-lg bg-[#0b100d] hover:bg-[#1b251f] text-[#EDE9DE] border border-[#777F89]/40 cursor-pointer"
          >
            Que horas terminei tarefas hoje?
          </button>
          <button
            type="button"
            onClick={() => handleSend('Quais canais externos são de Rides?')}
            className="btn-press text-[11px] px-2.5 py-1 rounded-lg bg-[#0b100d] hover:bg-[#1b251f] text-[#EDE9DE] border border-[#777F89]/40 cursor-pointer"
          >
            Canais externos de Rides
          </button>
          <button
            type="button"
            onClick={() => handleSend('O que resta fazer hoje?')}
            className="btn-press text-[11px] px-2.5 py-1 rounded-lg bg-[#0b100d] hover:bg-[#1b251f] text-[#EDE9DE] border border-[#777F89]/40 cursor-pointer"
          >
            O que resta fazer hoje?
          </button>
        </div>

        <div className="shrink-0 flex gap-2 pt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Pergunte ao ChatDot..."
            className="flex-1 bg-[#0b100d] border border-[#777F89]/60 rounded-xl px-3.5 py-2 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            className="btn-press px-4 py-2 bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Enviar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
