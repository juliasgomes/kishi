export type RouteId =
  | 'visao-geral'
  | 'campanhas'
  | 'pastas-99'
  | 'kanban'
  | 'historico'
  | 'chatbot';

export type TaskStatus = 'afazer' | 'andamento' | 'rotina' | 'concluido';
export type TaskFrequency = 'Diária' | 'Semanal' | 'Pontual';
export type ProductType = '99 Rides' | '99 Food' | 'Geral';
export type ChannelType = 'Externo' | 'Interno' | 'Nenhum';
export type FolderKey = 'rides' | 'food';
export type FolderTab = 'overview' | FolderKey;
export type WaveStatus = 'nao_extraido' | 'extraido';

export interface KishiTimeRule {
  id: string;
  label: string;
  tag: string;
  keywords: string[];
  minutes: number;
  appliesTo?: 'all' | 'tasks' | 'extractions';
}

export interface KishiTimeBank {
  workStart: string;
  workEnd: string;
  breakMinutes: number;
  extraBankMinutes: number;
  defaultTaskMinutes: number;
  defaultWaveMinutes: number;
  defaultTodoMinutes: number;
  timeRules: KishiTimeRule[];
  availableMinutes?: number;
}

export interface KishiUser {
  name: string;
  initial: string;
  role: string;
}

export interface KishiSheet {
  id: string;
  name: string;
  category: string;
  type: 'link' | 'file';
  url: string;
  note: string;
}

export interface KishiPortal {
  id: string;
  name: string;
  category: string;
  kind: 'Portal' | 'App';
  url: string;
}

export interface KishiCommonTask {
  title: string;
  done: boolean;
}

export interface KishiChannel {
  name: string;
  url: string;
  type: 'Externo' | 'Interno';
}

export interface KishiMediaRevision {
  id: string;
  title: string;
  note?: string;
  done: boolean;
}

export interface KishiMediaPlan {
  sheetName: string;
  sheetUrl: string;
  revisions: KishiMediaRevision[];
}

export interface KishiFolderData {
  common: KishiCommonTask[];
  internos: KishiChannel[];
  externos: KishiChannel[];
  mediaPlan: KishiMediaPlan;
}

export interface KishiCampaign {
  id: string;
  name: string;
  details: string;
  sheetUrl?: string;
  done: boolean;
}

export interface KishiWavePlan {
  id: string;
  waveName: string;
  planTitle: string;
  planUrl?: string;
  startDate?: string;
  endDate?: string;
  status: WaveStatus;
  totalValue?: string;
  fromSheet?: boolean;
  tag?: string;
  estimatedMinutes?: number;
}

export interface KishiCampaignTodo {
  id: string;
  text: string;
  waveRef?: string;
  done: boolean;
}

export interface KishiActiveCampaign {
  id: string;
  name: string;
  front: '99 Rides' | '99 Food';
  sheetUrl?: string;
  autoSync?: boolean;
  lastSyncedAt?: string;
  notes?: string;
  waves: KishiWavePlan[];
  todos: KishiCampaignTodo[];
}

export interface KishiTask {
  id: string;
  product: ProductType;
  subBrand: string;
  channelType: ChannelType;
  channelName: string;
  title: string;
  status: TaskStatus;
  frequency: TaskFrequency;
  tag?: string;
  estimatedMinutes?: number;
  completedAt: string | null;
  dateStr: string;
}

export interface KishiHistoryItem {
  id: string;
  dateStr: string;
  title: string;
  product: ProductType | string;
  subBrand: string;
  channelType: ChannelType | string;
  channelName: string;
  frequency: TaskFrequency | string;
  time: string;
}

export interface KishiState {
  lastDateStr: string;
  user: KishiUser;
  portals: KishiPortal[];
  sheets: KishiSheet[];
  campaigns: {
    drv: KishiCampaign[];
    food: KishiCampaign[];
  };
  activeCampaigns: KishiActiveCampaign[];
  channels: {
    rides: KishiFolderData;
    food: KishiFolderData;
  };
  tasks: KishiTask[];
  history: KishiHistoryItem[];
  timeBank?: KishiTimeBank;
}
