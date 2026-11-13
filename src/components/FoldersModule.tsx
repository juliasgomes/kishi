import type { ChangeEvent } from 'react';
import {
  AppWindow,
  ArrowRight,
  Car,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  LayoutGrid,
  Link as LinkIcon,
  ListChecks,
  Lock,
  Pencil,
  Plus,
  Share2,
  Table2,
  Trash2,
  UploadCloud,
  UtensilsCrossed,
} from 'lucide-react';
import type {
  FolderKey,
  FolderTab,
  KishiChannel,
  KishiPortal,
  KishiSheet,
  KishiState,
  ProductType,
} from '@/src/types/kishi';
import { getChannelColor, getFrontStyle } from '@/src/utils/channelColors';

interface FoldersModuleProps {
  activeTab: FolderTab;
  channels: KishiState['channels'];
  portals: KishiPortal[];
  sheets: KishiSheet[];
  onSwitchTab: (tab: FolderTab) => void;
  onToggleCommonTask: (folder: FolderKey, index: number) => void;
  onDeleteCommonTask: (folder: FolderKey, index: number) => void;
  onAddCommonTask: (folder: FolderKey) => void;
  onPushCommonToToday: (title: string, product: ProductType) => void;
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

export function FoldersModule({
  activeTab,
  channels,
  portals,
  sheets,
  onSwitchTab,
  onToggleCommonTask,
  onDeleteCommonTask,
  onAddCommonTask,
  onPushCommonToToday,
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
  const sharedPortals = portals.filter(
    (p) => p.category !== '99 Rides' && p.category !== '99 Food',
  );
  const sharedSheets = sheets.filter(
    (s) => s.category !== '99 Rides' && s.category !== '99 Food',
  );
  const ridesSheets = sheets.filter((s) => s.category === '99 Rides');
  const foodSheets = sheets.filter((s) => s.category === '99 Food');

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((portal) => {
          const front = getFrontStyle(portal.category);
          const isBoth99 = portal.category === '99';
          return (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`interactive-card group p-3 rounded-xl bg-[#0f1512]/80 border border-[#777F89]/40 ${front.cardBorderClass} flex items-center justify-between gap-2.5 focus:outline-none`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`h-8 ${isBoth99 ? 'px-2' : 'w-8'} rounded-lg flex items-center justify-center shrink-0 ${front.iconBgClass}`}
                >
                  {renderFrontIcon(portal.category, portal.kind === 'App' ? 'app' : 'portal')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#A9B99D]">
                    <span className={`font-bold ${front.textClass}`}>{front.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>{portal.kind}</span>
                  </div>
                  <h4
                    className="text-[13px] font-bold text-[#EDE9DE] group-hover:text-[#C5A66B] transition-colors truncate mt-0.5"
                    title={portal.name}
                  >
                    {portal.name}
                  </h4>
                </div>
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
            </a>
          );
        })}
      </div>
    );
  }

  function renderSheetsGrid(items: KishiSheet[], emptyText: string) {
    if (items.length === 0) {
      return (
        <div className="text-center py-6 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((sh) => {
          const front = getFrontStyle(sh.category);
          const isBoth99 = sh.category === '99';
          return (
            <a
              key={sh.id}
              href={sh.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`interactive-card group p-3.5 rounded-xl bg-[#0f1512]/80 border border-[#777F89]/40 ${front.cardBorderClass} flex items-start justify-between gap-2.5 focus:outline-none`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`h-9 ${isBoth99 ? 'px-2' : 'w-9'} rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${front.iconBgClass}`}
                >
                  {renderFrontIcon(sh.category, sh.type === 'file' ? 'file' : 'sheet')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className={`font-bold ${front.textClass}`}>{front.label}</span>
                    <span className="text-[#777F89]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[#A9B99D]">
                      {sh.type === 'file' ? 'Arquivo' : 'Planilha'}
                    </span>
                  </div>
                  <h4
                    className="text-sm font-bold text-[#EDE9DE] group-hover:text-[#C5A66B] transition-colors mt-1 leading-snug truncate"
                    title={sh.name}
                  >
                    {sh.name}
                  </h4>
                </div>
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
                  title="Editar Planilha / Frente"
                  aria-label={`Editar ${sh.name}`}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSheet(sh.id)}
                  className="btn-press h-7 w-7 rounded-lg bg-[#0b100d] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                  title="Remover da lista"
                  aria-label={`Remover planilha ${sh.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </a>
          );
        })}
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
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#EDE9DE] flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-sky-300" />
                  <span>Portais &amp; Apps (99 · Rides &amp; Food)</span>
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
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 space-y-3.5">
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
                    accept=".xlsx,.xls,.csv,.pdf"
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

            {renderSheetsGrid(
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
                      {channels.rides.common.length} afazer(es)
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
                      {channels.food.common.length} afazer(es)
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
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 space-y-3.5">
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
                    accept=".xlsx,.xls,.csv,.pdf"
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

            {renderSheetsGrid(
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

          {/* Afazeres Comuns */}
          <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#EDE9DE] tracking-wide flex items-center gap-2">
                <ListChecks
                  className={`w-4 h-4 ${isRides ? 'text-[#C5A66B]' : 'text-orange-300'}`}
                />
                <span>{isRides ? 'Afazeres Comuns — 99 Rides' : 'Afazeres Comuns — 99 Food'}</span>
              </span>
              <button
                type="button"
                onClick={() => onAddCommonTask(currentFolder)}
                className="btn-press text-xs text-[#C5A66B] hover:underline font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Afazer</span>
              </button>
            </div>

            {folderData.common.length === 0 ? (
              <div className="text-center py-4 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
                Nenhum afazer cadastrado. Clique em{' '}
                <strong className="text-[#EDE9DE]">Adicionar Afazer</strong> para criar.
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
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
                        } truncate`}
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
