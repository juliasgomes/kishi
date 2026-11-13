import { useState, type ChangeEvent } from 'react';
import {
  AppWindow,
  ArrowRight,
  Calendar,
  Car,
  Check,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Globe,
  LayoutGrid,
  Link as LinkIcon,
  ListChecks,
  Lock,
  Palette,
  Pencil,
  Plus,
  Presentation,
  Share2,
  Table2,
  Trash2,
  UploadCloud,
  UtensilsCrossed,
} from 'lucide-react';
import { SumerianGlyphWhisper } from '@/src/components/KishiIcons';
import type {
  FolderKey,
  FolderTab,
  KishiChannel,
  KishiPortal,
  KishiSheet,
  KishiState,
  KishiTask,
  ProductType,
  SheetResourceKind,
} from '@/src/types/kishi';
import { getChannelColor, getFrontStyle } from '@/src/utils/channelColors';
import {
  detectResourceKind,
  getResourceKindMeta,
  LINK_RESOURCE_KINDS,
} from '@/src/utils/resourceKind';
import {
  getSheetColorLabel,
  getSheetColorMeta,
  SHEET_COLOR_PALETTE,
} from '@/src/utils/sheetColors';
import {
  formatShortDateBR,
  getBrasiliaTodayISO,
  getTaskScheduleLabel,
  isTaskDueToday,
  isTaskScheduledForDate,
} from '@/src/utils/taskSchedule';
import { getBrasiliaTimeParts } from '@/src/utils/workHours';

interface FoldersModuleProps {
  activeTab: FolderTab;
  channels: KishiState['channels'];
  portals: KishiPortal[];
  sheets: KishiSheet[];
  tasks: KishiTask[];
  sheetColorLabels?: Record<string, string>;
  onSwitchTab: (tab: FolderTab) => void;
  onUpdateSheetColorLabels: (nextLabels: Record<string, string>) => void;
  onToggleCommonTask: (folder: FolderKey, index: number) => void;
  onDeleteCommonTask: (folder: FolderKey, index: number) => void;
  onPushCommonToToday: (title: string, product: ProductType) => void;
  onOpenNewFrontTask: (product: ProductType) => void;
  onOpenEditTask: (task: KishiTask) => void;
  onToggleTaskDone: (taskId: string) => void;
  onDeleteLinkedTask: (taskId: string) => void;
  onOpenNewChannel: (folder: FolderKey, defaultType: 'Interno' | 'Externo') => void;
  onOpenEditChannel: (
    folder: FolderKey,
    listKey: 'internos' | 'externos',
    index: number,
    channel: KishiChannel,
  ) => void;
  onDeleteChannel: (folder: FolderKey, listKey: 'internos' | 'externos', index: number) => void;
  onOpenNewPortal: (defaultCategory: string) => void;
  onOpenEditPortal: (portal: KishiPortal) => void;
  onRemovePortal: (portalId: string) => void;
  onUploadFiles: (files: File[], category: string) => void;
  onOpenAddSheetLink: (defaultCategory: string) => void;
  onOpenEditSheet: (sheet: KishiSheet) => void;
  onRemoveSheet: (sheetId: string) => void;
}

function renderFrontIcon(
  category: string,
  fallback: 'portal' | 'app' | 'sheet' | 'file',
) {
  if (category === '99 Rides') {
    return <Car className="w-4 h-4" />;
  }
  if (category === '99 Food') {
    return <UtensilsCrossed className="w-4 h-4" />;
  }
  if (category === '99') {
    return (
      <span className="flex items-center gap-0.5">
        <Car className="w-3.5 h-3.5 text-[#C5A66B]" />
        <UtensilsCrossed className="w-3.5 h-3.5 text-orange-300" />
      </span>
    );
  }
  if (fallback === 'app') return <AppWindow className="w-4 h-4" />;
  if (fallback === 'portal') return <Globe className="w-4 h-4" />;
  if (fallback === 'file') return <FileSpreadsheet className="w-4 h-4" />;
  return <ExternalLink className="w-4 h-4" />;
}

