import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Hourglass,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ChannelType,
  FolderKey,
  KishiActiveCampaign,
  KishiCampaign,
  KishiChannel,
  KishiPortal,
  KishiSheet,
  KishiState,
  KishiTask,
  KishiTimeBank,
  KishiTimeRule,
  KishiUser,
  ProductType,
  TaskFrequency,
  TaskStatus,
} from '@/src/types/kishi';
import {
  DEFAULT_TIME_TAGS,
  estimateWorkspaceTime,
  getAllAvailableTags,
  matchTimeRule,
} from '@/src/utils/timeEstimator';
import { computeWorkHoursStats, formatDuration } from '@/src/utils/workHours';

interface TaskModalProps {
  open: boolean;
  editingTask: KishiTask | null;
  channels: KishiState['channels'];
  timeBank?: KishiTimeBank;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    product: ProductType;
    subBrand: string;
    channelType: ChannelType;
    channelName: string;
    title: string;
    status: TaskStatus;
    frequency: TaskFrequency;
    tag?: string;
    estimatedMinutes?: number;
  }) => void;
}

export function TaskModal({
  open,
  editingTask,
  channels,
  timeBank,
  onClose,
  onSave,
}: TaskModalProps) {
  const [product, setProduct] = useState<ProductType>('99 Rides');
  const [subBrand, setSubBrand] = useState('PAX');
  const [channelType, setChannelType] = useState<ChannelType>('Externo');
  const [channelName, setChannelName] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>('andamento');
  const [frequency, setFrequency] = useState<TaskFrequency>('Diária');
  const [tag, setTag] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setProduct(editingTask.product);
      setSubBrand(editingTask.subBrand || (editingTask.product === '99 Rides' ? 'PAX' : editingTask.product === '99 Food' ? 'B-Side' : 'Geral'));
      setChannelType(editingTask.channelType || 'Nenhum');
      setChannelName(editingTask.channelName || '');
      setTitle(editingTask.title);
      setStatus(editingTask.status);
      setFrequency(editingTask.frequency);
      setTag(editingTask.tag || '');
      setEstimatedMinutes(
        typeof editingTask.estimatedMinutes === 'number' && editingTask.estimatedMinutes > 0
          ? String(editingTask.estimatedMinutes)
          : '',
      );
    } else {
      setProduct('99 Rides');
      setSubBrand('PAX');
      setChannelType('Externo');
      setChannelName(channels.rides.externos[0]?.name || '');
      setTitle('');
      setStatus('andamento');
      setFrequency('Diária');
      setTag('');
      setEstimatedMinutes('');
    }
  }, [open, editingTask, channels]);

  if (!open) return null;

  const subBrandOptions =
    product === '99 Rides'
      ? [
          { value: 'PAX', label: 'Rides: PAX (Passageiro)' },
          { value: 'DRV', label: 'Rides: DRV (Motorista)' },
          { value: 'Geral', label: 'Rides Geral' },
        ]
      : product === '99 Food'
        ? [
            { value: 'B-Side', label: 'Food: B-Side (Restaurantes)' },
            { value: 'C-Side', label: 'Food: C-Side (Consumidor)' },
            { value: 'D-Side', label: 'Food: D-Side (Entregadores)' },
          ]
        : [{ value: 'Geral', label: 'Demanda Interna' }];

  const availableChannels =
    channelType === 'Nenhum'
      ? []
      : product === '99 Food'
        ? channelType === 'Externo'
          ? channels.food.externos
          : channels.food.internos
        : channelType === 'Externo'
          ? channels.rides.externos
          : channels.rides.internos;

  function handleProductChange(nextProd: ProductType) {
    setProduct(nextProd);
    if (nextProd === '99 Rides') setSubBrand('PAX');
    else if (nextProd === '99 Food') setSubBrand('B-Side');
    else setSubBrand('Geral');

    if (channelType !== 'Nenhum') {
      const nextList =
        nextProd === '99 Food'
          ? channelType === 'Externo'
            ? channels.food.externos
            : channels.food.internos
          : channelType === 'Externo'
            ? channels.rides.externos
            : channels.rides.internos;
      setChannelName(nextList[0]?.name || '');
    }
  }

  function handleChannelTypeChange(nextType: ChannelType) {
    setChannelType(nextType);
    if (nextType === 'Nenhum') {
      setChannelName('');
      return;
    }
    const nextList =
      product === '99 Food'
        ? nextType === 'Externo'
          ? channels.food.externos
          : channels.food.internos
        : nextType === 'Externo'
          ? channels.rides.externos
          : channels.rides.internos;
    setChannelName(nextList[0]?.name || '');
  }

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const parsedMinutes = Number.parseInt(estimatedMinutes, 10);
    onSave({
      id: editingTask?.id,
      product,
      subBrand,
      channelType,
      channelName,
      title: trimmed,
      status,
      frequency,
      tag: tag.trim() || undefined,
      estimatedMinutes:
        Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : undefined,
    });
  }

  const availableTags = timeBank
    ? getAllAvailableTags(timeBank)
    : DEFAULT_TIME_TAGS;
  const smartMatchPreview = timeBank
    ? matchTimeRule(
        `${title} ${channelName} ${product}`,
        tag.trim() || undefined,
        timeBank.timeRules || [],
        'tasks',
      )
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">
            {editingTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
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
              Produto / Frente Principal
            </label>
            <select
              value={product}
              onChange={(e) => handleProductChange(e.target.value as ProductType)}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
            >
              <option value="99 Rides">99 Rides</option>
              <option value="99 Food">99 Food</option>
              <option value="Geral">Geral / Sem Produto</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Sub-marca / Vertente
              </label>
              <select
                value={subBrand}
                onChange={(e) => setSubBrand(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                {subBrandOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Tipo de Canal</label>
              <select
                value={channelType}
                onChange={(e) => handleChannelTypeChange(e.target.value as ChannelType)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                <option value="Externo">Externo (CPB)</option>
                <option value="Interno">Interno / Próprio</option>
                <option value="Nenhum">Nenhum / Demanda Pessoal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Canal Específico (Opcional)
            </label>
            <select
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
            >
              {channelType === 'Nenhum' ? (
                <option value="">Nenhum canal associado</option>
              ) : availableChannels.length === 0 ? (
                <option value="">Nenhum canal cadastrado ainda nesta pasta</option>
              ) : (
                <>
                  <option value="">Selecione um canal (opcional)</option>
                  {availableChannels.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Nome / Descrição da Tarefa
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="Ex: Conferir planilha UOL ou atualizar base Logan"
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Etapa Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                <option value="afazer">A Fazer</option>
                <option value="andamento">Em Andamento</option>
                <option value="rotina">Rotina</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Frequência</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as TaskFrequency)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                <option value="Diária">Diária</option>
                <option value="Semanal">Semanal</option>
                <option value="Pontual">Pontual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Etiqueta (Organização)
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                <option value="">Detectar pelo nome</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Tempo est. (min)
              </label>
              <input
                type="number"
                min={1}
                max={600}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder={
                  smartMatchPreview?.rule
                    ? `Auto: ${smartMatchPreview.rule.minutes}min`
                    : `Padrão (${timeBank?.defaultTaskMinutes ?? 15}min)`
                }
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
          </div>

          {!estimatedMinutes && smartMatchPreview?.rule && (
            <div className="text-[11px] font-mono text-[#C5A66B] bg-[#C5A66B]/10 border border-[#C5A66B]/25 rounded-lg px-2.5 py-1.5">
              Reconhecido automaticamente como <strong>#{smartMatchPreview.rule.tag}</strong> ({smartMatchPreview.rule.minutes}min)
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#777F89]/40">
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-4 py-2 bg-[#0b100d] hover:bg-[#1b251f] rounded-xl text-[#EDE9DE] text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

interface ChannelModalProps {
  open: boolean;
  folder: FolderKey;
  editing: {
    listKey: 'internos' | 'externos';
    index: number;
    channel: KishiChannel;
  } | null;
  defaultType: 'Interno' | 'Externo';
  onClose: () => void;
  onSave: (payload: {
    folder: FolderKey;
    name: string;
    url: string;
    type: 'Interno' | 'Externo';
    editing: { listKey: 'internos' | 'externos'; index: number } | null;
  }) => void;
}

export function ChannelModal({
  open,
  folder,
  editing,
  defaultType,
  onClose,
  onSave,
}: ChannelModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'Interno' | 'Externo'>('Externo');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.channel.name);
      setUrl(editing.channel.url);
      setType(editing.listKey === 'internos' ? 'Interno' : 'Externo');
    } else {
      setName('');
      setUrl('');
      setType(defaultType);
    }
  }, [open, editing, defaultType]);

  if (!open) return null;

  function handleSubmit() {
    if (!name.trim() || !url.trim()) return;
    onSave({
      folder,
      name: name.trim(),
      url: url.trim(),
      type,
      editing: editing ? { listKey: editing.listKey, index: editing.index } : null,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">
            {editing
              ? `Editar Canal (${editing.channel.name})`
              : `Adicionar Canal em 99 ${folder.toUpperCase()}`}
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
            <label className="block text-[#A9B99D] mb-1 font-semibold">Nome do Canal</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: UOL, Logan, Meta Ads..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Link Direto da Planilha / Base (URL)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
            />
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'Interno' | 'Externo')}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
            >
              <option value="Externo">Externo (Bases CPB)</option>
              <option value="Interno">Interno / Proprietário</option>
            </select>
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
            disabled={!name.trim() || !url.trim()}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            Salvar Canal
          </button>
        </div>
      </div>
    </div>
  );
}

interface SheetLinkModalProps {
  open: boolean;
  editingSheet?: KishiSheet | null;
  defaultCategory?: string;
  onClose: () => void;
  onSave: (payload: { id?: string; name: string; url: string; category: string }) => void;
}

export function SheetLinkModal({
  open,
  editingSheet,
  defaultCategory = '99',
  onClose,
  onSave,
}: SheetLinkModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState(defaultCategory);

  useEffect(() => {
    if (!open) return;
    if (editingSheet) {
      setName(editingSheet.name);
      setUrl(editingSheet.url);
      setCategory(editingSheet.category || defaultCategory);
    } else {
      setName('');
      setUrl('');
      setCategory(defaultCategory);
    }
  }, [open, editingSheet, defaultCategory]);

  if (!open) return null;

  const isLocalFile = editingSheet?.type === 'file';

  function handleSubmit() {
    if (!name.trim() || (!isLocalFile && !url.trim())) return;
    onSave({
      id: editingSheet?.id,
      name: name.trim(),
      url: isLocalFile ? editingSheet.url : url.trim(),
      category,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">
            {editingSheet ? 'Editar Planilha / Arquivo' : 'Adicionar Link de Planilha'}
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
              {isLocalFile ? 'Nome do Arquivo' : 'Nome da Planilha'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Planilha de Mídia - Geral 99"
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              autoFocus
            />
          </div>

          {!isLocalFile && (
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                URL (Google Sheets / Drive)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                placeholder="https://docs.google.com/spreadsheets/..."
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
          )}

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">Frente</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
            >
              <option value="99">99 (Rides &amp; Food)</option>
              <option value="99 Rides">99 Rides</option>
              <option value="99 Food">99 Food</option>
              <option value="Canais Externos">Canais Externos</option>
            </select>
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
            disabled={!name.trim() || (!isLocalFile && !url.trim())}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            {editingSheet ? 'Salvar Alterações' : 'Salvar Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PortalModalProps {
  open: boolean;
  editingPortal?: KishiPortal | null;
  defaultCategory?: string;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    name: string;
    url: string;
    category: string;
    kind: 'Portal' | 'App';
  }) => void;
}

export function PortalModal({
  open,
  editingPortal,
  defaultCategory = '99',
  onClose,
  onSave,
}: PortalModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [kind, setKind] = useState<'Portal' | 'App'>('Portal');

  useEffect(() => {
    if (!open) return;
    if (editingPortal) {
      setName(editingPortal.name);
      setUrl(editingPortal.url);
      setCategory(editingPortal.category || defaultCategory);
      setKind(editingPortal.kind || 'Portal');
    } else {
      setName('');
      setUrl('');
      setCategory(defaultCategory);
      setKind('Portal');
    }
  }, [open, editingPortal, defaultCategory]);

  if (!open) return null;

  function handleSubmit() {
    if (!name.trim() || !url.trim()) return;
    onSave({
      id: editingPortal?.id,
      name: name.trim(),
      url: url.trim(),
      category,
      kind,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">
            {editingPortal ? 'Editar Portal / App' : 'Adicionar Portal ou App'}
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
            <label className="block text-[#A9B99D] mb-1 font-semibold">Nome do Portal / App</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: DataHub, Overview, Looker..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">URL de Acesso</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="https://..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Tipo</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as 'Portal' | 'App')}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                <option value="Portal">Portal</option>
                <option value="App">App / Ferramenta</option>
              </select>
            </div>

            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">Frente</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
              >
                <option value="99">99 (Rides &amp; Food)</option>
                <option value="99 Rides">99 Rides</option>
                <option value="99 Food">99 Food</option>
                <option value="Canais Externos">Canais Externos</option>
              </select>
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
            disabled={!name.trim() || !url.trim()}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            {editingPortal ? 'Salvar Alterações' : 'Salvar Portal / App'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProfileModalProps {
  open: boolean;
  user: KishiUser;
  onClose: () => void;
  onSave: (user: KishiUser) => void;
}

export function ProfileModal({ open, user, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [initial, setInitial] = useState(user.initial);
  const [role, setRole] = useState(user.role);

  useEffect(() => {
    if (!open) return;
    setName(user.name);
    setInitial(user.initial);
    setRole(user.role);
  }, [open, user]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">Editar Perfil</h3>
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
            <label className="block text-[#A9B99D] mb-1 font-semibold">Seu Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
            />
          </div>
          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">Inicial do Avatar</label>
            <input
              type="text"
              maxLength={2}
              value={initial}
              onChange={(e) => setInitial(e.target.value.toUpperCase())}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] uppercase text-center font-bold focus:outline-none focus:border-[#C5A66B]"
            />
          </div>
          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">Cargo / Frentes</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#777F89]/40">
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-4 py-2 bg-[#0b100d] rounded-xl text-[#EDE9DE] text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                name: name.trim() || 'Júlia',
                initial: (initial.trim() || 'J').toUpperCase(),
                role: role.trim() || 'Operação 99 Food & Rides',
              })
            }
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

interface HoursSettingsModalProps {
  open: boolean;
  timeBank: KishiTimeBank;
  onClose: () => void;
  onSave: (next: KishiTimeBank) => void;
}

export function HoursSettingsModal({
  open,
  timeBank,
  onClose,
  onSave,
}: HoursSettingsModalProps) {
  const [workStart, setWorkStart] = useState(timeBank.workStart);
  const [workEnd, setWorkEnd] = useState(timeBank.workEnd);
  const [breakMinutes, setBreakMinutes] = useState(String(timeBank.breakMinutes));
  const [extraHours, setExtraHours] = useState(
    String(Math.floor((timeBank.extraBankMinutes || 0) / 60)),
  );
  const [extraMins, setExtraMins] = useState(
    String((timeBank.extraBankMinutes || 0) % 60),
  );

  useEffect(() => {
    if (!open) return;
    setWorkStart(timeBank.workStart || '09:00');
    setWorkEnd(timeBank.workEnd || '18:00');
    setBreakMinutes(String(timeBank.breakMinutes ?? 60));
    const totalExtra = timeBank.extraBankMinutes || 0;
    const sign = totalExtra < 0 ? -1 : 1;
    const absExtra = Math.abs(totalExtra);
    setExtraHours(String(sign * Math.floor(absExtra / 60)));
    setExtraMins(String(absExtra % 60));
  }, [open, timeBank]);

  if (!open) return null;

  const parsedBreak = Math.max(0, Number.parseInt(breakMinutes || '0', 10) || 0);
  const parsedExtraH = Number.parseInt(extraHours || '0', 10) || 0;
  const parsedExtraM = Math.max(0, Math.min(59, Number.parseInt(extraMins || '0', 10) || 0));
  const parsedExtraTotal =
    parsedExtraH < 0 ? -(Math.abs(parsedExtraH) * 60 + parsedExtraM) : parsedExtraH * 60 + parsedExtraM;

  const previewBank: KishiTimeBank = {
    ...timeBank,
    workStart: workStart || '09:00',
    workEnd: workEnd || '18:00',
    breakMinutes: parsedBreak,
    extraBankMinutes: parsedExtraTotal,
  };
  const previewStats = computeWorkHoursStats(previewBank);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C5A66B]" />
            <h3 className="text-sm font-bold text-[#EDE9DE]">Horas &amp; Jornada de Trabalho</h3>
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

        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Início do trabalho
              </label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] font-mono focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Término do trabalho
              </label>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] font-mono focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#A9B99D] font-semibold">
                Intervalo / Almoço (min)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBreakMinutes('0')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono border cursor-pointer ${
                    parsedBreak === 0
                      ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B] font-bold'
                      : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D]'
                  }`}
                >
                  Sem pausa
                </button>
                <button
                  type="button"
                  onClick={() => setBreakMinutes('60')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono border cursor-pointer ${
                    parsedBreak === 60
                      ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B] font-bold'
                      : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D]'
                  }`}
                >
                  1h (60m)
                </button>
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={240}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] font-mono focus:outline-none focus:border-[#C5A66B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Banco Extra (Horas)
              </label>
              <input
                type="number"
                min={-100}
                max={200}
                value={extraHours}
                onChange={(e) => setExtraHours(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] font-mono focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
            <div>
              <label className="block text-[#A9B99D] mb-1 font-semibold">
                Banco Extra (Min)
              </label>
              <input
                type="number"
                min={0}
                max={59}
                value={extraMins}
                onChange={(e) => setExtraMins(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] font-mono focus:outline-none focus:border-[#C5A66B]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b100d] border border-[#777F89]/40 space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between text-[#C5A66B] pb-1 border-b border-[#777F89]/25">
              <span>Relógio sincronizado (Brasília):</span>
              <span className="font-bold">{previewStats.brasiliaTimeFormatted}</span>
            </div>
            <div className="flex justify-between text-[#A9B99D]">
              <span>Jornada diária líquida:</span>
              <span className="text-[#EDE9DE] font-bold">
                {formatDuration(previewStats.netShiftMinutes)}
              </span>
            </div>
            <div className="flex justify-between text-[#A9B99D]">
              <span>Tempo já trabalhado hoje:</span>
              <span className="text-[#EDE9DE] font-bold">
                {formatDuration(previewStats.workedMinutes)}
              </span>
            </div>
            <div className="flex justify-between text-[#A9B99D]">
              <span>Tempo restante no trabalho:</span>
              <span className="text-[#C5A66B] font-bold">
                {formatDuration(previewStats.remainingShiftMinutes)}
              </span>
            </div>
            {parsedExtraTotal !== 0 && (
              <div className="flex justify-between text-[#A9B99D] pt-1 border-t border-[#777F89]/25">
                <span>Disponível total (c/ banco extra):</span>
                <span className="text-emerald-300 font-bold">
                  {formatDuration(previewStats.totalAvailableMinutes)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#777F89]/40">
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-4 py-2 bg-[#0b100d] rounded-xl text-[#EDE9DE] text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(previewBank)}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            Salvar Horas
          </button>
        </div>
      </div>
    </div>
  );
}

interface TempoSettingsModalProps {
  open: boolean;
  timeBank: KishiTimeBank;
  tasks: KishiTask[];
  activeCampaigns: KishiActiveCampaign[];
  onClose: () => void;
  onUpdateTimeBank: (next: KishiTimeBank) => void;
  onUpdateTask: (
    taskId: string,
    patch: { tag?: string; estimatedMinutes?: number | undefined },
  ) => void;
  onUpdateWave: (
    campaignId: string,
    waveId: string,
    patch: { tag?: string; estimatedMinutes?: number | undefined },
  ) => void;
}

export function TempoSettingsModal({
  open,
  timeBank,
  tasks,
  activeCampaigns,
  onClose,
  onUpdateTimeBank,
  onUpdateTask,
  onUpdateWave,
}: TempoSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'today'>('catalog');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('Todas');
  const [newLabel, setNewLabel] = useState('');
  const [newTag, setNewTag] = useState('Extração');
  const [customTagInput, setCustomTagInput] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newMinutes, setNewMinutes] = useState('20');

  const workStats = useMemo(() => computeWorkHoursStats(timeBank), [timeBank]);
  const estimate = useMemo(
    () => estimateWorkspaceTime({ tasks, activeCampaigns, timeBank }),
    [tasks, activeCampaigns, timeBank],
  );
  const allTags = useMemo(
    () => getAllAvailableTags(timeBank, tasks),
    [timeBank, tasks],
  );

  if (!open) return null;

  const rules = timeBank.timeRules || [];
  const filteredRules =
    selectedTagFilter === 'Todas'
      ? rules
      : rules.filter((r) => r.tag === selectedTagFilter);
  const balanceMinutes = workStats.totalAvailableMinutes - estimate.totalEstimatedMinutes;
  const fitsInShift = balanceMinutes >= 0;

  function handleAddRule() {
    const labelTrimmed = newLabel.trim();
    if (!labelTrimmed) return;
    const effectiveTag =
      newTag === '__custom__'
        ? customTagInput.trim() || 'Geral'
        : newTag || 'Geral';
    const parsedMins = Math.max(0, Number.parseInt(newMinutes || '15', 10) || 15);
    const parsedKeywords = newKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const nextRule: KishiTimeRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: labelTrimmed,
      tag: effectiveTag,
      keywords:
        parsedKeywords.length > 0
          ? parsedKeywords
          : labelTrimmed.toLowerCase().split(/\s+/).filter((w) => w.length >= 3),
      minutes: parsedMins,
      appliesTo: 'all',
    };

    onUpdateTimeBank({
      ...timeBank,
      timeRules: [nextRule, ...rules],
    });
    setNewLabel('');
    setCustomTagInput('');
    setNewKeywords('');
    setNewMinutes('20');
  }

  function handleUpdateRule(ruleId: string, patch: Partial<KishiTimeRule>) {
    onUpdateTimeBank({
      ...timeBank,
      timeRules: rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
    });
  }

  function handleDeleteRule(ruleId: string) {
    onUpdateTimeBank({
      ...timeBank,
      timeRules: rules.filter((r) => r.id !== ruleId),
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#777F89]/40 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-[#0b100d] border border-[#C5A66B]/40 flex items-center justify-center shrink-0">
              <Hourglass className="w-4 h-4 text-[#C5A66B]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#EDE9DE] truncate">
                Tempo — Tarefas, Etiquetas &amp; Estimativas
              </h3>
              <p className="text-[11px] text-[#A9B99D] truncate">
                Atualize seus tempos por atividade ou etiqueta para o KISHI calcular o que falta hoje e para extrair.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A9B99D] hover:text-white cursor-pointer shrink-0 ml-2"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de resumo sincronizada com Brasília */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 bg-[#0b100d]/70 border-b border-[#777F89]/35 shrink-0 text-[11px] font-mono">
          <div className="p-2.5 rounded-xl bg-[#151d18] border border-[#777F89]/30">
            <div className="text-[#A9B99D]">O que resta hoje</div>
            <div className="text-sm font-extrabold text-[#EDE9DE] mt-0.5">
              {estimate.taskEstimates.length} ({formatDuration(estimate.tasksMinutes)})
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#151d18] border border-[#777F89]/30">
            <div className="text-rose-300">Para extrair</div>
            <div className="text-sm font-extrabold text-rose-300 mt-0.5">
              {estimate.waveEstimates.length} ({formatDuration(estimate.wavesMinutes)})
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#151d18] border border-[#777F89]/30">
            <div className="text-[#A9B99D]">Total estimado</div>
            <div className="text-sm font-extrabold text-[#C5A66B] mt-0.5">
              {formatDuration(estimate.totalEstimatedMinutes)}
            </div>
          </div>
          <div
            className={`p-2.5 rounded-xl bg-[#151d18] border ${
              fitsInShift ? 'border-emerald-500/35' : 'border-amber-500/45'
            }`}
          >
            <div className="text-[#A9B99D]">Expediente ({workStats.brasiliaTimeFormatted} BRT)</div>
            <div
              className={`text-sm font-extrabold mt-0.5 ${
                fitsInShift ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {formatDuration(workStats.totalAvailableMinutes)} (
              {fitsInShift
                ? `+${formatDuration(balanceMinutes)}`
                : formatDuration(balanceMinutes)}
              )
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-[#777F89]/35 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-2 rounded-t-xl font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-[#C5A66B] text-[#C5A66B] bg-[#0b100d]/60'
                : 'border-transparent text-[#A9B99D] hover:text-[#EDE9DE]'
            }`}
          >
            Minha Lista &amp; Etiquetas ({rules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2 rounded-t-xl font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'today'
                ? 'border-[#C5A66B] text-[#C5A66B] bg-[#0b100d]/60'
                : 'border-transparent text-[#A9B99D] hover:text-[#EDE9DE]'
            }`}
          >
            Previsão Atual ({estimate.taskEstimates.length + estimate.waveEstimates.length})
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'catalog' ? (
            <>
              {/* Nova atividade / etiqueta */}
              <div className="p-3.5 rounded-xl bg-[#0b100d] border border-[#C5A66B]/30 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-[#EDE9DE]">
                  <Plus className="w-3.5 h-3.5 text-[#C5A66B]" />
                  <span>Adicionar Tarefa / Regra de Tempo</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Nome da tarefa (ex: Extrair base Logan)"
                    className="sm:col-span-5 bg-[#151d18] border border-[#777F89]/60 rounded-xl px-3 py-2 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                  />
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="sm:col-span-3 bg-[#151d18] border border-[#777F89]/60 rounded-xl px-2.5 py-2 text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
                  >
                    {allTags.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                    <option value="__custom__">+ Nova etiqueta...</option>
                  </select>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={newMinutes}
                      onChange={(e) => setNewMinutes(e.target.value)}
                      className="w-full bg-[#151d18] border border-[#777F89]/60 rounded-xl px-2.5 py-2 font-mono text-center text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
                    />
                    <span className="text-[11px] font-mono text-[#A9B99D]">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRule}
                    disabled={!newLabel.trim()}
                    className="sm:col-span-2 btn-press px-3 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                {newTag === '__custom__' && (
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="Nome da nova etiqueta (ex: Parceiros, Criativos...)"
                    className="w-full bg-[#151d18] border border-[#777F89]/60 rounded-xl px-3 py-2 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                  />
                )}

                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="Palavras-chave para bater com nomes (opcional, ex: extrair, wave, plano)"
                  className="w-full bg-[#151d18] border border-[#777F89]/40 rounded-xl px-3 py-1.5 text-[11px] text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                />
              </div>

              {/* Filtro por etiqueta */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-[#A9B99D] inline-flex items-center gap-1 mr-1">
                  <Tag className="w-3 h-3 text-[#C5A66B]" />
                  Etiquetas:
                </span>
                {['Todas', ...allTags].map((tagName) => (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => setSelectedTagFilter(tagName)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer transition ${
                      selectedTagFilter === tagName
                        ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B] font-bold'
                        : 'bg-[#0b100d] border-[#777F89]/40 text-[#A9B99D] hover:text-[#EDE9DE]'
                    }`}
                  >
                    {tagName === 'Todas' ? 'Todas' : `#${tagName}`}
                  </button>
                ))}
              </div>

              {/* Lista de regras */}
              {filteredRules.length === 0 ? (
                <div className="p-6 text-center text-[#A9B99D] border border-dashed border-[#777F89]/35 rounded-xl">
                  Nenhuma atividade cadastrada nesta etiqueta ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-[#0b100d] border border-[#777F89]/40 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-[#C5A66B]/15 border border-[#C5A66B]/30 text-[#C5A66B] text-[10px] font-mono font-bold shrink-0">
                            #{rule.tag}
                          </span>
                          <input
                            type="text"
                            value={rule.label}
                            onChange={(e) =>
                              handleUpdateRule(rule.id, { label: e.target.value })
                            }
                            className="flex-1 min-w-0 bg-transparent border-b border-transparent focus:border-[#C5A66B] text-xs font-semibold text-[#EDE9DE] focus:outline-none py-0.5"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {[10, 15, 20, 30, 45, 60].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUpdateRule(rule.id, { minutes: preset })}
                              className={`px-2 py-1 rounded-md text-[10px] font-mono border cursor-pointer ${
                                rule.minutes === preset
                                  ? 'bg-[#C5A66B]/20 border-[#C5A66B] text-[#C5A66B] font-bold'
                                  : 'bg-[#151d18] border-[#777F89]/40 text-[#A9B99D] hover:text-[#EDE9DE]'
                              }`}
                            >
                              {preset}m
                            </button>
                          ))}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={600}
                              value={rule.minutes}
                              onChange={(e) =>
                                handleUpdateRule(rule.id, {
                                  minutes: Math.max(
                                    0,
                                    Number.parseInt(e.target.value || '0', 10) || 0,
                                  ),
                                })
                              }
                              className="w-14 bg-[#151d18] border border-[#777F89]/60 rounded-lg px-2 py-1 text-[11px] font-mono text-[#EDE9DE] text-center focus:outline-none focus:border-[#C5A66B]"
                            />
                            <span className="text-[10px] font-mono text-[#A9B99D]">min</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="h-7 w-7 rounded-lg bg-[#151d18] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                            title="Remover item da lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[11px]">
                        <span className="text-[#A9B99D] shrink-0">Palavras-chave:</span>
                        <input
                          type="text"
                          value={(rule.keywords || []).join(', ')}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, {
                              keywords: e.target.value
                                .split(',')
                                .map((k) => k.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="extrair, plano, wave..."
                          className="flex-1 bg-[#151d18] border border-[#777F89]/35 rounded-lg px-2.5 py-1 font-mono text-[11px] text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Padrões quando não houver match */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#777F89]/30">
                <div>
                  <label className="block text-[11px] text-[#A9B99D] mb-1">
                    Padrão se tarefa não bater com nenhuma regra (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={timeBank.defaultTaskMinutes}
                    onChange={(e) =>
                      onUpdateTimeBank({
                        ...timeBank,
                        defaultTaskMinutes: Math.max(
                          0,
                          Number.parseInt(e.target.value || '0', 10) || 0,
                        ),
                      })
                    }
                    className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl px-3 py-2 font-mono text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#A9B99D] mb-1">
                    Padrão se extração não bater com regra (min, 0 = só por regra)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={timeBank.defaultWaveMinutes}
                    onChange={(e) =>
                      onUpdateTimeBank({
                        ...timeBank,
                        defaultWaveMinutes: Math.max(
                          0,
                          Number.parseInt(e.target.value || '0', 10) || 0,
                        ),
                      })
                    }
                    className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl px-3 py-2 font-mono text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Tarefas em O que resta hoje */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#EDE9DE]">
                    O Que Resta Hoje ({estimate.taskEstimates.length})
                  </h4>
                  <span className="font-mono text-[#C5A66B] font-bold">
                    {formatDuration(estimate.tasksMinutes)}
                  </span>
                </div>

                {estimate.taskEstimates.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#0b100d] border border-dashed border-[#777F89]/35 text-[11px] text-[#A9B99D] text-center">
                    Nenhuma tarefa pendente hoje.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {estimate.taskEstimates.map(({ task, minutes, matchType, matchedRule }) => (
                      <div
                        key={task.id}
                        className="p-2.5 rounded-xl bg-[#0b100d] border border-[#777F89]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[#EDE9DE] truncate">
                            {task.title}
                          </div>
                          <div className="text-[10px] font-mono text-[#A9B99D] flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>{task.product}</span>
                            {matchType === 'manual' && (
                              <span className="text-[#C5A66B]">· Tempo manual</span>
                            )}
                            {matchType === 'tag' && matchedRule && (
                              <span className="text-emerald-300 inline-flex items-center gap-1">
                                · Etiqueta #{matchedRule.tag} ({matchedRule.minutes}m)
                              </span>
                            )}
                            {matchType === 'smart' && matchedRule && (
                              <span className="text-sky-300 inline-flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                Casou c/ &quot;{matchedRule.label}&quot; (#{matchedRule.tag})
                              </span>
                            )}
                            {matchType === 'default' && (
                              <span>· Usando padrão ({minutes}m)</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={task.tag || ''}
                            onChange={(e) =>
                              onUpdateTask(task.id, {
                                tag: e.target.value || undefined,
                              })
                            }
                            className="bg-[#151d18] border border-[#777F89]/50 rounded-lg px-2 py-1 text-[11px] text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
                          >
                            <option value="">Auto</option>
                            {allTags.map((t) => (
                              <option key={t} value={t}>
                                #{t}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            max={600}
                            value={
                              typeof task.estimatedMinutes === 'number'
                                ? task.estimatedMinutes
                                : ''
                            }
                            placeholder={String(minutes)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                onUpdateTask(task.id, { estimatedMinutes: undefined });
                                return;
                              }
                              const val = Number.parseInt(raw, 10);
                              if (Number.isFinite(val) && val >= 0) {
                                onUpdateTask(task.id, { estimatedMinutes: val });
                              }
                            }}
                            className="w-14 bg-[#151d18] border border-[#777F89]/60 rounded-lg px-2 py-1 text-[11px] font-mono text-[#EDE9DE] text-center focus:outline-none focus:border-[#C5A66B]"
                          />
                          <span className="text-[10px] font-mono text-[#A9B99D]">m</span>
                          {matchedRule &&
                            typeof task.estimatedMinutes === 'number' &&
                            task.estimatedMinutes !== matchedRule.minutes && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateRule(matchedRule.id, {
                                    minutes: task.estimatedMinutes!,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-[#C5A66B]/15 border border-[#C5A66B]/40 text-[#C5A66B] text-[10px] font-semibold cursor-pointer"
                                title={`Atualizar regra "${matchedRule.label}" para ${task.estimatedMinutes}min`}
                              >
                                Salvar na regra
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Para Extrair */}
              <div className="space-y-2 pt-2 border-t border-[#777F89]/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-rose-300">
                    Para Extrair em Campanhas ({estimate.waveEstimates.length})
                  </h4>
                  <span className="font-mono text-rose-300 font-bold">
                    {formatDuration(estimate.wavesMinutes)}
                  </span>
                </div>

                {estimate.waveEstimates.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#0b100d] border border-dashed border-[#777F89]/35 text-[11px] text-[#A9B99D] text-center">
                    Nenhum item não extraído em campanhas no momento.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {estimate.waveEstimates.map(
                      ({ campaignId, campaignName, front, wave, minutes, matchType, matchedRule }) => (
                        <div
                          key={wave.id}
                          className="p-2.5 rounded-xl bg-[#0b100d] border border-[#777F89]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[#EDE9DE] truncate">
                              {wave.planTitle}
                            </div>
                            <div className="text-[10px] font-mono text-[#A9B99D] flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>
                                {front} · {campaignName}
                              </span>
                              {matchedRule && (
                                <span className="text-sky-300">
                                  · Casou c/ #{matchedRule.tag} ({matchedRule.minutes}m)
                                </span>
                              )}
                              {matchType === 'manual' && (
                                <span className="text-[#C5A66B]">· Tempo manual</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <select
                              value={wave.tag || ''}
                              onChange={(e) =>
                                onUpdateWave(campaignId, wave.id, {
                                  tag: e.target.value || undefined,
                                })
                              }
                              className="bg-[#151d18] border border-[#777F89]/50 rounded-lg px-2 py-1 text-[11px] text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B]"
                            >
                              <option value="">Extração (Auto)</option>
                              {allTags.map((t) => (
                                <option key={t} value={t}>
                                  #{t}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={600}
                              value={
                                typeof wave.estimatedMinutes === 'number'
                                  ? wave.estimatedMinutes
                                  : ''
                              }
                              placeholder={String(minutes)}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  onUpdateWave(campaignId, wave.id, {
                                    estimatedMinutes: undefined,
                                  });
                                  return;
                                }
                                const val = Number.parseInt(raw, 10);
                                if (Number.isFinite(val) && val >= 0) {
                                  onUpdateWave(campaignId, wave.id, {
                                    estimatedMinutes: val,
                                  });
                                }
                              }}
                              className="w-14 bg-[#151d18] border border-[#777F89]/60 rounded-lg px-2 py-1 text-[11px] font-mono text-[#EDE9DE] text-center focus:outline-none focus:border-[#C5A66B]"
                            />
                            <span className="text-[10px] font-mono text-[#A9B99D]">m</span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[#777F89]/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ open, title, message, onCancel, onConfirm }: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#EDE9DE]">{title}</h3>
            <p className="text-xs text-[#A9B99D] leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-[#777F89]/40">
          <button
            type="button"
            onClick={onCancel}
            className="btn-press px-4 py-2 bg-[#0b100d] hover:bg-[#1b251f] rounded-xl text-[#EDE9DE] text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-press px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

interface PromptModalProps {
  open: boolean;
  title: string;
  label: string;
  placeholder: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function PromptModal({
  open,
  title,
  label,
  placeholder,
  onCancel,
  onConfirm,
}: PromptModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  if (!open) return null;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#A9B99D] hover:text-white cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-[#A9B99D] font-semibold">{label}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder={placeholder}
            className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#777F89]/40">
          <button
            type="button"
            onClick={onCancel}
            className="btn-press px-4 py-2 bg-[#0b100d] rounded-xl text-[#EDE9DE] text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

interface CampaignModalProps {
  open: boolean;
  bucket: 'drv' | 'food';
  editingCampaign?: KishiCampaign | null;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    bucket: 'drv' | 'food';
    name: string;
    details: string;
    sheetUrl: string;
    done: boolean;
  }) => void;
}

export function CampaignModal({
  open,
  bucket,
  editingCampaign,
  onClose,
  onSave,
}: CampaignModalProps) {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingCampaign) {
      setName(editingCampaign.name);
      setDetails(editingCampaign.details);
      setSheetUrl(editingCampaign.sheetUrl || '');
      setDone(Boolean(editingCampaign.done));
    } else {
      setName('');
      setDetails('');
      setSheetUrl('');
      setDone(false);
    }
  }, [open, editingCampaign]);

  if (!open) return null;

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({
      id: editingCampaign?.id,
      bucket,
      name: name.trim(),
      details: details.trim(),
      sheetUrl: sheetUrl.trim(),
      done,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#151d18] border border-[#777F89]/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-[#777F89]/40 pb-3">
          <h3 className="text-sm font-bold text-[#EDE9DE]">
            {editingCampaign
              ? `Editar Campanha (${bucket === 'drv' ? '99 Rides' : '99 Food'})`
              : `Nova Pendência de Campanha — ${bucket === 'drv' ? '99 Rides' : '99 Food'}`}
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
              Campanha / Item para revisar
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                bucket === 'drv'
                  ? 'Ex: Campanha Motorista / Atualizar linha no Plano de Mídia'
                  : 'Ex: Campanha Cupom / Revisar aba do Plano de Mídia'
              }
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Detalhes / O que precisa ser revisado
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: Conferir aba de Meta Ads, atualizar investimento diário e checar divergência na base..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B] resize-y"
            />
          </div>

          <div>
            <label className="block text-[#A9B99D] mb-1 font-semibold">
              Link da Planilha / Plano de Mídia (Opcional)
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl p-2.5 text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer text-[#EDE9DE]">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => setDone(e.target.checked)}
              className="h-3.5 w-3.5 rounded bg-[#0b100d] border-[#777F89]/60 accent-[#C5A66B] cursor-pointer"
            />
            <span>Marcar campanha como já revisada / atualizada</span>
          </label>
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
            disabled={!name.trim()}
            className="btn-press px-5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] font-bold rounded-xl text-xs cursor-pointer"
          >
            {editingCampaign ? 'Salvar Alterações' : 'Salvar Campanha'}
          </button>
        </div>
      </div>
    </div>
  );
}
