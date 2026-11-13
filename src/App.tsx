import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderTree,
  Globe,
  History,
  Home,
  Hourglass,
  Kanban,
  LogOut,
  Megaphone,
  Presentation,
  Search,
  ShieldCheck,
  Table2,
  Upload,
  UserPen,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import bundledSeedData from '@/src/data/kishi-data.json';
import {
  CampaignSetupModal,
  WavePlanModal,
} from '@/src/components/CampaignModals';
import { CampaignsModule } from '@/src/components/CampaignsModule';
import { ChatDotModule } from '@/src/components/ChatDotModule';
import { FoldersModule } from '@/src/components/FoldersModule';
import { HistoryModule } from '@/src/components/HistoryModule';
import { KanbanModule } from '@/src/components/KanbanModule';
import { AntTrailOverlay, triggerAntScurry } from '@/src/components/AntTrailOverlay';
import {
  ChatDotAntSvg,
  KishiLogoSvg,
  RealisticMicroAntSvg,
  SumerianGlyphWhisper,
} from '@/src/components/KishiIcons';
import {
  ChannelModal,
  ConfirmModal,
  HoursSettingsModal,
  PortalModal,
  ProfileModal,
  PromptModal,
  SheetLinkModal,
  TaskModal,
  TempoSettingsModal,
} from '@/src/components/Modals';
import { LoginScreen } from '@/src/components/LoginScreen';
import { OverviewModule } from '@/src/components/OverviewModule';
import { PrivacySecurityModal } from '@/src/components/PrivacySecurityModal';
import { OfflineIndicator } from '@/src/components/PWAInstallButton';
import {
  createWorkspaceDoc,
  reloadCurrentUser,
  resendVerificationEmail,
  sendResetPassword,
  signInWithEmail,
  signOutFirebase,
  subscribeToAuth,
  subscribeWorkspaceDoc,
  updateWorkspaceDoc,
} from '@/src/services/firebaseSync';
import { DEFAULT_TIME_RULES } from '@/src/utils/timeEstimator';
import {
  clearSensitiveLocalCaches,
  deleteUploadedSheetFile,
  fetchKishiState,
  getFormattedDateHeader,
  getFormattedTimeNow,
  getFormattedToday,
  inspectGoogleResourceLink,
  normalizeKishiState,
  persistKishiState,
  syncGoogleSheetUrl,
  uploadSheetFile,
} from '@/src/services/kishiApi';
import type {
  ChannelType,
  FolderKey,
  FolderTab,
  KishiActiveCampaign,
  KishiChannel,
  KishiPortal,
  KishiSheet,
  KishiState,
  KishiTask,
  KishiTimeBank,
  KishiUser,
  KishiWavePlan,
  ProductType,
  RouteId,
  SheetResourceKind,
  TaskFrequency,
  TaskStatus,
  WaveStatus,
} from '@/src/types/kishi';
import {
  detectResourceKind,
  getResourceKindMeta,
} from '@/src/utils/resourceKind';
import {
  getWavesContentDigest,
  mergeParsedWaves,
  parseDelimitedSheetText,
  syncWavesFromSheet,
  type ParsedSheetRow,
} from '@/src/utils/sheetParser';
import {
  getBrasiliaTodayISO,
  getWaveDueState,
  isMonthlyDayMatch,
  isTaskDueToday,
} from '@/src/utils/taskSchedule';
import {
  hashNormalizedCsv,
  isGoogleSheetsUrl,
} from '@/src/utils/urlDuplicates';
import { getBrasiliaTimeParts } from '@/src/utils/workHours';

const VALID_ROUTES: RouteId[] = [
  'visao-geral',
  'campanhas',
  'pastas-99',
  'kanban',
  'historico',
  'chatbot',
];

function getInitialRoute(): RouteId {
  const hash = window.location.hash.replace('#', '') as RouteId;
  return VALID_ROUTES.includes(hash) ? hash : 'visao-geral';
}

