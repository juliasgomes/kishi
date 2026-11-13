import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { DuplicateLinkNotice } from '@/src/components/DuplicateLinkNotice';
import type {
  KishiActiveCampaign,
  KishiState,
  KishiWavePlan,
  WaveStatus,
} from '@/src/types/kishi';
import { syncGoogleSheetUrl } from '@/src/services/kishiApi';
import {
  parseDelimitedSheetText,
  parseGoogleSheetsHtml,
  parseHtmlListItems,
  type ParsedSheetRow,
} from '@/src/utils/sheetParser';
import { findDuplicateLinks } from '@/src/utils/urlDuplicates';

interface CampaignSetupModalProps {
  open: boolean;
  editingCampaign?: KishiActiveCampaign | null;
  defaultFront?: '99 Rides' | '99 Food';
  workspaceState?: KishiState;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    name: string;
    front: '99 Rides' | '99 Food';
    sheetUrl: string;
    autoSync: boolean;
    notes: string;
    lastSheetTitle?: string;
    importedRows?: ParsedSheetRow[] | null;
    replaceWithImported?: boolean;
  }) => void;
}

export function CampaignSetupModal({
  open,
  editingCampaign,
  defaultFront = '99 Food',
  workspaceState,
  onClose,
  onSave,
}: CampaignSetupModalProps) {
  const [name, setName] = useState('');
  const [front, setFront] = useState<'99 Rides' | '99 Food'>(defaultFront);
  const [sheetUrl, setSheetUrl] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [notes, setNotes] = useState('');

  const [showManualPaste, setShowManualPaste] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedSheetRow[] | null>(null);
  const [importMode, setImportMode] = useState<'sync' | 'merge'>('sync');
  const [lastReadUrl, setLastReadUrl] = useState('');
  const [fetchedSheetTitle, setFetchedSheetTitle] = useState<string | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info'; message: string } | null>(null);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    if (editingCampaign) {
      setName(editingCampaign.name);
      setFront(editingCampaign.front);
      setSheetUrl(editingCampaign.sheetUrl || '');
      setAutoSync(
        typeof editingCampaign.autoSync === 'boolean'
          ? editingCampaign.autoSync
          : Boolean(editingCampaign.sheetUrl),
      );
      setNotes(editingCampaign.notes || '');
      setLastReadUrl(editingCampaign.sheetUrl || '');
      setFetchedSheetTitle(editingCampaign.lastSheetTitle);
      setShowManualPaste(!editingCampaign.sheetUrl);
      setImportMode(editingCampaign.sheetUrl ? 'sync' : 'merge');
    } else {
      setName('');
      setFront(defaultFront);
      setSheetUrl('');
      setAutoSync(true);
      setNotes('');
      setLastReadUrl('');
      setFetchedSheetTitle(undefined);
      setShowManualPaste(false);
      setImportMode('sync');
    }
    setPastedText('');
    setParsedRows(null);
    setSyncing(false);
    setSaving(false);
    setFeedback(null);
  }, [open, editingCampaign, defaultFront]);

  const sheetDuplicateMatches = useMemo(() => {
    if (!open) return [];
    return findDuplicateLinks(sheetUrl, workspaceState, {
      kind: 'campaign',
      id: editingCampaign?.id,
    });
  }, [open, sheetUrl, workspaceState, editingCampaign?.id]);

  if (!open) return null;

  async function readSheetFromUrl(urlToRead: string): Promise<ParsedSheetRow[] | null> {
    const cleanUrl = urlToRead.trim();
    if (!cleanUrl) return null;

    setSyncing(true);
    setFeedback(null);
    const res = await syncGoogleSheetUrl(cleanUrl);
    setSyncing(false);

    if (!res.ok || !res.csv) {
      setFeedback({
        type: 'error',
        message:
          res.error ||
          'Não foi possível ler o link diretamente. Se a planilha exigir login, use a opção "Colar linhas / CSV" abaixo.',
      });
      if (res.requiresAuth) {
        setShowManualPaste(true);
      }
      return null;
    }

    if (res.docTitle) {
      setFetchedSheetTitle(res.docTitle);
      if (!name.trim()) {
        setName(res.docTitle);
      }
    }
    if (!editingCampaign && (res.detectedCategory === '99 Food' || res.detectedCategory === '99 Rides')) {
      setFront(res.detectedCategory);
    }

    const rows = parseDelimitedSheetText(res.csv);
    setParsedRows(rows);
    setImportMode('sync');
    setLastReadUrl(cleanUrl);

    if (rows.length === 0) {
      setFeedback({
        type: 'error',
        message:
          'Conectou à planilha, mas nenhuma linha válida foi encontrada nesta aba. Verifique se o link contém o #gid= da aba certa.',
      });
      return rows;
    }

    setFeedback({
      type: 'info',
      message: `${rows.length} linha(s) lida(s) com sucesso!`,
    });
    return rows;
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    if (html && html.includes('<tr')) {
      const htmlRows = parseGoogleSheetsHtml(html);
      if (htmlRows.length > 0) {
        e.preventDefault();
        setPastedText(plain || `${htmlRows.length} linha(s) colada(s) do Google Sheets`);
        setParsedRows(htmlRows);
        if (editingCampaign && editingCampaign.waves.length > 0 && !sheetUrl.trim()) {
          setImportMode('merge');
        }
        const withLinks = htmlRows.filter((r) => Boolean(r.planUrl)).length;
        setFeedback({
          type: 'info',
          message: `${htmlRows.length} item(ns) detectado(s) (${withLinks} com link direto preservado).`,
        });
        return;
      }
    }

    if (html && html.includes('<li')) {
      const listRows = parseHtmlListItems(html);
      if (listRows.length > 0) {
        e.preventDefault();
        setPastedText(plain || listRows.map((r) => r.planTitle).join('\n'));
        setParsedRows(listRows);
        if (editingCampaign && editingCampaign.waves.length > 0) {
          setImportMode('merge');
        }
        const withLinks = listRows.filter((r) => Boolean(r.planUrl)).length;
        setFeedback({
          type: 'info',
          message: `${listRows.length} item(ns) extraído(s) da lista${withLinks > 0 ? ` (${withLinks} com link)` : ''}, entrando como Não Extraído.`,
        });
        return;
      }
    }

    if (plain) {
      const textRows = parseDelimitedSheetText(plain);
      setParsedRows(textRows);
      if (editingCampaign && editingCampaign.waves.length > 0 && !sheetUrl.trim()) {
        setImportMode('merge');
      }
      if (textRows.length > 0) {
        setFeedback({
          type: 'info',
          message: `${textRows.length} item(ns) detectado(s) do texto colado.`,
        });
      }
    }
  }

  function handleTextChange(val: string) {
    setPastedText(val);
    if (!val.trim()) {
      setParsedRows(null);
      return;
    }
    setParsedRows(parseDelimitedSheetText(val));
  }

  function handleCsvFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setPastedText(text);
      const rows = parseDelimitedSheetText(text);
      setParsedRows(rows);
      setFeedback(
        rows.length > 0
          ? { type: 'info', message: `${rows.length} linha(s) carregada(s) de ${file.name}.` }
          : { type: 'error', message: 'Nenhuma linha válida encontrada neste arquivo CSV.' },
      );
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleSubmit() {
    if (saving) return;

    const cleanUrl = sheetUrl.trim();
    let rowsToSave = parsedRows;
    let resolvedName = name.trim();

    // If the user pasted a new/updated Google Sheets URL and hit Save without clicking "Ler Link", auto-read it!
    if (cleanUrl && cleanUrl !== lastReadUrl && !pastedText.trim()) {
      setSaving(true);
      const fetchedRes = await syncGoogleSheetUrl(cleanUrl);
      setSaving(false);
      if (fetchedRes.ok && fetchedRes.csv) {
        const fetched = parseDelimitedSheetText(fetchedRes.csv);
        if (fetched.length > 0) rowsToSave = fetched;
        if (!resolvedName && fetchedRes.docTitle) {
          resolvedName = fetchedRes.docTitle;
        }
        if (fetchedRes.docTitle) {
          setFetchedSheetTitle(fetchedRes.docTitle);
        }
      }
    }

    if (!resolvedName) return;

    onSave({
      id: editingCampaign?.id,
      name: resolvedName,
      front,
      sheetUrl: cleanUrl,
      autoSync: Boolean(cleanUrl) && autoSync,
      notes: notes.trim(),
      lastSheetTitle: fetchedSheetTitle,
      importedRows: rowsToSave,
      replaceWithImported: Boolean(rowsToSave && rowsToSave.length > 0) && importMode === 'sync',
    });
  }

  const previewRows = parsedRows || [];
  const pendingCount = previewRows.filter((r) => r.status === 'nao_extraido').length;
  const doneCount = previewRows.filter((r) => r.status === 'extraido').length;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#C5A66B]" />
            <h3 className="text-sm font-bold text-[#EDE9DE]">
              {editingCampaign
                ? `Editar Campanha — ${editingCampaign.name}`
                : 'Nova Campanha & Vínculo com Planilha'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A9B99D] hover:text-white cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1 min-h-0">
          {/* Frente + Nome */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-[#A9B99D] mb-1.5 font-semibold">Frente</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFront('99 Food')}
                  className={`btn-press py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    front === '99 Food'
                      ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                      : 'bg-[#0b100d] border-[#777F89]/50 text-[#A9B99D] hover:text-[#EDE9DE]'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>99 Food</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFront('99 Rides')}
                  className={`btn-press py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    front === '99 Rides'
                      ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B]'
                      : 'bg-[#0b100d] border-[#777F89]/50 text-[#A9B99D] hover:text-[#EDE9DE]'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>99 Rides</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-7">
              <label className="block text-[#A9B99D] mb-1.5 font-semibold">Nome da Campanha</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Zazu Lançamento / Black Friday / Regional"
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                autoFocus
              />
            </div>
          </div>

          {/* Vincular Planilha */}
          <div className="p-3.5 rounded-xl bg-[#0b100d] border border-[#777F89]/45 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[#EDE9DE] font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Link da Planilha Google Sheets (Opcional)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Cole o link com o #gid= da aba exata (https://docs.google.com/spreadsheets/d/...)"
                className="flex-1 bg-[#151d18] border border-[#777F89]/60 rounded-xl px-3 py-2 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              />
              <button
                type="button"
                onClick={() => void readSheetFromUrl(sheetUrl)}
                disabled={!sheetUrl.trim() || syncing}
                className="btn-press px-3.5 py-2 rounded-xl bg-[#1b251f] hover:bg-[#222e27] disabled:opacity-50 text-[#EDE9DE] font-semibold border border-[#777F89]/60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C5A66B] ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Lendo...' : 'Ler Link'}</span>
              </button>
            </div>

            <DuplicateLinkNotice matches={sheetDuplicateMatches} />

            <label className="flex items-center gap-2 text-[11px] text-[#EDE9DE] cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                disabled={!sheetUrl.trim()}
                className="h-3.5 w-3.5 rounded bg-[#151d18] accent-[#C5A66B] cursor-pointer"
              />
              <span>
                <strong>Sincronização automática:</strong> quando houver alteração na planilha (planos, nome ou frente), o app atualiza sozinho.
              </span>
            </label>
          </div>

          {/* Opção alternativa: Colar linhas ou subir CSV */}
          <div className="rounded-xl bg-[#0b100d] border border-[#777F89]/35 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowManualPaste((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#0f1512]/60 transition cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-[#A9B99D] flex items-center gap-1.5">
                {showManualPaste ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#C5A66B]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#C5A66B]" />
                )}
                <ClipboardPaste className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Ou colar planilha / lista simples (Ctrl+C → Ctrl+V) / subir CSV</span>
              </span>
            </button>

            {showManualPaste && (
              <div className="p-3.5 pt-0 space-y-2.5 border-t border-[#777F89]/25">
                <div className="flex items-center justify-between gap-2 pt-2.5">
                  <span className="text-[11px] text-[#A9B99D]">
                    Cole linhas do Sheets ou qualquer lista (mesmo sem coluna de status — entra como Não Extraído):
                  </span>
                  <label className="btn-press px-2.5 py-1 rounded-lg bg-[#151d18] hover:bg-[#1b251f] text-[#EDE9DE] text-[11px] font-semibold border border-[#777F89]/50 cursor-pointer flex items-center gap-1">
                    <UploadCloud className="w-3 h-3 text-[#C5A66B]" />
                    <span>Subir CSV</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleCsvFile}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  rows={3}
                  value={pastedText}
                  onPaste={handlePaste}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Cole linhas da planilha ou uma lista de itens (um por linha, com ou sem marcador/link)..."
                  className="w-full bg-[#151d18] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B] font-mono text-[11px]"
                />
              </div>
            )}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                feedback.type === 'error'
                  ? 'bg-rose-950/35 border-rose-500/40 text-rose-200'
                  : 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Prévia detectada */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-[#EDE9DE] font-bold">
                    Prévia: {previewRows.length} item(ns)
                  </span>
                  <span className="text-rose-300 font-semibold">
                    {pendingCount} Não Extraído
                  </span>
                  <span className="text-emerald-300 font-semibold">
                    {doneCount} Extraído
                  </span>
                </div>

                {editingCampaign && editingCampaign.waves.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`px-2 py-0.5 rounded-md border cursor-pointer transition ${
                        importMode === 'merge'
                          ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B] font-bold'
                          : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D]'
                      }`}
                    >
                      Adicionar aos atuais
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('sync')}
                      className={`px-2 py-0.5 rounded-md border cursor-pointer transition ${
                        importMode === 'sync'
                          ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B] font-bold'
                          : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D]'
                      }`}
                    >
                      Sincronizar / substituir
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {previewRows.map((row, idx) => (
                  <div
                    key={`${row.planTitle}-${idx}`}
                    className="p-2 rounded-lg bg-[#0b100d] border border-[#777F89]/40 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#EDE9DE] truncate">
                          {row.planTitle}
                        </span>
                        {row.planUrl && (
                          <ExternalLink className="w-3 h-3 text-[#C5A66B] shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-[#A9B99D] font-mono block truncate">
                        {row.waveName}
                        {row.startDate ? ` · ${row.startDate}` : ''}
                        {row.endDate ? ` → ${row.endDate}` : ''}
                        {row.totalValue ? ` · ${row.totalValue}` : ''}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shrink-0 border ${
                        row.status === 'nao_extraido'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                      }`}
                    >
                      {row.status === 'nao_extraido' ? 'Não Extraído' : 'Extraído'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Observações Gerais (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações rápidas sobre esta campanha..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B] resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#777F89]/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-4 py-2 bg-[#0b100d] rounded-xl text-[#EDE9DE] text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || saving || syncing}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
          >
            {(saving || syncing) && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {saving
                ? 'Lendo planilha e salvando...'
                : editingCampaign
                  ? 'Salvar Alterações'
                  : 'Criar Campanha e Salvar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface WavePlanModalProps {
  open: boolean;
  campaignName: string;
  editingWave?: KishiWavePlan | null;
  workspaceState?: KishiState;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    waveName: string;
    planTitle: string;
    planUrl: string;
    startDate: string;
    endDate: string;
    status: WaveStatus;
    totalValue: string;
  }) => void;
}

export function WavePlanModal({
  open,
  campaignName,
  editingWave,
  workspaceState,
  onClose,
  onSave,
}: WavePlanModalProps) {
  const [waveName, setWaveName] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planUrl, setPlanUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<WaveStatus>('nao_extraido');
  const [totalValue, setTotalValue] = useState('');

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    if (editingWave) {
      setWaveName(editingWave.waveName);
      setPlanTitle(editingWave.planTitle);
      setPlanUrl(editingWave.planUrl || '');
      setStartDate(editingWave.startDate || '');
      setEndDate(editingWave.endDate || '');
      setStatus(editingWave.status);
      setTotalValue(editingWave.totalValue || '');
    } else {
      setWaveName('');
      setPlanTitle('');
      setPlanUrl('');
      setStartDate('');
      setEndDate('');
      setStatus('nao_extraido');
      setTotalValue('');
    }
  }, [open, editingWave]);

  const duplicateMatches = useMemo(() => {
    if (!open) return [];
    return findDuplicateLinks(planUrl, workspaceState, {
      kind: 'wave',
      id: editingWave?.id,
    });
  }, [open, planUrl, workspaceState, editingWave?.id]);

  if (!open) return null;

  function handleSubmit() {
    if (!waveName.trim() && !planTitle.trim()) return;
    onSave({
      id: editingWave?.id,
      waveName: waveName.trim() || planTitle.trim(),
      planTitle: planTitle.trim() || waveName.trim(),
      planUrl: planUrl.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      status,
      totalValue: totalValue.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">
            {editingWave
              ? `Editar Wave / Plano — ${campaignName}`
              : `Adicionar Wave / Plano — ${campaignName}`}
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
          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Wave / Identificador
            </label>
            <input
              type="text"
              value={waveName}
              onChange={(e) => setWaveName(e.target.value)}
              placeholder="Ex: Wave 1 / Praça / Versão"
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Nome do Plano de Mídia
            </label>
            <input
              type="text"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder="Ex: Plano de Mídia Wave 1 v1"
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
            />
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Link do Plano de Mídia (URL - Opcional)
            </label>
            <input
              type="url"
              value={planUrl}
              onChange={(e) => setPlanUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
            />
            <DuplicateLinkNotice matches={duplicateMatches} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Início</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Fim</label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WaveStatus)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                <option value="nao_extraido">Não Extraído (Vermelho)</option>
                <option value="extraido">Extraído (Verde)</option>
              </select>
            </div>
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Valor Total (Opcional)
              </label>
              <input
                type="text"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="Ex: R$ 100.000,00"
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#777F89]/40">
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-4 py-2 bg-[#0b100d] rounded-xl text-[#EDE9DE] text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!waveName.trim() && !planTitle.trim()}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            {editingWave ? 'Salvar Alterações' : 'Salvar Wave'}
          </button>
        </div>
      </div>
    </div>
  );
}