function renderResourceKindIcon(kind: SheetResourceKind) {
  switch (kind) {
    case 'drive':
      return <FolderOpen className="w-4 h-4" />;
    case 'doc':
      return <FileText className="w-4 h-4" />;
    case 'apresentacao':
      return <Presentation className="w-4 h-4" />;
    case 'arquivo':
      return <FileSpreadsheet className="w-4 h-4" />;
    case 'planilha':
    default:
      return <Table2 className="w-4 h-4" />;
  }
}

export function FoldersModule({
  activeTab,
  channels,
  portals,
  sheets,
  tasks,
  sheetColorLabels,
  onSwitchTab,
  onUpdateSheetColorLabels,
  onToggleCommonTask,
  onDeleteCommonTask,
  onPushCommonToToday,
  onOpenNewFrontTask,
  onOpenEditTask,
  onToggleTaskDone,
  onDeleteLinkedTask,
  onOpenNewChannel,
  onOpenEditChannel,
  onDeleteChannel,
  onOpenNewPortal,
  onOpenEditPortal,
  onRemovePortal,
  onUploadFiles,
  onOpenAddSheetLink,
  onOpenEditSheet,
  onRemoveSheet,
}: FoldersModuleProps) {
  const [sheetColorFilter, setSheetColorFilter] = useState<string>('all');
  const [sheetKindFilter, setSheetKindFilter] = useState<'all' | SheetResourceKind>('all');
  const [editingColorsOpen, setEditingColorsOpen] = useState(false);
  const [draftColorLabels, setDraftColorLabels] = useState<Record<string, string>>({});
  const [todoFilterMode, setTodoFilterMode] = useState<'today' | 'date' | 'all'>('today');
  const [selectedTodoDate, setSelectedTodoDate] = useState<string>(() => getBrasiliaTodayISO());

  const sharedPortals = portals.filter(
    (p) => p.category !== '99 Rides' && p.category !== '99 Food',
  );
  const sharedSheets = sheets.filter(
    (s) => s.category !== '99 Rides' && s.category !== '99 Food',
  );
  const ridesSheets = sheets.filter((s) => s.category === '99 Rides');
  const foodSheets = sheets.filter((s) => s.category === '99 Food');

  function openColorLabelsEditor() {
    if (editingColorsOpen) {
      setEditingColorsOpen(false);
      return;
    }
    setDraftColorLabels(sheetColorLabels ? { ...sheetColorLabels } : {});
    setEditingColorsOpen(true);
  }

  function saveColorLabelsEditor() {
    const cleaned: Record<string, string> = {};
    for (const c of SHEET_COLOR_PALETTE) {
      const val = (draftColorLabels[c.id] || '').trim();
      if (val) cleaned[c.id] = val;
    }
    onUpdateSheetColorLabels(cleaned);
    setEditingColorsOpen(false);
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>, category: string) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    onUploadFiles(Array.from(fileList), category);
    e.target.value = '';
  }

  function renderPortalGrid(items: KishiPortal[], emptyText: string) {
    if (items.length === 0) {
      return (
        <div className="text-center py-6 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr">
        {items.map((portal) => {
          const front = getFrontStyle(portal.category);
          const isBoth99 = portal.category === '99';
          return (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`interactive-card group h-full p-3.5 rounded-xl bg-[#0f1512]/80 border border-[#777F89]/40 ${front.cardBorderClass} flex flex-col justify-between gap-2.5 focus:outline-none`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div
                    className={`h-8 ${isBoth99 ? 'px-2' : 'w-8'} rounded-lg flex items-center justify-center shrink-0 ${front.iconBgClass}`}
                  >
                    {renderFrontIcon(portal.category, portal.kind === 'App' ? 'app' : 'portal')}
                  </div>
                  <h4
                    title={portal.name}
                    className="text-[13px] font-bold text-[#EDE9DE] group-hover:text-[#C5A66B] transition-colors leading-snug line-clamp-2 break-words pt-0.5"
                  >
                    {portal.name}
                  </h4>
                </div>

                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenEditPortal(portal)}
                    className="btn-press h-7 w-7 rounded-lg bg-[#0b100d] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
                    title="Editar Portal / App"
                    aria-label={`Editar ${portal.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePortal(portal.id)}
                    className="btn-press h-7 w-7 rounded-lg bg-[#0b100d] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                    title="Remover Portal / App"
                    aria-label={`Remover ${portal.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#777F89]/20 flex items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border bg-[#0b100d] border-[#777F89]/35 text-[#EDE9DE]/90 text-[10px] font-semibold shrink-0">
                  {portal.kind}
                </span>
                <span className="text-[#A9B99D] truncate">
                  {isBoth99 ? '99 · Rides & Food' : front.label}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    );
  }

  function renderSheetsOrganizerAndGrid(items: KishiSheet[], emptyText: string) {
    const colorFiltered =
      sheetColorFilter === 'all'
        ? items
        : sheetColorFilter === 'none'
          ? items.filter((s) => !s.color)
          : items.filter((s) => s.color === sheetColorFilter);

    const filteredItems =
      sheetKindFilter === 'all'
        ? colorFiltered
        : colorFiltered.filter(
            (s) => detectResourceKind(s.url, s.type, s.resourceKind) === sheetKindFilter,
          );

    const hasUncolored = items.some((s) => !s.color);

    return (
      <div className="space-y-3">
        {/* Barra de Filtros por Cor + Tipo + Customizar Títulos */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSheetColorFilter('all')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                sheetColorFilter === 'all'
                  ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#EDE9DE]'
                  : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-white'
              }`}
            >
              Todas ({items.length})
            </button>

            {SHEET_COLOR_PALETTE.map((c) => {
              const count = items.filter((s) => s.color === c.id).length;
              const isActive = sheetColorFilter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSheetColorFilter(isActive ? 'all' : c.id)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                    isActive
                      ? c.pillActiveClass
                      : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-white'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${c.dotClass}`} />
                  <span>{getSheetColorLabel(c.id, sheetColorLabels)}</span>
                  {count > 0 && <span className="font-mono opacity-80">({count})</span>}
                </button>
              );
            })}

            {hasUncolored && items.some((s) => Boolean(s.color)) && (
              <button
                type="button"
                onClick={() =>
                  setSheetColorFilter(sheetColorFilter === 'none' ? 'all' : 'none')
                }
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                  sheetColorFilter === 'none'
                    ? 'bg-[#777F89]/25 border-[#777F89] text-[#EDE9DE]'
                    : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-white'
                }`}
              >
                Sem cor ({items.filter((s) => !s.color).length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={sheetKindFilter}
              onChange={(e) =>
                setSheetKindFilter(e.target.value as 'all' | SheetResourceKind)
              }
              aria-label="Filtrar por tipo de arquivo"
              className="px-2.5 py-1 rounded-lg border border-[#777F89]/40 bg-[#0b100d] text-[11px] font-semibold text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B] cursor-pointer"
            >
              <option value="all">Todos os tipos</option>
              {LINK_RESOURCE_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
              <option value="arquivo">Arquivo</option>
            </select>

            <button
              type="button"
              onClick={openColorLabelsEditor}
              className={`btn-press px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                editingColorsOpen
                  ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B]'
                  : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-[#EDE9DE]'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>{editingColorsOpen ? 'Fechar Cores' : 'Títulos das Cores'}</span>
            </button>
          </div>
        </div>

        {/* Editor Inline de Títulos das Cores */}
        {editingColorsOpen && (
          <div className="p-3.5 rounded-xl bg-[#0b100d] border border-[#C5A66B]/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[11px] text-[#A9B99D]">
                Personalize o nome de cada cor para identificar seus links (ex: Vermelho ={' '}
                <strong className="text-[#EDE9DE]">CP atualiza</strong>).
              </p>
              <button
                type="button"
                onClick={saveColorLabelsEditor}
                className="btn-press px-3 py-1.5 rounded-lg bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] text-[11px] font-bold flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Títulos</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SHEET_COLOR_PALETTE.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-[#151d18] border border-[#777F89]/40 rounded-lg px-2.5 py-1.5"
                >
                  <span className={`h-3 w-3 rounded-full shrink-0 ${c.dotClass}`} />
                  <input
                    type="text"
                    maxLength={40}
                    value={draftColorLabels[c.id] ?? ''}
                    onChange={(e) =>
                      setDraftColorLabels((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                    placeholder={c.defaultLabel}
                    className="w-full bg-transparent text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-6 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
            {items.length === 0
              ? emptyText
              : 'Nenhum item encontrado com os filtros selecionados.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr">
            {filteredItems.map((sh) => {
              const front = getFrontStyle(sh.category);
              const isBoth99 = sh.category === '99';
              const colorMeta = getSheetColorMeta(sh.color);
              const colorLabel = sh.color ? getSheetColorLabel(sh.color, sheetColorLabels) : '';
              const resourceKind = detectResourceKind(sh.url, sh.type, sh.resourceKind);
              const kindMeta = getResourceKindMeta(resourceKind);

              return (
                <a
                  key={sh.id}
                  href={sh.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`interactive-card group h-full p-3.5 rounded-xl bg-[#0f1512]/80 border border-[#777F89]/40 ${
                    colorMeta ? colorMeta.borderClass : front.cardBorderClass
                  } flex flex-col justify-between gap-2.5 focus:outline-none`}
                >
                  {/* Cabeçalho compacto: Ícone do tipo + Título + Ações */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${kindMeta.iconBoxClass}`}
                        title={kindMeta.label}
                      >
                        {renderResourceKindIcon(resourceKind)}
                      </div>
                      <h4
                        title={sh.name}
                        className="text-[13px] font-bold text-[#EDE9DE] group-hover:text-[#C5A66B] transition-colors leading-snug line-clamp-2 break-words pt-0.5"
                      >
                        {sh.name}
                      </h4>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenEditSheet(sh)}
                        className="btn-press h-7 w-7 rounded-lg bg-[#0b100d] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
                        title="Editar Item / Tipo / Cor / Obs"
                        aria-label={`Editar ${sh.name}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSheet(sh.id)}
                        className="btn-press h-7 w-7 rounded-lg bg-[#0b100d] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                        title="Remover da lista"
                        aria-label={`Remover ${sh.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Rodapé organizado em largura total */}
                  <div className="space-y-2 pt-2 border-t border-[#777F89]/20">
                    {sh.obs && (
                      <p
                        title={sh.obs}
                        className="text-[11px] text-[#EDE9DE]/90 bg-[#151d18] border border-[#777F89]/30 rounded-lg px-2.5 py-1.5 line-clamp-2 break-words leading-snug"
                      >
                        {sh.obs}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${kindMeta.badgeClass}`}
                        >
                          {kindMeta.label}
                        </span>
                        <span className="text-[11px] text-[#A9B99D] truncate">
                          {isBoth99 ? '99 · Rides & Food' : front.label}
                        </span>
                      </div>

                      {colorMeta && colorLabel && (
                        <span
                          title={colorLabel}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold truncate max-w-[125px] shrink-0 ${colorMeta.textClass}`}
                        >
                          <span className={`h-2 w-2 rounded-full shrink-0 ${colorMeta.dotClass}`} />
                          <span className="truncate">{colorLabel}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isOverview = activeTab === 'overview';
  const currentFolder: FolderKey = activeTab === 'food' ? 'food' : 'rides';
  const isRides = currentFolder === 'rides';
  const folderData = isRides ? channels.rides : channels.food;
  const productLabel: ProductType = isRides ? '99 Rides' : '99 Food';
  const folderCategory = isRides ? '99 Rides' : '99 Food';
  const folderSheets = isRides ? ridesSheets : foodSheets;
  const folderPortals = portals.filter((p) => p.category === folderCategory);

  const ridesChannelsCount = channels.rides.internos.length + channels.rides.externos.length;
  const foodChannelsCount = channels.food.internos.length + channels.food.externos.length;

  const todayFormattedBR = getBrasiliaTimeParts().formattedDate;
  const ridesLinkedTasks = tasks.filter((t) => t.product === '99 Rides');
  const foodLinkedTasks = tasks.filter((t) => t.product === '99 Food');
  const frontLinkedTasks = tasks.filter((t) => t.product === folderCategory);
  const filteredFrontTasks = frontLinkedTasks.filter((t) => {
    if (todoFilterMode === 'all') return true;
    if (todoFilterMode === 'date') {
      return isTaskScheduledForDate(t, selectedTodoDate);
    }
    // 'today' shows tasks due today OR tasks already concluded today
    return isTaskDueToday(t) || (t.status === 'concluido' && t.dateStr === todayFormattedBR);
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#EDE9DE]">Estrutura 99</h1>
        <p className="text-xs text-[#A9B99D] mt-0.5">
          Acesse os portais e planilhas compartilhados da 99 ou entre diretamente em 99 Rides e 99 Food.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#777F89]/40 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => onSwitchTab('overview')}
          className={`btn-press px-4 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
            isOverview
              ? 'font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40'
              : 'font-semibold text-[#A9B99D] hover:text-white hover:bg-[#151d18] border border-transparent'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          <span>Geral 99 (Rides &amp; Food)</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchTab('rides')}
          className={`btn-press px-4 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'rides'
              ? 'font-bold bg-[#C5A66B] text-[#0f1512]'
              : 'font-semibold text-[#A9B99D] hover:text-white hover:bg-[#151d18]'
          }`}
        >
          <Car className="w-3.5 h-3.5 shrink-0" />
          <span>99 Rides (PAX &amp; DRV)</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchTab('food')}
          className={`btn-press px-4 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'food'
              ? 'font-bold bg-orange-400 text-[#0f1512]'
              : 'font-semibold text-[#A9B99D] hover:text-white hover:bg-[#151d18]'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
          <span>99 Food (B, C &amp; D-Side)</span>
        </button>
      </div>

      {isOverview ? (
        <div className="space-y-6">
          {/* Bloco 1: Portais & Apps (Rides & Food) */}
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#EDE9DE] flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-sky-300" />
                  <span>Portais &amp; Apps (99 · Rides &amp; Food)</span>
                  <SumerianGlyphWhisper glyphs="𒆠" className="text-[10px]" />
                </h3>
                <p className="text-xs text-[#A9B99D] mt-0.5">
                  Portais e ferramentas compartilhados entre os dois canais. Clique no card para abrir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewPortal('99')}
                className="btn-press px-3 py-1.5 rounded-xl bg-[#1b251f] hover:bg-[#222e27] text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-sky-300" />
                <span>Novo Portal / App</span>
              </button>
            </div>

            {renderPortalGrid(
              sharedPortals,
              'Nenhum portal ou app compartilhado cadastrado ainda. Clique em Novo Portal / App para adicionar.',
            )}
          </div>

          {/* Bloco 2: Planilhas & Arquivos (Rides & Food) */}
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#EDE9DE] flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-sky-300" />
                  <span>Planilhas &amp; Arquivos (99 · Rides &amp; Food)</span>
                </h3>
                <p className="text-xs text-[#A9B99D] mt-0.5">
                  Planilhas e documentos que envolvem 99 Rides e 99 Food juntos. Clique no card para abrir.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <label className="btn-press px-3 py-1.5 rounded-xl bg-[#1b251f] hover:bg-[#222e27] text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                  <UploadCloud className="w-3.5 h-3.5 text-sky-300" />
                  <span>Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => handleFileInput(e, '99')}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onOpenAddSheetLink('99')}
                  className="btn-press px-3 py-1.5 rounded-xl bg-[#1b251f] hover:bg-[#222e27] text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-sky-300" />
                  <span>Novo Link</span>
                </button>
              </div>
            </div>

            {renderSheetsOrganizerAndGrid(
              sharedSheets,
              'Nenhuma planilha compartilhada entre Rides e Food cadastrada ainda. Use Upload ou Novo Link para adicionar.',
            )}
          </div>

          {/* Bloco 3: Botões para entrar em 99 Rides ou 99 Food */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#EDE9DE]">Acessar Separações</h3>
              <p className="text-xs text-[#A9B99D] mt-0.5">
                Escolha um canal para ver suas planilhas exclusivas, afazeres e links internos/externos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => onSwitchTab('rides')}
                className="interactive-card group text-left bg-[#151d18] border border-[#777F89]/40 border-t-2 border-t-[#C5A66B] hover:border-[#C5A66B]/70 rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-[#C5A66B]/15 border border-[#C5A66B]/35 text-[#C5A66B] flex items-center justify-center shrink-0 group-hover:bg-[#C5A66B]/25 transition-colors">
                    <Car className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-base font-extrabold text-[#EDE9DE] group-hover:text-[#C5A66B] transition-colors block">
                      99 Rides
                    </span>
                    <span className="text-xs text-[#A9B99D] block mt-0.5">
                      PAX &amp; DRV · Planilhas, afazeres e canais
                    </span>
                    <span className="text-[11px] font-mono text-[#C5A66B] block mt-2 tabular-nums">
                      {ridesSheets.length} planilha(s) · {ridesChannelsCount} canal(is) ·{' '}
                      {ridesLinkedTasks.length + channels.rides.common.length} afazer(es)
                    </span>
                  </div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-[#0b100d] border border-[#777F89]/40 text-[#C5A66B] flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSwitchTab('food')}
                className="interactive-card group text-left bg-[#151d18] border border-[#777F89]/40 border-t-2 border-t-orange-400 hover:border-orange-400/70 rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/15 border border-orange-500/35 text-orange-300 flex items-center justify-center shrink-0 group-hover:bg-orange-500/25 transition-colors">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-base font-extrabold text-[#EDE9DE] group-hover:text-orange-300 transition-colors block">
                      99 Food
                    </span>
                    <span className="text-xs text-[#A9B99D] block mt-0.5">
                      B, C &amp; D-Side · Planilhas, afazeres e canais
                    </span>
                    <span className="text-[11px] font-mono text-orange-300 block mt-2 tabular-nums">
                      {foodSheets.length} planilha(s) · {foodChannelsCount} canal(is) ·{' '}
                      {foodLinkedTasks.length + channels.food.common.length} afazer(es)
                    </span>
                  </div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-[#0b100d] border border-[#777F89]/40 text-orange-300 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Planilhas & Arquivos da frente */}
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#EDE9DE] flex items-center gap-2">
                  {isRides ? (
                    <Car className="w-4 h-4 text-[#C5A66B]" />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4 text-orange-300" />
                  )}
                  <span>Planilhas &amp; Arquivos — {folderCategory}</span>
                </h3>
                <p className="text-xs text-[#A9B99D] mt-0.5">
                  Documentos e planilhas principais desta frente. Clique no card para abrir diretamente.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <label className="btn-press px-3 py-1.5 rounded-xl bg-[#1b251f] hover:bg-[#222e27] text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                  <UploadCloud
                    className={`w-3.5 h-3.5 ${isRides ? 'text-[#C5A66B]' : 'text-orange-300'}`}
                  />
                  <span>Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => handleFileInput(e, folderCategory)}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onOpenAddSheetLink(folderCategory)}
                  className="btn-press px-3 py-1.5 rounded-xl bg-[#1b251f] hover:bg-[#222e27] text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <LinkIcon
                    className={`w-3.5 h-3.5 ${isRides ? 'text-[#C5A66B]' : 'text-orange-300'}`}
                  />
                  <span>Novo Link</span>
                </button>
              </div>
            </div>

            {renderSheetsOrganizerAndGrid(
              folderSheets,
              `Nenhuma planilha cadastrada para ${folderCategory} ainda. Use Upload ou Novo Link para adicionar.`,
            )}
          </div>

          {/* Portais específicos da frente (se houver) */}
          {folderPortals.length > 0 && (
            <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#EDE9DE] flex items-center gap-2">
                  <LayoutGrid
                    className={`w-4 h-4 ${isRides ? 'text-[#C5A66B]' : 'text-orange-300'}`}
                  />
                  <span>Portais &amp; Apps — {folderCategory}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenNewPortal(folderCategory)}
                  className="btn-press px-3 py-1.5 rounded-xl bg-[#1b251f] hover:bg-[#222e27] text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Plus
                    className={`w-3.5 h-3.5 ${isRides ? 'text-[#C5A66B]' : 'text-orange-300'}`}
                  />
                  <span>Novo Portal / App</span>
                </button>
              </div>
              {renderPortalGrid(folderPortals, '')}
            </div>
          )}

          {/* Afazeres Comuns vinculados às Tarefas do Dia e datas */}
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#EDE9DE] tracking-wide flex items-center gap-2">
                  <ListChecks
                    className={`w-4 h-4 ${isRides ? 'text-[#C5A66B]' : 'text-orange-300'}`}
                  />
                  <span>{isRides ? 'Afazeres Comuns — 99 Rides' : 'Afazeres Comuns — 99 Food'}</span>
                </span>
                <p className="text-[11px] text-[#A9B99D] mt-0.5">
                  Conectado automaticamente com Tarefas do Dia e Quadro de Tarefas. Filtre por dia ou veja todas as rotinas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenNewFrontTask(productLabel)}
                className="btn-press px-3 py-1.5 rounded-xl bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Afazer</span>
              </button>
            </div>

            {/* Controle de dias e filtro */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#777F89]/30 pb-3">
              <button
                type="button"
                onClick={() => setTodoFilterMode('today')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                  todoFilterMode === 'today'
                    ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B]'
                    : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-white'
                }`}
              >
                Hoje
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTodoFilterMode('date')}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                    todoFilterMode === 'date'
                      ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B]'
                      : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-white'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Por Dia</span>
                </button>
                {todoFilterMode === 'date' && (
                  <input
                    type="date"
                    value={selectedTodoDate}
                    onChange={(e) => setSelectedTodoDate(e.target.value)}
                    className="bg-[#0b100d] border border-[#C5A66B]/50 rounded-lg px-2 py-0.5 text-[11px] text-[#EDE9DE] font-mono focus:outline-none"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => setTodoFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                  todoFilterMode === 'all'
                    ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B]'
                    : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-white'
                }`}
              >
                Todas ({frontLinkedTasks.length})
              </button>
            </div>

            {filteredFrontTasks.length === 0 && folderData.common.length === 0 ? (
              <div className="text-center py-5 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
                {todoFilterMode === 'date'
                  ? `Nenhum afazer de ${folderCategory} programado para ${formatShortDateBR(selectedTodoDate)}.`
                  : todoFilterMode === 'today'
                    ? `Nenhum afazer de ${folderCategory} para hoje.`
                    : `Nenhum afazer cadastrado em ${folderCategory}.`}{' '}
                Clique em <strong className="text-[#EDE9DE]">Adicionar Afazer</strong> para criar.
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {filteredFrontTasks.map((task) => {
                  const isDone = task.status === 'concluido';
                  const scheduleLabel = getTaskScheduleLabel(task);
                  const statusLabel =
                    task.status === 'concluido'
                      ? 'Concluído'
                      : task.status === 'andamento'
                        ? 'Em Andamento'
                        : task.status === 'rotina'
                          ? 'Rotina'
                          : 'A Fazer';

                  return (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-lg bg-[#0b100d] border border-[#777F89]/40 flex items-center justify-between gap-3 hover:border-[#A9B99D]/60 transition"
                    >
                      <label className="flex items-start sm:items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => onToggleTaskDone(task.id)}
                          className="h-3.5 w-3.5 mt-0.5 sm:mt-0 rounded bg-[#151d18] border-[#777F89]/60 accent-[#C5A66B] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className={`block break-words font-medium ${
                              isDone ? 'line-through text-[#A9B99D]' : 'text-[#EDE9DE]'
                            }`}
                          >
                            {task.title}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[#A9B99D] mt-0.5">
                            <span className="text-[#C5A66B] font-semibold">{scheduleLabel}</span>
                            <span>·</span>
                            <span>{statusLabel}</span>
                            {task.channelName && (
                              <>
                                <span>·</span>
                                <span className={getChannelColor(task.channelName).textClass}>
                                  {task.channelName}
                                </span>
                              </>
                            )}
                            {task.tag && (
                              <>
                                <span>·</span>
                                <span className="text-[#C5A66B]">#{task.tag}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </label>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenEditTask(task)}
                          className="btn-press text-[#A9B99D] hover:text-[#EDE9DE] p-1 cursor-pointer"
                          title="Editar afazer / data"
                          aria-label={`Editar ${task.title}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLinkedTask(task.id)}
                          className="btn-press text-[#A9B99D] hover:text-rose-400 p-1 cursor-pointer"
                          title="Excluir afazer"
                          aria-label={`Excluir afazer ${task.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {folderData.common.map((item, idx) => (
                  <div
                    key={`${currentFolder}-common-${idx}`}
                    className="p-2.5 rounded-lg bg-[#0b100d] border border-[#777F89]/40 flex items-center justify-between gap-3 hover:border-[#A9B99D]/60 transition"
                  >
                    <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => onToggleCommonTask(currentFolder, idx)}
                        className="h-3.5 w-3.5 rounded bg-[#151d18] border-[#777F89]/60 accent-[#C5A66B] cursor-pointer shrink-0"
                      />
                      <span
                        className={`${
                          item.done ? 'line-through text-[#A9B99D]' : 'text-[#EDE9DE]'
                        } break-words`}
                      >
                        {item.title}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPushCommonToToday(item.title, productLabel)}
                        className="btn-press text-[#C5A66B] hover:underline font-semibold text-[11px] whitespace-nowrap cursor-pointer"
                        title="Enviar para a Home como tarefa do dia"
                      >
                        + Jogar no Dia
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCommonTask(currentFolder, idx)}
                        className="btn-press text-[#A9B99D] hover:text-rose-400 p-1 cursor-pointer"
                        title="Excluir afazer"
                        aria-label={`Excluir afazer ${item.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canais Internos e Externos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Internos */}
            <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#777F89]/40 pb-2">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-300" />
                  <span>Canais Internos / Proprietários</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenNewChannel(currentFolder, 'Interno')}
                  className="btn-press text-[11px] text-[#C5A66B] hover:underline font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Novo Canal
                </button>
              </div>

              {folderData.internos.length === 0 ? (
                <div className="text-center py-5 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
                  Nenhum canal interno cadastrado ainda. Use{' '}
                  <strong className="text-[#EDE9DE]">+ Novo Canal</strong> para adicionar.
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {folderData.internos.map((ch, idx) => {
                    const color = getChannelColor(ch.name);
                    return (
                      <div
                        key={`${ch.name}-${idx}`}
                        className={`interactive-card p-3 rounded-xl bg-[#0b100d] border border-[#777F89]/40 ${color.cardBorderClass} flex items-center justify-between gap-3`}
                      >
                        <a
                          href={ch.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 min-w-0 flex-1 group"
                        >
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color.iconBgClass}`}
                          >
                            <Table2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-sm font-bold ${color.textClass} group-hover:underline flex items-center gap-1.5 truncate`}
                            >
                              <span className="truncate">{ch.name}</span>
                              <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                            </span>
                            <span className="text-[11px] text-[#A9B99D] truncate block mt-0.5 font-mono">
                              {ch.url}
                            </span>
                          </div>
                        </a>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenEditChannel(currentFolder, 'internos', idx, ch)}
                            className="btn-press h-7 w-7 rounded-lg bg-[#151d18] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
                            title="Editar Canal"
                            aria-label={`Editar canal ${ch.name}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteChannel(currentFolder, 'internos', idx)}
                            className="btn-press h-7 w-7 rounded-lg bg-[#151d18] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                            title="Excluir Canal"
                            aria-label={`Excluir canal ${ch.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Externos */}
            <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#777F89]/40 pb-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Canais Externos (Bases CPB)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenNewChannel(currentFolder, 'Externo')}
                  className="btn-press text-[11px] text-[#C5A66B] hover:underline font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Novo Canal
                </button>
              </div>

              {folderData.externos.length === 0 ? (
                <div className="text-center py-5 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
                  Nenhum canal externo cadastrado ainda. Use{' '}
                  <strong className="text-[#EDE9DE]">+ Novo Canal</strong> para adicionar.
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {folderData.externos.map((ch, idx) => {
                    const color = getChannelColor(ch.name);
                    return (
                      <div
                        key={`${ch.name}-${idx}`}
                        className={`interactive-card p-3 rounded-xl bg-[#0b100d] border border-[#777F89]/40 ${color.cardBorderClass} flex items-center justify-between gap-3`}
                      >
                        <a
                          href={ch.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 min-w-0 flex-1 group"
                        >
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color.iconBgClass}`}
                          >
                            <Table2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-sm font-bold ${color.textClass} group-hover:underline flex items-center gap-1.5 truncate`}
                            >
                              <span className="truncate">{ch.name}</span>
                              <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                            </span>
                            <span className="text-[11px] text-[#A9B99D] truncate block mt-0.5 font-mono">
                              {ch.url}
                            </span>
                          </div>
                        </a>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenEditChannel(currentFolder, 'externos', idx, ch)}
                            className="btn-press h-7 w-7 rounded-lg bg-[#151d18] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
                            title="Editar Canal"
                            aria-label={`Editar canal ${ch.name}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteChannel(currentFolder, 'externos', idx)}
                            className="btn-press h-7 w-7 rounded-lg bg-[#151d18] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                            title="Excluir Canal"
                            aria-label={`Excluir canal ${ch.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