export default function App() {
  const [state, setState] = useState<KishiState>(() =>
    normalizeKishiState(bundledSeedData as KishiState),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteId>(getInitialRoute);
  const [activeFolderTab, setActiveFolderTab] = useState<FolderTab>('overview');
  const [dateHeader, setDateHeader] = useState<string>(getFormattedDateHeader);

  // Search, Alerts & Profile dropdowns
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);
  const [sheetAlerts, setSheetAlerts] = useState<
    Array<{
      id: string;
      title: string;
      kind: 'campaign' | 'channel';
      timeFormatted: string;
      unread: boolean;
    }>
  >([]);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kishi_autolock_v1') === 'true';
    } catch {
      return false;
    }
  });
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchBoxRef = useRef<HTMLDivElement | null>(null);
  const profileBoxRef = useRef<HTMLDivElement | null>(null);
  const alertsBoxRef = useRef<HTMLDivElement | null>(null);
  const alertedDueWavesRef = useRef<Set<string>>(new Set());

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KishiTask | null>(null);
  const [taskDefaultProduct, setTaskDefaultProduct] = useState<ProductType>('99 Rides');

  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [channelModalFolder, setChannelModalFolder] = useState<FolderKey>('rides');
  const [channelModalDefaultType, setChannelModalDefaultType] = useState<'Interno' | 'Externo'>(
    'Externo',
  );
  const [editingChannel, setEditingChannel] = useState<{
    listKey: 'internos' | 'externos';
    index: number;
    channel: KishiChannel;
  } | null>(null);

  const [sheetLinkModalOpen, setSheetLinkModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<KishiSheet | null>(null);
  const [sheetDefaultCategory, setSheetDefaultCategory] = useState('99');
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<KishiPortal | null>(null);
  const [portalDefaultCategory, setPortalDefaultCategory] = useState('99');
  const [activeCampaignModalOpen, setActiveCampaignModalOpen] = useState(false);
  const [activeCampaignDefaultFront, setActiveCampaignDefaultFront] = useState<'99 Rides' | '99 Food'>('99 Food');
  const [editingActiveCampaign, setEditingActiveCampaign] = useState<KishiActiveCampaign | null>(null);
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Record<string, boolean>>({});
  const [syncingCampaignIds, setSyncingCampaignIds] = useState<Record<string, boolean>>({});
  const [waveModalState, setWaveModalState] = useState<{
    open: boolean;
    campaignId: string;
    editingWave: KishiWavePlan | null;
  }>({ open: false, campaignId: '', editingWave: null });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [tempoModalOpen, setTempoModalOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [promptDialog, setPromptDialog] = useState<{
    open: boolean;
    title: string;
    label: string;
    placeholder: string;
    onConfirm: ((value: string) => void) | null;
  }>({
    open: false,
    title: '',
    label: '',
    placeholder: '',
    onConfirm: null,
  });

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2600);
  }, []);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [cloudSyncedOnce, setCloudSyncedOnce] = useState(false);
  const authUserRef = useRef<User | null>(null);
  const cloudDocReadyRef = useRef(false);
  const lastCloudHashRef = useRef('');

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  const lastAutoSyncAtRef = useRef<number>(0);
  const lastChannelPollAtRef = useRef<number>(0);
  const lastSheetMetaPollAtRef = useRef<number>(0);
  const syncInFlightRef = useRef(false);
  const lastCsvSnapshotRef = useRef<Record<string, string>>({});
  const lastAlertedDigestRef = useRef<Record<string, string>>({});
  const inMemoryChannelHashRef = useRef<Record<string, string>>({});

  const pushUniqueSheetAlert = useCallback(
    (
      title: string,
      kind: 'campaign' | 'channel',
      timeFormatted: string,
      unread: boolean,
    ) => {
      setSheetAlerts((prev) => {
        const filtered = prev.filter(
          (a) => !(a.kind === kind && a.title.toLowerCase() === title.toLowerCase()),
        );
        return [
          {
            id: `${kind}_alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title,
            kind,
            timeFormatted,
            unread,
          },
          ...filtered,
        ].slice(0, 20);
      });
    },
    [],
  );

  const commitState = useCallback(
    (updater: (prev: KishiState) => KishiState) => {
      setState((prev) => {
        const next = updater(prev);
        const currentUid = authUserRef.current?.uid;
        if (currentUid && authUserRef.current?.emailVerified) {
          void persistKishiState(next, currentUid);
        }
        if (currentUid && authUserRef.current?.emailVerified && cloudDocReadyRef.current) {
          try {
            lastCloudHashRef.current = JSON.stringify(normalizeKishiState(next));
          } catch {
            // ignore hash stringify edge cases
          }
          void updateWorkspaceDoc(currentUid, next).catch((err) => {
            console.error('Erro ao sincronizar alteração na nuvem:', err);
          });
        }
        return next;
      });
    },
    [],
  );

  // Apply day rollover when midnight passes (including Diária, Mensal e datas agendadas)
  const applyDayRollover = useCallback(
    (current: KishiState): { next: KishiState; rolledOver: boolean } => {
      const brt = getBrasiliaTimeParts();
      const currentToday = brt.formattedDate;
      if (current.lastDateStr === currentToday) {
        return { next: current, rolledOver: false };
      }

      const todayISO = getBrasiliaTodayISO();

      const nextTasks = current.tasks.map((t) => {
        if (t.frequency === 'Diária') {
          return {
            ...t,
            status: t.status === 'concluido' ? ('afazer' as TaskStatus) : t.status,
            completedAt: t.status === 'concluido' ? null : t.completedAt,
            dateStr: currentToday,
          };
        }

        if (t.frequency === 'Mensal' && t.monthlyDay) {
          const matchesToday = isMonthlyDayMatch(t.monthlyDay, brt.year, brt.month, brt.day);
          if (matchesToday) {
            return {
              ...t,
              status:
                t.status === 'rotina' || t.status === 'concluido'
                  ? ('afazer' as TaskStatus)
                  : t.status,
              completedAt: null,
              dateStr: currentToday,
            };
          }
          if (t.status === 'concluido') {
            return {
              ...t,
              status: 'rotina' as TaskStatus,
              completedAt: null,
              dateStr: currentToday,
            };
          }
          return { ...t, dateStr: currentToday };
        }

        if (t.scheduledDate && t.status === 'rotina' && todayISO >= t.scheduledDate) {
          return {
            ...t,
            status: 'afazer' as TaskStatus,
            completedAt: null,
            dateStr: currentToday,
          };
        }

        if (t.status !== 'concluido') {
          return { ...t, dateStr: currentToday };
        }
        return t;
      });

      const resetCommon = (items: KishiState['channels']['rides']['common']) =>
        items.map((item) => ({ ...item, done: false }));

      return {
        rolledOver: true,
        next: {
          ...current,
          lastDateStr: currentToday,
          tasks: nextTasks,
          channels: {
            rides: {
              ...current.channels.rides,
              common: resetCommon(current.channels.rides.common),
            },
            food: {
              ...current.channels.food,
              common: resetCommon(current.channels.food.common),
            },
          },
        },
      };
    },
    [],
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setAuthUser(user);
      setEmailVerified(Boolean(user?.emailVerified));
      setAuthReady(true);
      if (!user || !user.emailVerified) {
        cloudDocReadyRef.current = false;
        setCloudSyncedOnce(false);
        lastCloudHashRef.current = '';
        lastCsvSnapshotRef.current = {};
        lastAlertedDigestRef.current = {};
        setSheetAlerts([]);
        setState(normalizeKishiState(bundledSeedData as KishiState));
        if (!user) {
          clearSensitiveLocalCaches();
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // Load UID-scoped offline cache ONLY when authenticated & verified (LGPD protection)
  useEffect(() => {
    if (!authReady) return;
    if (!authUser || !emailVerified) {
      setIsLoaded(true);
      return;
    }

    let mounted = true;
    fetchKishiState(authUser.uid).then(({ state: loaded }) => {
      if (!mounted) return;
      const { next, rolledOver } = applyDayRollover(loaded);
      setState(next);
      setIsLoaded(true);
      if (rolledOver) {
        void persistKishiState(next, authUser.uid);
        showToast('Novo dia iniciado! Tarefas diárias atualizadas.');
      }
    });
    return () => {
      mounted = false;
    };
  }, [authReady, authUser, emailVerified, applyDayRollover, showToast]);

  // Real-time Firestore cross-device sync (PC <-> Mobile in the same second)
  useEffect(() => {
    if (!authReady || !authUser || !emailVerified || !isLoaded) return;

    const unsubDoc = subscribeWorkspaceDoc(authUser.uid, {
      onRemoteData: (remoteState, hasPendingWrites) => {
        cloudDocReadyRef.current = true;
        setCloudSyncedOnce(true);
        const { next, rolledOver } = applyDayRollover(remoteState);
        let nextHash = '';
        try {
          nextHash = JSON.stringify(normalizeKishiState(next));
        } catch {
          nextHash = String(Date.now());
        }
        if (nextHash !== lastCloudHashRef.current) {
          lastCloudHashRef.current = nextHash;
          setState(next);
          void persistKishiState(next, authUser.uid);
          if (rolledOver && !hasPendingWrites) {
            void updateWorkspaceDoc(authUser.uid, next).catch((err) => {
              console.error('Erro ao salvar virada de dia na nuvem:', err);
            });
          }
        }
      },
      onMissingDoc: () => {
        void createWorkspaceDoc(authUser.uid, stateRef.current)
          .then(() => {
            cloudDocReadyRef.current = true;
            setCloudSyncedOnce(true);
          })
          .catch((err) => {
            console.error('Erro ao criar workspace inicial na nuvem:', err);
          });
      },
      onError: (err) => {
        console.error('Erro na sincronização em tempo real:', err);
      },
    });

    return () => {
      unsubDoc();
    };
  }, [authReady, authUser, emailVerified, isLoaded, applyDayRollover]);

  async function handleEmailSignIn(email: string, password: string) {
    const loggedUser = await signInWithEmail(email, password);
    setAuthUser(loggedUser);
    setEmailVerified(Boolean(loggedUser.emailVerified));
    if (loggedUser.emailVerified) {
      showToast('Acesso liberado! Sincronização automática ativada.');
    }
  }

  async function handleCheckVerification() {
    const refreshed = await reloadCurrentUser();
    if (refreshed) {
      setAuthUser(refreshed);
      setEmailVerified(Boolean(refreshed.emailVerified));
      if (refreshed.emailVerified) {
        showToast('E-mail confirmado! Sincronização automática ativada.');
      } else {
        throw new Error('not-verified-yet');
      }
    }
  }

  async function handleResendVerification() {
    if (!authUser) return;
    await resendVerificationEmail(authUser);
  }

  const handleDisconnectCloud = useCallback(async () => {
    const uid = authUserRef.current?.uid;
    try {
      clearSensitiveLocalCaches(uid);
      setProfileMenuOpen(false);
      setPrivacyModalOpen(false);
      setSheetAlerts([]);
      lastCsvSnapshotRef.current = {};
      lastAlertedDigestRef.current = {};
      lastCloudHashRef.current = '';
      setState(normalizeKishiState(bundledSeedData as KishiState));
      await signOutFirebase();
      showToast('Sessão encerrada e dados locais limpos.');
    } catch {
      showToast('Erro ao sair da conta.');
    }
  }, [showToast]);

  // Opt-in LGPD Auto-Lock after 30 minutes of inactivity
  useEffect(() => {
    if (!autoLockEnabled || !authUser || !emailVerified) return;

    const INACTIVITY_MS = 30 * 60 * 1000;
    let timerId = window.setTimeout(() => {
      void handleDisconnectCloud();
    }, INACTIVITY_MS);

    const resetTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        void handleDisconnectCloud();
      }, INACTIVITY_MS);
    };

    window.addEventListener('pointerdown', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer, { passive: true });
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [autoLockEnabled, authUser, emailVerified, handleDisconnectCloud]);

  // Periodic day rollover & date header check
  useEffect(() => {
    if (!isLoaded) return;
    const checkRollover = () => {
      setDateHeader(getFormattedDateHeader());
      setState((prev) => {
        const { next, rolledOver } = applyDayRollover(prev);
        if (rolledOver) {
          void persistKishiState(next, authUserRef.current?.uid);
          showToast('Novo dia iniciado! Tarefas diárias atualizadas.');
          return next;
        }
        return prev;
      });
    };

    const interval = window.setInterval(checkRollover, 30000);
    window.addEventListener('focus', checkRollover);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkRollover);
    };
  }, [isLoaded, applyDayRollover, showToast]);

  // Real-time / automatic sync for campaigns linked to open Google Sheets
  const syncCampaignById = useCallback(
    async (campaignId: string, silent: boolean): Promise<boolean> => {
      const target = stateRef.current.activeCampaigns.find((c) => c.id === campaignId);
      if (!target?.sheetUrl) return false;

      if (!silent) {
        setSyncingCampaignIds((prev) => ({ ...prev, [campaignId]: true }));
      }

      const res = await syncGoogleSheetUrl(target.sheetUrl);

      if (!silent) {
        setSyncingCampaignIds((prev) => ({ ...prev, [campaignId]: false }));
      }

      if (!res.ok || !res.csv) {
        if (!silent) {
          showToast(res.error || `Não foi possível sincronizar "${target.name}".`);
        }
        return false;
      }

      const normalizedCsv = res.csv.replace(/\r\n/g, '\n').trim();
      const latestCamp = stateRef.current.activeCampaigns.find((c) => c.id === campaignId);
      if (!latestCamp) return false;

      const nextDocTitle = res.docTitle?.trim();
      const docTitleChanged = Boolean(
        nextDocTitle && latestCamp.lastSheetTitle && nextDocTitle !== latestCamp.lastSheetTitle,
      );
      const needsBaselineTitle = Boolean(nextDocTitle && !latestCamp.lastSheetTitle);

      if (
        silent &&
        lastCsvSnapshotRef.current[campaignId] === normalizedCsv &&
        !docTitleChanged &&
        !needsBaselineTitle
      ) {
        return false;
      }

      const parsedRows = parseDelimitedSheetText(normalizedCsv);
      if (parsedRows.length === 0) {
        if (!silent) {
          showToast(`Nenhuma linha encontrada na aba de "${target.name}".`);
        }
        return false;
      }

      const nextWaves = syncWavesFromSheet(latestCamp.waves, parsedRows);
      const prevDigest = getWavesContentDigest(latestCamp.waves);
      const nextDigest = getWavesContentDigest(nextWaves);
      const wavesChanged = prevDigest !== nextDigest;

      lastCsvSnapshotRef.current[campaignId] = normalizedCsv;

      if (!wavesChanged && !docTitleChanged && !needsBaselineTitle) {
        lastAlertedDigestRef.current[campaignId] = nextDigest;
        if (silent) {
          return false;
        }
        showToast(`"${latestCamp.name}" já está atualizada (${parsedRows.length} planos).`);
        return false;
      }

      const shouldAlert =
        (wavesChanged && lastAlertedDigestRef.current[campaignId] !== nextDigest) ||
        docTitleChanged;
      lastAlertedDigestRef.current[campaignId] = nextDigest;

      const timeNow = getFormattedTimeNow();
      const syncStamp = `${getFormattedToday()} às ${timeNow}`;
      const nextName = docTitleChanged && nextDocTitle ? nextDocTitle : latestCamp.name;
      const nextFront =
        docTitleChanged &&
        (res.detectedCategory === '99 Food' || res.detectedCategory === '99 Rides')
          ? res.detectedCategory
          : latestCamp.front;

      const todayISO = getBrasiliaTodayISO();
      const todayBR = getFormattedToday();

      setState((prev) => {
        const currentCamp = prev.activeCampaigns.find((c) => c.id === campaignId);
        if (!currentCamp) return prev;
        const freshNextWaves = syncWavesFromSheet(currentCamp.waves, parsedRows);

        const resolvedFront: '99 Rides' | '99 Food' =
          docTitleChanged &&
          (res.detectedCategory === '99 Food' || res.detectedCategory === '99 Rides')
            ? res.detectedCategory
            : currentCamp.front;
        const resolvedCampName =
          docTitleChanged && nextDocTitle ? nextDocTitle : currentCamp.name;

        let nextTasks = prev.tasks;
        if (currentCamp.waves.length > 0) {
          const newlyAddedPending = freshNextWaves.filter(
            (w) =>
              w.status === 'nao_extraido' &&
              !currentCamp.waves.some(
                (old) =>
                  old.id === w.id ||
                  old.planTitle.trim().toLowerCase() === w.planTitle.trim().toLowerCase(),
              ),
          );

          for (const wave of newlyAddedPending) {
            const existsOpen = nextTasks.some(
              (t) =>
                t.status !== 'concluido' &&
                t.title.toLowerCase().includes(wave.planTitle.trim().toLowerCase()),
            );
            if (!existsOpen) {
              const autoWaveTask: KishiTask = {
                id: `TK-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                product: resolvedFront,
                subBrand: resolvedFront === '99 Rides' ? 'PAX' : 'B-Side',
                channelType: 'Interno',
                channelName: resolvedCampName,
                title: `Extrair wave: ${wave.planTitle}`,
                status: 'afazer',
                frequency: 'Pontual',
                scheduledDate: todayISO,
                completedAt: null,
                dateStr: todayBR,
              };
              nextTasks = [autoWaveTask, ...nextTasks];
            }
          }
        }

        const nextState: KishiState = {
          ...prev,
          activeCampaigns: prev.activeCampaigns.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  name: resolvedCampName,
                  front: resolvedFront,
                  lastSheetTitle: nextDocTitle || c.lastSheetTitle,
                  waves: freshNextWaves,
                  lastSyncedAt:
                    wavesChanged || docTitleChanged ? syncStamp : c.lastSyncedAt || syncStamp,
                }
              : c,
          ),
          tasks: nextTasks,
        };
        const currentUid = authUserRef.current?.uid;
        void persistKishiState(nextState, currentUid);
        if (currentUid && authUserRef.current?.emailVerified && cloudDocReadyRef.current) {
          try {
            lastCloudHashRef.current = JSON.stringify(normalizeKishiState(nextState));
          } catch {
            // ignore
          }
          void updateWorkspaceDoc(currentUid, nextState).catch((err) => {
            console.error('Erro ao salvar sincronização da planilha na nuvem:', err);
          });
        }
        return nextState;
      });

      if (shouldAlert) {
        pushUniqueSheetAlert(nextName, 'campaign', timeNow, silent);
      }

      if (!silent) {
        showToast(
          wavesChanged || docTitleChanged
            ? `"${nextName}" atualizada!`
            : `"${nextName}" já está atualizada (${parsedRows.length} planos).`,
        );
      }

      return wavesChanged || docTitleChanged;
    },
    [pushUniqueSheetAlert, showToast],
  );

  // Silent internal sheet monitoring for channels (UOL, Logan, etc.)
  const syncMonitoredChannels = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastChannelPollAtRef.current < 120_000) {
        return;
      }
      lastChannelPollAtRef.current = now;

      const current = stateRef.current;
      const folders: FolderKey[] = ['rides', 'food'];
      const listKeys: Array<'internos' | 'externos'> = ['internos', 'externos'];

      const targets: Array<{
        folder: FolderKey;
        listKey: 'internos' | 'externos';
        index: number;
        channel: KishiChannel;
        sheetUrl: string;
      }> = [];

      for (const folder of folders) {
        for (const listKey of listKeys) {
          current.channels[folder][listKey].forEach((ch, idx) => {
            if (!ch.watchChanges) return;
            const targetUrl = (ch.monitorSheetUrl || ch.url || '').trim();
            if (isGoogleSheetsUrl(targetUrl)) {
              targets.push({
                folder,
                listKey,
                index: idx,
                channel: ch,
                sheetUrl: targetUrl,
              });
            }
          });
        }
      }

      if (targets.length === 0) return;

      for (const target of targets) {
        const res = await syncGoogleSheetUrl(target.sheetUrl);
        if (!res.ok || !res.csv) continue;

        const nextHash = await hashNormalizedCsv(res.csv);
        const latestChannel =
          stateRef.current.channels[target.folder][target.listKey][target.index];
        if (!latestChannel || latestChannel.name !== target.channel.name) continue;

        const cacheKey = `${target.folder}:${target.listKey}:${target.channel.name.toLowerCase()}`;
        const prevHash = inMemoryChannelHashRef.current[cacheKey] || latestChannel.lastCsvHash;
        if (prevHash === nextHash) {
          inMemoryChannelHashRef.current[cacheKey] = nextHash;
          continue;
        }

        inMemoryChannelHashRef.current[cacheKey] = nextHash;
        const timeNow = getFormattedTimeNow();
        const todayBR = getFormattedToday();
        const todayISO = getBrasiliaTodayISO();
        const syncStamp = `${todayBR} às ${timeNow}`;
        const isInitialBaseline = !prevHash;

        setState((prev) => {
          const list = prev.channels[target.folder][target.listKey];
          const chItem = list[target.index];
          if (!chItem || chItem.name !== target.channel.name) return prev;

          const nextList = list.map((item, idx) =>
            idx === target.index
              ? { ...item, lastCsvHash: nextHash, lastSyncedAt: syncStamp }
              : item,
          );

          let nextTasks = prev.tasks;
          if (!isInitialBaseline) {
            const expectedTitle = `Plano atualizado: ${chItem.name}`;
            const alreadyPendingToday = prev.tasks.some(
              (t) =>
                t.status !== 'concluido' &&
                t.channelName.toLowerCase() === chItem.name.toLowerCase() &&
                (t.title === expectedTitle ||
                  t.title.startsWith('Plano atualizado:') ||
                  t.title.startsWith('Conferir plano atualizado:')),
            );
            if (!alreadyPendingToday) {
              const autoTask: KishiTask = {
                id: `TK-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                product: target.folder === 'food' ? '99 Food' : '99 Rides',
                subBrand: '',
                channelType: chItem.type,
                channelName: chItem.name,
                title: expectedTitle,
                status: 'afazer',
                frequency: 'Pontual',
                scheduledDate: todayISO,
                completedAt: null,
                dateStr: todayBR,
              };
              nextTasks = [autoTask, ...prev.tasks];
            }
          }

          const nextState: KishiState = {
            ...prev,
            channels: {
              ...prev.channels,
              [target.folder]: {
                ...prev.channels[target.folder],
                [target.listKey]: nextList,
              },
            },
            tasks: nextTasks,
          };

          const currentUid = authUserRef.current?.uid;
          void persistKishiState(nextState, currentUid);
          if (currentUid && authUserRef.current?.emailVerified && cloudDocReadyRef.current) {
            try {
              lastCloudHashRef.current = JSON.stringify(normalizeKishiState(nextState));
            } catch {
              // ignore
            }
            void updateWorkspaceDoc(currentUid, nextState).catch((err) => {
              console.error('Erro ao salvar atualização de canal na nuvem:', err);
            });
          }
          return nextState;
        });

        if (!isInitialBaseline) {
          pushUniqueSheetAlert(latestChannel.name, 'channel', timeNow, true);
        }
      }
    },
    [pushUniqueSheetAlert],
  );

  const syncMonitoredSheets = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastSheetMetaPollAtRef.current < 120_000) {
        return;
      }
      lastSheetMetaPollAtRef.current = now;

      const monitored = stateRef.current.sheets.filter(
        (sh) =>
          sh.type === 'link' &&
          sh.autoSyncMeta !== false &&
          (sh.url.startsWith('https://docs.google.com/') ||
            sh.url.startsWith('https://drive.google.com/')),
      );
      if (monitored.length === 0) return;

      for (const sheet of monitored) {
        let fetchedTitle: string | undefined;
        let fetchedCategory: '99' | '99 Rides' | '99 Food' | undefined;
        let fetchedKind = detectResourceKind(sheet.url, sheet.type, sheet.resourceKind);

        if (isGoogleSheetsUrl(sheet.url)) {
          const res = await syncGoogleSheetUrl(sheet.url);
          if (!res.ok) continue;
          fetchedTitle = res.docTitle?.trim();
          fetchedCategory = res.detectedCategory;
          fetchedKind = 'planilha';
        } else {
          const meta = await inspectGoogleResourceLink(sheet.url);
          fetchedTitle = meta.title?.trim();
          fetchedCategory = meta.category;
          fetchedKind = meta.resourceKind;
        }

        if (!fetchedTitle && !fetchedCategory) continue;

        const latestSheet = stateRef.current.sheets.find((s) => s.id === sheet.id);
        if (!latestSheet) continue;

        const isInitialBaseline = !latestSheet.lastSheetTitle && Boolean(fetchedTitle);
        const titleChanged = Boolean(
          fetchedTitle && latestSheet.lastSheetTitle && fetchedTitle !== latestSheet.lastSheetTitle,
        );
        const categoryChanged = Boolean(
          fetchedCategory &&
            fetchedCategory !== latestSheet.category &&
            (titleChanged ||
              (latestSheet.category === '99' &&
                (fetchedCategory === '99 Food' || fetchedCategory === '99 Rides'))),
        );
        const kindChanged = fetchedKind !== (latestSheet.resourceKind || 'planilha');

        if (!isInitialBaseline && !titleChanged && !categoryChanged && !kindChanged) {
          continue;
        }

        const timeNow = getFormattedTimeNow();
        const syncStamp = `${getFormattedToday()} às ${timeNow}`;
        const finalName = titleChanged && fetchedTitle ? fetchedTitle : latestSheet.name;
        const finalCategory =
          categoryChanged && fetchedCategory ? fetchedCategory : latestSheet.category;

        setState((prev) => {
          const currentSheet = prev.sheets.find((s) => s.id === sheet.id);
          if (!currentSheet) return prev;
          const nextState: KishiState = {
            ...prev,
            sheets: prev.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    name: titleChanged && fetchedTitle ? fetchedTitle : s.name,
                    category: categoryChanged && fetchedCategory ? fetchedCategory : s.category,
                    resourceKind: fetchedKind,
                    note: getResourceKindMeta(fetchedKind).label,
                    lastSheetTitle: fetchedTitle || s.lastSheetTitle,
                    lastSyncedAt: syncStamp,
                  }
                : s,
            ),
          };
          const currentUid = authUserRef.current?.uid;
          void persistKishiState(nextState, currentUid);
          if (currentUid && authUserRef.current?.emailVerified && cloudDocReadyRef.current) {
            try {
              lastCloudHashRef.current = JSON.stringify(normalizeKishiState(nextState));
            } catch {
              // ignore
            }
            void updateWorkspaceDoc(currentUid, nextState).catch((err) => {
              console.error('Erro ao salvar atualização de arquivo na nuvem:', err);
            });
          }
          return nextState;
        });

        if (titleChanged || categoryChanged) {
          pushUniqueSheetAlert(
            `${finalName}${categoryChanged ? ` (${finalCategory})` : ''}`,
            'campaign',
            timeNow,
            true,
          );
        }
      }
    },
    [pushUniqueSheetAlert],
  );

  const syncAllLinkedCampaigns = useCallback(
    async (silent: boolean) => {
      if (syncInFlightRef.current) return;
      const linked = stateRef.current.activeCampaigns.filter(
        (c) => Boolean(c.sheetUrl) && (!silent || c.autoSync !== false),
      );
      const hasWatchedChannels =
        silent &&
        (['rides', 'food'] as const).some((folder) =>
          (['internos', 'externos'] as const).some((listKey) =>
            stateRef.current.channels[folder][listKey].some((ch) => Boolean(ch.watchChanges)),
          ),
        );
      const hasAutoMetaSheets =
        silent &&
        stateRef.current.sheets.some(
          (sh) =>
            sh.type === 'link' &&
            sh.autoSyncMeta !== false &&
            (sh.url.startsWith('https://docs.google.com/') ||
              sh.url.startsWith('https://drive.google.com/')),
        );

      if (linked.length === 0 && !hasWatchedChannels && !hasAutoMetaSheets) return;

      syncInFlightRef.current = true;
      lastAutoSyncAtRef.current = Date.now();
      try {
        for (const camp of linked) {
          await syncCampaignById(camp.id, silent);
        }
        if (hasWatchedChannels) {
          await syncMonitoredChannels();
        }
        if (hasAutoMetaSheets) {
          await syncMonitoredSheets();
        }
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [syncCampaignById, syncMonitoredChannels, syncMonitoredSheets],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (authUser && emailVerified && !cloudSyncedOnce) return;

    // Initial background sync once workspace state is ready
    void syncAllLinkedCampaigns(true);

    // Sync automatically whenever user returns to this browser tab after editing Google Sheets
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastAutoSyncAtRef.current < 8000) return;
      void syncAllLinkedCampaigns(true);
    };

    // Background polling every 25s while tab is visible
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncAllLinkedCampaigns(true);
      }
    }, 25000);

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [isLoaded, authUser, emailVerified, cloudSyncedOnce, syncAllLinkedCampaigns]);

  // Hash navigation listener
  useEffect(() => {
    const onHashChange = () => {
      setActiveRoute(getInitialRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Check for pending waves due today or overdue once per wave per session
  useEffect(() => {
    if (!isLoaded) return;
    const timeNow = getFormattedTimeNow();
    for (const camp of state.activeCampaigns) {
      for (const wave of camp.waves) {
        if (wave.status !== 'nao_extraido') continue;
        const dueState = getWaveDueState(wave.startDate, wave.endDate, wave.status);
        if (dueState === 'normal') continue;
        const key = `${camp.id}:${wave.id}:${dueState}`;
        if (alertedDueWavesRef.current.has(key)) continue;
        alertedDueWavesRef.current.add(key);
        pushUniqueSheetAlert(
          `${camp.name} · ${wave.planTitle} (${dueState === 'overdue' ? 'Atrasado' : 'Vence hoje'})`,
          'campaign',
          timeNow,
          true,
        );
      }
    }
  }, [isLoaded, state.activeCampaigns, pushUniqueSheetAlert]);

  // Outside click to close search & profile menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktopSearch = searchBoxRef.current?.contains(target) ?? false;
      const insideMobileSearch = mobileSearchBoxRef.current?.contains(target) ?? false;
      if (!insideDesktopSearch && !insideMobileSearch) {
        setSearchQuery('');
      }
      if (profileBoxRef.current && !profileBoxRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (alertsBoxRef.current && !alertsBoxRef.current.contains(target)) {
        setAlertsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigate = useCallback((route: RouteId) => {
    setActiveRoute(route);
    window.location.hash = `#${route}`;
  }, []);

  // Metrics
  const todayStr = getFormattedToday();
  const remainingCount = state.tasks.filter((t) => isTaskDueToday(t)).length;
  const doneTodayCount = state.history.filter((h) => h.dateStr === todayStr).length;
  const totalToday = remainingCount + doneTodayCount;
  const progressPct = totalToday > 0 ? Math.round((doneTodayCount / totalToday) * 100) : 0;

  // Global search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const tasks = state.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.channelName && t.channelName.toLowerCase().includes(q)) ||
        t.product.toLowerCase().includes(q),
    );
    const portals = state.portals.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.kind.toLowerCase().includes(q),
    );
    const sheets = state.sheets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
    );
    const channels: Array<{ folder: FolderKey; channel: KishiChannel }> = [
      ...state.channels.rides.internos.map((channel) => ({ folder: 'rides' as FolderKey, channel })),
      ...state.channels.rides.externos.map((channel) => ({ folder: 'rides' as FolderKey, channel })),
      ...state.channels.food.internos.map((channel) => ({ folder: 'food' as FolderKey, channel })),
      ...state.channels.food.externos.map((channel) => ({ folder: 'food' as FolderKey, channel })),
    ].filter((entry) => entry.channel.name.toLowerCase().includes(q));

    const activeCampaigns = state.activeCampaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.waves.some(
          (w) =>
            w.waveName.toLowerCase().includes(q) || w.planTitle.toLowerCase().includes(q),
        ) ||
        c.todos.some((t) => t.text.toLowerCase().includes(q)),
    );

    return { tasks, portals, sheets, channels, activeCampaigns };
  }, [searchQuery, state]);

  // Task handlers
  function handleSaveTask(payload: {
    id?: string;
    product: ProductType;
    subBrand: string;
    channelType: ChannelType;
    channelName: string;
    title: string;
    status: TaskStatus;
    frequency: TaskFrequency;
    scheduledDate?: string;
    monthlyDay?: number;
    tag?: string;
    estimatedMinutes?: number;
  }) {
    const nowTime = getFormattedTimeNow();
    const today = getFormattedToday();
    const cleanChannelName = payload.channelType === 'Nenhum' ? '' : payload.channelName;

    if (payload.id) {
      commitState((prev) => {
        const prevTask = prev.tasks.find((t) => t.id === payload.id);
        const becameCompleted =
          payload.status === 'concluido' && prevTask?.status !== 'concluido';

        const updatedTasks = prev.tasks.map((t) =>
          t.id === payload.id
            ? {
                ...t,
                product: payload.product,
                subBrand: payload.subBrand,
                channelType: payload.channelType,
                channelName: cleanChannelName,
                title: payload.title,
                status: payload.status,
                frequency: payload.frequency,
                scheduledDate: payload.scheduledDate,
                monthlyDay: payload.monthlyDay,
                tag: payload.tag,
                estimatedMinutes: payload.estimatedMinutes,
                completedAt:
                  payload.status === 'concluido' ? t.completedAt || nowTime : null,
              }
            : t,
        );

        const nextHistory = becameCompleted
          ? [
              {
                id: `HIST-${Date.now()}`,
                taskId: payload.id,
                dateStr: today,
                title: payload.title,
                product: payload.product,
                subBrand: payload.subBrand,
                channelType: payload.channelType,
                channelName: cleanChannelName || 'Geral',
                frequency: payload.frequency,
                time: nowTime,
              },
              ...prev.history,
            ]
          : prev.history;

        return { ...prev, tasks: updatedTasks, history: nextHistory };
      });
      showToast('Tarefa atualizada!');
    } else {
      const newTask: KishiTask = {
        id: `TK-${Date.now()}`,
        product: payload.product,
        subBrand: payload.subBrand,
        channelType: payload.channelType,
        channelName: cleanChannelName,
        title: payload.title,
        status: payload.status,
        frequency: payload.frequency,
        scheduledDate: payload.scheduledDate,
        monthlyDay: payload.monthlyDay,
        tag: payload.tag,
        estimatedMinutes: payload.estimatedMinutes,
        completedAt: payload.status === 'concluido' ? nowTime : null,
        dateStr: today,
      };

      commitState((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
        history:
          payload.status === 'concluido'
            ? [
                {
                  id: `HIST-${Date.now()}`,
                  taskId: newTask.id,
                  dateStr: today,
                  title: payload.title,
                  product: payload.product,
                  subBrand: payload.subBrand,
                  channelType: payload.channelType,
                  channelName: cleanChannelName || 'Geral',
                  frequency: payload.frequency,
                  time: nowTime,
                },
                ...prev.history,
              ]
            : prev.history,
      }));
      showToast('Nova tarefa salva!');
    }

    setTaskModalOpen(false);
    setEditingTask(null);
  }

  function markChannelVerifiedFromTask(
    prevChannels: KishiState['channels'],
    taskTitle: string,
    channelName: string,
    stamp: string,
  ): { nextChannels: KishiState['channels']; matchedChannelName: string | null } {
    const cleanTitle = taskTitle.trim().toLowerCase();
    const isAutoCheckTask =
      cleanTitle.startsWith('plano atualizado:') ||
      cleanTitle.startsWith('conferir plano atualizado:');
    if (!isAutoCheckTask || !channelName.trim()) {
      return { nextChannels: prevChannels, matchedChannelName: null };
    }

    const targetLower = channelName.trim().toLowerCase();
    let matchedName: string | null = null;

    const patchList = (list: KishiChannel[]) =>
      list.map((ch) => {
        if (ch.name.trim().toLowerCase() === targetLower) {
          matchedName = ch.name;
          return { ...ch, lastVerifiedAt: stamp };
        }
        return ch;
      });

    const nextChannels: KishiState['channels'] = {
      rides: {
        ...prevChannels.rides,
        internos: patchList(prevChannels.rides.internos),
        externos: patchList(prevChannels.rides.externos),
      },
      food: {
        ...prevChannels.food,
        internos: patchList(prevChannels.food.internos),
        externos: patchList(prevChannels.food.externos),
      },
    };

    return { nextChannels, matchedChannelName: matchedName };
  }

  function handleCompleteTask(taskId: string) {
    const nowTime = getFormattedTimeNow();
    const today = getFormattedToday();
    const stamp = `${today} às ${nowTime}`;
    const currentTask = stateRef.current.tasks.find((t) => t.id === taskId);

    commitState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task) return prev;

      const { nextChannels } = markChannelVerifiedFromTask(
        prev.channels,
        task.title,
        task.channelName,
        stamp,
      );

      return {
        ...prev,
        channels: nextChannels,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'concluido', completedAt: nowTime } : t,
        ),
        history: [
          {
            id: `HIST-${Date.now()}`,
            taskId: task.id,
            dateStr: today,
            title: task.title,
            product: task.product,
            subBrand: task.subBrand,
            channelType: task.channelType,
            channelName: task.channelName || 'Geral',
            frequency: task.frequency,
            time: nowTime,
          },
          ...prev.history,
        ],
      };
    });

    if (
      currentTask &&
      currentTask.channelName &&
      (currentTask.title.toLowerCase().startsWith('plano atualizado:') ||
        currentTask.title.toLowerCase().startsWith('conferir plano atualizado:'))
    ) {
      const chLower = currentTask.channelName.trim().toLowerCase();
      setSheetAlerts((alerts) =>
        alerts.map((a) =>
          a.kind === 'channel' && a.title.trim().toLowerCase() === chLower
            ? { ...a, unread: false }
            : a,
        ),
      );
      showToast(`Conferência de ${currentTask.channelName} concluída às ${nowTime}!`);
      return;
    }

    showToast(`Tarefa concluída às ${nowTime}!`);
  }

  function handleToggleTaskDone(taskId: string) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status !== 'concluido') {
      handleCompleteTask(taskId);
      return;
    }

    commitState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'afazer', completedAt: null } : t,
      ),
    }));
    showToast('Tarefa reaberta para fazer.');
  }

  function handleMoveTask(taskId: string, targetStatus: TaskStatus) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    const nowTime = getFormattedTimeNow();
    const today = getFormattedToday();
    const stamp = `${today} às ${nowTime}`;
    const becameDone = targetStatus === 'concluido';

    commitState((prev) => {
      const target = prev.tasks.find((t) => t.id === taskId);
      if (!target || target.status === targetStatus) return prev;

      const { nextChannels } = becameDone
        ? markChannelVerifiedFromTask(prev.channels, target.title, target.channelName, stamp)
        : { nextChannels: prev.channels };

      return {
        ...prev,
        channels: nextChannels,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: targetStatus,
                completedAt: becameDone ? t.completedAt || nowTime : null,
              }
            : t,
        ),
        history:
          becameDone && !target.completedAt
            ? [
                {
                  id: `HIST-${Date.now()}`,
                  taskId: target.id,
                  dateStr: today,
                  title: target.title,
                  product: target.product,
                  subBrand: target.subBrand,
                  channelType: target.channelType,
                  channelName: target.channelName || 'Geral',
                  frequency: target.frequency,
                  time: nowTime,
                },
                ...prev.history,
              ]
            : prev.history,
      };
    });

    if (
      becameDone &&
      task.channelName &&
      (task.title.toLowerCase().startsWith('plano atualizado:') ||
        task.title.toLowerCase().startsWith('conferir plano atualizado:'))
    ) {
      const chLower = task.channelName.trim().toLowerCase();
      setSheetAlerts((alerts) =>
        alerts.map((a) =>
          a.kind === 'channel' && a.title.trim().toLowerCase() === chLower
            ? { ...a, unread: false }
            : a,
        ),
      );
    }

    const statusName =
      targetStatus === 'afazer'
        ? 'A Fazer'
        : targetStatus === 'andamento'
          ? 'Em Andamento'
          : targetStatus === 'rotina'
            ? 'Rotina'
            : 'Concluído';
    showToast(`Tarefa movida para ${statusName}`);
  }

  function handleDeleteTask(taskId: string) {
    const task = state.tasks.find((t) => t.id === taskId);
    const name = task ? task.title : 'esta tarefa';
    setConfirmDialog({
      open: true,
      title: 'Excluir Tarefa',
      message: `Tem certeza que deseja apagar "${name}"? Ela também será removida do código.`,
      onConfirm: () => {
        commitState((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Tarefa excluída.');
      },
    });
  }

  // Sheets handlers
  async function handleUploadFiles(files: File[], category = '99') {
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const result = await uploadSheetFile(file);
        return {
          id: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          category,
          type: 'file' as const,
          resourceKind: detectResourceKind(file.name, 'file'),
          url: result.url,
          note: result.note,
        };
      }),
    );

    commitState((prev) => ({
      ...prev,
      sheets: [...uploaded, ...prev.sheets],
    }));
    showToast(`${files.length} arquivo(s) salvo(s) em ${category}.`);
  }

  // Portals & Apps handlers
  function handleSavePortal(payload: {
    id?: string;
    name: string;
    url: string;
    category: string;
    kind: 'Portal' | 'App';
  }) {
    if (payload.id) {
      commitState((prev) => ({
        ...prev,
        portals: prev.portals.map((p) =>
          p.id === payload.id
            ? {
                ...p,
                name: payload.name,
                url: payload.url,
                category: payload.category,
                kind: payload.kind,
              }
            : p,
        ),
      }));
      showToast('Portal / App atualizado no código!');
    } else {
      commitState((prev) => ({
        ...prev,
        portals: [
          {
            id: `pt_${Date.now()}`,
            name: payload.name,
            url: payload.url,
            category: payload.category,
            kind: payload.kind,
          },
          ...prev.portals,
        ],
      }));
      showToast('Portal / App salvo no código!');
    }
    setPortalModalOpen(false);
    setEditingPortal(null);
  }

  function handleRemovePortal(portalId: string) {
    const item = state.portals.find((p) => p.id === portalId);
    const name = item ? item.name : 'este portal';
    setConfirmDialog({
      open: true,
      title: 'Remover Portal / App',
      message: `Deseja remover "${name}" da lista e do código?`,
      onConfirm: () => {
        commitState((prev) => ({
          ...prev,
          portals: prev.portals.filter((p) => p.id !== portalId),
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Portal / App removido.');
      },
    });
  }

  function handleSaveSheetLink(payload: {
    id?: string;
    name: string;
    url: string;
    category: string;
    resourceKind: SheetResourceKind;
    color?: string;
    obs?: string;
    autoSyncMeta?: boolean;
    lastSheetTitle?: string;
  }) {
    if (payload.id) {
      commitState((prev) => ({
        ...prev,
        sheets: prev.sheets.map((s) =>
          s.id === payload.id
            ? {
                ...s,
                name: payload.name,
                url: payload.url,
                category: payload.category,
                resourceKind: payload.resourceKind,
                color: payload.color,
                obs: payload.obs,
                autoSyncMeta: payload.autoSyncMeta,
                lastSheetTitle: payload.lastSheetTitle ?? s.lastSheetTitle,
              }
            : s,
        ),
      }));
      showToast('Item atualizado!');
    } else {
      commitState((prev) => ({
        ...prev,
        sheets: [
          {
            id: `sh_${Date.now()}`,
            name: payload.name,
            category: payload.category,
            type: 'link',
            resourceKind: payload.resourceKind,
            url: payload.url,
            note: getResourceKindMeta(payload.resourceKind).label,
            color: payload.color,
            obs: payload.obs,
            autoSyncMeta: payload.autoSyncMeta,
            lastSheetTitle: payload.lastSheetTitle,
          },
          ...prev.sheets,
        ],
      }));
      showToast('Link salvo!');
    }
    setSheetLinkModalOpen(false);
    setEditingSheet(null);
  }

  function handleUpdateSheetColorLabels(nextLabels: Record<string, string>) {
    commitState((prev) => {
      const currentBank: KishiTimeBank = prev.timeBank ?? {
        workStart: '09:00',
        workEnd: '18:00',
        breakMinutes: 60,
        extraBankMinutes: 0,
        defaultTaskMinutes: 15,
        defaultWaveMinutes: 0,
        defaultTodoMinutes: 0,
        timeRules: DEFAULT_TIME_RULES,
      };
      return {
        ...prev,
        timeBank: {
          ...currentBank,
          sheetColorLabels: Object.keys(nextLabels).length > 0 ? nextLabels : undefined,
        },
      };
    });
    showToast('Títulos das cores salvos!');
  }

  function handleRemoveSheet(sheetId: string) {
    const item = state.sheets.find((s) => s.id === sheetId);
    const name = item ? item.name : 'esta planilha';
    setConfirmDialog({
      open: true,
      title: 'Remover Planilha',
      message: `Deseja remover "${name}" do acesso rápido e do código?`,
      onConfirm: () => {
        if (item?.url) {
          void deleteUploadedSheetFile(item.url);
        }
        commitState((prev) => ({
          ...prev,
          sheets: prev.sheets.filter((s) => s.id !== sheetId),
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Item removido com sucesso.');
      },
    });
  }

  // Folders & Channels handlers
  function handleToggleCommonTask(folder: FolderKey, index: number) {
    commitState((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [folder]: {
          ...prev.channels[folder],
          common: prev.channels[folder].common.map((item, idx) =>
            idx === index ? { ...item, done: !item.done } : item,
          ),
        },
      },
    }));
  }

  function handleDeleteCommonTask(folder: FolderKey, index: number) {
    const item = state.channels[folder].common[index];
    const title = item ? item.title : 'este afazer';
    setConfirmDialog({
      open: true,
      title: 'Excluir Afazer Comum',
      message: `Deseja remover "${title}" da lista?`,
      onConfirm: () => {
        commitState((prev) => ({
          ...prev,
          channels: {
            ...prev.channels,
            [folder]: {
              ...prev.channels[folder],
              common: prev.channels[folder].common.filter((_, idx) => idx !== index),
            },
          },
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Afazer excluído.');
      },
    });
  }

  function handlePushCommonToToday(title: string, product: ProductType) {
    const newTask: KishiTask = {
      id: `TK-${Date.now()}`,
      product,
      subBrand: product === '99 Rides' ? 'PAX' : 'B-Side',
      channelType: 'Interno',
      channelName: '',
      title,
      status: 'andamento',
      frequency: 'Diária',
      completedAt: null,
      dateStr: getFormattedToday(),
    };
    commitState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    showToast('Adicionada às suas tarefas de hoje!');
  }

  function handleSaveChannel(payload: {
    folder: FolderKey;
    name: string;
    url: string;
    type: 'Interno' | 'Externo';
    monitorSheetUrl?: string;
    watchChanges?: boolean;
    editing: { listKey: 'internos' | 'externos'; index: number } | null;
  }) {
    const targetListKey = payload.type === 'Interno' ? 'internos' : 'externos';

    commitState((prev) => {
      const folderData = prev.channels[payload.folder];
      const nextInternos = [...folderData.internos];
      const nextExternos = [...folderData.externos];

      const existingChannel = payload.editing
        ? folderData[payload.editing.listKey][payload.editing.index]
        : undefined;
      const prevTargetUrl = (existingChannel?.monitorSheetUrl || existingChannel?.url || '').trim();
      const nextTargetUrl = (payload.monitorSheetUrl || payload.url || '').trim();
      const keepBaseline =
        Boolean(payload.watchChanges) &&
        Boolean(existingChannel?.watchChanges) &&
        prevTargetUrl === nextTargetUrl;

      const newEntry: KishiChannel = {
        name: payload.name,
        url: payload.url,
        type: payload.type,
        monitorSheetUrl: payload.monitorSheetUrl || undefined,
        watchChanges: Boolean(payload.watchChanges),
        lastCsvHash: keepBaseline ? existingChannel?.lastCsvHash : undefined,
        lastSyncedAt: keepBaseline ? existingChannel?.lastSyncedAt : undefined,
      };

      if (payload.editing) {
        const { listKey: oldKey, index } = payload.editing;
        if (oldKey === targetListKey) {
          if (targetListKey === 'internos') nextInternos[index] = newEntry;
          else nextExternos[index] = newEntry;
        } else {
          if (oldKey === 'internos') nextInternos.splice(index, 1);
          else nextExternos.splice(index, 1);

          if (targetListKey === 'internos') nextInternos.push(newEntry);
          else nextExternos.push(newEntry);
        }
      } else {
        if (targetListKey === 'internos') nextInternos.push(newEntry);
        else nextExternos.push(newEntry);
      }

      return {
        ...prev,
        channels: {
          ...prev.channels,
          [payload.folder]: {
            ...folderData,
            internos: nextInternos,
            externos: nextExternos,
          },
        },
      };
    });

    if (payload.watchChanges) {
      const targetListKey = payload.type === 'Interno' ? 'internos' : 'externos';
      delete inMemoryChannelHashRef.current[
        `${payload.folder}:${targetListKey}:${payload.name.toLowerCase()}`
      ];
      window.setTimeout(() => {
        void syncMonitoredChannels(true);
      }, 250);
    }

    setChannelModalOpen(false);
    setEditingChannel(null);
    showToast(payload.editing ? 'Canal atualizado!' : 'Canal cadastrado!');
  }

  function handleDeleteChannel(
    folder: FolderKey,
    listKey: 'internos' | 'externos',
    index: number,
  ) {
    const item = state.channels[folder][listKey][index];
    const name = item ? item.name : 'este canal';
    setConfirmDialog({
      open: true,
      title: 'Excluir Canal',
      message: `Deseja remover "${name}" da pasta 99 ${folder.toUpperCase()}?`,
      onConfirm: () => {
        commitState((prev) => ({
          ...prev,
          channels: {
            ...prev.channels,
            [folder]: {
              ...prev.channels[folder],
              [listKey]: prev.channels[folder][listKey].filter((_, idx) => idx !== index),
            },
          },
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Canal excluído.');
      },
    });
  }

  // Active Campaigns & Waves handlers
  function handleSaveActiveCampaign(payload: {
    id?: string;
    name: string;
    front: '99 Rides' | '99 Food';
    sheetUrl: string;
    autoSync: boolean;
    notes: string;
    lastSheetTitle?: string;
    importedRows?: ParsedSheetRow[] | null;
    replaceWithImported?: boolean;
  }) {
    const syncStamp = `${getFormattedToday()} às ${getFormattedTimeNow()}`;

    if (payload.id) {
      commitState((prev) => ({
        ...prev,
        activeCampaigns: prev.activeCampaigns.map((c) => {
          if (c.id !== payload.id) return c;
          const nextWaves =
            payload.importedRows && payload.importedRows.length > 0
              ? payload.replaceWithImported === false
                ? mergeParsedWaves(c.waves, payload.importedRows).waves
                : syncWavesFromSheet(c.waves, payload.importedRows)
              : c.waves;
          return {
            ...c,
            name: payload.name,
            front: payload.front,
            sheetUrl: payload.sheetUrl || undefined,
            autoSync: Boolean(payload.sheetUrl) && payload.autoSync,
            lastSheetTitle: payload.lastSheetTitle ?? c.lastSheetTitle,
            lastSyncedAt:
              payload.importedRows && payload.importedRows.length > 0
                ? syncStamp
                : c.lastSyncedAt,
            notes: payload.notes || undefined,
            waves: nextWaves,
          };
        }),
      }));
      showToast('Campanha atualizada e salva no código!');
    } else {
      const newId = `ac_${Date.now()}`;
      const initialWaves =
        payload.importedRows && payload.importedRows.length > 0
          ? syncWavesFromSheet([], payload.importedRows)
          : [];
      const nextCamp: KishiActiveCampaign = {
        id: newId,
        name: payload.name,
        front: payload.front,
        sheetUrl: payload.sheetUrl || undefined,
        autoSync: Boolean(payload.sheetUrl) && payload.autoSync,
        lastSheetTitle: payload.lastSheetTitle,
        lastSyncedAt: initialWaves.length > 0 ? syncStamp : undefined,
        notes: payload.notes || undefined,
        waves: initialWaves,
        todos: [],
      };
      commitState((prev) => ({
        ...prev,
        activeCampaigns: [nextCamp, ...prev.activeCampaigns],
      }));
      setExpandedCampaignIds((prev) => ({ ...prev, [newId]: true }));
      showToast(
        initialWaves.length > 0
          ? `Campanha "${payload.name}" criada com ${initialWaves.length} planos!`
          : 'Nova campanha criada e salva no código!',
      );
    }

    setActiveCampaignModalOpen(false);
    setEditingActiveCampaign(null);
  }

  function handleDeleteActiveCampaign(campaignId: string) {
    const camp = state.activeCampaigns.find((c) => c.id === campaignId);
    const name = camp ? camp.name : 'esta campanha';
    setConfirmDialog({
      open: true,
      title: 'Excluir Campanha',
      message: `Tem certeza que deseja excluir "${name}" e todos os seus waves/tarefas?`,
      onConfirm: () => {
        commitState((prev) => ({
          ...prev,
          activeCampaigns: prev.activeCampaigns.filter((c) => c.id !== campaignId),
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Campanha excluída.');
      },
    });
  }

  function handleSaveWavePlan(payload: {
    id?: string;
    waveName: string;
    planTitle: string;
    planUrl: string;
    startDate: string;
    endDate: string;
    status: WaveStatus;
    totalValue: string;
  }) {
    const targetId = waveModalState.campaignId;
    if (!targetId) return;

    commitState((prev) => ({
      ...prev,
      activeCampaigns: prev.activeCampaigns.map((c) => {
        if (c.id !== targetId) return c;
        if (payload.id) {
          return {
            ...c,
            waves: c.waves.map((w) =>
              w.id === payload.id
                ? {
                    ...w,
                    waveName: payload.waveName,
                    planTitle: payload.planTitle,
                    planUrl: payload.planUrl || undefined,
                    startDate: payload.startDate || undefined,
                    endDate: payload.endDate || undefined,
                    status: payload.status,
                    totalValue: payload.totalValue || undefined,
                  }
                : w,
            ),
          };
        }
        const nextWave: KishiWavePlan = {
          id: `wv_${Date.now()}`,
          waveName: payload.waveName,
          planTitle: payload.planTitle,
          planUrl: payload.planUrl || undefined,
          startDate: payload.startDate || undefined,
          endDate: payload.endDate || undefined,
          status: payload.status,
          totalValue: payload.totalValue || undefined,
          fromSheet: false,
        };
        return { ...c, waves: [nextWave, ...c.waves] };
      }),
    }));

    setWaveModalState({ open: false, campaignId: '', editingWave: null });
    showToast(payload.id ? 'Wave / Plano atualizado!' : 'Wave / Plano adicionado!');
  }

  function handleToggleWaveStatus(campaignId: string, waveId: string) {
    commitState((prev) => ({
      ...prev,
      activeCampaigns: prev.activeCampaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              waves: c.waves.map((w) =>
                w.id === waveId
                  ? {
                      ...w,
                      status: w.status === 'nao_extraido' ? 'extraido' : 'nao_extraido',
                    }
                  : w,
              ),
            }
          : c,
      ),
    }));
  }

  function handleDeleteWavePlan(campaignId: string, waveId: string) {
    setConfirmDialog({
      open: true,
      title: 'Excluir Wave / Plano',
      message: 'Deseja remover este wave/plano de mídia desta campanha?',
      onConfirm: () => {
        commitState((prev) => ({
          ...prev,
          activeCampaigns: prev.activeCampaigns.map((c) =>
            c.id === campaignId
              ? { ...c, waves: c.waves.filter((w) => w.id !== waveId) }
              : c,
          ),
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Wave removido.');
      },
    });
  }


  function handleAddCampaignTodo(campaignId: string, text: string, waveRef?: string) {
    commitState((prev) => ({
      ...prev,
      activeCampaigns: prev.activeCampaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              todos: [
                { id: `td_${Date.now()}`, text, waveRef, done: false },
                ...c.todos,
              ],
            }
          : c,
      ),
    }));
  }

  function handleToggleCampaignTodo(campaignId: string, todoId: string) {
    commitState((prev) => ({
      ...prev,
      activeCampaigns: prev.activeCampaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              todos: c.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)),
            }
          : c,
      ),
    }));
  }

  function handleDeleteCampaignTodo(campaignId: string, todoId: string) {
    commitState((prev) => ({
      ...prev,
      activeCampaigns: prev.activeCampaigns.map((c) =>
        c.id === campaignId
          ? { ...c, todos: c.todos.filter((t) => t.id !== todoId) }
          : c,
      ),
    }));
  }

  function handlePushWaveToToday(campaign: KishiActiveCampaign, wave: KishiWavePlan) {
    const newTask: KishiTask = {
      id: `TK-${Date.now()}`,
      product: campaign.front,
      subBrand: campaign.front === '99 Rides' ? 'PAX' : 'B-Side',
      channelType: 'Interno',
      channelName: campaign.name,
      title: `Atualizar Plano (${wave.waveName}): ${wave.planTitle}`,
      status: 'andamento',
      frequency: 'Pontual',
      completedAt: null,
      dateStr: getFormattedToday(),
    };
    commitState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    showToast('Atualização de plano enviada para Tarefas do Dia!');
  }

  function handlePushCampaignTodoToToday(
    campaign: KishiActiveCampaign,
    todoText: string,
    waveRef?: string,
  ) {
    const newTask: KishiTask = {
      id: `TK-${Date.now()}`,
      product: campaign.front,
      subBrand: campaign.front === '99 Rides' ? 'PAX' : 'B-Side',
      channelType: 'Interno',
      channelName: campaign.name,
      title: waveRef ? `${todoText} (${waveRef})` : todoText,
      status: 'andamento',
      frequency: 'Pontual',
      completedAt: null,
      dateStr: getFormattedToday(),
    };
    commitState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    showToast('Tarefa da campanha enviada para Tarefas do Dia!');
  }

  // History handlers
  function handleRestoreHistory(historyId: string) {
    const today = getFormattedToday();

    commitState((prev) => {
      const item = prev.history.find((h) => h.id === historyId);
      if (!item) return prev;

      const norm = (val?: string) => (val || '').trim().toLowerCase();
      const itemTitle = norm(item.title);
      const itemChannel = item.channelName === 'Geral' ? '' : norm(item.channelName);

      // Locate existing completed task in Kanban/Tasks so we move it back instead of duplicating
      const matchedTask =
        (item.taskId ? prev.tasks.find((t) => t.id === item.taskId) : undefined) ||
        prev.tasks.find(
          (t) =>
            t.status === 'concluido' &&
            norm(t.title) === itemTitle &&
            norm(t.product) === norm(item.product) &&
            norm(t.channelName) === itemChannel &&
            t.completedAt === item.time,
        ) ||
        prev.tasks.find(
          (t) =>
            t.status === 'concluido' &&
            norm(t.title) === itemTitle &&
            norm(t.product) === norm(item.product) &&
            norm(t.channelName) === itemChannel,
        ) ||
        prev.tasks.find((t) => t.status === 'concluido' && norm(t.title) === itemTitle);

      let nextTasks: KishiTask[];
      if (matchedTask) {
        nextTasks = prev.tasks.map((t) =>
          t.id === matchedTask.id
            ? {
                ...t,
                status: 'afazer',
                completedAt: null,
                dateStr: today,
              }
            : t,
        );
      } else {
        const restoredTask: KishiTask = {
          id: `TK-${Date.now()}`,
          product:
            item.product === '99 Rides' || item.product === '99 Food' || item.product === 'Geral'
              ? item.product
              : '99 Rides',
          subBrand: item.subBrand || 'PAX',
          channelType:
            item.channelType === 'Externo' ||
            item.channelType === 'Interno' ||
            item.channelType === 'Nenhum'
              ? item.channelType
              : 'Externo',
          channelName: item.channelName === 'Geral' ? '' : item.channelName || '',
          title: item.title,
          status: 'afazer',
          frequency:
            item.frequency === 'Diária' ||
            item.frequency === 'Semanal' ||
            item.frequency === 'Mensal' ||
            item.frequency === 'Pontual'
              ? item.frequency
              : 'Diária',
          completedAt: null,
          dateStr: today,
        };
        nextTasks = [restoredTask, ...prev.tasks];
      }

      return {
        ...prev,
        tasks: nextTasks,
        history: prev.history.filter((h) => h.id !== historyId),
      };
    });
    showToast('Tarefa restaurada para A Fazer!');
  }

  function handleRemoveHistory(historyId: string) {
    const item = state.history.find((h) => h.id === historyId);
    const name = item ? item.title : 'este registro';
    setConfirmDialog({
      open: true,
      title: 'Remover do Histórico',
      message: `Deseja excluir definitivamente "${name}" do histórico?`,
      onConfirm: () => {
        commitState((prev) => ({
          ...prev,
          history: prev.history.filter((h) => h.id !== historyId),
        }));
        setConfirmDialog((d) => ({ ...d, open: false }));
        showToast('Registro removido do histórico.');
      },
    });
  }

  // Profile, TimeBank & Backup handlers
  function handleUpdateTimeBank(nextTimeBank: KishiTimeBank) {
    commitState((prev) => ({ ...prev, timeBank: nextTimeBank }));
  }

  function handlePatchTask(
    taskId: string,
    patch: { tag?: string; estimatedMinutes?: number | undefined },
  ) {
    commitState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
  }

  function handlePatchWave(
    campaignId: string,
    waveId: string,
    patch: { tag?: string; estimatedMinutes?: number | undefined },
  ) {
    commitState((prev) => ({
      ...prev,
      activeCampaigns: prev.activeCampaigns.map((camp) =>
        camp.id === campaignId
          ? {
              ...camp,
              waves: camp.waves.map((w) => (w.id === waveId ? { ...w, ...patch } : w)),
            }
          : camp,
      ),
    }));
  }

  function handleSaveProfile(nextUser: KishiUser) {
    commitState((prev) => ({ ...prev, user: nextUser }));
    setProfileModalOpen(false);
    showToast('Perfil atualizado e salvo!');
  }

  function handleExportBackup() {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `kishi_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setProfileMenuOpen(false);
    showToast('Backup baixado com sucesso!');
  }

  function handleImportBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        if (parsed && typeof parsed === 'object') {
          const normalized = normalizeKishiState(parsed);
          commitState(() => normalized);
          setProfileMenuOpen(false);
          showToast('Backup restaurado e salvo no código!');
        } else {
          showToast('Formato de arquivo inválido.');
        }
      } catch {
        showToast('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const navItems: Array<{
    id: RouteId;
    label: string;
    icon: 'home' | 'campaigns' | 'folders' | 'kanban' | 'history' | 'chat';
  }> = [
    { id: 'visao-geral', label: 'Tarefas do Dia', icon: 'home' },
    { id: 'campanhas', label: 'Campanhas Ativas', icon: 'campaigns' },
    { id: 'pastas-99', label: '99 (Rides & Food)', icon: 'folders' },
    { id: 'kanban', label: 'Quadro de Tarefas', icon: 'kanban' },
    { id: 'historico', label: 'Histórico Permanente', icon: 'history' },
    { id: 'chatbot', label: 'ChatDot', icon: 'chat' },
  ];

  function renderNavIcon(icon: (typeof navItems)[number]['icon'], active: boolean) {
    const colorClass = active ? 'text-[#C5A66B]' : 'text-[#A9B99D]';
    switch (icon) {
      case 'home':
        return <Home className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'campaigns':
        return <Megaphone className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'folders':
        return <FolderTree className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'kanban':
        return <Kanban className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'history':
        return <History className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'chat':
        return <ChatDotAntSvg className="w-4 h-4 text-[#C5A66B] shrink-0" />;
    }
  }

  const totalUnextractedWaves = state.activeCampaigns
    .flatMap((c) => c.waves)
    .filter((w) => w.status === 'nao_extraido').length;

  const mobileShortLabel: Record<RouteId, string> = {
    'visao-geral': 'Hoje',
    campanhas: 'Campanhas',
    'pastas-99': '99',
    kanban: 'Quadro',
    historico: 'Histórico',
    chatbot: 'Dot',
  };

  const resolvedTimeBank: KishiTimeBank = state.timeBank ?? {
    workStart: '09:00',
    workEnd: '18:00',
    breakMinutes: 60,
    extraBankMinutes: 0,
    defaultTaskMinutes: 15,
    defaultWaveMinutes: 0,
    defaultTodoMinutes: 0,
    timeRules: DEFAULT_TIME_RULES,
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0f1512] text-[#EDE9DE] flex flex-col items-center justify-center gap-5 p-6">
        <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl bg-[#0b100d] border border-[#C5A66B]/45 flex items-center justify-center shadow-2xl">
          <KishiLogoSvg className="h-20 w-20 sm:h-24 sm:w-24 text-[#C5A66B] animate-pulse" />
        </div>
        <span className="font-extrabold text-xl sm:text-2xl tracking-[0.28em] text-[#EDE9DE] font-['Montserrat',sans-serif]">
          KISHI
        </span>
      </div>
    );
  }

  if (!authUser || !emailVerified) {
    return (
      <LoginScreen
        pendingVerificationUser={authUser && !emailVerified ? authUser : null}
        onSignIn={handleEmailSignIn}
        onResetPassword={sendResetPassword}
        onResendVerification={handleResendVerification}
        onCheckVerification={handleCheckVerification}
        onSignOut={handleDisconnectCloud}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f1512] text-[#EDE9DE] overflow-hidden">
      {/* TOPBAR */}
      <header className="h-14 md:h-16 bg-[#0b100d] border-b border-[#777F89]/40 flex items-center justify-between gap-2 md:gap-4 px-3 md:px-6 z-40 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              triggerAntScurry(rect.left + rect.width * 0.35, rect.top + rect.height * 0.5, 2);
              navigate('visao-geral');
            }}
            className="flex items-center gap-2 md:gap-3 focus:outline-none group cursor-pointer"
          >
            <div className="brand-logo-container relative h-9 w-9 md:h-11 md:w-11 rounded-xl bg-[#151d18] border border-[#777F89]/60 flex items-center justify-center">
              <KishiLogoSvg className="h-5 w-5 md:h-7 md:w-7 text-[#C5A66B]" />
              <RealisticMicroAntSvg className="w-2.5 h-2.5 text-[#C5A66B]/60 absolute -top-1 -right-1 pointer-events-none rotate-[28deg]" />
            </div>
            <span className="font-extrabold text-base md:text-xl tracking-[0.18em] md:tracking-[0.25em] text-[#EDE9DE] font-['Montserrat',sans-serif] group-hover:text-[#C5A66B] transition-colors whitespace-nowrap shrink-0">
              KISHI
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#777F89]/40 text-xs text-[#A9B99D] whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-[#C5A66B]" />
            <span className="font-medium text-[#EDE9DE] tabular-nums">{dateHeader}</span>
          </div>
        </div>

        {/* Barra de Pesquisa Desktop */}
        <div ref={searchBoxRef} className="hidden md:block flex-1 max-w-md mx-6 relative">
          <Search className="w-3.5 h-3.5 text-[#A9B99D] absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefas, canais, planilhas..."
            className="w-full bg-[#151d18] border border-[#777F89]/60 rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B] transition"
            aria-label="Buscar tarefas, canais ou planilhas"
          />

          {searchResults && (
            <div className="absolute top-10 left-0 right-0 bg-[#151d18] border border-[#777F89]/60 rounded-xl p-2 z-50 shadow-2xl space-y-1 text-xs max-h-64 overflow-y-auto">
              {searchResults.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    navigate('kanban');
                    setEditingTask(t);
                    setTaskModalOpen(true);
                    setSearchQuery('');
                  }}
                  className="w-full text-left p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] truncate">{t.title}</span>
                  <span className="text-[#C5A66B] text-[11px] font-mono shrink-0">{t.product}</span>
                </button>
              ))}

              {searchResults.portals.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSearchQuery('')}
                  className="p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] flex items-center gap-1.5 truncate">
                    <Globe className="w-3.5 h-3.5 text-[#C5A66B] shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="text-[#A9B99D] text-[11px] font-mono shrink-0">
                    {p.kind} · {p.category}
                  </span>
                </a>
              ))}

              {searchResults.sheets.map((s) => {
                const kind = detectResourceKind(s.url, s.type, s.resourceKind);
                const kindMeta = getResourceKindMeta(kind);
                return (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSearchQuery('')}
                    className="p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                  >
                    <span className="text-[#C5A66B] flex items-center gap-1.5 truncate">
                      {kind === 'drive' ? (
                        <FolderOpen className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      ) : kind === 'doc' ? (
                        <FileText className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                      ) : kind === 'apresentacao' ? (
                        <Presentation className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                      ) : kind === 'arquivo' ? (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                      ) : (
                        <Table2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      )}
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="text-[#A9B99D] text-[11px] font-mono shrink-0">
                      {kindMeta.label} · {s.category}
                    </span>
                  </a>
                );
              })}

              {searchResults.channels.map(({ folder, channel }, idx) => (
                <a
                  key={`${folder}-${channel.name}-${idx}`}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSearchQuery('')}
                  className="p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] truncate">{channel.name}</span>
                  <span className="text-[#A9B99D] text-[11px] font-mono shrink-0">
                    99 {folder.toUpperCase()} · {channel.type}
                  </span>
                </a>
              ))}

              {searchResults.activeCampaigns.map((camp) => (
                <button
                  key={camp.id}
                  type="button"
                  onClick={() => {
                    navigate('campanhas');
                    setSearchQuery('');
                  }}
                  className="w-full text-left p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] truncate">{camp.name}</span>
                  <span className="text-[#C5A66B] text-[11px] font-mono shrink-0">
                    Campanha · {camp.front}
                  </span>
                </button>
              ))}

              {searchResults.tasks.length === 0 &&
                searchResults.portals.length === 0 &&
                searchResults.sheets.length === 0 &&
                searchResults.channels.length === 0 &&
                searchResults.activeCampaigns.length === 0 && (
                  <div className="p-2 text-[#A9B99D]">Nenhum item correspondente encontrado.</div>
                )}
            </div>
          )}
        </div>

        {/* Ações direita: Busca Mobile + Alertas + Perfil */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((v) => !v);
              setAlertsMenuOpen(false);
              setProfileMenuOpen(false);
            }}
            className={`md:hidden btn-press h-9 w-9 rounded-full border flex items-center justify-center focus:outline-none cursor-pointer transition ${
              mobileSearchOpen
                ? 'bg-[#C5A66B]/15 border-[#C5A66B]/70 text-[#C5A66B]'
                : 'bg-[#151d18] border-[#777F89]/50 text-[#EDE9DE]'
            }`}
            aria-label="Abrir busca"
          >
            {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4 text-[#A9B99D]" />}
          </button>

          {/* Alertas de atualização de planilha */}
          <div ref={alertsBoxRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setAlertsMenuOpen((prev) => {
                  const nextOpen = !prev;
                  if (nextOpen) {
                    setSheetAlerts((items) =>
                      items.map((a) => (a.unread ? { ...a, unread: false } : a)),
                    );
                  }
                  return nextOpen;
                });
                setProfileMenuOpen(false);
              }}
              className="btn-press relative h-9 w-9 rounded-full bg-[#151d18] border border-[#777F89]/50 hover:border-[#C5A66B]/60 text-[#EDE9DE] flex items-center justify-center focus:outline-none cursor-pointer"
              aria-label="Alertas de planilhas"
              title="Atualizações de planilhas"
            >
              <Bell className="w-4 h-4 text-[#C5A66B]" />
              {sheetAlerts.some((a) => a.unread) && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C5A66B] text-[#0f1512] text-[10px] font-extrabold flex items-center justify-center shadow">
                  {sheetAlerts.filter((a) => a.unread).length}
                </span>
              )}
            </button>

            {alertsMenuOpen && (
              <div className="absolute right-0 top-11 w-72 bg-[#151d18] border border-[#777F89]/60 rounded-2xl p-3 z-50 shadow-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#777F89]/40">
                  <span className="font-bold text-[#EDE9DE]">Atualizações</span>
                  {sheetAlerts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSheetAlerts([])}
                      className="text-[11px] text-[#A9B99D] hover:text-[#C5A66B] cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {sheetAlerts.length === 0 ? (
                  <p className="py-3 text-center text-[11px] text-[#A9B99D]">
                    Nenhuma alteração recente.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                    {sheetAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-2 rounded-xl bg-[#0b100d] border border-[#777F89]/30 flex items-center gap-2"
                      >
                        <span className="text-[10px] font-mono font-bold text-[#C5A66B] shrink-0">
                          {alert.timeFormatted}
                        </span>
                        <span className="text-[11px] text-[#EDE9DE] leading-snug">
                          {alert.kind === 'channel' ? (
                            <>
                              Plano de <strong className="text-[#C5A66B]">{alert.title}</strong> atualizado
                            </>
                          ) : (
                            <>
                              <strong className="text-[#EDE9DE]">{alert.title}</strong> atualizada
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Perfil */}
          <div ref={profileBoxRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen((v) => !v);
                setAlertsMenuOpen(false);
              }}
              className="btn-press h-9 w-9 rounded-full bg-[#C5A66B] text-[#0f1512] font-extrabold text-sm flex items-center justify-center hover:bg-[#d5b880] shadow-md focus:outline-none border border-[#C5A66B]/30 cursor-pointer"
              aria-label="Menu do perfil"
            >
              {state.user.initial || 'J'}
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-11 w-64 bg-[#151d18] border border-[#777F89]/60 rounded-2xl p-3 z-50 shadow-2xl space-y-1.5 text-xs">
                <div className="pb-2 border-b border-[#777F89]/40">
                  <div className="font-bold text-[#EDE9DE]">{state.user.name}</div>
                  <div className="text-[11px] text-[#A9B99D] font-mono">{state.user.role}</div>
                  {authUser && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-mono text-emerald-300 bg-[#0b100d] px-2 py-1 rounded-lg border border-emerald-500/30">
                      <span className="truncate">{authUser.email || 'Conectada'}</span>
                      <button
                        type="button"
                        onClick={() => void handleDisconnectCloud()}
                        className="text-rose-300 hover:text-rose-200 shrink-0 cursor-pointer flex items-center gap-1"
                        title="Sair da conta"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer"
              >
                <UserPen className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Editar Perfil</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setHoursModalOpen(true);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Horas (Jornada &amp; Banco)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setTempoModalOpen(true);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer"
              >
                <Hourglass className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Tempo (Tarefas &amp; Etiquetas)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('historico');
                  setProfileMenuOpen(false);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Histórico Permanente</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setPrivacyModalOpen(true);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Segurança &amp; LGPD</span>
              </button>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Fazer Backup dos Dados (JSON)</span>
              </button>
              <label className="w-full text-left p-2 rounded-lg hover:bg-[#1b251f] text-[#EDE9DE] flex items-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Restaurar Backup (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          )}
          </div>
        </div>
      </header>

      {/* BUSCA MOBILE EXPANSÍVEL */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchBoxRef}
          className="md:hidden px-3 py-2 bg-[#0b100d] border-b border-[#777F89]/40 relative z-30 shrink-0"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A9B99D] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefas, canais, planilhas..."
              className="w-full bg-[#151d18] border border-[#777F89]/60 rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B] transition"
              aria-label="Buscar no celular"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[#A9B99D] hover:text-[#EDE9DE] cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchResults && (
            <div className="mt-2 bg-[#151d18] border border-[#777F89]/60 rounded-xl p-2 shadow-2xl space-y-1 text-xs max-h-60 overflow-y-auto">
              {searchResults.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    navigate('kanban');
                    setEditingTask(t);
                    setTaskModalOpen(true);
                    setSearchQuery('');
                    setMobileSearchOpen(false);
                  }}
                  className="w-full text-left p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] truncate">{t.title}</span>
                  <span className="text-[#C5A66B] text-[11px] font-mono shrink-0">{t.product}</span>
                </button>
              ))}

              {searchResults.portals.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setSearchQuery('');
                    setMobileSearchOpen(false);
                  }}
                  className="p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] flex items-center gap-1.5 truncate">
                    <Globe className="w-3.5 h-3.5 text-[#C5A66B] shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="text-[#A9B99D] text-[11px] font-mono shrink-0">
                    {p.kind} · {p.category}
                  </span>
                </a>
              ))}

              {searchResults.sheets.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setSearchQuery('');
                    setMobileSearchOpen(false);
                  }}
                  className="p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#C5A66B] truncate">{s.name}</span>
                  <span className="text-[#A9B99D] text-[11px] font-mono shrink-0">{s.category}</span>
                </a>
              ))}

              {searchResults.channels.map(({ folder, channel }, idx) => (
                <a
                  key={`${folder}-${channel.name}-${idx}`}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setSearchQuery('');
                    setMobileSearchOpen(false);
                  }}
                  className="p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] truncate">{channel.name}</span>
                  <span className="text-[#A9B99D] text-[11px] font-mono shrink-0">
                    99 {folder.toUpperCase()}
                  </span>
                </a>
              ))}

              {searchResults.activeCampaigns.map((camp) => (
                <button
                  key={camp.id}
                  type="button"
                  onClick={() => {
                    navigate('campanhas');
                    setSearchQuery('');
                    setMobileSearchOpen(false);
                  }}
                  className="w-full text-left p-2 hover:bg-[#0b100d] rounded-lg cursor-pointer flex justify-between items-center gap-2"
                >
                  <span className="text-[#EDE9DE] truncate">{camp.name}</span>
                  <span className="text-[#C5A66B] text-[11px] font-mono shrink-0">{camp.front}</span>
                </button>
              ))}

              {searchResults.tasks.length === 0 &&
                searchResults.portals.length === 0 &&
                searchResults.sheets.length === 0 &&
                searchResults.channels.length === 0 &&
                searchResults.activeCampaigns.length === 0 && (
                  <div className="p-2 text-[#A9B99D]">Nenhum item encontrado.</div>
                )}
            </div>
          )}
        </div>
      )}

      {/* LAYOUT PRINCIPAL */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden md:flex w-60 bg-[#0b100d] border-r border-[#777F89]/40 flex-col justify-between py-5 px-3 shrink-0 select-none">
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-[#A9B99D] tracking-wide px-3 block">
              Navegação
            </span>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'pastas-99') {
                        setActiveFolderTab('overview');
                      }
                      navigate(item.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-left transition whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'font-bold bg-[#151d18] text-[#C5A66B] border border-[#777F89]/60'
                        : 'font-semibold text-[#EDE9DE] hover:bg-[#151d18] hover:text-white border border-transparent'
                    }`}
                  >
                    {renderNavIcon(item.icon, isActive)}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2">
            <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-[#EDE9DE] font-semibold text-[11px]">
                <span>Conclusão Hoje</span>
                <span className="text-[#C5A66B] font-bold font-mono tabular-nums">
                  {progressPct}%
                </span>
              </div>
              <div className="w-full bg-[#0b100d] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#A9B99D] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#A9B99D] font-mono tabular-nums">
                <span>{remainingCount} pendentes</span>
                <span>{doneTodayCount} concluídas</span>
              </div>
            </div>
            <div className="px-2 flex items-center justify-between">
              <SumerianGlyphWhisper glyphs="𒆧 · 𒋗 · 𒁾" />
              <RealisticMicroAntSvg className="w-2.5 h-2.5 text-[#C5A66B]/30 -rotate-12 pointer-events-none" />
            </div>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 min-h-0 bg-[#0f1512] overflow-y-auto p-3.5 pb-24 md:p-7 md:pb-7">
          {/* RESUMO COMPACTO MOBILE NO FLUXO DO CONTEÚDO */}
          <div className="md:hidden mb-3.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0b100d] border border-[#777F89]/35 text-[11px]">
            <div className="flex items-center gap-1.5 text-[#EDE9DE] truncate">
              <Calendar className="w-3 h-3 text-[#C5A66B] shrink-0" />
              <span className="font-medium truncate tabular-nums">{dateHeader}</span>
            </div>
            <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
              <span className="text-[#A9B99D]">{remainingCount} pend.</span>
              <span className="text-[#C5A66B] font-bold">{progressPct}%</span>
            </div>
          </div>
          {activeRoute === 'visao-geral' && (
            <OverviewModule
              userName={state.user.name}
              tasks={state.tasks}
              doneTodayCount={doneTodayCount}
              sheets={state.sheets}
              activeCampaigns={state.activeCampaigns}
              timeBank={resolvedTimeBank}
              onOpenNewTask={() => {
                setEditingTask(null);
                setTaskDefaultProduct('99 Rides');
                setTaskModalOpen(true);
              }}
              onOpenEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
              onGoToFolder={(folder, channelName) => {
                setActiveFolderTab(folder);
                navigate('pastas-99');
                if (channelName) {
                  showToast(`Visualizando canal "${channelName}" em 99 ${folder.toUpperCase()}`);
                }
              }}
              onGoToCampaigns={() => navigate('campanhas')}
            />
          )}

          {activeRoute === 'campanhas' && (
            <CampaignsModule
              campaigns={state.activeCampaigns}
              expandedIds={expandedCampaignIds}
              syncingCampaignIds={syncingCampaignIds}
              onToggleExpand={(campaignId) =>
                setExpandedCampaignIds((prev) => ({ ...prev, [campaignId]: !prev[campaignId] }))
              }
              onSetExpandAll={(expand) => {
                if (!expand) {
                  setExpandedCampaignIds({});
                  return;
                }
                const next: Record<string, boolean> = {};
                state.activeCampaigns.forEach((c) => {
                  next[c.id] = true;
                });
                setExpandedCampaignIds(next);
              }}
              onOpenNewCampaign={(front) => {
                setActiveCampaignDefaultFront(front || '99 Food');
                setEditingActiveCampaign(null);
                setActiveCampaignModalOpen(true);
              }}
              onOpenEditCampaign={(campaign) => {
                setActiveCampaignDefaultFront(campaign.front);
                setEditingActiveCampaign(campaign);
                setActiveCampaignModalOpen(true);
              }}
              onDeleteCampaign={handleDeleteActiveCampaign}
              onSyncCampaignNow={(campaign) => void syncCampaignById(campaign.id, false)}
              onSyncAllNow={() => void syncAllLinkedCampaigns(false)}
              onOpenAddWave={(campaignId) =>
                setWaveModalState({ open: true, campaignId, editingWave: null })
              }
              onOpenEditWave={(campaignId, wave) =>
                setWaveModalState({ open: true, campaignId, editingWave: wave })
              }
              onToggleWaveStatus={handleToggleWaveStatus}
              onDeleteWave={handleDeleteWavePlan}
              onPushWaveToToday={handlePushWaveToToday}
              onAddTodo={handleAddCampaignTodo}
              onToggleTodo={handleToggleCampaignTodo}
              onDeleteTodo={handleDeleteCampaignTodo}
              onPushTodoToToday={handlePushCampaignTodoToToday}
            />
          )}

          {activeRoute === 'pastas-99' && (
            <FoldersModule
              activeTab={activeFolderTab}
              channels={state.channels}
              portals={state.portals}
              sheets={state.sheets}
              tasks={state.tasks}
              sheetColorLabels={resolvedTimeBank.sheetColorLabels}
              onSwitchTab={setActiveFolderTab}
              onUpdateSheetColorLabels={handleUpdateSheetColorLabels}
              onToggleCommonTask={handleToggleCommonTask}
              onDeleteCommonTask={handleDeleteCommonTask}
              onPushCommonToToday={handlePushCommonToToday}
              onOpenNewFrontTask={(product) => {
                setEditingTask(null);
                setTaskDefaultProduct(product);
                setTaskModalOpen(true);
              }}
              onOpenEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onToggleTaskDone={handleToggleTaskDone}
              onDeleteLinkedTask={handleDeleteTask}
              onOpenNewChannel={(folder, defaultType) => {
                setChannelModalFolder(folder);
                setChannelModalDefaultType(defaultType);
                setEditingChannel(null);
                setChannelModalOpen(true);
              }}
              onOpenEditChannel={(folder, listKey, index, channel) => {
                setChannelModalFolder(folder);
                setEditingChannel({ listKey, index, channel });
                setChannelModalOpen(true);
              }}
              onDeleteChannel={handleDeleteChannel}
              onOpenNewPortal={(defaultCategory) => {
                setPortalDefaultCategory(defaultCategory);
                setEditingPortal(null);
                setPortalModalOpen(true);
              }}
              onOpenEditPortal={(portal) => {
                setPortalDefaultCategory(portal.category || '99');
                setEditingPortal(portal);
                setPortalModalOpen(true);
              }}
              onRemovePortal={handleRemovePortal}
              onUploadFiles={handleUploadFiles}
              onOpenAddSheetLink={(defaultCategory) => {
                setSheetDefaultCategory(defaultCategory);
                setEditingSheet(null);
                setSheetLinkModalOpen(true);
              }}
              onOpenEditSheet={(sheet) => {
                setSheetDefaultCategory(sheet.category || '99');
                setEditingSheet(sheet);
                setSheetLinkModalOpen(true);
              }}
              onRemoveSheet={handleRemoveSheet}
            />
          )}

          {activeRoute === 'kanban' && (
            <KanbanModule
              tasks={state.tasks}
              onOpenNewTask={() => {
                setEditingTask(null);
                setTaskDefaultProduct('99 Rides');
                setTaskModalOpen(true);
              }}
              onOpenEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onMoveTask={handleMoveTask}
            />
          )}

          {activeRoute === 'historico' && (
            <HistoryModule
              history={state.history}
              tasks={state.tasks}
              activeCampaigns={state.activeCampaigns}
              onRestore={handleRestoreHistory}
              onRemove={handleRemoveHistory}
              onCopied={showToast}
            />
          )}

          {activeRoute === 'chatbot' && <ChatDotModule state={state} />}
        </main>

        {/* NAVEGAÇÃO MOBILE FIXA INFERIOR (SEM ALTERAR DESKTOP) */}
        <nav
          aria-label="Navegação mobile"
          className="md:hidden safe-area-pb fixed bottom-0 inset-x-0 z-40 bg-[#0b100d]/95 backdrop-blur-md border-t border-[#777F89]/40 px-1.5 py-1.5 grid grid-cols-6 gap-1"
        >
          {navItems.map((item) => {
            const isActive = activeRoute === item.id;
            const showCampaignBadge = item.id === 'campanhas' && totalUnextractedWaves > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'pastas-99') {
                    setActiveFolderTab('overview');
                  }
                  navigate(item.id);
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl text-[10px] transition cursor-pointer ${
                  isActive
                    ? 'font-bold bg-[#151d18] text-[#C5A66B] border border-[#777F89]/50'
                    : 'font-medium text-[#A9B99D] hover:text-[#EDE9DE]'
                }`}
              >
                <div className="relative">
                  {renderNavIcon(item.icon, isActive)}
                  {showCampaignBadge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-3.5 px-1 rounded-full bg-rose-500 text-[#0b100d] font-mono font-extrabold text-[9px] leading-[14px] text-center">
                      {totalUnextractedWaves > 99 ? '99+' : totalUnextractedWaves}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-full">{mobileShortLabel[item.id]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* MODAIS */}
      <TaskModal
        open={taskModalOpen}
        editingTask={editingTask}
        defaultProduct={taskDefaultProduct}
        channels={state.channels}
        timeBank={resolvedTimeBank}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />

      <ChannelModal
        open={channelModalOpen}
        folder={channelModalFolder}
        editing={editingChannel}
        defaultType={channelModalDefaultType}
        workspaceState={state}
        onClose={() => {
          setChannelModalOpen(false);
          setEditingChannel(null);
        }}
        onSave={handleSaveChannel}
      />

      <SheetLinkModal
        open={sheetLinkModalOpen}
        editingSheet={editingSheet}
        defaultCategory={sheetDefaultCategory}
        sheetColorLabels={resolvedTimeBank.sheetColorLabels}
        workspaceState={state}
        onClose={() => {
          setSheetLinkModalOpen(false);
          setEditingSheet(null);
        }}
        onSave={handleSaveSheetLink}
      />

      <PortalModal
        open={portalModalOpen}
        editingPortal={editingPortal}
        defaultCategory={portalDefaultCategory}
        workspaceState={state}
        onClose={() => {
          setPortalModalOpen(false);
          setEditingPortal(null);
        }}
        onSave={handleSavePortal}
      />

      <CampaignSetupModal
        open={activeCampaignModalOpen}
        editingCampaign={editingActiveCampaign}
        defaultFront={activeCampaignDefaultFront}
        workspaceState={state}
        onClose={() => {
          setActiveCampaignModalOpen(false);
          setEditingActiveCampaign(null);
        }}
        onSave={handleSaveActiveCampaign}
      />

      <WavePlanModal
        open={waveModalState.open}
        campaignName={
          state.activeCampaigns.find((c) => c.id === waveModalState.campaignId)?.name ||
          'Campanha'
        }
        editingWave={waveModalState.editingWave}
        workspaceState={state}
        onClose={() => setWaveModalState({ open: false, campaignId: '', editingWave: null })}
        onSave={handleSaveWavePlan}
      />

      <ProfileModal
        open={profileModalOpen}
        user={state.user}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />

      <PrivacySecurityModal
        open={privacyModalOpen}
        userEmail={authUser?.email || 'Conta privada'}
        autoLockEnabled={autoLockEnabled}
        onToggleAutoLock={(next) => {
          setAutoLockEnabled(next);
          try {
            localStorage.setItem('kishi_autolock_v1', String(next));
          } catch {
            // ignore
          }
          showToast(
            next
              ? 'Bloqueio automático (30 min) ativado.'
              : 'Bloqueio automático desativado.',
          );
        }}
        onLockAndSignOut={() => void handleDisconnectCloud()}
        onClose={() => setPrivacyModalOpen(false)}
      />

      <HoursSettingsModal
        open={hoursModalOpen}
        timeBank={resolvedTimeBank}
        onClose={() => setHoursModalOpen(false)}
        onSave={(next) => {
          handleUpdateTimeBank(next);
          setHoursModalOpen(false);
          showToast('Horários de trabalho e banco de horas salvos!');
        }}
      />

      <TempoSettingsModal
        open={tempoModalOpen}
        timeBank={resolvedTimeBank}
        tasks={state.tasks}
        activeCampaigns={state.activeCampaigns}
        onClose={() => setTempoModalOpen(false)}
        onUpdateTimeBank={handleUpdateTimeBank}
        onUpdateTask={handlePatchTask}
        onUpdateWave={handlePatchWave}
      />

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false, onConfirm: null }))}
        onConfirm={() => confirmDialog.onConfirm?.()}
      />

      <PromptModal
        open={promptDialog.open}
        title={promptDialog.title}
        label={promptDialog.label}
        placeholder={promptDialog.placeholder}
        onCancel={() => setPromptDialog((d) => ({ ...d, open: false, onConfirm: null }))}
        onConfirm={(val) => promptDialog.onConfirm?.(val)}
      />

      {/* INDICADOR OFFLINE PWA */}
      <OfflineIndicator />

      {/* TOAST */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50">
          <div className="bg-[#151d18] border border-[#C5A66B]/60 text-[#EDE9DE] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#C5A66B] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
      {/* MICRO-FORMIGAS SUTIS AO CLICAR */}
      <AntTrailOverlay />
    </div>
  );
}
