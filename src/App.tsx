import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Users, User, Calendar, TrendingUp, QrCode, Plus, Trash2, Edit, Save, X, 
  Sparkles, Check, RotateCcw, Info, Clock, Play, Square, AlertTriangle, 
  Share2, ExternalLink, Eye, Settings, Search, Award, Shield, FileText, CheckCircle2,
  Phone, UserCheck, Trash, Activity, Lock, Key, Download
} from 'lucide-react';

import { Team, Player, Referee, Match, MatchEvent, TournamentType, Tournament } from './types';
import { Language, translations } from './translations';
import { 
  INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_REFEREES, INITIAL_MATCHES 
} from './dataPresets';
import { 
  computeStandings, computePlayerStats, generateLeagueFixtures, generateKnockoutFixtures, generateGroupStageFixtures 
} from './utils';
import LiveFanView from './components/LiveFanView';
import RefereePortal from './components/RefereePortal';
import TeamPortal from './components/TeamPortal';
import QrCodeModal from './components/QrCodeModal';
import QrScannerOverlay from './components/QrScannerOverlay';
import PlayerDetailsModal from './components/PlayerDetailsModal';
import MatchCalendar from './components/MatchCalendar';
import QRCode from 'qrcode';

const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
  // \uFEFF is the UTF-8 BOM so Excel opens Arabic correctly
  const csvContent = "\uFEFF" + [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper for initial load of storage prefix based on logged in user session
const getInitialStoragePrefix = () => {
  const userStored = localStorage.getItem('ftm_registered_user');
  if (userStored) {
    try {
      const u = JSON.parse(userStored);
      const isOwner = u.name === 'كابتن حمادة' || u.email === 'Hamada10gaoui@gmail.com';
      const isSAdmin = localStorage.getItem('ftm_is_super_admin') === 'true';
      if (u.role === 'organizer' && !isOwner && !isSAdmin) {
        return `ftm_org_${u.name.toLowerCase().replace(/\s+/g, '_')}`;
      }
    } catch (e) {}
  }
  return 'ftm';
};

export default function App() {
  // Add match view mode choice (list or calendar)
  const [matchViewMode, setMatchViewMode] = useState<'list' | 'calendar'>('list');

  const loadedPrefixRef = useRef<string>(getInitialStoragePrefix());

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    return localStorage.getItem('ftm_is_super_admin') === 'true';
  });

  const [registeredUser, setRegisteredUser] = useState<{
    name: string;
    email: string;
    role: 'spectator' | 'organizer';
    favoriteTeamId?: string | null;
  } | null>(() => {
    const stored = localStorage.getItem('ftm_registered_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [viewingPrefix, setViewingPrefix] = useState<string>(() => getInitialStoragePrefix());

  const [isOrganizerVerified, setIsOrganizerVerified] = useState<boolean>(() => {
    return localStorage.getItem('ftm_is_organizer_verified') === 'true';
  });

  const [verifiedTournamentIds, setVerifiedTournamentIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('ftm_verified_tournament_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const getStoragePrefix = (user: { name: string; role: string; email?: string } | null, superAdmin?: boolean) => {
    if (!user) return 'ftm';
    const isOwner = user.name === 'كابتن حمادة' || user.email === 'Hamada10gaoui@gmail.com';
    if (isOwner || superAdmin) return 'ftm';
    if (user.role === 'organizer') {
      const identifier = user.name.toLowerCase().replace(/\s+/g, '_');
      return `ftm_org_${identifier}`;
    }
    return 'ftm';
  };

  // Load all tournaments across prefixes for options selection
  const getAvailableTournaments = () => {
    const list: { id: string; name: string; prefix: string; organizerName: string; matchesCount: number }[] = [];
    
    // 1. Check main 'ftm' prefix
    const savedFtm = localStorage.getItem('ftm_tournaments');
    if (savedFtm) {
      try {
        const parsed = JSON.parse(savedFtm) as Tournament[];
        parsed.forEach(t => {
          list.push({
            id: t.id,
            name: t.name,
            prefix: 'ftm',
            organizerName: t.organizerName || 'أ. محمد الغامدي',
            matchesCount: t.matches?.length || 0
          });
        });
      } catch (e) {}
    } else {
      // Default initial FTM tournament
      list.push({
        id: 'tour-1',
        name: 'كأس التفوق الميداني',
        prefix: 'ftm',
        organizerName: 'أ. محمد الغامدي',
        matchesCount: 0
      });
    }

    // 2. Scan all other custom organizer prefixes in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ftm_org_') && key.endsWith('_tournaments')) {
        const prefix = key.substring(0, key.length - '_tournaments'.length);
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val) as Tournament[];
            parsed.forEach(t => {
              if (!list.some(item => item.id === t.id)) {
                list.push({
                  id: t.id,
                  name: t.name,
                  prefix,
                  organizerName: t.organizerName || '',
                  matchesCount: t.matches?.length || 0
                });
              }
            });
          }
        } catch (e) {}
      }
    }
    return list;
  };

  // ----------------------------------------------------
  // State Initialization from LocalStorage or Presets
  // ----------------------------------------------------
  const [teams, setTeams] = useState<Team[]>(() => {
    const pf = getInitialStoragePrefix();
    const saved = localStorage.getItem(`${pf}_teams`);
    return saved ? JSON.parse(saved) : (pf === 'ftm' ? INITIAL_TEAMS : []);
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const pf = getInitialStoragePrefix();
    const saved = localStorage.getItem(`${pf}_players`);
    return saved ? JSON.parse(saved) : (pf === 'ftm' ? INITIAL_PLAYERS : []);
  });

  const [referees, setReferees] = useState<Referee[]>(() => {
    const pf = getInitialStoragePrefix();
    const saved = localStorage.getItem(`${pf}_referees`);
    return saved ? JSON.parse(saved) : (pf === 'ftm' ? INITIAL_REFEREES : []);
  });

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const pf = getInitialStoragePrefix();
    const saved = localStorage.getItem(`${pf}_tournaments`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tournaments:', e);
      }
    }
    if (pf === 'ftm') {
      return [
        {
          id: 'tour-1',
          name: 'كأس التفوق الميداني',
          organizerName: 'أ. محمد الغامدي',
          participatingTeamIds: ['team-1', 'team-2', 'team-3', 'team-4'],
          matches: [],
          drawType: 'league'
        }
      ];
    }
    return [];
  });

  const [activeTournamentId, setActiveTournamentId] = useState<string>(() => {
    const pf = getInitialStoragePrefix();
    return localStorage.getItem(`${pf}_active_tournament_id`) || (pf === 'ftm' ? 'tour-1' : '');
  });

  const [tournamentName, setTournamentName] = useState<string>(() => {
    const pf = getInitialStoragePrefix();
    const saved = localStorage.getItem(`${pf}_tournaments`);
    const actId = localStorage.getItem(`${pf}_active_tournament_id`) || (pf === 'ftm' ? 'tour-1' : '');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Tournament[];
        const found = parsed.find(t => t.id === actId);
        if (found) return found.name;
      } catch (e) {}
    }
    return pf === 'ftm' ? 'كأس التفوق الميداني' : '';
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    const pf = getInitialStoragePrefix();
    const saved = localStorage.getItem(`${pf}_tournaments`);
    const actId = localStorage.getItem(`${pf}_active_tournament_id`) || (pf === 'ftm' ? 'tour-1' : '');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Tournament[];
        const found = parsed.find(t => t.id === actId);
        if (found) return found.matches || [];
      } catch (e) {}
    }
    const savedMatches = localStorage.getItem(`${pf}_matches`);
    return savedMatches ? JSON.parse(savedMatches) : (pf === 'ftm' ? INITIAL_MATCHES : []);
  });

  // Track if we are inside normal admin dashboard, or mobile fan view
  const [viewMode, setViewMode] = useState<'admin' | 'fan' | 'referee-portal' | 'team-portal'>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'live') return 'fan';
    if (view === 'referee-portal') return 'referee-portal';
    if (view === 'team-portal') return 'team-portal';
    return 'admin';
  });

  // QR and Scanner overlay states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeQrModal, setActiveQrModal] = useState<{
    title: string;
    subtitle: string;
    url: string;
  } | null>(null);

  // Synchronize dynamic updates across different tabs on the same device in real time
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      try {
        if (e.key === 'ftm_matches') {
          setMatches(JSON.parse(e.newValue || '[]'));
        }
        if (e.key === 'ftm_players') {
          setPlayers(JSON.parse(e.newValue || '[]'));
        }
        if (e.key === 'ftm_teams') {
          setTeams(JSON.parse(e.newValue || '[]'));
        }
      } catch (err) {
        console.error('Failed to sync storage event:', err);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'teams' | 'players' | 'referees' | 'matches' | 'draw'>('dashboard');

  // Welcome banner state
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return localStorage.getItem('ftm_welcome_dismissed') !== 'true';
  });

  const handleDismissWelcome = () => {
    localStorage.setItem('ftm_welcome_dismissed', 'true');
    setShowWelcome(false);
  };

  // Search/Filter states
  const [teamSearch, setTeamSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerTeamFilter, setPlayerTeamFilter] = useState('all');

  // Form states for Teams
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [newTourFormOpen, setNewTourFormOpen] = useState(false);
  const [newTourNameInput, setNewTourNameInput] = useState('');
  const [newTourOrganizerInput, setNewTourOrganizerInput] = useState('');
  const [newTourPinInput, setNewTourPinInput] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamNameForm, setTeamNameForm] = useState('');
  const [teamClassForm, setTeamClassForm] = useState('');
  const [teamCityForm, setTeamCityForm] = useState('');
  const [teamColorForm, setTeamColorForm] = useState('bg-emerald-500');
  const [teamIconForm, setTeamIconForm] = useState('⚽');

  // Form states for Players
  const [playerFormOpen, setPlayerFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerNameForm, setPlayerNameForm] = useState('');
  const [playerTeamForm, setPlayerTeamForm] = useState('');
  const [playerTeamNameForm, setPlayerTeamNameForm] = useState('');
  const [playerNumForm, setPlayerNumForm] = useState<number>(10);
  const [playerPositionForm, setPlayerPositionForm] = useState<'GK' | 'DF' | 'MF' | 'FW'>('FW');
  const [detailedPlayer, setDetailedPlayer] = useState<Player | null>(null);

  // Form states for Referees
  const [refereeFormOpen, setRefereeFormOpen] = useState(false);
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);
  const [refereeNameForm, setRefereeNameForm] = useState('');
  const [refereePhoneForm, setRefereePhoneForm] = useState('');
  const [refereeTypeForm, setRefereeTypeForm] = useState<'main' | 'assistant' | 'fourth'>('main');

  // Form states for Match scheduling Edit CRUD
  const [matchEditFormOpen, setMatchEditFormOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matchEditHomeId, setMatchEditHomeId] = useState('');
  const [matchEditAwayId, setMatchEditAwayId] = useState('');
  const [matchEditStage, setMatchEditStage] = useState('');
  const [matchEditRefereeId, setMatchEditRefereeId] = useState('');
  const [matchEditDate, setMatchEditDate] = useState('');
  const [matchEditTime, setMatchEditTime] = useState('');
  const [matchEditScoreHome, setMatchEditScoreHome] = useState(0);
  const [matchEditScoreAway, setMatchEditScoreAway] = useState(0);
  const [matchEditStatus, setMatchEditStatus] = useState<Match['status']>('not_started');

  // Match management system
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [matchingStatus, setMatchingStatus] = useState<Match['status']>('not_started');
  const [matchEventTimer, setMatchEventTimer] = useState<number>(1); // defaulted to 1 for live match start or 45 depending
  const [matchEventPlayer, setMatchEventPlayer] = useState<string>('');
  const [matchEventType, setMatchEventType] = useState<'goal' | 'yellow_card' | 'red_card'>('goal');

  // Automatic Game Chrono helpers derived from currentMatch
  const isChronoRunning = currentMatch?.isChronoRunning ?? false;
  const chronoSeconds = currentMatch?.chronoSeconds ?? 0;
  const chronoSpeed = currentMatch?.chronoSpeed ?? 'normal';

  // 1. Automatic running clock ticker for ANY live and active matches in matches state!
  useEffect(() => {
    const interval = setInterval(() => {
      setMatches(prevMatches => {
        let changed = false;
        const nextMatches = prevMatches.map(m => {
          if (m.status === 'live' && m.isChronoRunning) {
            changed = true;
            const currentSecs = m.chronoSeconds ?? 0;
            const speed = m.chronoSpeed ?? 'normal';
            const increment = speed === 'fast' ? 60 : 1;
            const nextSecs = Math.min(120 * 60, currentSecs + increment);
            return {
              ...m,
              chronoSeconds: nextSecs
            };
          }
          return m;
        });
        if (changed) {
          return nextMatches;
        }
        return prevMatches;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Sync selected currentMatch with its state from the master matches list (for live ticking inside panels)
  useEffect(() => {
    if (currentMatch) {
      const matchInList = matches.find(m => m.id === currentMatch.id);
      if (matchInList) {
        if (
          currentMatch.chronoSeconds !== matchInList.chronoSeconds ||
          currentMatch.isChronoRunning !== matchInList.isChronoRunning ||
          currentMatch.chronoSpeed !== matchInList.chronoSpeed ||
          currentMatch.status !== matchInList.status ||
          currentMatch.scoreHome !== matchInList.scoreHome ||
          currentMatch.scoreAway !== matchInList.scoreAway ||
          currentMatch.events.length !== matchInList.events.length
        ) {
          setCurrentMatch(matchInList);
        }
      }
    }
  }, [matches, currentMatch?.id]);

  // 3. Synchronize the default event logging minute input with the live running minute
  useEffect(() => {
    if (currentMatch && currentMatch.status === 'live') {
      const liveMin = Math.min(120, Math.floor((currentMatch.chronoSeconds ?? 0) / 60) + 1);
      // Automatically keep matchEventTimer updated if chrono is running
      if (currentMatch.isChronoRunning) {
        setMatchEventTimer(liveMin);
      }
    }
  }, [currentMatch?.chronoSeconds, currentMatch?.isChronoRunning]);

  const formatChronoTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Active language state (ar, en, fr)
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('ftm_lang') as Language) || 'ar';
  });

  const [dashboardQrDataUrl, setDashboardQrDataUrl] = useState<string>('');

  const t = translations[language];

  // Tournament Setup Draw state
  const [drawType, setDrawType] = useState<TournamentType>('league');
  const [drawMessage, setDrawMessage] = useState<string | null>(null);

  // Single organizer assignment state
  const [organizerName, setOrganizerName] = useState<string>(() => {
    const pf = getInitialStoragePrefix();
    const saved = localStorage.getItem(`${pf}_tournaments`);
    const actId = localStorage.getItem(`${pf}_active_tournament_id`) || (pf === 'ftm' ? 'tour-1' : '');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Tournament[];
        const found = parsed.find(t => t.id === actId);
        if (found) return found.organizerName || (pf === 'ftm' ? 'أ. محمد الغامدي' : '');
      } catch (e) {}
    }
    return localStorage.getItem(`${pf}_organizer_name`) || (pf === 'ftm' ? 'أ. محمد الغامدي' : '');
  });

  // Participating teams selection state
  const [participatingTeamIds, setParticipatingTeamIds] = useState<string[]>(() => {
    const pf = getInitialStoragePrefix();
    const savedTournaments = localStorage.getItem(`${pf}_tournaments`);
    const actId = localStorage.getItem(`${pf}_active_tournament_id`) || (pf === 'ftm' ? 'tour-1' : '');
    if (savedTournaments) {
      try {
        const parsed = JSON.parse(savedTournaments) as Tournament[];
        const found = parsed.find(t => t.id === actId);
        if (found && found.participatingTeamIds) return found.participatingTeamIds;
      } catch (e) {}
    }
    const saved = localStorage.getItem(`${pf}_participating_team_ids`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return pf === 'ftm' ? INITIAL_TEAMS.map(t => t.id) : [];
  });

  const isSwappingTournament = useRef<boolean>(false);
  const loadedTournamentIdRef = useRef<string>(activeTournamentId);

  // Load selected tournament data when activeTournamentId changes
  useEffect(() => {
    const found = tournaments.find(t => t.id === activeTournamentId);
    if (found) {
      isSwappingTournament.current = true;
      setTournamentName(found.name || 'بطولة جديدة');
      setOrganizerName(found.organizerName || 'أ. محمد الغامدي');
      setParticipatingTeamIds(found.participatingTeamIds || []);
      setMatches(found.matches || []);
      setDrawType(found.drawType || 'league');
      loadedTournamentIdRef.current = activeTournamentId;
      setTimeout(() => {
        isSwappingTournament.current = false;
      }, 50);
    }
  }, [activeTournamentId]);

  // Synchronize changes to active tournament back to tournaments
  useEffect(() => {
    if (isSwappingTournament.current) return;
    if (loadedTournamentIdRef.current !== activeTournamentId) return;
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    setTournaments(prev => {
      const updated = prev.map(t => {
        if (t.id === activeTournamentId) {
          return {
            ...t,
            name: tournamentName,
            organizerName,
            participatingTeamIds,
            matches,
            drawType
          };
        }
        return t;
      });
      localStorage.setItem(`${pf}_tournaments`, JSON.stringify(updated));
      return updated;
    });
  }, [tournamentName, organizerName, participatingTeamIds, matches, drawType, activeTournamentId, viewingPrefix, isOrganizerVerified]);

  useEffect(() => {
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_active_tournament_id`, activeTournamentId);
  }, [activeTournamentId, viewingPrefix]);

  useEffect(() => {
    localStorage.setItem('ftm_lang', language);
  }, [language]);

  useEffect(() => {
    const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
    const liveUrl = `${cleanUrl}?view=live`;
    QRCode.toDataURL(liveUrl, {
      margin: 1,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => {
        setDashboardQrDataUrl(url);
      })
      .catch(err => {
        console.error('Error generating dashboard QR code:', err);
        setDashboardQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(liveUrl)}`);
      });
  }, []);

  useEffect(() => {
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_organizer_name`, organizerName);
  }, [organizerName, viewingPrefix, isOrganizerVerified]);

  useEffect(() => {
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_participating_team_ids`, JSON.stringify(participatingTeamIds));
  }, [participatingTeamIds, viewingPrefix, isOrganizerVerified]);

  useEffect(() => {
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_matches`, JSON.stringify(matches));
  }, [matches, viewingPrefix, isOrganizerVerified]);

  // Drawing simulation interactive state
  const [isDrawingInProgress, setIsDrawingInProgress] = useState<boolean>(false);
  const [drawingProgress, setDrawingProgress] = useState<number>(0);
  const [drawingStepText, setDrawingStepText] = useState<string>('');
  const [drawnMatchesSoFar, setDrawnMatchesSoFar] = useState<Match[]>([]);
  const [activelyDrawingM, setActivelyDrawingM] = useState<any | null>(null);

  // Custom persistent safe popups for iframe environment
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'danger' | 'info';
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'warning' | 'danger' | 'info' = 'warning'
  ) => {
    setCustomConfirm({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm(null);
      },
      type
    });
  };

  const triggerAlert = (title: string, message: string) => {
    setCustomAlert({
      isOpen: true,
      title,
      message
    });
  };

  const [showSuperAdminPanel, setShowSuperAdminPanel] = useState<boolean>(true);
  const [editingTourPinId, setEditingTourPinId] = useState<string | null>(null);
  const [customPinInput, setCustomPinInput] = useState<string>('');
  
  const [organizerLoginOpen, setOrganizerLoginOpen] = useState(false);
  const [organizerPinInput, setOrganizerPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ run: () => void } | null>(null);

  // Stored Private Accounts Database
  interface PrivateAccount {
    name: string;
    email: string;
    role: 'spectator' | 'organizer';
    favoriteTeamId?: string | null;
    passcode: string;
  }

  const [superAdminPins, setSuperAdminPins] = useState<string[]>(() => {
    const stored = localStorage.getItem('ftm_super_admin_pins');
    return stored ? JSON.parse(stored) : ['HAMADA-ADMIN', 'ADMIN@HAMADA', 'CREATOR-ADMIN'];
  });

  const [registeredAccounts, setRegisteredAccounts] = useState<PrivateAccount[]>(() => {
    const stored = localStorage.getItem('ftm_registered_accounts');
    let list: PrivateAccount[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch (e) {
        list = [];
      }
    }
    // Ensure Captain Hamada's account is seeded as the Owner Account if not present
    const hasOwner = list.some(acc => acc.name === 'كابتن حمادة' || acc.email === 'Hamada10gaoui@gmail.com');
    if (!hasOwner) {
      list.push({
        name: 'كابتن حمادة',
        email: 'Hamada10gaoui@gmail.com',
        role: 'organizer',
        favoriteTeamId: null,
        passcode: 'HAMADA-ADMIN'
      });
      localStorage.setItem('ftm_registered_accounts', JSON.stringify(list));
    }
    return list;
  });

  // State for editing personal account (as isolated registered user)
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editProfileFavTeamId, setEditProfileFavTeamId] = useState('');
  const [editProfilePasscode, setEditProfilePasscode] = useState('');
  const [editProfileError, setEditProfileError] = useState<string | null>(null);

  // Predictions state: { [matchId: string]: 'home' | 'away' | 'draw' }
  const [matchPredictions, setMatchPredictions] = useState<{ [matchId: string]: 'home' | 'away' | 'draw' }>(() => {
    const stored = localStorage.getItem('ftm_match_predictions');
    return stored ? JSON.parse(stored) : {};
  });

  // Team Cheers counter state: { [teamId: string]: number }
  const [teamCheers, setTeamCheers] = useState<{ [teamId: string]: number }>(() => {
    const stored = localStorage.getItem('ftm_team_cheers');
    return stored ? JSON.parse(stored) : {};
  });

  // Hot votes registry state: { [matchId: string]: { home: number, away: number, draw: number } }
  const [matchVotes, setMatchVotes] = useState<{ [matchId: string]: { home: number, away: number, draw: number } }>(() => {
    const stored = localStorage.getItem('ftm_match_votes');
    if (stored) return JSON.parse(stored);
    return {
      'm-1': { home: 18, away: 5, draw: 12 },
      'm-2': { home: 9, away: 15, draw: 4 },
      'm-3': { home: 22, away: 24, draw: 8 },
    };
  });

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [regNameInput, setRegNameInput] = useState('');
  const [regEmailInput, setRegEmailInput] = useState('');
  const [regRole, setRegRole] = useState<'spectator' | 'organizer'>('spectator');
  const [regFavTeamId, setRegFavTeamId] = useState<string>('');
  const [regPinInput, setRegPinInput] = useState('');
  const [regPasscode, setRegPasscode] = useState('');
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const handleRegisterUserSubmit = () => {
    const trimmedName = regNameInput.trim();
    if (!trimmedName) {
      setRegError(language === 'ar' ? 'الرجاء إدخال الاسم بالكامل!' : language === 'en' ? 'Please enter full name!' : 'Veuillez saisir votre nom complet !');
      return;
    }

    const trimmedPasscode = regPasscode.trim();
    if (!trimmedPasscode) {
      setRegError(language === 'ar' ? 'الرجاء إدخال رمز سري خاص بحسابك لحمايته!' : language === 'en' ? 'Please enter a private passcode to protect your account!' : 'Veuillez entrer un code secret pour votre compte !');
      return;
    }

    // Check if username already exists matching case-insensitively
    const accountExists = registeredAccounts.some(
      acc => acc.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (accountExists) {
      setRegError(t.registerErrorExists);
      return;
    }

    // No tournament PIN is verified during user signup, because registration is decoupled.
    // They establish their account with their own name and personal passcode.
    setIsOrganizerVerified(false);
    setIsSuperAdmin(false);
    localStorage.removeItem('ftm_is_organizer_verified');
    localStorage.removeItem('ftm_is_super_admin');

    const newAccount: PrivateAccount = {
      name: trimmedName,
      email: regEmailInput.trim(),
      role: regRole,
      favoriteTeamId: regRole === 'spectator' ? regFavTeamId || null : null,
      passcode: trimmedPasscode
    };

    // Save strictly to accounts directory pool
    const updatedAccounts = [...registeredAccounts, newAccount];
    setRegisteredAccounts(updatedAccounts);
    localStorage.setItem('ftm_registered_accounts', JSON.stringify(updatedAccounts));

    // Sign in the user
    const newUserSession = {
      name: trimmedName,
      email: regEmailInput.trim(),
      role: regRole,
      favoriteTeamId: regRole === 'spectator' ? regFavTeamId || null : null
    };
    setRegisteredUser(newUserSession);
    localStorage.setItem('ftm_registered_user', JSON.stringify(newUserSession));
    setRegisterModalOpen(false);

    // Reset inputs
    setRegNameInput('');
    setRegEmailInput('');
    setRegRole('spectator');
    setRegFavTeamId('');
    setRegPinInput('');
    setRegPasscode('');
    setRegError(null);

    triggerAlert(
      language === 'ar' ? 'تم التسجيل بنجاح! 🎉' : language === 'en' ? 'Registered Successfully! 🎉' : 'Inscription réussie ! 🎉',
      language === 'ar' 
        ? `مرحباً بك يا كابتن ${trimmedName}! تم تسجيل حسابك كـ ${regRole === 'organizer' ? 'منظم للبطولة 🔑' : 'مشاهد مباشر للنتائج 📣'} بنجاح وحمايته برمزك السري الخاص.` 
        : language === 'en'
        ? `Welcome Captain ${trimmedName}! Registered successfully as a ${regRole === 'organizer' ? 'Tournament Organizer 🔑' : 'Live Results Spectator 📣'} with your private passcode.`
        : `Bienvenue Capitaine ${trimmedName} ! Enregistré comme ${regRole === 'organizer' ? 'Organisateur 🔑' : 'Spectateur 📣'} sécurisé par votre code secret.`
    );
  };

  const handleLoginUserSubmit = () => {
    const trimmedName = loginNameInput.trim();
    const trimmedPassword = loginPasswordInput.trim();

    if (!trimmedName || !trimmedPassword) {
      setRegError(language === 'ar' ? 'الرجاء إدخال الاسم والرمز السري الخاص بك!' : language === 'en' ? 'Please enter both account name and passcode!' : 'Veuillez saisir votre nom et code de passe !');
      return;
    }

    // Find the account Case-Insensitively
    const matchedAccount = registeredAccounts.find(
      acc => acc.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (!matchedAccount || matchedAccount.passcode !== trimmedPassword) {
      setRegError(t.loginErrorNotFound);
      return;
    }

    // Successfully matching passcode & name
    const newUserSession = {
      name: matchedAccount.name, // preservation of original name casing
      email: matchedAccount.email,
      role: matchedAccount.role,
      favoriteTeamId: matchedAccount.favoriteTeamId || null
    };

    setRegisteredUser(newUserSession);
    localStorage.setItem('ftm_registered_user', JSON.stringify(newUserSession));

    const isOwner = matchedAccount.name === 'كابتن حمادة' || matchedAccount.email === 'Hamada10gaoui@gmail.com';
    if (isOwner || superAdminPins.includes(matchedAccount.passcode.toUpperCase())) {
      setIsSuperAdmin(true);
      setIsOrganizerVerified(true);
      localStorage.setItem('ftm_is_super_admin', 'true');
      localStorage.setItem('ftm_is_organizer_verified', 'true');
    } else {
      setIsSuperAdmin(false);
      localStorage.removeItem('ftm_is_super_admin');
      // We restore isOrganizerVerified dynamically or ask them for current tournament's passcode
      const previouslyVerified = verifiedTournamentIds.includes(activeTournamentId);
      setIsOrganizerVerified(previouslyVerified);
      if (previouslyVerified) {
        localStorage.setItem('ftm_is_organizer_verified', 'true');
      } else {
        localStorage.removeItem('ftm_is_organizer_verified');
      }
    }

    setRegisterModalOpen(false);
    
    // Clear login fields
    setLoginNameInput('');
    setLoginPasswordInput('');
    setRegError(null);

    triggerAlert(
      language === 'ar' ? 'تم الدخول بنجاح! 🔑' : language === 'en' ? 'Signed In Successfully! 🔑' : 'Connexion réussie ! 🔑',
      t.loginSuccessMsg
    );
  };

  const handlePredictMatch = (matchId: string, predict: 'home' | 'away' | 'draw') => {
    if (!registeredUser) {
      setRegisterModalOpen(true);
      setRegRole('spectator');
      return;
    }

    const updated = {
      ...matchPredictions,
      [matchId]: predict
    };
    setMatchPredictions(updated);
    localStorage.setItem('ftm_match_predictions', JSON.stringify(updated));

    setMatchVotes(prev => {
      const current = prev[matchId] || { home: 12, away: 8, draw: 6 };
      const nextVotes = {
        ...current,
        [predict]: current[predict] + 1
      };
      const allVotes = {
        ...prev,
        [matchId]: nextVotes
      };
      localStorage.setItem('ftm_match_votes', JSON.stringify(allVotes));
      return allVotes;
    });

    triggerAlert(t.voteSuccess, language === 'ar' ? 'تم تسجيل توقعك للفائز! يمكنك رؤية نسب تصويتات الجماهير ترتفع مباشرة لشحن حماس الجولة.' : language === 'en' ? 'Your winner prediction is recorded! Live spectator prediction percentages are updated.' : 'Votre pronostic a bien été pris en compte !');
  };

  const handleCheerTeam = (teamId: string, teamName: string) => {
    const currentCount = teamCheers[teamId] || 0;
    const updated = {
      ...teamCheers,
      [teamId]: currentCount + 1
    };
    setTeamCheers(updated);
    localStorage.setItem('ftm_team_cheers', JSON.stringify(updated));

    triggerAlert(
      language === 'ar' ? 'حرارة الجماهير ملتهبة! 🔥' : language === 'en' ? 'Fan Support is blazing! 🔥' : 'Ambiance de folie ! 🔥',
      t.cheeredTo.replace('{team}', teamName) + (language === 'ar' ? ` (مجموع تشجيعاتك: ${currentCount + 1} 📣)` : ` (Total cheers: ${currentCount + 1} 📣)`)
    );
  };

  const handleLogoutAccount = () => {
    setRegisteredUser(null);
    localStorage.removeItem('ftm_registered_user');
    setVerifiedTournamentIds([]);
    localStorage.removeItem('ftm_verified_tournament_ids');
    setIsOrganizerVerified(false);
    setIsSuperAdmin(false);
    localStorage.removeItem('ftm_is_organizer_verified');
    localStorage.removeItem('ftm_is_super_admin');
    triggerAlert(
      language === 'ar' ? 'تم الخروج بنجاح' : language === 'en' ? 'Logged Out Successfully' : 'Déconnexion réussie',
      language === 'ar' ? 'تم حذف صلاحياتك ومسح ملفك الشخصي بنجاح والعودة كزائر مجهول.' : language === 'en' ? 'Successfully removed user profile and returned to anonymous visitor mode.' : 'Profil effacé avec succès. Retour au mode anonyme.'
    );
  };

  const handleOpenProfileModal = () => {
    if (!registeredUser) return;
    const matched = registeredAccounts.find(acc => acc.name.toLowerCase() === registeredUser.name.toLowerCase());
    setEditProfileName(registeredUser.name);
    setEditProfileEmail(registeredUser.email || '');
    setEditProfileFavTeamId(registeredUser.favoriteTeamId || '');
    setEditProfilePasscode(matched ? matched.passcode : '');
    setEditProfileError(null);
    setProfileModalOpen(true);
  };

  const handleUpdateUserProfile = () => {
    if (!registeredUser) return;
    const trimmedName = editProfileName.trim();
    const trimmedEmail = editProfileEmail.trim();
    const trimmedPasscode = editProfilePasscode.trim();

    if (!trimmedName) {
      setEditProfileError(language === 'ar' ? 'الرجاء إدخال الاسم بالكامل!' : 'Please enter your name!');
      return;
    }
    if (!trimmedPasscode) {
      setEditProfileError(language === 'ar' ? 'الرجاء إدخال رمز سري خاص بحسابك لحمايته!' : 'Please enter a passcode!');
      return;
    }

    // Check if another account has the same name
    const exists = registeredAccounts.some(
      acc => acc.name.toLowerCase() === trimmedName.toLowerCase() && acc.name.toLowerCase() !== registeredUser.name.toLowerCase()
    );
    if (exists) {
      setEditProfileError(language === 'ar' ? 'اسم المستخدم هذا مسجل بالفعل لحساب آخر! اختر اسماً فريداً.' : 'This account name is already registered!');
      return;
    }

    // Now update
    const updatedList = registeredAccounts.map(acc => {
      if (acc.name.toLowerCase() === registeredUser.name.toLowerCase()) {
        const isOwner = acc.name === 'كابتن حمادة';
        const updatedAcc = {
          ...acc,
          name: trimmedName,
          email: trimmedEmail,
          favoriteTeamId: acc.role === 'spectator' ? editProfileFavTeamId || null : null,
          passcode: trimmedPasscode
        };

        // If the updated account is the App Owner ("كابتن حمادة"), update superAdminPins with their passcode too!
        if (isOwner || trimmedName === 'كابتن حمادة') {
          setSuperAdminPins(prev => {
            const nextPins = [...prev];
            // Replace first admin pin with the new passcode
            nextPins[0] = trimmedPasscode.toUpperCase();
            localStorage.setItem('ftm_super_admin_pins', JSON.stringify(nextPins));
            return nextPins;
          });
        }
        return updatedAcc;
      }
      return acc;
    });

    setRegisteredAccounts(updatedList);
    localStorage.setItem('ftm_registered_accounts', JSON.stringify(updatedList));

    const updatedUserSession = {
      name: trimmedName,
      email: trimmedEmail,
      role: registeredUser.role,
      favoriteTeamId: registeredUser.role === 'spectator' ? editProfileFavTeamId || null : null
    };

    setRegisteredUser(updatedUserSession);
    localStorage.setItem('ftm_registered_user', JSON.stringify(updatedUserSession));

    // If role was organizer, ensure organiser flags persist
    if (registeredUser.role === 'organizer') {
      setIsOrganizerVerified(true);
      localStorage.setItem('ftm_is_organizer_verified', 'true');
      // If it is Captain Hamada, set superAdmin state true
      if (trimmedName === 'كابتن حمادة' || superAdminPins.includes(trimmedPasscode.toUpperCase())) {
        setIsSuperAdmin(true);
        localStorage.setItem('ftm_is_super_admin', 'true');
      }
    }

    setProfileModalOpen(false);
    triggerAlert(
      language === 'ar' ? 'تم تحديث بيانات حسابك بنجاح! 👤✨' : 'Account updated successfully! 👤✨',
      language === 'ar' 
        ? 'تم عزل وحفظ تعديلات حسابك الشخصي ورمزك السري الجديد بنجاح في قاعدة البيانات المحلية.'
        : 'Your account profile settings and new passcode have been secured in the local database.'
    );
  };

  const handleAdminBypassLogin = (account: PrivateAccount) => {
    const newUserSession = {
      name: account.name,
      email: account.email,
      role: account.role,
      favoriteTeamId: account.favoriteTeamId || null
    };
    setRegisteredUser(newUserSession);
    localStorage.setItem('ftm_registered_user', JSON.stringify(newUserSession));
    
    if (account.role === 'organizer') {
      setIsOrganizerVerified(true);
      localStorage.setItem('ftm_is_organizer_verified', 'true');
    } else {
      setIsOrganizerVerified(false);
      localStorage.removeItem('ftm_is_organizer_verified');
    }

    // Check if logged into Captain Hamada's account
    if (account.name === 'كابتن حمادة' || superAdminPins.includes(account.passcode.toUpperCase())) {
      setIsSuperAdmin(true);
      localStorage.setItem('ftm_is_super_admin', 'true');
    } else {
      setIsSuperAdmin(false);
      localStorage.removeItem('ftm_is_super_admin');
    }

    triggerAlert(
      language === 'ar' ? 'تم الدخول المباشر للحساب! 🔑' : 'Bypass login successful! 🔑',
      language === 'ar'
        ? `بصفتك مالك التطبيق، تم تسجيل دخولك بنجاح وبشكل فوري لحساب: "${account.name}".`
        : `As the app owner, you have successfully logged into the account of: "${account.name}".`
    );
  };

  const handleAdminUpdateOwnerPasscode = (newName: string, newPasscode: string) => {
    const updatedList = registeredAccounts.map(acc => {
      // Find the App Owner account ("كابتن حمادة" or email containing Hamada)
      if (acc.name === 'كابتن حمادة' || acc.email === 'Hamada10gaoui@gmail.com') {
        const nextAcc = {
          ...acc,
          name: newName.trim() || acc.name,
          passcode: newPasscode.trim()
        };
        // Also update superAdminPins so he can use the new passcode to log in as Super Admin next time!
        setSuperAdminPins(prev => {
          const nextPins = [...prev];
          nextPins[0] = newPasscode.trim().toUpperCase();
          localStorage.setItem('ftm_super_admin_pins', JSON.stringify(nextPins));
          return nextPins;
        });
        return nextAcc;
      }
      return acc;
    });

    setRegisteredAccounts(updatedList);
    localStorage.setItem('ftm_registered_accounts', JSON.stringify(updatedList));

    // If currently logged in as Captain Hamada, update the active session too!
    if (registeredUser && (registeredUser.name === 'كابتن حمادة' || registeredUser.email === 'Hamada10gaoui@gmail.com')) {
      setRegisteredUser(prev => {
        if (!prev) return null;
        const nextUser = { ...prev, name: newName.trim() || prev.name };
        localStorage.setItem('ftm_registered_user', JSON.stringify(nextUser));
        return nextUser;
      });
    }

    triggerAlert(
      language === 'ar' ? 'تم حفظ وتحديث رمز المالك! 👑' : 'Owner passcode updated! 👑',
      language === 'ar'
        ? `تم بنجاح تحديث الاسم والرمز السري لحساب مالك التطبيق الحصري إلى: "${newPasscode.trim()}". هذا الرمز مُعزّز بمستويات الحماية الفائقة.`
        : `Successfully updated the owner's account passcode to: "${newPasscode.trim()}" in secure storage.`
    );
  };

  const [isSuperAdminLoginTab, setIsSuperAdminLoginTab] = useState<boolean>(false);

  const checkOrganizerPermission = (onSuccess: () => void) => {
    setIsSuperAdminLoginTab(false);
    if (isOrganizerVerified) {
      onSuccess();
    } else {
      setPendingAction({ run: onSuccess });
      setOrganizerLoginOpen(true);
      setPinError(null);
      setOrganizerPinInput('');
    }
  };

  const handleTabChange = (tab: 'dashboard' | 'teams' | 'players' | 'referees' | 'matches' | 'draw') => {
    setActiveTab(tab);
    if (tab === 'draw') {
      setDrawMessage(null);
    }
    setTimeout(() => {
      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

   const handleOrganizerLogin = () => {
    const activeTour = tournaments.find(t => t.id === activeTournamentId);
    const enteredPin = organizerPinInput.trim();
    
    // Helper function to convert Arabic numerals to English
    const convertArabicNumeralsToEnglish = (str: string) => {
      const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return str.replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
    };

    const enteredPinNormalized = convertArabicNumeralsToEnglish(enteredPin);
    const enteredPinUpper = enteredPinNormalized.toUpperCase();

    if (superAdminPins.includes(enteredPinUpper)) {
      setIsSuperAdmin(true);
      setIsOrganizerVerified(true);
      localStorage.setItem('ftm_is_super_admin', 'true');
      localStorage.setItem('ftm_is_organizer_verified', 'true');
      setOrganizerLoginOpen(false);
      setOrganizerPinInput('');
      setPinError(null);

      setTimeout(() => {
        triggerAlert(
          'مرحباً بك يا مدير التطبيق والمطور! 👑✨',
          'تم تفعيل وضع المدير العام الفائق (Creator Super Admin) بنجاح. لقد حصلت على صلاحيات التحكم الكاملة في جميع البطولات، وعرض وتحديث كودات الدخول، وتعديل أي جزء في البيانات للحفاظ على سير العمل.'
        );
        if (pendingAction) {
          pendingAction.run();
          setPendingAction(null);
        }
      }, 300);
      return;
    }

    const validPins = ['2026'];
    if (activeTour?.pin) {
      validPins.push(convertArabicNumeralsToEnglish(activeTour.pin.trim()));
    }

    if (validPins.includes(enteredPinNormalized)) {
      setVerifiedTournamentIds(prev => {
        if (!prev.includes(activeTournamentId)) {
          const next = [...prev, activeTournamentId];
          localStorage.setItem('ftm_verified_tournament_ids', JSON.stringify(next));
          return next;
        }
        return prev;
      });
      setIsOrganizerVerified(true);
      localStorage.setItem('ftm_is_organizer_verified', 'true');
      setOrganizerLoginOpen(false);
      setOrganizerPinInput('');
      setPinError(null);
      
      setTimeout(() => {
        triggerAlert(
          'تم التحقق بنجاح 🔑',
          `مرحباً بك يا كابتن! تم تفعيل وضع المنظم بنجاح لبطولة "${activeTour?.name || ''}"، وامتلاك صلاحيات تعديل وإضافة الفرق وإدخال النتائج وتعديل المباريات بالكامل.`
        );
        if (pendingAction) {
          pendingAction.run();
          setPendingAction(null);
        }
      }, 300);
    } else {
      setPinError('رمز الدخول غير صحيح! يرجى المحاولة مرة أخرى أو كتابة الرمز الصحيح الذي حصلت عليه عند إنشاء البطولة.');
    }
  };

  const handleOrganizerLogout = () => {
    setIsOrganizerVerified(false);
    setIsSuperAdmin(false);
    setVerifiedTournamentIds([]);
    localStorage.removeItem('ftm_verified_tournament_ids');
    localStorage.removeItem('ftm_is_organizer_verified');
    localStorage.removeItem('ftm_is_super_admin');
    triggerAlert('تم الخروج', 'تم تسجيل الخروج من وضع المنظم والمسؤول والعودة لوضع المشاهدة للقراءة فقط.');
  };

  const handleUpdateTournamentPin = (tournamentId: string, newPin: string) => {
    setTournaments(prev => {
      const updated = prev.map(t => {
        if (t.id === tournamentId) {
          return { ...t, pin: newPin };
        }
        return t;
      });
      localStorage.setItem('ftm_tournaments', JSON.stringify(updated));
      return updated;
    });
    triggerAlert('تم تحديث رمز الدخول 🔑', 'تم تغيير كلمة مرور البطولة وعرضها بنجاح!');
  };

  const handleDeleteTournamentByAdmin = (tourId: string) => {
    if (tournaments.length <= 1) {
      triggerAlert('خطأ 🗑️', 'لا يمكن حذف كافة البطولات بقاعدة البيانات. يجب بقاء بطولة واحدة على الأقل في السجلات المتاحة.');
      return;
    }
    const remaining = tournaments.filter(t => t.id !== tourId);
    setTournaments(remaining);
    localStorage.setItem('ftm_tournaments', JSON.stringify(remaining));
    if (activeTournamentId === tourId) {
      setActiveTournamentId(remaining[0].id);
    }
    triggerAlert('تم الحذف النهائي 🗑️', 'تم حذف البطولة وصلاحياتها بالكامل بنجاح!');
  };

  // URL checking hook to load correct match context when scanning QR codes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const matchId = params.get('matchId');
    if (view === 'referee-portal' && matchId) {
      const matchObj = matches.find(m => m.id === matchId);
      if (matchObj && (!currentMatch || currentMatch.id !== matchId)) {
        setCurrentMatch(matchObj);
        setMatchingStatus(matchObj.status);
      }
    }
  }, [matches, currentMatch]);

  // ----------------------------------------------------
  // Sync to local storage
  // ----------------------------------------------------
  useEffect(() => {
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_teams`, JSON.stringify(teams));
  }, [teams, viewingPrefix, isOrganizerVerified]);

  useEffect(() => {
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_players`, JSON.stringify(players));
  }, [players, viewingPrefix, isOrganizerVerified]);

  useEffect(() => {
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_referees`, JSON.stringify(referees));
  }, [referees, viewingPrefix, isOrganizerVerified]);

  useEffect(() => {
    if (!isOrganizerVerified) return; // PREVENT SPECTATOR/VISITOR MUTATION
    const pf = viewingPrefix;
    if (loadedPrefixRef.current !== pf) return; // PREVENT MUTATION ON TRANSITION
    localStorage.setItem(`${pf}_matches`, JSON.stringify(matches));
  }, [matches, viewingPrefix, isOrganizerVerified]);

  // Keep verified tournament IDs synced to local storage
  useEffect(() => {
    localStorage.setItem('ftm_verified_tournament_ids', JSON.stringify(verifiedTournamentIds));
  }, [verifiedTournamentIds]);

  // Synchronize viewingPrefix with active logged in organizer/admin
  useEffect(() => {
    const defaultPf = getStoragePrefix(registeredUser, isSuperAdmin);
    setViewingPrefix(defaultPf);
  }, [registeredUser, isSuperAdmin]);

  // Dynamically resolve tournament organizer verification status
  useEffect(() => {
    if (!registeredUser) {
      setIsOrganizerVerified(false);
      localStorage.removeItem('ftm_is_organizer_verified');
      return;
    }
    const isOwner = registeredUser.name === 'كابتن حمادة' || registeredUser.email === 'Hamada10gaoui@gmail.com';
    const myPrefix = getStoragePrefix(registeredUser, isSuperAdmin);
    const isCustomOrganizerAuthorized = registeredUser.role === 'organizer' && myPrefix !== 'ftm' && myPrefix === viewingPrefix;

    if (isSuperAdmin || isOwner || isCustomOrganizerAuthorized) {
      setIsOrganizerVerified(true);
      localStorage.setItem('ftm_is_organizer_verified', 'true');
    } else {
      const isVerified = verifiedTournamentIds.includes(activeTournamentId);
      setIsOrganizerVerified(isVerified);
      if (isVerified) {
        localStorage.setItem('ftm_is_organizer_verified', 'true');
      } else {
        localStorage.removeItem('ftm_is_organizer_verified');
      }
    }
  }, [activeTournamentId, isSuperAdmin, verifiedTournamentIds, registeredUser, viewingPrefix]);

  // Guard protected tournament setup tabs for organizers only
  useEffect(() => {
    if (!isOrganizerVerified && activeTab === 'draw') {
      setActiveTab('dashboard');
    }
  }, [isOrganizerVerified, activeTab]);

  // Dynamically reload whole data list states whenever active user profile or selected viewingPrefix changes
  useEffect(() => {
    const pf = viewingPrefix;
    
    // Load Tournaments
    let tList: Tournament[] = [];
    const savedTour = localStorage.getItem(`${pf}_tournaments`);
    if (savedTour) {
      try {
        tList = JSON.parse(savedTour);
      } catch (e) {
        tList = [];
      }
    } else {
      if (pf === 'ftm') {
        tList = [
          {
            id: 'tour-1',
            name: 'كأس التفوق الميداني',
            organizerName: 'أ. محمد الغامدي',
            participatingTeamIds: ['team-1', 'team-2', 'team-3', 'team-4'],
            matches: [],
            drawType: 'league'
          }
        ];
      } else {
        tList = []; // Clean slate for new organizers
      }
    }
    setTournaments(tList);

    // Load active tournament ID
    let actId = localStorage.getItem(`${pf}_active_tournament_id`);
    if (!actId) {
      actId = tList.length > 0 ? tList[0].id : '';
    }
    setActiveTournamentId(actId);

    // Load Teams
    let teamList: Team[] = [];
    const savedTeams = localStorage.getItem(`${pf}_teams`);
    if (savedTeams) {
      try {
        teamList = JSON.parse(savedTeams);
      } catch (e) {
        teamList = [];
      }
    } else {
      teamList = pf === 'ftm' ? INITIAL_TEAMS : [];
    }
    setTeams(teamList);

    // Load Players
    let playerList: Player[] = [];
    const savedPlayers = localStorage.getItem(`${pf}_players`);
    if (savedPlayers) {
      try {
        playerList = JSON.parse(savedPlayers);
      } catch (e) {
        playerList = [];
      }
    } else {
      playerList = pf === 'ftm' ? INITIAL_PLAYERS : [];
    }
    setPlayers(playerList);

    // Load Referees
    let refList: Referee[] = [];
    const savedRefs = localStorage.getItem(`${pf}_referees`);
    if (savedRefs) {
      try {
        refList = JSON.parse(savedRefs);
      } catch (e) {
        refList = [];
      }
    } else {
      refList = pf === 'ftm' ? INITIAL_REFEREES : [];
    }
    setReferees(refList);

    // Load matches & active tournament details
    const activeTourObj = tList.find(t => t.id === actId);
    if (activeTourObj) {
      setTournamentName(activeTourObj.name || '');
      setOrganizerName(activeTourObj.organizerName || '');
      setParticipatingTeamIds(activeTourObj.participatingTeamIds || []);
      setMatches(activeTourObj.matches || []);
      setDrawType(activeTourObj.drawType || 'league');
    } else {
      setTournamentName('');
      setOrganizerName('');
      setParticipatingTeamIds([]);
      setMatches([]);
      setDrawType('league');
    }

    // Set loadedPrefixRef to avoid overwriting clean slate data during transition
    loadedPrefixRef.current = pf;
  }, [viewingPrefix]);

  // Keep playerTeamNameForm synchronized if playerTeamForm changes
  useEffect(() => {
    if (playerTeamForm) {
      const selectedTeam = teams.find(t => t.id === playerTeamForm);
      if (selectedTeam) {
        setPlayerTeamNameForm(selectedTeam.name);
      }
    } else {
      setPlayerTeamNameForm('');
    }
  }, [playerTeamForm, teams]);

  // Construct sharing dynamic link
  const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
  const liveUrl = `${cleanUrl}?view=live`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(liveUrl)}`;

  // ----------------------------------------------------
  // Recalculating Dynamic Statistics
  // ----------------------------------------------------
  const standings = computeStandings(teams, matches);
  const playerStatsList = computePlayerStats(players, matches);
  
  // High scorers sorted list
  const topScorers = [...playerStatsList]
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'ar'))
    .slice(0, 10);

  // General counts and statistics
  const liveCount = matches.filter(m => m.status === 'live').length;
  const finishedCount = matches.filter(m => m.status === 'finished').length;
  const pendingCount = matches.filter(m => m.status === 'not_started').length;
  const totalGoalsCount = matches.reduce((acc, match) => acc + match.scoreHome + match.scoreAway, 0);

  // Jakob's Law helper: Render team's recent form circles (WIN, LOSS, DRAW)
  const renderFormCircles = (teamId: string) => {
    const teamFinishedMatches = matches
      .filter(m => m.status === 'finished' && (m.homeTeamId === teamId || m.awayTeamId === teamId));
    const formResults = teamFinishedMatches.slice(-5).map(m => {
      const isHome = m.homeTeamId === teamId;
      const teamScore = isHome ? m.scoreHome : m.scoreAway;
      const oppScore = isHome ? m.scoreAway : m.scoreHome;
      if (teamScore > oppScore) return 'W';
      if (teamScore < oppScore) return 'L';
      return 'D';
    });

    return (
      <div className="flex gap-0.5 justify-center items-center" dir="ltr">
        {formResults.map((res, i) => {
          let bgClass = 'bg-slate-850 text-slate-400 border-slate-700/60';
          if (res === 'W') bgClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/25';
          if (res === 'L') bgClass = 'bg-rose-500/20 text-rose-450 text-rose-400 border-rose-500/25';
          return (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-black border ${bgClass}`}
              title={res === 'W' ? 'Win (فوز)' : res === 'L' ? 'Loss (خسارة)' : 'Draw (تعادل)'}
            >
              {res}
            </span>
          );
        })}
        {formResults.length === 0 && (
          <span className="text-[10px] text-slate-600 font-mono">-</span>
        )}
      </div>
    );
  };

  // Jakob's Law helper: Render goals in real SofaScore / FotMob split layout
  const renderInlineScorers = (match: Match) => {
    const goals = match.events.filter(e => e.type === 'goal' || e.type === 'own_goal');
    if (goals.length === 0) return null;

    const homeScorers = goals.filter(e => {
      return (e.type === 'goal' && e.teamId === match.homeTeamId) || (e.type === 'own_goal' && e.teamId === match.awayTeamId);
    });

    const awayScorers = goals.filter(e => {
      return (e.type === 'goal' && e.teamId === match.awayTeamId) || (e.type === 'own_goal' && e.teamId === match.homeTeamId);
    });

    return (
      <div className="border-t border-slate-800/40 mt-3 pt-2.5 flex flex-col gap-0.5 text-[9px] text-slate-400 font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className={`grid grid-cols-2 gap-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          {/* Home scorers */}
          <div className="space-y-0.5">
            {homeScorers.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 truncate">
                <span className="text-emerald-400">⚽</span>
                <span className="font-semibold text-slate-300">{s.playerName}</span>
                <span className="text-slate-500 font-mono text-[8px]">{s.minute}'</span>
                {s.type === 'own_goal' && <span className="text-rose-455 text-[8px] font-bold">(OG)</span>}
              </div>
            ))}
          </div>
          {/* Away scorers */}
          <div className="space-y-0.5">
            {awayScorers.map(s => (
              <div key={s.id} className={`flex items-center gap-1.5 truncate ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                {language === 'ar' ? (
                  <>
                    <span className="text-emerald-400">⚽</span>
                    <span className="font-semibold text-slate-300">{s.playerName}</span>
                    <span className="text-slate-500 font-mono text-[8px]">{s.minute}'</span>
                    {s.type === 'own_goal' && <span className="text-rose-455 text-[8px] font-bold">(OG)</span>}
                  </>
                ) : (
                  <>
                    {s.type === 'own_goal' && <span className="text-rose-455 text-[8px] font-bold">(OG)</span>}
                    <span className="text-slate-500 font-mono text-[8px]">{s.minute}'</span>
                    <span className="font-semibold text-slate-300">{s.playerName}</span>
                    <span className="text-emerald-400">⚽</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // Exporters for Results & Statistics (تحميل النتائج والإحصائيات)
  // ----------------------------------------------------
  const handleExportTeamsCsv = () => {
    const isAr = language === 'ar';
    const headers = isAr 
      ? ['الترتيب', 'اسم الفريق', 'اللقب/المجموعة', 'الصف/الجهة', 'المدينة', 'المباريات الملعوبة', 'النقاط', 'فوز', 'تعادل', 'خسارة', 'له من الأهداف', 'عليه من الأهداف', 'فارق الأهداف']
      : ['Rank', 'Team Name', 'Group', 'School/Class', 'City', 'Played', 'Points', 'Wins', 'Draws', 'Losses', 'Goals For', 'Goals Against', 'Goal Difference'];
    
    const rows = standings.map((team, idx) => [
      (idx + 1).toString(),
      team.name,
      team.group || '',
      team.schoolClass || '',
      team.city || '',
      team.played.toString(),
      team.points.toString(),
      team.wins.toString(),
      team.draws.toString(),
      team.losses.toString(),
      team.goalsFor.toString(),
      team.goalsAgainst.toString(),
      team.goalDifference.toString()
    ]);

    exportToCSV(`teams_standings_${activeTournamentId}.csv`, headers, rows);
  };

  const handleExportMatchesCsv = () => {
    const isAr = language === 'ar';
    const headers = isAr
      ? ['رقم المباراة', 'الدور / الجولة', 'المجموعة', 'الفريق المستضيف', 'النتيجة', 'الفريق الضيف', 'الحكم', 'التاريخ', 'الوقت', 'الحالة', 'الأحداث']
      : ['Match #', 'Stage / Round', 'Group', 'Home Team', 'Score', 'Away Team', 'Referee', 'Date', 'Time', 'Status', 'Events'];
    
    const rows = matches.map((match, idx) => {
      const scoreString = match.status === 'not_started' 
        ? 'VS' 
        : `${match.scoreHome} - ${match.scoreAway}`;
      
      const statusStr = match.status === 'live' 
        ? (isAr ? 'مباشر الآن' : 'Live Now') 
        : match.status === 'finished' 
        ? (isAr ? 'منتهية' : 'Completed') 
        : (isAr ? 'لم تبدأ' : 'Not Started');

      const eventsFormatted = match.events && match.events.length > 0
        ? match.events.map(ev => {
            const evTypeStr = ev.type === 'goal' ? (isAr ? 'هدف' : 'Goal')
              : ev.type === 'yellow_card' ? (isAr ? 'إنذار أصفر' : 'Yellow Card')
              : ev.type === 'red_card' ? (isAr ? 'طرد أحمر' : 'Red Card')
              : (isAr ? 'هدف عكسي' : 'Own Goal');
            return `${ev.playerName} (${evTypeStr} - ${ev.minute}')`;
          }).join(' | ')
        : (isAr ? 'بدون أحداث مسجلة' : 'No recorded events');

      return [
        (idx + 1).toString(),
        match.stage || '',
        match.group || '',
        match.homeTeamName,
        scoreString,
        match.awayTeamName,
        match.refereeName || (isAr ? 'غير محدد' : 'Not assigned'),
        match.date,
        match.time,
        statusStr,
        eventsFormatted
      ];
    });

    exportToCSV(`matches_results_${activeTournamentId}.csv`, headers, rows);
  };

  const handleExportPlayersCsv = () => {
    const isAr = language === 'ar';
    const headers = isAr
      ? ['رقم اللاعب', 'الاسم', 'الفريق', 'المركز', 'الأهداف المسجلة', 'البطاقات الصفراء', 'البطاقات الحمراء']
      : ['Jersey #', 'Player Name', 'Team Name', 'Position', 'Goals Scored', 'Yellow Cards', 'Red Cards'];
    
    const rows = playerStatsList.map(player => {
      const positionStr = player.position === 'GK' ? (isAr ? 'حارس مرمى' : 'Goalkeeper')
        : player.position === 'DF' ? (isAr ? 'مدافع' : 'Defender')
        : player.position === 'MF' ? (isAr ? 'وسط' : 'Midfielder')
        : (isAr ? 'مهاجم' : 'Forward');

      return [
        player.number.toString(),
        player.name,
        player.teamName,
        positionStr,
        player.goals.toString(),
        player.yellowCards.toString(),
        player.redCards.toString()
      ];
    });

    exportToCSV(`players_statistics_${activeTournamentId}.csv`, headers, rows);
  };

  const handleDownloadHtmlReport = () => {
    const isAr = language === 'ar';
    const dirAttr = isAr ? 'rtl' : 'ltr';
    const reportDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Inter:wght@300;400;600;700;800&display=swap');`;

    const teamsHtml = standings.map((team, idx) => {
      const diffSign = team.goalDifference > 0 ? '+' : '';
      return `
        <tr class="hover:bg-slate-50/50">
          <td class="py-3 px-3 text-center font-bold">
            <span class="inline-flex items-center justify-center bg-slate-100 text-slate-800 rounded-full h-5 w-5 text-[10px] font-black">${idx + 1}</span>
          </td>
          <td class="py-3 px-3 font-black text-slate-900">${team.name}</td>
          <td class="py-3 px-3 text-center font-bold text-indigo-600">${team.group || '-'}</td>
          <td class="py-3 px-3 text-center">${team.played}</td>
          <td class="py-3 px-3 text-center">${team.wins}</td>
          <td class="py-3 px-3 text-center">${team.draws}</td>
          <td class="py-3 px-3 text-center">${team.losses}</td>
          <td class="py-3 px-3 text-center text-emerald-600 font-bold">${team.goalsFor}</td>
          <td class="py-3 px-3 text-center text-rose-500">${team.goalsAgainst}</td>
          <td class="py-3 px-3 text-center font-bold">${diffSign}${team.goalDifference}</td>
          <td class="py-3 px-3 text-center font-extrabold text-indigo-600 text-[13px]">${team.points}</td>
        </tr>
      `;
    }).join('');

    const matchesHtml = matches.length === 0
      ? `<div class="text-center py-6 text-slate-400 font-bold text-xs">${isAr ? 'لا يوجد مباريات مسجلة حالياً' : 'No matches updated yet.'}</div>`
      : matches.map((match) => {
          const roundName = match.stage || (isAr ? 'الجولة' : 'Round');
          const grpSpan = match.group ? `<span class="text-[10px] font-bold bg-slate-200/60 text-slate-650 px-2 py-0.5 rounded">${match.group}</span>` : '';
          const scoreBox = match.status === 'not_started'
            ? `<span>${isAr ? 'لم تبدأ' : 'VS'}</span>`
            : `<span class="text-emerald-400">${match.scoreHome}</span><span class="text-slate-500">:</span><span class="text-indigo-400">${match.scoreAway}</span>`;
          const refereeStr = match.refereeName || (isAr ? 'غير محدد' : 'Unassigned');

          return `
            <div class="p-4 border border-slate-100 rounded-xl bg-slate-50/55 flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-black bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full px-2.5 py-1 uppercase">${roundName}</span>
                ${grpSpan}
                <span class="text-[11px] text-slate-500 font-bold">${match.date} @ ${match.time}</span>
              </div>
              <div class="flex items-center gap-6 justify-center w-full md:w-auto my-1 col-span-2">
                <span class="font-black text-xs text-slate-900 text-right min-w-[100px] truncate">${match.homeTeamName}</span>
                <div class="bg-slate-900 text-white rounded-lg px-4 py-1.5 font-sans font-black flex items-center gap-3 text-xs shadow-md">
                  ${scoreBox}
                </div>
                <span class="font-black text-xs text-slate-900 text-left min-w-[100px] truncate">${match.awayTeamName}</span>
              </div>
              <div class="text-[11px] text-slate-500 font-bold mt-1 md:mt-0">
                👤 ${isAr ? 'الحكم:' : 'Ref:'} ${refereeStr}
              </div>
            </div>
          `;
        }).join('');

    const topScorersHtml = topScorers.length === 0
      ? `<div class="text-center py-6 col-span-2 text-slate-400 font-bold text-xs">${isAr ? 'لا يوجد أهداف مسجلة حتى الآن' : 'No goals scored yet.'}</div>`
      : topScorers.map((player, idx) => `
          <div class="p-3.5 border border-slate-100 bg-slate-50/40 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="font-black text-xs text-slate-400 font-mono">#${idx + 1}</span>
              <div>
                <h4 class="font-bold text-xs text-slate-900">${player.name}</h4>
                <p class="text-[10px] text-slate-500 font-medium">🏃 ${player.teamName} | ${player.position}</p>
              </div>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5 shadow-sm">
              ⚽ ${player.goals} ${isAr ? 'أهداف' : 'Goals'}
            </div>
          </div>
        `).join('');

    const currentYear = new Date().getFullYear();

    const htmlContent = `<!DOCTYPE html>
<html lang="${language}" dir="${dirAttr}">
<head>
  <meta charset="UTF-8">
  <title>${isAr ? 'التقرير الختامي للبطولة' : 'Official Tournament Report'} - ${tournamentName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${fontImport}
    body {
      font-family: ${isAr ? "'Cairo'" : "'Inter'"}, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
    }
    @media print {
      body {
        background-color: #ffffff;
      }
      .no-print {
        display: none !important;
      }
      .print-border {
        border-color: #e2e8f0 !important;
      }
    }
  </style>
</head>
<body class="py-10 px-4 max-w-5xl mx-auto space-y-8">

  <!-- Print floating toolbar -->
  <div class="no-print bg-slate-90 styles bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <span class="text-xl">🏆</span>
      <div>
        <h4 class="text-sm font-extrabold text-white">${isAr ? 'تأكيد وحفظ التقرير الشامل للبطولة' : 'Championship Dynamic Report Panel'}</h4>
        <p class="text-[10px] text-slate-400">${isAr ? 'يمكنك طباعة التقرير أو حفظه كملف PDF رسمي' : 'Print directly or export your tournament sheet as PDF'}</p>
      </div>
    </div>
    <button onclick="window.print()" class="bg-emerald-50 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl cursor-pointer transition shadow flex items-center gap-2 bg-emerald-500">
      🖨️ ${isAr ? 'طباعة وحفظ كملف PDF' : 'Print & Export to PDF'}
    </button>
  </div>

  <!-- Tournament Header Card -->
  <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-3xl relative overflow-hidden shadow-xl border border-slate-800">
    <div class="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-60"></div>
    <div class="relative z-10 space-y-4">
      <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-emerald-505 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
        🏅 ${isAr ? 'التقرير الرسمي المعتمد' : 'OFFICIAL LICENSED REPORT'}
      </div>
      <div>
        <h1 class="text-3xl font-black text-white">${tournamentName}</h1>
        <p class="text-sm text-slate-400 mt-1 font-bold">${isAr ? 'إشراف وتنظيم:' : 'Organized by:'} ${tournaments.find(t => t.id === activeTournamentId)?.organizerName || 'الأستاذ المنظم'}</p>
      </div>
      <div class="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800 text-xs text-slate-300">
        <div class="mr-4 ml-4 font-bold">📅 ${isAr ? 'تاريخ التصدير:' : 'Generated At:'} ${reportDate}</div>
        <div class="mr-4 ml-4 font-bold">👥 ${isAr ? 'عدد الفرق المشاركة:' : 'Total Squads:'} ${teams.length}</div>
        <div class="mr-4 ml-4 font-bold">⚽ ${isAr ? 'إجمالي الأهداف المسجلة:' : 'Total Goals Scored:'} ${totalGoalsCount}</div>
        <div class="mr-4 ml-4 font-bold">🏁 ${isAr ? 'مباريات منتهية:' : 'Finished matches:'} ${finishedCount} / ${matches.length}</div>
      </div>
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
      <div class="text-3xl font-black text-indigo-600">${teams.length}</div>
      <div class="text-xs text-slate-500 mt-1 font-bold">${isAr ? 'إجمالي الفرق' : 'Total Teams'}</div>
    </div>
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
      <div class="text-3xl font-black text-sky-600">${players.length}</div>
      <div class="text-xs text-slate-500 mt-1 font-bold">${isAr ? 'اللاعبين المقيدين' : 'Registered Players'}</div>
    </div>
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
      <div class="text-3xl font-black text-emerald-600">${totalGoalsCount}</div>
      <div class="text-xs text-slate-500 mt-1 font-bold">${isAr ? 'الأهداف المسجلة' : 'Goals Scored'}</div>
    </div>
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
      <div class="text-3xl font-black text-amber-600">${finishedCount}</div>
      <div class="text-xs text-slate-500 mt-1 font-bold">${isAr ? 'المباريات المنتهية' : 'Matches Played'}</div>
    </div>
  </div>

  <!-- Standings Board Table -->
  <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
    <h3 class="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
      🏆 ${isAr ? 'جدول الترتيب النهائي للفرق' : 'Teams Tournament Standings'}
    </h3>
    <div class="overflow-x-auto">
      <table class="w-full text-start text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50 text-slate-600 font-black border-b border-slate-100 text-[11px]">
            <th class="py-3 px-3 text-center">#</th>
            <th class="py-3 px-3">${isAr ? 'الفريق' : 'Team'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'المجموعة' : 'Group'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'لعب' : 'Pld'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'فوز' : 'W'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'تعادل' : 'D'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'خسر' : 'L'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'له' : 'GF'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'عليه' : 'GA'}</th>
            <th class="py-3 px-3 text-center">${isAr ? 'الفارق' : 'GD'}</th>
            <th class="py-3 px-3 text-center text-slate-900 font-extrabold">${isAr ? 'النقاط' : 'Pts'}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${teamsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Matches and Results List -->
  <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 font-sans">
    <h3 class="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
      📅 ${isAr ? 'جدول نتائج ومواعيد المباريات' : 'Match Schedules & Official Results'}
    </h3>
    <div class="space-y-3">
      ${matchesHtml}
    </div>
  </div>

  <!-- Top Scorers scoreboard -->
  <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
    <h3 class="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
      ⚽ ${isAr ? 'قائمة الهدافين الذهبيين' : 'Top Scorers - Golden Boot Leaderboard'}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${topScorersHtml}
    </div>
  </div>

  <div class="text-center text-[10px] text-slate-400 pt-8 border-t border-slate-200">
    <p>© ${currentYear} ${tournamentName} • ${isAr ? 'منصة إدارة البطولات الرقمية الذكية' : 'Tournament Hub Management System'}</p>
    <p class="mt-1">${isAr ? 'تم تصدير هذا التقرير وتوقيعه إلكترونياً بنجاح.' : 'This report is dynamically generated, signed, and approved.'}</p>
  </div>

</body>
</html>`;

    // Download HTML
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tournament_report_${activeTournamentId}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preset Colors for logos
  const PRESET_COLORS = [
    'bg-emerald-500', 'bg-emerald-600', 'bg-teal-500', 
    'bg-sky-500', 'bg-blue-600', 'bg-indigo-600', 
    'bg-purple-600', 'bg-pink-600', 'bg-rose-500', 
    'bg-red-500', 'bg-orange-500', 'bg-amber-500'
  ];

  const PRESET_ICONS = ['⚽', '🏆', '⭐', '🦁', '🦅', '🐯', '⚡', '👑', '🦈', '🔥', '🛡️', '🌊'];

  // ----------------------------------------------------
  // CRUD Handlers
  // ----------------------------------------------------

  // Team CRUD
  const handleOpenTeamForm = (team?: Team) => {
    const isNew = !team;
    const canCreate = (registeredUser && registeredUser.role === 'organizer') || isSuperAdmin;
    if (isNew && canCreate) {
      setEditingTeam(null);
      setTeamNameForm('');
      setTeamClassForm('');
      setTeamCityForm('');
      setTeamColorForm('bg-emerald-500');
      setTeamIconForm('⚽');
      setTeamFormOpen(true);
    } else {
      checkOrganizerPermission(() => {
        if (team) {
          setEditingTeam(team);
          setTeamNameForm(team.name);
          setTeamClassForm(team.schoolClass || '');
          setTeamCityForm(team.city || '');
          setTeamColorForm(team.logoColor);
          setTeamIconForm(team.logoIcon);
        } else {
          setEditingTeam(null);
          setTeamNameForm('');
          setTeamClassForm('');
          setTeamCityForm('');
          setTeamColorForm('bg-emerald-500');
          setTeamIconForm('⚽');
        }
        setTeamFormOpen(true);
      });
    }
  };

  const handleSaveTeam = () => {
    if (!teamNameForm.trim()) return;

    if (editingTeam) {
      // Edit
      setTeams(prev => prev.map(t => t.id === editingTeam.id ? {
        ...t,
        name: teamNameForm,
        schoolClass: teamClassForm,
        city: teamCityForm,
        logoColor: teamColorForm,
        logoIcon: teamIconForm
      } : t));

      // Also update player state copies of teamName
      setPlayers(prev => prev.map(p => p.teamId === editingTeam.id ? { ...p, teamName: teamNameForm } : p));
      
      // Update matches copies of team names
      setMatches(prev => prev.map(m => {
        let updated = { ...m };
        if (m.homeTeamId === editingTeam.id) updated.homeTeamName = teamNameForm;
        if (m.awayTeamId === editingTeam.id) updated.awayTeamName = teamNameForm;
        return updated;
      }));

    } else {
      // Create
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: teamNameForm,
        logoColor: teamColorForm,
        logoIcon: teamIconForm,
        schoolClass: teamClassForm,
        city: teamCityForm,
        points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0
      };
      setTeams(prev => [...prev, newTeam]);
    }

    setTeamFormOpen(false);
    setEditingTeam(null);
  };

  const handleDeleteTeam = (id: string) => {
    checkOrganizerPermission(() => {
      triggerConfirm(
        'تأكيد حذف الفريق',
        'هل أنت متأكد من حذف هذا الفريق؟ سيؤدي ذلك لحذف لاعبيه وكافة مبارياته المرتبطة به بشكل نهائي ولا يمكن التراجع.',
        () => {
          setTeams(prev => prev.filter(t => t.id !== id));
          setPlayers(prev => prev.filter(p => p.teamId !== id));
          setMatches(prev => prev.filter(m => m.homeTeamId !== id && m.awayTeamId !== id));
        },
        'danger'
      );
    });
  };

  // Player CRUD
  const handleOpenPlayerForm = (player?: Player) => {
    checkOrganizerPermission(() => {
      if (player) {
        setEditingPlayer(player);
        setPlayerNameForm(player.name);
        setPlayerTeamForm(player.teamId);
        setPlayerTeamNameForm(player.teamName || teams.find(t => t.id === player.teamId)?.name || '');
        setPlayerNumForm(player.number);
        setPlayerPositionForm(player.position);
      } else {
        const firstTeam = teams[0];
        setEditingPlayer(null);
        setPlayerNameForm('');
        setPlayerTeamForm(firstTeam?.id || '');
        setPlayerTeamNameForm(firstTeam?.name || '');
        setPlayerNumForm(10);
        setPlayerPositionForm('FW');
      }
      setPlayerFormOpen(true);
    });
  };

  const handleSavePlayer = () => {
    if (!playerNameForm.trim() || !playerTeamForm) return;

    const selectedTeamObj = teams.find(t => t.id === playerTeamForm);
    const teamName = playerTeamNameForm || (selectedTeamObj ? selectedTeamObj.name : 'فريق غير معروف');

    // Check for duplicate jersey number in the same team
    const hasDuplicateNumber = players.some(p => {
      if (editingPlayer && p.id === editingPlayer.id) return false;
      return p.teamId === playerTeamForm && p.number === playerNumForm;
    });

    if (hasDuplicateNumber) {
      triggerAlert(
        'رقم القميص مكرر',
        `الرقم ${playerNumForm} محجوز مسبقاً للاعب آخر في فريق "${teamName}". لا يمكن تكرار أرقام القمصان للاعبي نفس الفريق.`
      );
      return;
    }

    if (editingPlayer) {
      setPlayers(prev => prev.map(p => p.id === editingPlayer.id ? {
        ...p,
        name: playerNameForm,
        teamId: playerTeamForm,
        teamName: teamName,
        number: playerNumForm,
        position: playerPositionForm
      } : p));
    } else {
      const newPlayer: Player = {
        id: `p-${Date.now()}`,
        name: playerNameForm,
        teamId: playerTeamForm,
        teamName: teamName,
        number: playerNumForm,
        position: playerPositionForm,
        goals: 0,
        yellowCards: 0,
        redCards: 0
      };
      setPlayers(prev => [...prev, newPlayer]);
    }

    setPlayerFormOpen(false);
    setEditingPlayer(null);
  };

  const handleDeletePlayer = (id: string) => {
    checkOrganizerPermission(() => {
      triggerConfirm(
        'تأكيد حذف اللاعب',
        'هل أنت متأكد من حذف هذا اللاعب وإلغاء كافة إحصائياته من البطولة الحالية؟',
        () => {
          setPlayers(prev => prev.filter(p => p.id !== id));
          // Clean up events linked to this player
          setMatches(prev => prev.map(m => ({
            ...m,
            events: m.events.filter(e => e.playerId !== id)
          })));
        },
        'danger'
      );
    });
  };

  // Referee CRUD
  const handleOpenRefereeForm = (ref?: Referee) => {
    checkOrganizerPermission(() => {
      if (ref) {
        setEditingReferee(ref);
        setRefereeNameForm(ref.name);
        setRefereePhoneForm(ref.phone || '');
        setRefereeTypeForm(ref.type);
      } else {
        setEditingReferee(null);
        setRefereeNameForm('');
        setRefereePhoneForm('');
        setRefereeTypeForm('main');
      }
      setRefereeFormOpen(true);
    });
  };

  const handleSaveReferee = () => {
    if (!refereeNameForm.trim()) return;

    if (editingReferee) {
      setReferees(prev => prev.map(r => r.id === editingReferee.id ? {
        ...r,
        name: refereeNameForm,
        phone: refereePhoneForm,
        type: refereeTypeForm
      } : r));
    } else {
      const newRef: Referee = {
        id: `ref-${Date.now()}`,
        name: refereeNameForm,
        phone: refereePhoneForm,
        type: refereeTypeForm
      };
      setReferees(prev => [...prev, newRef]);
    }

    setRefereeFormOpen(false);
    setEditingReferee(null);
  };

  const handleDeleteReferee = (id: string) => {
    checkOrganizerPermission(() => {
      triggerConfirm(
        'تأكيد حذف الحكم',
        'هل أنت متأكد من حذف هذا الحكم من سجلات البطولة؟',
        () => {
          setReferees(prev => prev.filter(r => r.id !== id));
        },
        'danger'
      );
    });
  };

  // Match scheduling details edit
  const handleOpenMatchEditForm = (m: Match) => {
    checkOrganizerPermission(() => {
      setEditingMatch(m);
      setMatchEditHomeId(m.homeTeamId);
      setMatchEditAwayId(m.awayTeamId);
      setMatchEditStage(m.stage);
      setMatchEditRefereeId(m.refereeId || '');
      setMatchEditDate(m.date);
      setMatchEditTime(m.time);
      setMatchEditScoreHome(m.scoreHome);
      setMatchEditScoreAway(m.scoreAway);
      setMatchEditStatus(m.status);
      setMatchEditFormOpen(true);
    });
  };

  const handleSaveMatchEdit = () => {
    if (!editingMatch || !matchEditHomeId || !matchEditAwayId) return;

    const homeTeamObj = teams.find(t => t.id === matchEditHomeId);
    const awayTeamObj = teams.find(t => t.id === matchEditAwayId);
    if (!homeTeamObj || !awayTeamObj) return;

    const refObj = referees.find(r => r.id === matchEditRefereeId);

    const updatedMatch: Match = {
      ...editingMatch,
      homeTeamId: matchEditHomeId,
      homeTeamName: homeTeamObj.name,
      awayTeamId: matchEditAwayId,
      awayTeamName: awayTeamObj.name,
      stage: matchEditStage || 'الجولة العامة',
      refereeId: matchEditRefereeId || undefined,
      refereeName: refObj ? refObj.name : undefined,
      date: matchEditDate,
      time: matchEditTime,
      scoreHome: Number(matchEditScoreHome),
      scoreAway: Number(matchEditScoreAway),
      status: matchEditStatus,
    };

    setMatches(prev => prev.map(m => m.id === editingMatch.id ? updatedMatch : m));
    
    // Also synchronize current active match if it's the one being modified
    if (currentMatch && currentMatch.id === editingMatch.id) {
      setCurrentMatch(updatedMatch);
      setMatchingStatus(updatedMatch.status);
    }

    setMatchEditFormOpen(false);
    setEditingMatch(null);
  };


  // Start automated draw simulation sequence with engaging animations and a visual progress indicator.
  const startAnimatedDrawSimulation = (finalizedMatches: Match[]) => {
    setIsDrawingInProgress(true);
    setDrawnMatchesSoFar([]);
    setActivelyDrawingM(null);
    setDrawingProgress(0);
    setDrawingStepText('جاري تهيئة وعاء القرعة وتحضير كرات الفرق الكروية... 🔮');

    const totalMatches = finalizedMatches.length;

    const performStep = async () => {
      // 1. Warm-up mix phase
      await new Promise(r => setTimeout(r, 1200));
      setDrawingProgress(15);
      setDrawingStepText('جاري خلط الكرات العشوائية وتوزيع مستويات تصنيف الفرق الكروية في الوعاء... 🔄');
      
      await new Promise(r => setTimeout(r, 1000));
      setDrawingProgress(30);

      // Now, draw matches one by one sequentially
      for (let i = 0; i < totalMatches; i++) {
        const nextMatch = finalizedMatches[i];

        // Status description
        setDrawingStepText(`جاري سحب واختيار طرفي اللقاء رقم ${i + 1} من وعاء البطولة... ⚽`);
        
        // Rapid shuffle effect for that specific match's home and away names
        let shuffleCounter = 0;
        const maxShuffles = 8;
        
        // Fast shuffle to build suspense!
        while (shuffleCounter < maxShuffles) {
          const randHome = teams[Math.floor(Math.random() * teams.length)];
          let randAway = teams[Math.floor(Math.random() * teams.length)];
          while (randHome && randAway && randAway.id === randHome.id && teams.length > 1) {
            randAway = teams[Math.floor(Math.random() * teams.length)];
          }

          setActivelyDrawingM({
            id: `shuffle-${shuffleCounter}`,
            stage: nextMatch.stage,
            homeTeamId: randHome ? randHome.id : '',
            homeTeamName: randHome ? randHome.name : '',
            awayTeamId: randAway ? randAway.id : '',
            awayTeamName: randAway ? randAway.name : 'جاري السحب...',
            scoreHome: 0,
            scoreAway: 0,
            status: 'not_started',
            events: [],
            date: nextMatch.date,
            time: nextMatch.time,
          });

          await new Promise(r => setTimeout(r, 100));
          shuffleCounter++;
        }

        // Commit actual pairing drawn!
        setActivelyDrawingM(nextMatch);
        setDrawnMatchesSoFar(prev => [...prev, nextMatch]);
        
        // update progress elegantly
        const computedPercent = 30 + Math.floor(((i + 1) / totalMatches) * 65);
        setDrawingProgress(computedPercent);

        // pause momentarily to celebrate/acknowledge the pairing!
        await new Promise(r => setTimeout(r, 1200));
      }

      // Finish drawing session
      setActivelyDrawingM(null);
      setDrawingStepText('الحمد لله! اكتملت القرعة الكروية بنجاح بنسبة 100%. جاري جدولة ومطابقة مواجهات البطولة الفورية... 🏅');
      setDrawingProgress(100);

      await new Promise(r => setTimeout(r, 1000));

      // Persist the actual generated matches
      setMatches(finalizedMatches);
      setDrawMessage(`تمت عملية سحب القرعة التلقائية وتوليد ${finalizedMatches.length} مباريات شيقة! ✨`);
      setTimeout(() => setDrawMessage(null), 5000);
      setIsDrawingInProgress(false);
      handleTabChange('matches');
    };

    performStep();
  };

  // ----------------------------------------------------
  // Automatic Draw Generator
  // ----------------------------------------------------
  const handleGenerateDraw = () => {
    checkOrganizerPermission(() => {
      const activeDrawTeams = teams.filter(t => participatingTeamIds.includes(t.id));
      if (activeDrawTeams.length < 2) {
        triggerAlert(
          language === 'ar' ? 'تنبيه نظام القرعة ⚠️' : 'Draw Warning ⚠️',
          language === 'ar' 
            ? 'يجب تحديد فريقين مشاركين على الأقل من القائمة لإجراء عملية سحب القرعة وتوليد المباريات.'
            : 'You must select at least 2 participating teams from the roster to generate fixtures.'
        );
        return;
      }

      const titlePrompt = language === 'ar' 
        ? 'تأكيد سحب القرعة وبدء البطولة' 
        : language === 'en' 
          ? 'Confirm Draw & Start Tournament' 
          : 'Confirmer le tirage et commencer';

      const messageType = drawType === 'league' 
        ? (language === 'ar' ? 'نظام الدوري العام الكامل (الكل ضد الكل)' : language === 'en' ? 'Round Robin League' : 'Championnat (Poules)') 
        : drawType === 'groups'
          ? (language === 'ar' ? 'نظام المجموعات (تقسيم الدوري العام)' : language === 'en' ? 'Group Stage System' : 'Phase de Groupes')
          : (language === 'ar' ? 'نظام الكأس الإقصائي (خروج المغلوب)' : language === 'en' ? 'Direct Knockout Cup' : 'Élimination Directe');

      const warningDesc = language === 'ar'
        ? `تحذير هام: ستقوم هذه العملية بإعادة تهيئة البطولة، وجدولة المباريات لعدد (${activeDrawTeams.length}) فرق مشاركة ومسح أحداث المباريات السابقة بناءً على [ ${messageType} ]. هل أنت متأكد من المتابعة والبدء؟`
        : language === 'en'
          ? `Warning: This action will re-initialize the tournament, scheduling fixtures for (${activeDrawTeams.length}) participating teams and clearing previous records using [ ${messageType} ]. Proceed?`
          : `Attention : Cette action va réinitialiser le tournoi, planifier les rencontres pour (${activeDrawTeams.length}) équipes et nettoyer l'historique d'arbitrage en utilisant [ ${messageType} ]. Continuer ?`;

      triggerConfirm(
        titlePrompt,
        warningDesc,
        () => {
          let generatedMatches: Omit<Match, 'id'>[] = [];
          
          if (drawType === 'league') {
            // Reset group tags on all teams
            setTeams(prev => prev.map(t => ({ ...t, group: undefined })));
            generatedMatches = generateLeagueFixtures(activeDrawTeams);
          } else if (drawType === 'groups') {
            // Generate group-stage fixtures and retrieve assignments
            const { matches: groupMatches, teamGroupAssignments } = generateGroupStageFixtures(activeDrawTeams);
            generatedMatches = groupMatches;
            
            // Assign groups to teams
            setTeams(prev => prev.map(t => {
              const assignment = teamGroupAssignments.find(a => a.teamId === t.id);
              return {
                ...t,
                group: assignment ? assignment.group : undefined
              };
            }));
          } else {
            // Reset group tags on all teams
            setTeams(prev => prev.map(t => ({ ...t, group: undefined })));
            generatedMatches = generateKnockoutFixtures(activeDrawTeams);
          }

          const finalized: Match[] = generatedMatches.map((m, idx) => ({
            ...m,
            id: `match-generated-${idx}-${Date.now()}`
          }));

          startAnimatedDrawSimulation(finalized);
        },
        'warning'
      );
    });
  };


  // ----------------------------------------------------
  // Match Live Management Console
  // ----------------------------------------------------
  const handleOpenMatchManager = (match: Match) => {
    checkOrganizerPermission(() => {
      setCurrentMatch(match);
      setMatchingStatus(match.status);
      setMatchEventTimer(match.chronoSeconds ? Math.min(120, Math.floor(match.chronoSeconds / 60) + 1) : 1);
      setMatchEventPlayer('');
    });
  };

  const handleUpdateMatchChrono = (updates: { isChronoRunning?: boolean; chronoSeconds?: number; chronoSpeed?: 'normal' | 'fast' }) => {
    if (!currentMatch) return;
    const updatedMatch: Match = {
      ...currentMatch,
      ...updates
    };
    setCurrentMatch(updatedMatch);
    setMatches(prev => prev.map(m => m.id === currentMatch.id ? updatedMatch : m));
  };

  const handleUpdateMatchScoreManual = (homeChange: number, awayChange: number) => {
    if (!currentMatch) return;

    const updatedHomeScore = Math.max(0, currentMatch.scoreHome + homeChange);
    const updatedAwayScore = Math.max(0, currentMatch.scoreAway + awayChange);

    const updatedMatch: Match = {
      ...currentMatch,
      scoreHome: updatedHomeScore,
      scoreAway: updatedAwayScore,
    };

    setCurrentMatch(updatedMatch);
    setMatches(prev => prev.map(m => m.id === currentMatch.id ? updatedMatch : m));
  };

  const handleUpdateMatchStatus = (status: Match['status']) => {
    if (!currentMatch) return;
    
    const updatedMatch: Match = {
      ...currentMatch,
      status: status
    };

    setMatchingStatus(status);
    setCurrentMatch(updatedMatch);
    setMatches(prev => prev.map(m => m.id === currentMatch.id ? updatedMatch : m));
  };

  const handleAddMatchEvent = () => {
    if (!currentMatch || !matchEventPlayer) return;

    const selectedPlayerObj = players.find(p => p.id === matchEventPlayer);
    if (!selectedPlayerObj) return;

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      type: matchEventType,
      playerId: selectedPlayerObj.id,
      playerName: selectedPlayerObj.name,
      teamId: selectedPlayerObj.teamId,
      minute: Number(matchEventTimer)
    };

    // Calculate goals if event is a goal
    let goalHomeBonus = 0;
    let goalAwayBonus = 0;
    
    if (matchEventType === 'goal') {
      if (selectedPlayerObj.teamId === currentMatch.homeTeamId) {
        goalHomeBonus = 1;
      } else {
        goalAwayBonus = 1;
      }
    }

    const updatedMatch: Match = {
      ...currentMatch,
      scoreHome: currentMatch.scoreHome + goalHomeBonus,
      scoreAway: currentMatch.scoreAway + goalAwayBonus,
      events: [...currentMatch.events, newEvent]
    };

    setCurrentMatch(updatedMatch);
    setMatches(prev => prev.map(m => m.id === currentMatch.id ? updatedMatch : m));
    setMatchEventPlayer('');
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!currentMatch) return;

    const targetEvent = currentMatch.events.find(e => e.id === eventId);
    if (!targetEvent) return;

    let goalHomeReduction = 0;
    let goalAwayReduction = 0;

    if (targetEvent.type === 'goal') {
      if (targetEvent.teamId === currentMatch.homeTeamId) {
        goalHomeReduction = 1;
      } else {
        goalAwayReduction = 1;
      }
    }

    const updatedMatch: Match = {
      ...currentMatch,
      scoreHome: Math.max(0, currentMatch.scoreHome - goalHomeReduction),
      scoreAway: Math.max(0, currentMatch.scoreAway - goalAwayReduction),
      events: currentMatch.events.filter(e => e.id !== eventId)
    };

    setCurrentMatch(updatedMatch);
    setMatches(prev => prev.map(m => m.id === currentMatch.id ? updatedMatch : m));
  };

  // Add a fully customized Match manually
  const [manualHomeTeam, setManualHomeTeam] = useState('');
  const [manualAwayTeam, setManualAwayTeam] = useState('');
  const [manualStage, setManualStage] = useState('الجولة 1');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('17:00');
  const [manualReferee, setManualReferee] = useState('');

  const handleAddManualMatch = () => {
    checkOrganizerPermission(() => {
      if (!manualHomeTeam || !manualAwayTeam) {
        triggerAlert('تنبيه الجدولة', 'يجب تحديد الفريق المضيف والفريق الضيف أولاً للمتابعة.');
        return;
      }
      if (manualHomeTeam === manualAwayTeam) {
        triggerAlert('تنبيه الجدولة', 'لا يمكن للفريق الكروي أن يلعب مباراة ضد نفسه!');
        return;
      }

      const home = teams.find(t => t.id === manualHomeTeam);
      const away = teams.find(t => t.id === manualAwayTeam);
      const refereeObj = referees.find(r => r.id === manualReferee);

      const newMatch: Match = {
        id: `match-manual-${Date.now()}`,
        homeTeamId: manualHomeTeam,
        homeTeamName: home ? home.name : '',
        awayTeamId: manualAwayTeam,
        awayTeamName: away ? away.name : '',
        refereeId: manualReferee || undefined,
        refereeName: refereeObj ? refereeObj.name : undefined,
        date: manualDate || new Date().toISOString().split('T')[0],
        time: manualTime || '17:00',
        scoreHome: 0,
        scoreAway: 0,
        status: 'not_started',
        stage: manualStage,
        events: []
      };

      setMatches(prev => [...prev, newMatch]);
      
      // reset form
      setManualHomeTeam('');
      setManualAwayTeam('');
      setManualReferee('');
    });
  };

  const handleDeleteMatch = (id: string) => {
    checkOrganizerPermission(() => {
      triggerConfirm(
        'تأكيد حذف المباراة',
        'هل تريد بالتأكيد حذف هذه المباراة وجدولتها من جدول البطولة؟ سيؤدي ذلك لإلغاء جميع سجلات كروتها وأهدافها المتعلقة.',
        () => {
          setMatches(prev => prev.filter(m => m.id !== id));
          if (currentMatch && currentMatch.id === id) {
            setCurrentMatch(null);
          }
        },
        'danger'
      );
    });
  };

  // Reset entire state to presets
  const handleResetToPresets = () => {
    checkOrganizerPermission(() => {
      triggerConfirm(
        'إعادة تهيئة النظام بالكامل',
        'تحذير حاسم: سيؤدي هذا الإجراء لمسح كافة التعديلات، الفرق المسجلة، وجدول المباريات الفعلي وإعادة تشغيل التطبيق بالحالة والبيانات التجريبية الافتراضية. هل تريد المتابعة؟',
        () => {
          setTeams(INITIAL_TEAMS);
          setPlayers(INITIAL_PLAYERS);
          setReferees(INITIAL_REFEREES);
          setMatches(INITIAL_MATCHES);
          setCurrentMatch(null);
          setTimeout(() => {
            triggerAlert('إعادة تهيئة ناجحة', 'تم تصفير قاعدة البيانات وإعادتها لقيمها الافتراضية بنجاح.');
          }, 100);
        },
        'danger'
      );
    });
  };

  // ----------------------------------------------------
  // Share Feature Handlers
  // ----------------------------------------------------
  const handleCopyLink = () => {
    navigator.clipboard.writeText(liveUrl);
    triggerAlert(
      'نسخ الرابط بنجاح',
      'تم نسخ رابط البث المباشر التفاعلي للجمهور والجمهور في الحافظة بنجاح! يمكنك الآن مشاركته في تويتر، واتساب، أو منصات التواصل الاجتماعي.'
    );
  };

  // Switch dynamically to Public View inside same page for preview testing
  const handleTogglePublicView = () => {
    setViewMode('fan');
  };

  // If user opened with query ?view=live, we bypass Admin Dashboard
  if (viewMode === 'fan') {
    return (
      <>
        <LiveFanView 
          teams={teams}
          players={players}
          matches={matches}
          referees={referees}
          onBackToAdmin={() => setViewMode('admin')}
          onOpenScanner={() => setScannerOpen(true)}
          organizerName={organizerName}
          language={language}
        />
        <QrScannerOverlay
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          matches={matches}
          teams={teams}
          onScanSuccess={(decodedUrl) => {
            setScannerOpen(false);
            const queryPart = decodedUrl.split('?')[1] || '';
            const params = new URLSearchParams(queryPart);
            const view = params.get('view');
            const matchId = params.get('matchId');

            window.history.pushState({}, '', decodedUrl);

            if (view === 'referee-portal' && matchId) {
              const m = matches.find(match => match.id === matchId);
              if (m) {
                setCurrentMatch(m);
                setMatchingStatus(m.status);
              }
              setViewMode('referee-portal');
            } else if (view === 'team-portal') {
              setViewMode('team-portal');
            } else if (view === 'live') {
              setViewMode('fan');
            } else {
              setViewMode('admin');
            }
          }}
        />
      </>
    );
  }

  // Match referee portal bypass
  const queryParams = new URLSearchParams(window.location.search);
  const refereeMatchId = queryParams.get('matchId');
  const refereeMatch = matches.find(m => m.id === refereeMatchId);
  if (viewMode === 'referee-portal' && refereeMatch) {
    return (
      <RefereePortal
        match={refereeMatch}
        players={players}
        onUpdateMatch={(updatedMatch) => {
          setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
          if (currentMatch && currentMatch.id === updatedMatch.id) {
            setCurrentMatch(updatedMatch);
          }
        }}
        onBack={() => {
          const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
          window.history.pushState({}, '', cleanUrl);
          setViewMode('admin');
        }}
        language={language}
      />
    );
  }

  // Team portal bypass
  const teamIdParam = queryParams.get('teamId');
  const teamObjParam = standings.find(t => t.id === teamIdParam);
  if (viewMode === 'team-portal' && teamObjParam) {
    return (
      <TeamPortal
        team={teamObjParam}
        players={players}
        matches={matches}
        onAddPlayer={(newPlayer) => {
          const created: Player = {
            ...newPlayer,
            id: `pl-${Date.now()}`
          };
          setPlayers(prev => [...prev, created]);
        }}
        onDeletePlayer={(playerId) => {
          setPlayers(prev => prev.filter(p => p.id !== playerId));
        }}
        onBack={() => {
          const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
          window.history.pushState({}, '', cleanUrl);
          setViewMode('admin');
        }}
        language={language}
      />
    );
  }

  // ----------------------------------------------------
  // Main Admin Dashboard
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col antialiased font-sans selection:bg-emerald-500 selection:text-slate-950" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Dynamic Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-500 rounded flex items-center justify-center text-slate-950 font-bold italic shadow shadow-emerald-500/10">
                <Trophy className="h-5 w-5 font-extrabold" />
              </div>
              <div className="text-right">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  {t.appName}
                  <span className="text-emerald-400 font-medium text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{t.pro}</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">{t.appSubtitle}</p>
              </div>
            </div>

            {/* Quick action triggers */}
            <div className="flex flex-wrap items-center gap-2">
              {/* User Account / Registration Chip */}
              {registeredUser ? (
                <div 
                  className="bg-slate-800/80 border border-slate-750 p-1.5 rounded-xl text-xs flex items-center gap-2 shadow-sm"
                  title={language === 'ar' ? 'معلومات حسابك الحالي' : 'Your current account info'}
                >
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    registeredUser.role === 'organizer' 
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {registeredUser.role === 'organizer' ? '🔑' : '📣'}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-100 max-w-[80px] truncate leading-tight">{registeredUser.name}</p>
                    <p className="text-[8px] text-slate-400 leading-none">
                      {registeredUser.role === 'organizer' 
                        ? (language === 'ar' ? 'منظم مفعّل' : 'Organizer') 
                        : (language === 'ar' ? 'مشاهد رياضي' : 'Spectator')
                      }
                    </p>
                  </div>
                  <button 
                    onClick={handleLogoutAccount}
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-450 transition"
                    title={language === 'ar' ? 'تسجيل الخروج والمسح' : 'Log out & Clear'}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setRegisterModalOpen(true);
                    setRegNameInput('');
                    setRegEmailInput('');
                    setRegRole('spectator');
                    setRegFavTeamId('');
                    setRegPinInput('');
                    setRegError(null);
                  }}
                  className="bg-gradient-to-r from-emerald-500/15 to-indigo-500/15 hover:from-emerald-500/25 hover:to-indigo-500/25 text-emerald-300 border border-emerald-500/25 text-[11px] font-black px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>👤</span>
                  {t.registerBtn}
                </button>
              )}

              {/* Language Selector */}
              <div className="bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <span className="text-xs">🌐</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-transparent text-slate-200 border-none outline-none font-black text-[11px] cursor-pointer"
                >
                  <option value="ar" className="bg-slate-900 text-slate-100">العربية</option>
                  <option value="en" className="bg-slate-900 text-slate-100">English</option>
                  <option value="fr" className="bg-slate-900 text-slate-100">Français</option>
                </select>
              </div>

              {isOrganizerVerified ? (
                <button
                  onClick={handleOrganizerLogout}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-extrabold px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow-sm"
                  title="تسجيل الخروج من وضع المنظم وقفل التعديلات"
                >
                  <Lock className="h-3.5 w-3.5 text-rose-400" />
                  {t.organizerExit}
                </button>
              ) : (
                <button
                  onClick={() => checkOrganizerPermission(() => {})}
                  className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-550/30 text-[11px] font-extrabold px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow-md shadow-amber-500/5 animate-pulse"
                  title="تسجيل الدخول لتفعيل صلاحيات المنظم الكاملة لتقييد الفرق والإحصائيات"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400 font-bold" />
                  {t.organizerLogin}
                </button>
              )}

              <div className="bg-slate-900 px-3 py-1.5 rounded text-[10px] border border-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                {t.liveBadge}: {tournamentName}
              </div>

              <button
                onClick={handleTogglePublicView}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1.5"
                title="معاينة واجهة المتابعة والمشاهدة للهواتف"
              >
                <Eye className="h-3 w-3 text-emerald-400" />
                {t.publicViewBtn}
              </button>

              {isOrganizerVerified && (
                <>
                  <button
                    onClick={() => setScannerOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1.5"
                    title="مسح رمز QR لتسجيل النتائج الفورية"
                  >
                    <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                    {t.qrScanBtn}
                  </button>

                  <button
                    onClick={handleResetToPresets}
                    className="bg-slate-800 hover:bg-slate-700 text-rose-350 border border-slate-700 text-[10px] font-bold px-3 py-1.5 rounded transition flex items-center gap-1"
                    title="إعادة ضبط المصنع"
                  >
                    <RotateCcw className="h-3 w-3 text-red-400" />
                    {t.resetBtn}
                  </button>
                </>
              )}
            </div>
            
          </div>
        </div>

        {/* Dynamic Admin Sub-menu navigation links */}
        <div className="bg-slate-950/40 border-t border-slate-800/80 px-4">
          <nav className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar gap-1.5 py-1.5 text-xs sm:text-sm">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`py-1.5 px-3.5 text-xs font-bold rounded transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-transparent text-slate-400 hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {t.tabDashboard}
            </button>
            <button
              onClick={() => handleTabChange('teams')}
              className={`py-1.5 px-3.5 text-xs font-bold rounded transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'teams' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-transparent text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              {t.tabTeams} ({teams.length})
            </button>
            <button
              onClick={() => handleTabChange('players')}
              className={`py-1.5 px-3.5 text-xs font-bold rounded transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'players' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-transparent text-slate-400 hover:bg-slate-800'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              {t.tabPlayers} ({players.length})
            </button>
            <button
              onClick={() => handleTabChange('referees')}
              className={`py-1.5 px-3.5 text-xs font-bold rounded transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'referees' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-transparent text-slate-400 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              {t.tabReferees} ({referees.length})
            </button>
            <button
              onClick={() => handleTabChange('matches')}
              className={`py-1.5 px-3.5 text-xs font-bold rounded transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'matches' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-transparent text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {t.tabMatches} ({matches.length})
            </button>
            {isOrganizerVerified && (
              <button
                onClick={() => {
                  handleTabChange('draw');
                }}
                className={`py-1.5 px-3.5 text-xs font-bold rounded transition-all flex items-center gap-2 whitespace-nowrap border ${
                  activeTab === 'draw' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                {t.tabDraw}
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {tournaments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl space-y-6 animate-fade-in font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 text-3xl">
              🏆
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">
                {language === 'ar' ? 'اصنع بطولتك الكروية الأولى! ⚽' : 'Create Your First Tournament! ⚽'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-bold">
                {language === 'ar' 
                  ? 'أهلاً بك في منصتك الخاصة بالمنظمين. لم تقم بإنشاء أي بطولة حتى الآن للتحكم بها. ابدأ بإنشاء بطولتك وتحديد اسمها واسم المشرف المسؤول لبدء تجهيز الفرق واللاعبين وكل شيء من الصفر.'
                  : 'Welcome to your private organizers workspace. You have not created any tournaments yet. Start now by building your custom tournament.'}
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                setNewTourNameInput('');
                setNewTourOrganizerInput(registeredUser ? registeredUser.name : '');
                setNewTourPinInput('');
                setNewTourFormOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-555/20 text-xs font-black px-6 py-3 rounded-2xl transition inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 w-full justify-center cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {language === 'ar' ? '🏆 إنشاء أول بطولة الآن' : 'Create First Tournament'}
            </button>
          </div>
        ) : (
          <>
            {/* Role Separation Banner */}
        {!isOrganizerVerified ? (
          <div className="mb-6 bg-slate-900/90 border border-amber-500/20 text-slate-350 p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg animate-fade-in text-right">
            <div className="flex items-start gap-3 w-full">
              <span className="text-2xl shrink-0">👁️</span>
              <div className="space-y-2 flex-1">
                <h4 className="text-xs font-black text-amber-400">{t.viewerModeTitle}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-semibold">
                  {t.viewerModeDesc}
                </p>
                {organizerName && (
                  <div className="text-[10px] font-black text-slate-300 bg-slate-950/60 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span>👑 {t.tourSupervisor}:</span>
                    <span className="text-amber-400 font-sans">{organizerName}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => checkOrganizerPermission(() => {})}
              className="bg-amber-550 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] px-4 py-2.5 rounded-xl transition duration-150 shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-505/10"
            >
              <Key className="h-3.5 w-3.5 font-bold" />
              {language === 'ar' ? 'تفعيل وضع المنظم 🔑' : language === 'en' ? 'Activate Organizer Mode 🔑' : 'Activer Mode Organisateur 🔑'}
            </button>
          </div>
        ) : (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in text-right">
            <div className="flex items-start gap-3 w-full">
              <span className="text-2xl shrink-0 animate-bounce">🛠️</span>
              <div className="space-y-3 flex-1">
                <div>
                  <h4 className="text-xs font-black text-emerald-400">{t.organizerModeTitle}</h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-semibold">
                    {t.organizerModeDesc}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap bg-slate-950/40 p-2.5 rounded-xl border border-emerald-500/20 max-w-xl">
                  <span className="text-[10px] text-slate-300 font-extrabold">{t.organizerLabel}</span>
                  <input
                    type="text"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="bg-slate-950 text-emerald-400 font-black text-xs px-3 py-1.5 border border-slate-800 rounded-lg outline-none focus:border-emerald-500 shadow-inner min-w-[200px]"
                    placeholder="اسم المنظم..."
                    title="تغيير اسم منظم البطولة المعتمد"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleOrganizerLogout}
              className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-550/20 font-black text-[11px] px-4 py-2.5 rounded-xl transition duration-150 shrink-0 flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              {language === 'ar' ? 'الخروج وقفل التعديلات 🔒' : language === 'en' ? 'Logout & Lock Edits 🔒' : 'Déconnexion & Verrouillage 🔒'}
            </button>
          </div>
        )}

        {/* Super Admin Control Center Dashboard (منشئ النظام) */}
        {isSuperAdmin && (
          <div className="mb-6 bg-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-right animate-fade-in shadow-xl shadow-amber-500/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-amber-500/10 text-amber-400 text-[10px] font-black tracking-widest px-4 py-1.5 rounded-br-2xl uppercase font-sans">
              👑 Super Admin Panel
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>لوحة تحكم المدير العام والمطوّر</span>
                  <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">بوابة المنشئ الفائقة</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  مرحباً بك يا كابتن حمادة 👋 بصفتك مالك ومطور التطبيق، تمكّنك هذه الواجهة الآمنة من الوصول الكامل لجميع البطولات، استرجاع الرموز السرية المنظّمة، وإعادة تعيينها وحلحلة المشاكل للمنظمين فورياً.
                </p>
              </div>
              
              <button
                onClick={() => setShowSuperAdminPanel(!showSuperAdminPanel)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-705 font-black text-[10px] px-3 py-1.5 rounded-xl transition duration-150 shrink-0 self-start cursor-pointer"
              >
                {showSuperAdminPanel ? '🙈 إخفاء اللوحة الفائقة' : '👁️ عرض تفاصيل التحكم'}
              </button>
            </div>

            {showSuperAdminPanel && (
              <div className="space-y-4 animate-fade-in">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-bold">إجمالي البطولات</div>
                    <div className="text-xl font-black text-amber-400 mt-1 font-sans">{tournaments.length}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-bold">الوضع النشط حالياً</div>
                    <div className="text-xs font-black text-emerald-400 mt-2">مسؤول فائق SuperAdmin</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-bold">الرمز الاحتياطي العام</div>
                    <div className="text-xl font-black text-white mt-1 font-sans">2026</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-bold">حساب المطور الموثق</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-2 font-mono truncate">Hamada10gaoui@gmail.com</div>
                  </div>
                </div>

                {/* Tournaments PIN & Access Table */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-black text-white">🗂️ قائمة مراقبة وتعديل كودات البطولات في الذاكرة</span>
                    <span className="text-[10px] text-slate-400 font-bold">انقر فوق الرموز لتعديل كود أي بطولة</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-500 font-bold text-[10px] border-b border-slate-900">
                          <th className="p-3 text-right">اسم البطولة</th>
                          <th className="p-3 text-right">المشرف/المنظم</th>
                          <th className="p-3 text-right">رمز الدخول الحالي (PIN)</th>
                          <th className="p-3 text-left">خيارات التحكم المباشرة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/80">
                        {tournaments.map((tour) => {
                          const isActive = tour.id === activeTournamentId;
                          const currentPin = tour.pin || '2026';
                          const isEditingPin = editingTourPinId === tour.id;

                          return (
                            <tr key={tour.id} className={`hover:bg-slate-900/40 transition duration-150 ${isActive ? 'bg-amber-500/5' : ''}`}>
                              <td className="p-3 font-semibold text-white">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>🏆 {tour.name}</span>
                                  {isActive && (
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">النشطة حالياً</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-medium text-slate-400">
                                👤 {tour.organizerName || 'لم يحدد'}
                              </td>
                              <td className="p-3">
                                {isEditingPin ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={customPinInput}
                                      maxLength={12}
                                      onChange={(e) => setCustomPinInput(e.target.value)}
                                      placeholder="رمز جديد..."
                                      className="bg-slate-950 text-amber-400 font-sans text-xs w-24 p-1 rounded border border-amber-500/50 outline-none text-center"
                                    />
                                    <button
                                      onClick={() => {
                                        if (customPinInput.trim()) {
                                          handleUpdateTournamentPin(tour.id, customPinInput.trim());
                                          setEditingTourPinId(null);
                                        }
                                      }}
                                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      onClick={() => setEditingTourPinId(null)}
                                      className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-sans text-sm font-black text-amber-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                                      {currentPin}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingTourPinId(tour.id);
                                        setCustomPinInput(currentPin);
                                      }}
                                      className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                                    >
                                      ✍️ تعديل يدوي
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-left">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Quick Switch Button */}
                                  {!isActive && (
                                    <button
                                      onClick={() => {
                                        setActiveTournamentId(tour.id);
                                        setIsOrganizerVerified(true);
                                        triggerAlert(
                                          'تحكّم البطولة المباشر 🔌',
                                          `تم نقل اتصالك بالكامل لبطولة "${tour.name}" وتفعيل وضع المنظم بنجاح!`
                                        );
                                      }}
                                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      🔌 دخول سريع كمسؤول
                                    </button>
                                  )}
                                  
                                  {/* Generate pin button */}
                                  <button
                                    onClick={() => {
                                      const randPin = String(Math.floor(1000 + Math.random() * 9000));
                                      handleUpdateTournamentPin(tour.id, randPin);
                                    }}
                                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="توليد كود تلقائي عشوائي"
                                  >
                                    🔄 توليد عشوائي جديد
                                  </button>

                                  {/* Delete/Clean (Only if there are multiple tournaments) */}
                                  {tournaments.length > 1 && (
                                    <button
                                      onClick={() => {
                                        setCustomConfirm({
                                          isOpen: true,
                                          title: 'تأكيد الحذف النهائي للبطولة 🚨',
                                          message: `هل أنت متأكد تماماً من حذف بطولة "${tour.name}" وكل الفرق والمباريات التابعة لها نهائياً من قاعدة الذاكرة؟ هذا الإجراء لا يمكن التراجع عنه.`,
                                          onConfirm: () => handleDeleteTournamentByAdmin(tour.id),
                                          type: 'delete'
                                        });
                                      }}
                                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer"
                                    >
                                      🗑️ حذف
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Registered Accounts & Bypass Portal & Owner Passcode Editing (عزل الحسابات والملاك) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  
                  {/* Left Column: Registered Users Table with Bypass Access */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 col-span-2 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">👥</span>
                        <h4 className="text-xs font-black text-white">إدارة حسابات المسجلين وبوابة الدخول السريع</h4>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        {registeredAccounts.length} مستخدمين مسجلين
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      هذه اللوحة خاصة بمالك التطبيق فقط لتمكينه من معاينة الحسابات، استرداد الرموز السرية للمشتركين المسجلين، والدخول الفوري لأي حساب لتجربة أو استكشاف حسابه.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-950 text-slate-500 font-bold text-[9px] border-b border-slate-900">
                            <th className="p-2 text-right">الاسم المسجل</th>
                            <th className="p-2 text-right">درجة الصلاحية</th>
                            <th className="p-2 text-right">الرمز السري (Passcode)</th>
                            <th className="p-2 text-left">خيارات الدخول الفوري</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60">
                          {registeredAccounts.map((acc, index) => {
                            const isOwner = acc.name === 'كابتن حمادة' || acc.email === 'Hamada10gaoui@gmail.com';
                            return (
                              <tr key={index} className="hover:bg-slate-900/40 transition">
                                <td className="p-2 font-bold text-white flex flex-col">
                                  <span>{acc.name}</span>
                                  {acc.email && <span className="text-[9px] font-mono text-slate-500 font-normal">{acc.email}</span>}
                                </td>
                                <td className="p-2">
                                  {acc.role === 'organizer' ? (
                                    <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-black border border-amber-500/15">منظم البطولة</span>
                                  ) : (
                                    <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-medium border border-sky-500/15">مشاهد عادي</span>
                                  )}
                                  {isOwner && <span className="ms-1 text-[8px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded font-black">مالك التطبيق</span>}
                                </td>
                                <td className="p-2 font-mono text-xs text-indigo-300 font-bold tracking-wider">
                                  {acc.passcode}
                                </td>
                                <td className="p-2 text-left">
                                  <button
                                    onClick={() => handleAdminBypassLogin(acc)}
                                    className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded text-[9.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="دخول مباشر فوري دون إدخال الرمز السري"
                                  >
                                    <span>🔑</span>
                                    دخول سريع للحساب
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Edit passcode for Application Owner ONLY ("تعديل رمز السري لحساب مالك التطبيق فقط") */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                      <span className="text-sm">👑</span>
                      <h4 className="text-xs font-black text-amber-400">تعديل الرمز السري لحساب مالك التطبيق</h4>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                      حسب قوانين الأمان والتزاماً بطلبك الحصري، يمكنك فقط تعديل الاسم والرمز السري لحساب مالك ومطور التطبيق العام (كابتن حمادة) للحفاظ على الخصوصية بمنتديات الجماهير الأخرى.
                    </p>

                    <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                      {(() => {
                        const ownerAcc = registeredAccounts.find(acc => acc.name === 'كابتن حمادة' || acc.email === 'Hamada10gaoui@gmail.com') || {
                          name: 'كابتن حمادة',
                          passcode: 'HAMADA-ADMIN'
                        };
                        return (
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const fData = new FormData(e.currentTarget);
                            const nameVal = fData.get('ownerName') as string;
                            const passVal = fData.get('ownerPasscode') as string;
                            if (passVal) {
                              handleAdminUpdateOwnerPasscode(nameVal, passVal);
                            }
                          }} className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 block">اسم مالك التطبيق</label>
                              <input
                                type="text"
                                name="ownerName"
                                defaultValue={ownerAcc.name}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-amber-500 text-right"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 block">الرمز السري الجديد للمالك (Passcode)</label>
                              <input
                                type="text"
                                name="ownerPasscode"
                                defaultValue={ownerAcc.passcode}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono font-bold text-amber-400 outline-none focus:border-amber-500 text-center tracking-widest"
                                placeholder="كود سري جديد"
                                required
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black py-2 rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>💾</span>
                              حفظ وتعديل رمز المالك فقط
                            </button>
                          </form>
                        );
                      })()}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* MULTI_TOURNAMENT SELECTOR & CONFIG DESIGN CARDS */}
        <section className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-right animate-fade-in space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                <Trophy className="h-3 w-3 text-emerald-500 shrink-0" />
                {t.multiTourName}
              </span>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                {t.activeTourLabel} 
                <span className="text-emerald-300 font-sans text-xs bg-slate-950 px-3 py-1 rounded border border-slate-800 font-black">
                  {tournamentName}
                </span>
              </h3>
            </div>

            {/* Selector list */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">{t.selectTourLabel}</span>
              <select
                value={`${viewingPrefix}:${activeTournamentId}`}
                onChange={(e) => {
                  const [pref, tId] = e.target.value.split(':');
                  setViewingPrefix(pref);
                  setActiveTournamentId(tId);
                }}
                className="bg-slate-950 text-slate-100 border border-slate-800 hover:border-slate-700 text-xs px-3 py-2 rounded-xl outline-none font-black min-w-[200px]"
              >
                {getAvailableTournaments().map((tItem) => (
                  <option key={`${tItem.prefix}:${tItem.id}`} value={`${tItem.prefix}:${tItem.id}`}>
                    🏆 {tItem.name} {tItem.organizerName ? `(${tItem.organizerName})` : ''} ({language === 'ar' ? 'المباريات' : language === 'en' ? 'Matches' : 'Matchs'}: {tItem.matchesCount})
                  </option>
                ))}
              </select>

              {((registeredUser && registeredUser.role === 'organizer') || isSuperAdmin || isOrganizerVerified) && (
                <button
                  type="button"
                  onClick={() => {
                    setNewTourNameInput('');
                    setNewTourOrganizerInput('');
                    setNewTourPinInput('');
                    setNewTourFormOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-1 shadow-md shadow-emerald-505/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t.newTourBtn}
                </button>
              )}
            </div>
          </div>

          {/* Quick Details of Active Tournament */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-400 font-extrabold block text-[10px]">👑 {t.tourDirector}</span>
              <p className="text-white font-extrabold flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">👤</span>
                {organizerName || (language === 'ar' ? 'لم يعين مشرف' : language === 'en' ? 'Unassigned' : 'Non assigné')}
              </p>
            </div>
            
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-400 font-extrabold block text-[10px]">⚽ {t.tourTeams}</span>
              <p className="text-slate-200 font-bold flex items-center gap-2">
                <span className="text-indigo-400">🛡️</span>
                <span className="text-emerald-400 font-black">{participatingTeamIds.length}</span> {t.teamsParticipating}
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-400 font-extrabold block text-[10px]">📊 {t.scheduledMatches}</span>
              <p className="text-slate-200 font-bold flex items-center gap-2">
                <span className="text-rose-400">📅</span>
                <span className="text-emerald-400 font-black">{matches.length}</span> {t.scheduledMatchesLabel}
              </p>
            </div>
          </div>

          {/* Organizer-only tools to edit Selected Tournament info */}
          {isOrganizerVerified && (
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex flex-wrap items-center justify-between gap-4 animate-fade-in text-xs">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-extrabold shrink-0">✏️ {t.editTourName}</span>
                  <input
                    type="text"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    className="bg-slate-950 text-slate-100 border border-slate-800 focus:border-emerald-500 outline-none px-3 py-1.5 rounded-lg text-xs font-bold w-full sm:w-[220px]"
                    placeholder="مثال: بطولة فصول الصف العاشر"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-extrabold shrink-0">👑 {t.tourSupervisor}</span>
                  <input
                    type="text"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="bg-slate-950 text-slate-100 border border-slate-800 focus:border-emerald-500 outline-none px-3 py-1.5 rounded-lg text-xs font-bold w-full sm:w-[180px]"
                    placeholder="مثال: كابتن أحمد"
                  />
                </div>
              </div>

              {tournaments.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const confirmTitle = language === 'ar' ? 'حذف البطولة بالكامل ⚠️' : language === 'en' ? 'Delete Tournament Entirely ⚠️' : 'Supprimer le Tournoi Entièrement ⚠️';
                    const confirmMsg = language === 'ar' ? `هل أنت متأكد من رغبتك في حذف بطولة "${tournamentName}" بالكامل مع أرشيف مبارياتها؟ هذا الإجراء لا يمكن التراجع عنه.` : language === 'en' ? `Are you sure you want to delete tournament "${tournamentName}" and all its match archive? This action cannot be undone.` : `Êtes-vous sûr de vouloir supprimer le tournoi "${tournamentName}" avec tous ses matchs ? Cette action est irréversible.`;
                    
                    triggerConfirm(
                      confirmTitle,
                      confirmMsg,
                      () => {
                        const remaining = tournaments.filter(tItem => tItem.id !== activeTournamentId);
                        setTournaments(remaining);
                        setActiveTournamentId(remaining[0].id);
                      },
                      'danger'
                    );
                  }}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-550/20 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 hover:text-white"
                  title="حذف هذه البطولة من أرشيف المنصة"
                >
                  <Trash className="h-3.5 w-3.5" />
                  {t.deleteTourBtn}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Draw success notice floating bar */}
        {drawMessage && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold">{drawMessage}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD AND SUMMARY */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="tab-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {showWelcome && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden shrink-0 group transition-all duration-300 hover:border-indigo-500/35"
                >
                  {/* Glowing background accent radial flare */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none rounded-full" />
                  
                  {/* Close/Hide Button */}
                  <button
                    onClick={handleDismissWelcome}
                    className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} p-1.5 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white transition shadow duration-150 shrink-0`}
                    title={language === 'ar' ? 'إخفاء التعريف' : language === 'en' ? 'Hide overview' : "Masquer l'aperçu"}
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
                    {/* Visual Mascot/Logo Display */}
                    <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg text-slate-950 font-extrabold rotate-3 group-hover:rotate-6 transition duration-300 shrink-0 animate-pulse">
                      <Trophy className="h-7 w-7 text-white font-extrabold animate-bounce" style={{ animationDuration: '4s' }} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <h2 className="text-lg sm:text-xl font-black tracking-tight text-white font-display leading-tight">
                          {t.welcomeTitle}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl font-sans">
                          {t.welcomeDesc}
                        </p>
                      </div>

                      {/* Feature Bullet highlights */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        <div className="bg-slate-950/65 border border-slate-800/60 p-3.5 rounded-2xl flex items-start gap-3 hover:border-emerald-500/20 transition duration-200">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/15">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200 leading-normal">
                              {t.welcomeFeatDraw}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-950/65 border border-slate-800/60 p-3.5 rounded-2xl flex items-start gap-3 hover:border-indigo-500/20 transition duration-200">
                          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 border border-indigo-500/15">
                            <QrCode className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200 leading-normal">
                              {t.welcomeFeatLive}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-950/65 border border-slate-800/60 p-3.5 rounded-2xl flex items-start gap-3 hover:border-indigo-500/20 transition duration-200">
                          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 border border-indigo-500/15">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200 leading-normal">
                              {t.welcomeFeatStats}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Registered Fan/Spectator Personalized Board Banner */}
              {registeredUser && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col sm:flex-row items-center gap-4 justify-between relative overflow-hidden shrink-0"
                >
                  <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl shrink-0 font-bold">
                      {registeredUser.role === 'organizer' ? '🏆' : '⚽'}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight">
                        {language === 'ar' ? `مرحباً بعودتك، كابتن ${registeredUser.name}! 👋` : `Welcome back, Captain ${registeredUser.name}! 👋`}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {registeredUser.role === 'organizer' ? (
                          <span className="text-amber-400 font-bold">{language === 'ar' ? '🔐 أنت مسجل بصفتك منظم ومسؤول مفعّل عن البطولة الحالية.' : '🔐 You are registered as an active tournament organizer.'}</span>
                        ) : (
                          <span>
                            {language === 'ar' ? '📣 حساب مشاهد نشط. يمكنك تشجيع فريقك والتصويت على المباريات الجارية!' : '📣 Active spectator account. Support your team and place predictions!'}
                            {registeredUser.favoriteTeamId && (
                              <span className="text-emerald-400 font-bold block sm:inline sm:ms-1.5">
                                🚩 {language === 'ar' ? 'فريقك المفضل:' : 'Fav Team:'} {teams.find(t => t.id === registeredUser.favoriteTeamId)?.name || ''}
                              </span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Add action buttons inside the greeting */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-end">
                    {registeredUser.role === 'spectator' && registeredUser.favoriteTeamId && (
                      <button
                        onClick={() => {
                          const tObj = teams.find(t => t.id === registeredUser.favoriteTeamId);
                          if (tObj) {
                            handleCheerTeam(tObj.id, tObj.name);
                          }
                        }}
                        className="bg-emerald-500 hover:bg-emerald-405 text-slate-950 text-[10px] font-black px-3.5 py-2 rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📣</span>
                        {language === 'ar' ? 'شجع فريقك!' : 'Cheer!'}
                      </button>
                    )}
                    <button
                      onClick={handleOpenProfileModal}
                      className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <span>⚙️</span>
                      {language === 'ar' ? 'تعديل حسابي ورمزي' : 'Edit Account & PIN'}
                    </button>
                    <button
                      onClick={handleLogoutAccount}
                      className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 text-rose-400 text-[10px] font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                    >
                      {language === 'ar' ? 'تسجيل الخروج 🚪' : 'Logout account'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Stats Widgets Grid */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div className="bg-slate-900 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">{t.totalTeams}</span>
                    <p className="text-2xl font-bold text-white">{teams.length}</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">{t.totalPlayers}</span>
                    <p className="text-2xl font-bold text-white">{players.length}</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">{t.goalsScored}</span>
                    <p className="text-2xl font-bold text-emerald-400">{totalGoalsCount}</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">{t.matchesPlayed}</span>
                    <p className="text-2xl font-bold text-white">
                      {finishedCount} <span className="text-xs text-slate-500 font-normal">{t.ofWord} {matches.length}</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Reports & Statistics Download Center (تحميل النتائج والإحصائيات) */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-xl space-y-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Download className="h-4 w-4 text-emerald-400 animate-bounce" style={{ animationDuration: '3s' }} />
                      {t.downloadCenterTitle}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {t.downloadCenterDesc}
                    </p>
                  </div>
                  
                  {/* Complete Printable HTML/PDF report */}
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={handleDownloadHtmlReport}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5 duration-150 cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      {t.downloadFullHtmlReportBtn}
                    </button>

                    <a
                      href="/RAPPORT.docx"
                      download="RAPPORT_CONCEPTION_FOOTBALL.docx"
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-400 hover:to-sky-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5 duration-150 cursor-pointer text-center"
                    >
                      <FileText className="h-4 w-4 text-white" />
                      {language === 'ar' ? 'تحميل التقرير كملف Word (.docx)' : language === 'fr' ? 'Télécharger le rapport Word (.docx)' : 'Download Word Report (.docx)'}
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={handleExportTeamsCsv}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 transition group cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Shield className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block transition group-hover:text-emerald-400">
                        {t.downloadTeamsCsvBtn}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 font-sans">
                        {language === 'ar' ? 'النقاط وهدافين وترتيب المجموعات' : 'Team points, wins & standings table'}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={handleExportMatchesCsv}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 transition group cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Calendar className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block transition group-hover:text-emerald-400">
                        {t.downloadMatchesCsvBtn}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 font-sans">
                        {language === 'ar' ? 'جدول المواعيد والنتائج والأحداث' : 'Full fixture schedule & score outcomes'}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={handleExportPlayersCsv}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 transition group cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-rose-400 flex items-center justify-center group-hover:scale-105 transition">
                      <User className="h-4 w-4 text-rose-450" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block transition group-hover:text-emerald-400">
                        {t.downloadPlayersCsvBtn}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 font-sans">
                        {language === 'ar' ? 'جدول كامل هدافين وبطاقات وبراءات اللاعبين' : 'Goalscorer metrics, yellow/red cards list'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Live QR Connection banner & Simulation Control */}
              <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-900/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
                  <div className="space-y-3 col-span-2">
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-full uppercase">{t.qrServiceBadge}</span>
                    <h2 className="text-xl sm:text-2xl font-black font-display leading-tight">{t.qrTitle}</h2>
                    <p className="text-xs text-slate-400 max-w-xl">
                      {t.qrDescription}
                    </p>
                    
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                       <button
                        onClick={handleCopyLink}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow"
                      >
                        <Share2 className="h-4 w-4" />
                        {t.copyPublicLink}
                      </button>

                      <button
                        onClick={handleTogglePublicView}
                        className="bg-slate-800 hover:bg-slate-700 hover:text-white transition text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-700"
                      >
                        <ExternalLink className="h-4 w-4 text-emerald-400" />
                        {t.openPublicView}
                      </button>
                    </div>
                  </div>

                  {/* QR Image Box */}
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <img 
                      src={dashboardQrDataUrl || qrCodeUrl} 
                      alt="البث المباشر للبطولة" 
                      className="h-32 w-32 object-contain bg-white p-2 rounded-xl shadow-lg border border-slate-800"
                    />
                    <div>
                      <span className="text-xs font-bold font-display text-emerald-400 block mb-0.5">{t.scanMobile}</span>
                      <span className="text-[9px] text-slate-400">{t.spectatorNote}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Standings and Live Matches block */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Miniature Leaderboard table */}
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      {t.topFiveStandings}
                    </h3>
                    <button 
                      onClick={() => handleTabChange('teams')}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold"
                    >
                      {t.viewAllTeams}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    {(() => {
                      const groupsWithTeams = Array.from(new Set(standings.filter(t => t.group).map(t => t.group as string))).sort();
                      const hasGroups = groupsWithTeams.length > 0;

                      if (!hasGroups) {
                        return (
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="text-slate-400 font-bold border-b border-slate-800 pb-1 text-[10px]">
                                <th className="py-2 px-1 text-center w-8">#</th>
                                <th className="py-2 px-2">{t.team}</th>
                                <th className="py-2 px-2 text-center w-10">{t.played}</th>
                                <th className="py-2 px-2 text-center w-10">{t.won}</th>
                                <th className="py-2 px-2 text-center w-10">{t.drawn}</th>
                                <th className="py-2 px-2 text-center w-10">{t.lost}</th>
                                <th className="py-2 px-2 text-center w-10">{t.diff}</th>
                                <th className="py-2 px-2 text-center w-14">{t.goals}</th>
                                <th className="py-2 px-2 text-center font-bold text-slate-300 w-10">{t.points}</th>
                                <th className="py-2 px-2 text-center w-24">{language === 'ar' ? 'آخر 5' : language === 'fr' ? 'Forme' : 'Form'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {standings.slice(0, 5).map((team, idx) => (
                                <tr key={team.id} className="hover:bg-slate-800/30 transition">
                                  <td className="py-2.5 px-1 text-center">
                                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                                      idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 font-bold flex items-center gap-2">
                                    <span className={`h-6 w-6 rounded-full ${team.logoColor} flex items-center justify-center text-xs shadow-sm`}>
                                      {team.logoIcon}
                                    </span>
                                    <div className="truncate">
                                      <span className="block text-slate-100">{team.name}</span>
                                      <span className="text-[9px] text-slate-400 block font-normal">{team.schoolClass}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{team.played}</td>
                                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{team.wins}</td>
                                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{team.draws}</td>
                                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{team.losses}</td>
                                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono font-bold" dir="ltr">
                                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[10px]" dir="ltr">
                                    {team.goalsFor}:{team.goalsAgainst}
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-black text-emerald-400 text-sm font-display">{team.points}</td>
                                  <td className="py-2.5 px-2 text-center">
                                    {renderFormCircles(team.id)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {groupsWithTeams.map(grp => {
                            const grpTeams = standings.filter(t => t.group === grp);
                            return (
                              <div key={grp} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 space-y-2">
                                <h4 className="font-extrabold text-[11px] text-amber-400 font-display flex items-center gap-1">
                                  <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                  {language === 'ar' ? `المجموعة ${grp}` : language === 'en' ? `Group ${grp}` : `Groupe ${grp}`}
                                </h4>
                                <table className="w-full text-right text-xs">
                                  <thead>
                                    <tr className="text-slate-400 font-bold border-b border-slate-800 pb-1 text-[9px]">
                                      <th className="py-1.5 px-1 text-center w-8">#</th>
                                      <th className="py-1.5 px-2">{t.team}</th>
                                      <th className="py-1.5 px-2 text-center w-12">{t.played}</th>
                                      <th className="py-1.5 px-2 text-center w-12">{t.won}</th>
                                      <th className="py-1.5 px-2 text-center w-12">{t.drawn}</th>
                                      <th className="py-1.5 px-2 text-center w-12">{t.lost}</th>
                                      <th className="py-1.5 px-2 text-center w-12">{t.diff}</th>
                                      <th className="py-1.5 px-2 text-center w-16">{t.goals}</th>
                                      <th className="py-1.5 px-2 text-center font-bold text-slate-300 w-12">{t.points}</th>
                                      <th className="py-1.5 px-2 text-center w-24">{language === 'ar' ? 'آخر 5' : language === 'fr' ? 'Forme' : 'Form'}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/30">
                                    {grpTeams.map((team, idx) => (
                                      <tr key={team.id} className="hover:bg-slate-800/20 transition">
                                        <td className="py-2 px-1 text-center">
                                          <span className={`inline-flex items-center justify-center h-4.5 w-4.5 rounded-full text-[9px] font-bold ${
                                            idx === 0 ? 'bg-amber-500/90 text-slate-950' : 'bg-slate-800 text-slate-300'
                                          }`}>
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2 font-bold flex items-center gap-2">
                                          <span className={`h-5 w-5 rounded-full ${team.logoColor} flex items-center justify-center text-[10px] shadow-sm`}>
                                            {team.logoIcon}
                                          </span>
                                          <span className="block text-slate-100 text-[11px] font-medium truncate max-w-[120px]">{team.name}</span>
                                        </td>
                                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">{team.played}</td>
                                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">{team.wins}</td>
                                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">{team.draws}</td>
                                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">{team.losses}</td>
                                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px] font-bold" dir="ltr">
                                          {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                                        </td>
                                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[9px]" dir="ltr">
                                          {team.goalsFor}:{team.goalsAgainst}
                                        </td>
                                        <td className="py-2 px-2 text-center font-bold text-emerald-400 font-display text-xs">{team.points}</td>
                                        <td className="py-2 px-2 text-center">
                                          {renderFormCircles(team.id)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. Top Scorers Miniature panel */}
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-400" />
                      {t.topScorers}
                    </h3>
                    <button 
                      onClick={() => handleTabChange('players')}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold"
                    >
                      {language === 'ar' ? 'الكل' : language === 'en' ? 'All' : 'Tout'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {topScorers.slice(0, 5).map((player, idx) => (
                      <div key={player.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-slate-400 font-mono font-bold">#{idx + 1}</span>
                          <div>
                            <span className="font-bold text-slate-200 block">{player.name}</span>
                            <span className="text-[9px] text-slate-400 block font-normal">{player.teamName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/20 font-bold">
                          <span className="font-display font-extrabold">{player.goals}</span>
                          <span className="text-[9px]">{t.goalsCountWord}</span>
                        </div>
                      </div>
                    ))}

                    {topScorers.length === 0 && (
                      <p className="text-center py-6 text-slate-500 text-xs">{t.noGoalsScoredYet}</p>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 2: TEAMS MANAGEMENT */}
          {activeTab === 'teams' && (
            <motion.div
              key="tab-teams"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold font-display text-white">إدارة الفرق والنوادي المشاركة</h2>
                  <p className="text-xs text-slate-400">سجل أسماء الفرق والمدارس الفصول الدراسية وقائد كل فريق</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="h-4 w-4 absolute right-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="البحث عن فريق..."
                      value={teamSearch}
                      onChange={e => setTeamSearch(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 placeholder-slate-500 text-xs pr-9 pl-3 py-2 rounded border border-slate-800 outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                  
                  {((registeredUser && registeredUser.role === 'organizer') || isSuperAdmin || isOrganizerVerified) && (
                    <button
                      onClick={() => handleOpenTeamForm()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-1 shrink-0 transition"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة فريق جديد
                    </button>
                  )}
                </div>
              </div>

              {/* Team Add / Edit form modal element if open */}
              {teamFormOpen && (
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl max-w-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                    <h3 className="font-bold text-sm text-white">
                      {editingTeam ? 'تعديل بيانات الفريق' : 'إضافة فريق بطولة جديد'}
                    </h3>
                    <button onClick={() => setTeamFormOpen(false)} className="text-slate-400 hover:text-white-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">اسم الفريق *</label>
                      <input
                        type="text"
                        placeholder="مثال: شباب العاصفة"
                        value={teamNameForm}
                        onChange={e => setTeamNameForm(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">الصف الدراسي أو الفئة (اختياري)</label>
                      <input
                        type="text"
                        placeholder="مثال: الصف الثاني عشر - ب"
                        value={teamClassForm}
                        onChange={e => setTeamClassForm(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">المنطقة أو المدرسة أو المدينة</label>
                      <input
                        type="text"
                        placeholder="مثال: الرياض"
                        value={teamCityForm}
                        onChange={e => setTeamCityForm(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Logo preset icon selector */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-400 block">أيقونة الشعار</label>
                      <div className="flex flex-wrap gap-2 py-1">
                        {PRESET_ICONS.map(ic => (
                          <button
                            key={ic}
                            onClick={() => setTeamIconForm(ic)}
                            className={`h-9 w-9 rounded flex items-center justify-center text-lg ${
                              teamIconForm === ic ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-950/60 hover:bg-slate-850 text-slate-300'
                            }`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logo preset color selector */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-400 block">لون الشعار الأساسي</label>
                      <div className="flex flex-wrap gap-2.5 py-1">
                        {PRESET_COLORS.map(col => (
                          <button
                            key={col}
                            onClick={() => setTeamColorForm(col)}
                            className={`h-7 w-7 rounded-full ${col} border-2 ${
                              teamColorForm === col ? 'border-white scale-110 shadow-sm shadow-black/50' : 'border-transparent'
                            } transition`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setTeamFormOpen(false)}
                      className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded text-slate-400 font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveTeam}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow"
                    >
                      حفظ الفريق
                    </button>
                  </div>
                </div>
              )}

              {/* Grid representation of teams */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {standings
                  .filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                  .map(team => {
                    const squadCount = players.filter(p => p.teamId === team.id).length;
                    
                    return (
                      <div key={team.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-4 relative card-hover overflow-hidden shadow-md">
                        
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded ${team.logoColor} flex items-center justify-center text-xl text-white shadow`}>
                            {team.logoIcon}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white font-display leading-tight">{team.name}</h3>
                            <p className="text-[10px] text-slate-400 font-normal">{team.schoolClass || 'بلا تصنيف صف'} • {team.city || 'عام'}</p>
                          </div>
                        </div>

                        {/* Quick Stats of the team squad to justify design */}
                        <div className="bg-slate-950 rounded-xl p-3 grid grid-cols-3 text-center text-xs divide-x-0 divide-slate-800 border border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-400 block">تشكيلة</span>
                            <span className="font-bold text-slate-200 mt-0.5 block">{squadCount} لاعبين</span>
                          </div>

                          <div className="border-x border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block">الأهداف</span>
                            <span className="font-bold text-slate-200 mt-0.5 block">{team.goalsFor} له</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">النقاط</span>
                            <span className="font-bold text-emerald-400 mt-0.5 block">{team.points} ن</span>
                          </div>
                        </div>

                        {/* Control buttons inside Card */}
                        {isOrganizerVerified && (
                          <div className="flex justify-end gap-1.5 pt-2">
                            <button
                              onClick={() => {
                                const teamUrl = `${cleanUrl}?view=team-portal&teamId=${team.id}`;
                                setActiveQrModal({
                                  title: `باركود مُمثل فريق: ${team.name}`,
                                  subtitle: `تنزيل الكود لفتح واجهة تقييد وتسجيل لاعبي الفريق بشكل حر ومباشر من الهواتف الذكية.`,
                                  url: teamUrl,
                                });
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 p-1.5 rounded text-xs"
                              title="رمز الاستجابة السريعة (QR) للفريق"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenTeamForm(team)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded text-xs"
                              title="تعديل بيانات الفريق"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteTeam(team.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded text-xs"
                              title="حذف الفريق"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {teams.length === 0 && (
                  <div className="col-span-full py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                    <Users className="h-10 w-10 mx-auto text-slate-500 mb-2" />
                    <p className="text-xs">لم تتم إضافة أي فرق حتى الآن. انقر على الزر بالأعلى لإضافة فريقك الأول!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: PLAYERS MANAGEMENT */}
          {activeTab === 'players' && (
            <motion.div
              key="tab-players"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold font-display text-white">سجلات وجداول اللاعبين</h2>
                  <p className="text-xs text-slate-400">تحكم وتابع جميع اللاعبين المسجلين في البطولة وإحصائيات التسجيل الخاصة بهم</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute right-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="ابحث باسم اللاعب..."
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      className="bg-slate-900 text-slate-200 placeholder-slate-500 text-xs pr-9 pl-3 py-2 rounded border border-slate-800 outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  {/* Filter by team */}
                  <select
                    value={playerTeamFilter}
                    onChange={e => setPlayerTeamFilter(e.target.value)}
                    className="bg-slate-900 text-xs py-2 px-3 rounded border border-slate-800 outline-none focus:border-emerald-500 font-bold text-slate-300"
                  >
                    <option value="all">كل الفرق</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  {isOrganizerVerified && (
                    <button
                      onClick={() => handleOpenPlayerForm()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-1 transition animate-fade-in"
                    >
                      <Plus className="h-4 w-4" />
                      تسجيل لاعب جديد
                    </button>
                  )}
                </div>
              </div>

              {/* Player edit dialog */}
              {playerFormOpen && (
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl max-w-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                    <h3 className="font-bold text-sm text-white">
                      {editingPlayer ? 'تعديل بيانات اللاعب' : 'تسجيل لاعب جديد في البطولة'}
                    </h3>
                    <button onClick={() => setPlayerFormOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">اسم اللاعب المزدوج/الثلاثي *</label>
                      <input
                        type="text"
                        placeholder="مثال: صالح الشهري"
                        value={playerNameForm}
                        onChange={e => setPlayerNameForm(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">انتساب إلى الفريق</label>
                      <select
                        value={playerTeamForm}
                        onChange={e => setPlayerTeamForm(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500 font-bold"
                      >
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">اسم الفريق المقترن</label>
                      <input
                        type="text"
                        placeholder="اسم الفريق للبطولة..."
                        value={playerTeamNameForm}
                        onChange={e => setPlayerTeamNameForm(e.target.value)}
                        className="w-full bg-slate-900 text-slate-350 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-505 font-bold shadow-inner"
                        title="اسم الفريق للّاعب، يتم تحديثه تلقائياً عند تغيير فريق الانتساب ويمكن تعديله"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">رقم قميص اللاعب</label>
                      <input
                        type="number"
                        placeholder="مثال: 10"
                        value={playerNumForm}
                        onChange={e => setPlayerNumForm(Number(e.target.value))}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1 font-bold">
                      <label className="text-xs font-bold text-slate-400 block">مركز اللعب المعتاد</label>
                      <select
                        value={playerPositionForm}
                        onChange={e => setPlayerPositionForm(e.target.value as any)}
                        className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500 font-bold"
                      >
                        <option value="FW">مهاجم (FW)</option>
                        <option value="MF">لاعب وسط (MF)</option>
                        <option value="DF">مدافع (DF)</option>
                        <option value="GK">حارس مرمى (GK)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setPlayerFormOpen(false)}
                      className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded text-slate-400 font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSavePlayer}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow"
                    >
                      حفظ اللاعب
                    </button>
                  </div>
                </div>
              )}

              {/* Table list of players */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="px-5 py-3 text-center w-12">الرقم</th>
                        <th className="px-5 py-3">الاسم</th>
                        <th className="px-5 py-3">الفريق الحلف</th>
                        <th className="px-5 py-3 text-center">المركز</th>
                        <th className="px-5 py-3 text-center text-emerald-400 bg-emerald-500/5 w-24">Goals ⚽</th>
                        <th className="px-5 py-3 text-center w-24">كروت صفراء 🟨</th>
                        <th className="px-5 py-3 text-center w-24">كروت حمراء 🟥</th>
                        <th className="px-5 py-3 text-center w-28">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-medium">
                      {playerStatsList
                        .filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                        .filter(p => playerTeamFilter === 'all' || p.teamId === playerTeamFilter)
                        .map(player => (
                          <tr key={player.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-3 text-center font-bold text-slate-400 font-mono">
                              #{player.number}
                            </td>
                            <td className="px-5 py-3 font-bold text-slate-100">
                              <button 
                                onClick={() => setDetailedPlayer(player)}
                                className="hover:text-emerald-400 text-right transition hover:underline focus:outline-none"
                                title="عرض تفاصيل اللاعب وإحصائيات المباراة كاملة"
                              >
                                {player.name}
                              </button>
                            </td>
                            <td className="px-5 py-3 text-slate-300 font-semibold">
                              {player.teamName}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                player.position === 'FW' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                player.position === 'MF' ? 'bg-indigo-505/10 text-indigo-400 border-indigo-500/20' :
                                player.position === 'DF' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {player.position === 'FW' ? 'مهاجم' : player.position === 'MF' ? 'وسط' : player.position === 'DF' ? 'مدافع' : 'حارس مرمى'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center font-extrabold text-[#10b981] bg-emerald-500/5 text-sm font-display">
                              {player.goals}
                            </td>
                            <td className="px-5 py-3 text-center font-bold text-yellow-500 font-mono">
                              {player.yellowCards}
                            </td>
                            <td className="px-5 py-3 text-center font-bold text-red-550 font-mono">
                              {player.redCards}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setDetailedPlayer(player)}
                                  className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition"
                                  title="تفاصيل وإحصائيات اللاعب الأوسع عبر البطولات"
                                >
                                  <Eye className="h-3 w-3" />
                                </button>
                                {isOrganizerVerified && (
                                  <>
                                    <button
                                      onClick={() => handleOpenPlayerForm(player)}
                                      className="text-slate-300 hover:text-white p-1.5 rounded bg-slate-800 hover:bg-slate-700 transition"
                                      title="تعديل"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePlayer(player.id)}
                                      className="text-red-400 hover:text-red-300 p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 transition"
                                      title="حذف"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                      {players.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-500 font-normal">
                            لا يوجد أي لاعبين مقيدين حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: REFEREES MANAGEMENT */}
          {activeTab === 'referees' && (
            <motion.div
              key="tab-referees"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold font-display text-white">إدارة الحكام والمسؤولين</h2>
                  <p className="text-xs text-slate-400">مراقبة حكام الساحة والحكام المساعدين بالبطولة والاتصال بهم</p>
                </div>

                {isOrganizerVerified && (
                  <button
                    onClick={() => handleOpenRefereeForm()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-1 transition shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة حكم جديد
                  </button>
                )}
              </div>

              {/* Referee edit popup */}
              {refereeFormOpen && (
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl max-w-xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                    <h3 className="font-bold text-sm text-white">
                      {editingReferee ? 'تعديل بيانات الحكم' : 'إضافة حكم ساحة/مساعد للبطولة'}
                    </h3>
                    <button onClick={() => setRefereeFormOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">اسم الحكم بالكامل *</label>
                      <input
                        type="text"
                        placeholder="مثال: تركي الخضير"
                        value={refereeNameForm}
                        onChange={e => setRefereeNameForm(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 block">رقم الهاتف للاتصال</label>
                      <input
                        type="text"
                        placeholder="مثال: 0501234567"
                        value={refereePhoneForm}
                        onChange={e => setRefereePhoneForm(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs px-3 py-2 border border-slate-800 rounded outline-none focus:border-emerald-500"
                      />
                    </div>


                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setRefereeFormOpen(false)}
                      className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded text-slate-400 font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveReferee}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow"
                    >
                      حفظ البيانات
                    </button>
                  </div>
                </div>
              )}

              {/* Grid representation of referees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {referees.map(ref => (
                  <div key={ref.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md relative hover:shadow-lg transition">
                    <span className="absolute top-4 left-4 text-[10px] font-bold bg-slate-850 px-2 py-0.5 rounded-full text-emerald-400 border border-slate-800/80">
                      حكم معتمد
                    </span>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{ref.name}</h4>
                        <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5 font-mono" dir="ltr">
                          <Phone className="h-3 w-3 shrink-0" />
                          {ref.phone || 'بلا رقم اتصال'}
                        </p>
                      </div>
                    </div>

                    {isOrganizerVerified && (
                      <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-slate-800 text-xs">
                        <button
                          onClick={() => handleOpenRefereeForm(ref)}
                          className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800"
                          title="تعديل"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReferee(ref.id)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/15"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {referees.length === 0 && (
                  <div className="col-span-full text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                    <UserCheck className="h-8 w-8 mx-auto text-slate-700 mb-1" />
                    لا يوجد حكام مسجلون حالياً.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: MATCHES LIST AND LIVE CONTROLLER */}
          {activeTab === 'matches' && (
            <motion.div
              key="tab-matches"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              
              {/* Quick schedule manually generator panel */}
              {isOrganizerVerified && (
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md space-y-4">
                  <h3 className="text-sm font-bold font-display text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                    إضافة مباراة للجدول يدوياً
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                    {/* Home Team */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 display">المستضيف (الأرض)</label>
                      <select
                        value={manualHomeTeam}
                        onChange={e => setManualHomeTeam(e.target.value)}
                        className="w-full bg-slate-950 text-xs p-2 rounded border border-slate-800 outline-none focus:border-emerald-500 font-bold"
                      >
                        <option value="">اختر الفريق الأول...</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Away Team */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 display">الضيف (خارج ملعبه)</label>
                      <select
                        value={manualAwayTeam}
                        onChange={e => setManualAwayTeam(e.target.value)}
                        className="w-full bg-slate-950 text-xs p-2 rounded border border-slate-800 outline-none focus:border-emerald-500 font-bold"
                      >
                        <option value="">اختر الفريق الثاني...</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stage */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">الجولة/المرحلة</label>
                      <input
                        type="text"
                        placeholder="الجولة 1"
                        value={manualStage}
                        onChange={e => setManualStage(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs p-2 rounded border border-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Referee Selection */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">الحكم المعين</label>
                      <select
                        value={manualReferee}
                        onChange={e => setManualReferee(e.target.value)}
                        className="w-full bg-slate-950 text-xs p-2 rounded border border-slate-800 outline-none font-bold"
                      >
                        <option value="">بدون تعيين حكم...</option>
                        {referees.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date selection */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">تاريخ اللقاء</label>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={e => setManualDate(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 text-xs p-2 rounded border border-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Time selection */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">ساعة البداية</label>
                      <input
                        type="time"
                        value={manualTime}
                        onChange={e => setManualTime(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 text-xs p-2 rounded border border-slate-800 outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Add action */}
                    <div className="flex items-end">
                      <button
                        onClick={handleAddManualMatch}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-2 rounded w-full transition flex items-center justify-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        جدولة اللقاء
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Match Events Control Suite - ONLY visible when editing a specific Match */}
              {currentMatch && (
                <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="font-bold text-sm text-emerald-400 font-display">لوحة تحكم المباراة الفورية ومسجل الأهداف</h3>
                    </div>
                    
                    <button onClick={() => setCurrentMatch(null)} className="text-slate-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Scoreline inside editor */}
                  <div className="grid grid-cols-7 items-center justify-center text-center max-w-xl mx-auto py-3 bg-slate-950/40 rounded-xl p-3 border border-slate-800">
                    {/* Home */}
                    <div className="col-span-2 text-center space-y-2">
                      <span className="text-xs font-bold block text-slate-100">{currentMatch.homeTeamName}</span>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleUpdateMatchScoreManual(1, 0)}
                          className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-755 border border-slate-700 font-bold text-xs text-emerald-400"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleUpdateMatchScoreManual(-1, 0)}
                          className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-755 border border-slate-700 font-bold text-xs text-red-400"
                        >
                          -1
                        </button>
                      </div>
                    </div>

                    {/* Score Center with Live status selectors */}
                    <div className="col-span-3 flex flex-col items-center justify-center gap-1.5">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl font-black font-display text-white">{currentMatch.scoreHome}</span>
                        <span className="text-slate-600 font-black text-sm">:</span>
                        <span className="text-2xl font-black font-display text-white">{currentMatch.scoreAway}</span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-850">
                        <button
                          onClick={() => handleUpdateMatchStatus('not_started')}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            matchingStatus === 'not_started' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          مجدولة
                        </button>
                        <button
                          onClick={() => handleUpdateMatchStatus('live')}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            matchingStatus === 'live' ? 'bg-red-500/15 text-red-400 animate-pulse' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          مباشر 🔴
                        </button>
                        <button
                          onClick={() => handleUpdateMatchStatus('finished')}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            matchingStatus === 'finished' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          انتهت
                        </button>
                      </div>
                    </div>

                    {/* Away */}
                    <div className="col-span-2 text-center space-y-2">
                      <span className="text-xs font-bold block text-slate-100">{currentMatch.awayTeamName}</span>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleUpdateMatchScoreManual(0, 1)}
                          className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-755 border border-slate-700 font-bold text-xs text-emerald-400"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleUpdateMatchScoreManual(0, -1)}
                          className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-755 border border-slate-700 font-bold text-xs text-red-400"
                        >
                          -1
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Automatic Chrono / Stopwatch Panel */}
                  {currentMatch.status === 'live' && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                          ⏱️ الكرونومتر التلقائي للقاء المباشر (Automatic Chrono)
                        </div>
                        <div className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                          يربط التوقيت المباشر مع تسجيل الأهداف تلقائياً
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
                        {/* Digital Timer Clock Display */}
                        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                          <span className="text-2xl font-black font-mono tracking-wider text-amber-400">
                            {formatChronoTime(chronoSeconds)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 font-sans border-r border-slate-800 pr-2 block">
                            دقيقة {matchEventTimer}
                          </span>
                        </div>

                        {/* Chrono Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateMatchChrono({ isChronoRunning: !isChronoRunning })}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                              isChronoRunning
                                ? 'bg-amber-500 text-slate-950 font-black shadow'
                                : 'bg-emerald-600 text-white font-black shadow'
                            }`}
                          >
                            {isChronoRunning ? '⏸️ إيقاف مؤقت' : '▶️ تشغيل الكرونو'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateMatchChrono({
                                chronoSeconds: 0,
                                isChronoRunning: false
                              });
                              setMatchEventTimer(1);
                            }}
                            className="bg-slate-900 text-slate-400 hover:text-white border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition"
                            title="تصفير الكرونو"
                          >
                            🔄 تصفير
                          </button>

                          {/* Minute adjustments */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextSecs = Math.max(0, chronoSeconds + 60);
                              handleUpdateMatchChrono({ chronoSeconds: nextSecs });
                              setMatchEventTimer(Math.min(120, Math.floor(nextSecs / 60) + 1));
                            }}
                            className="bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-slate-800 px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition font-mono"
                          >
                            +1 دقيقة
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextSecs = Math.max(0, chronoSeconds - 60);
                              handleUpdateMatchChrono({ chronoSeconds: nextSecs });
                              setMatchEventTimer(Math.max(1, Math.floor(nextSecs / 60) + 1));
                            }}
                            className="bg-slate-900 text-red-400 hover:text-red-350 border border-slate-800 px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition font-mono"
                          >
                            -1 دقيقة
                          </button>

                          {/* Simulation Speed Toggle */}
                          <button
                            type="button"
                            onClick={() => handleUpdateMatchChrono({ chronoSpeed: chronoSpeed === 'normal' ? 'fast' : 'normal' })}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              chronoSpeed === 'fast'
                                ? 'bg-indigo-600/25 text-indigo-400 border-indigo-500/30 font-black'
                                : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-300'
                            }`}
                          >
                            {chronoSpeed === 'fast' ? '⚡ محاكاة فائقة (دقيقة=ثانية)' : '⏱️ وقت حقيقي'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Match Events Form (goals or cards!) */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">تسجيل حدث حي (أهداف، إنذارات، طرد)</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      
                      {/* Event Type */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block font-bold">الحدث</label>
                        <select
                          value={matchEventType}
                          onChange={e => setMatchEventType(e.target.value as any)}
                          className="w-full bg-slate-900 text-xs p-2 rounded border border-slate-800 outline-none font-bold text-white font-sans"
                        >
                          <option value="goal">⚽ هدف (Goal)</option>
                          <option value="yellow_card">🟨 كارت أصفر (Yellow)</option>
                          <option value="red_card">🟥 كارت أحمر (Red)</option>
                        </select>
                      </div>

                      {/* Select Player */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block font-bold">تسجيل باسم اللاعب</label>
                        <select
                          value={matchEventPlayer}
                          onChange={e => setMatchEventPlayer(e.target.value)}
                          className="w-full bg-slate-900 text-xs p-2 rounded border border-slate-800 outline-none font-bold text-white"
                        >
                          <option value="">اختر اللاعب الفاعل...</option>
                          
                          <optgroup label={currentMatch.homeTeamName}>
                            {players
                              .filter(p => p.teamId === currentMatch.homeTeamId)
                              .map(p => (
                                <option key={p.id} value={p.id}>{p.name} (قميص #{p.number})</option>
                              ))}
                          </optgroup>
                          
                          <optgroup label={currentMatch.awayTeamName}>
                            {players
                              .filter(p => p.teamId === currentMatch.awayTeamId)
                              .map(p => (
                                <option key={p.id} value={p.id}>{p.name} (قميص #{p.number})</option>
                              ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Minute */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block font-bold">الدقيقة</label>
                        <div className="flex gap-1.5 font-sans">
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={matchEventTimer}
                            onChange={e => {
                              const v = Number(e.target.value);
                              setMatchEventTimer(v);
                              handleUpdateMatchChrono({ chronoSeconds: (v - 1) * 60 });
                            }}
                            className="bg-slate-900 text-xs p-2 rounded border border-slate-800 outline-none w-16 text-center text-white"
                          />
                          <button
                            onClick={handleAddMatchEvent}
                            disabled={!matchEventPlayer}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs px-4 rounded flex-1 transition"
                          >
                            تسجيل في التقرير
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Registered events listing for current edited match */}
                  {currentMatch.events.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block">شريط الأحداث الجارية لقاء</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentMatch.events.map(ev => (
                          <div key={ev.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs text-slate-100">
                            <div className="flex items-center gap-2">
                              {ev.type === 'goal' && <span className="text-emerald-400">⚽</span>}
                              {ev.type === 'yellow_card' && <span className="text-yellow-400">🟨</span>}
                              {ev.type === 'red_card' && <span className="text-red-400">🟥</span>}
                              <div>
                                <span className="font-bold block text-slate-200">{ev.playerName}</span>
                                <span className="text-[9px] text-slate-500 block">
                                  {ev.teamId === currentMatch.homeTeamId ? 'صاحب الأرض' : 'الضيف'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-[11px] text-slate-400">د {ev.minute}'</span>
                              <button
                                onClick={() => handleDeleteEvent(ev.id)}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition"
                                title="حذف الحدث"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Match Table Grid Timeline */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-2 gap-2">
                  <h3 className="font-bold text-white text-base font-display">قائمة كافة المباريات المقررة واللعب المباشر</h3>
                  
                  {/* Calendar/List Toggle */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start sm:self-center">
                    <button
                      onClick={() => setMatchViewMode('list')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        matchViewMode === 'list'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'ar' ? 'قائمة المباريات' : 'Match List'}
                    </button>
                    <button
                      onClick={() => setMatchViewMode('calendar')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                        matchViewMode === 'calendar'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {language === 'ar' ? 'تقويم المباريات' : 'Match Calendar'}
                    </button>
                  </div>
                </div>

                {matchViewMode === 'calendar' ? (
                  <MatchCalendar
                    matches={matches}
                    teams={teams}
                    referees={referees}
                    language={language}
                    isOrganizer={isOrganizerVerified}
                    onAddMatchOnDate={(dateStr) => {
                      setManualDate(dateStr);
                      const formElement = document.querySelector('[type="date"]');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                      triggerAlert('تاريخ محدد', language === 'ar' ? `تم ضبط تاريخ اللقاء الجديد على ${dateStr}. يرجى إدخال بقية حقول الجدولة بالأعلى.` : `Date set to ${dateStr}.`);
                    }}
                    onManageMatch={(match) => {
                      setCurrentMatch(match);
                      setMatchingStatus(match.status);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                  />
                ) : matches.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                    <Calendar className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-semibold">لم يتم توليد أو جدولة أي مباريات في هذه البطولة حتى الآن.</p>
                    {isOrganizerVerified ? (
                      <button
                        onClick={() => handleTabChange('draw')}
                        className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded shadow transition flex items-center gap-1.5 mx-auto"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                        افتح مساعد سحب القرعة 🔮
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-2 font-medium">يرجى الانتظار لحين قيام منسق البطولة بسحب القرعة وجدولة اللقاءات الرسمية.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matches.map(match => (
                      <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between card-hover relative overflow-hidden shadow-md">
                        
                        {/* Live indicator watermark */}
                        {match.status === 'live' && (
                          <div className="absolute right-0 top-0 h-1 bg-red-500 w-full animate-pulse"></div>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-3 border-b border-slate-800 pb-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                            match.status === 'live' ? 'bg-red-550/10 text-red-400 border border-red-500/20' :
                            match.status === 'finished' ? 'bg-slate-800 text-slate-300' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {match.status === 'live' ? 'مباشر 🔴' : match.status === 'finished' ? 'انتهت' : 'مجدولة'}
                          </span>

                          <span className="font-mono text-slate-400 text-[11px]">
                            {match.date} | {match.time}
                          </span>

                          <span className="font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">{match.stage}</span>
                        </div>

                        {/* Interactive Score Body representation */}
                        <div className="grid grid-cols-7 items-center justify-center text-center py-2">
                          <div className="col-span-2 truncate flex flex-col items-center">
                            <span className="font-bold text-xs text-slate-200 block truncate w-full">{match.homeTeamName}</span>
                            <button
                              onClick={() => handleCheerTeam(match.homeTeamId || 't-home', match.homeTeamName)}
                              className="mt-1 text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 font-black flex items-center gap-1 transition cursor-pointer"
                              title={language === 'ar' ? 'أرسل تشجيع حماسي 🔥' : 'Send blazing cheer 🔥'}
                            >
                              <span>🔥</span>
                              <span>{teamCheers[match.homeTeamId || 't-home'] || 0}</span>
                            </button>
                          </div>

                          <div className="col-span-3 flex items-center justify-center">
                            {match.status !== 'not_started' ? (
                              <div className="bg-slate-950 text-white font-black font-display text-base py-1 px-3.5 border border-slate-800 rounded-lg flex items-center gap-3">
                                <span className={match.status === 'live' ? 'text-red-400' : 'text-emerald-400'}>{match.scoreHome}</span>
                                <span className="text-slate-600 font-bold">-</span>
                                <span className={match.status === 'live' ? 'text-red-400' : 'text-emerald-400'}>{match.scoreAway}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-400 px-3 py-1 rounded">
                                VS
                              </span>
                            )}
                          </div>

                          <div className="col-span-2 truncate flex flex-col items-center">
                            <span className="font-bold text-xs text-slate-200 block truncate w-full">{match.awayTeamName}</span>
                            <button
                              onClick={() => handleCheerTeam(match.awayTeamId || 't-away', match.awayTeamName)}
                              className="mt-1 text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 font-black flex items-center gap-1 transition cursor-pointer"
                              title={language === 'ar' ? 'أرسل تشجيع حماسي 🔥' : 'Send blazing cheer 🔥'}
                            >
                              <span>🔥</span>
                              <span>{teamCheers[match.awayTeamId || 't-away'] || 0}</span>
                            </button>
                          </div>
                        </div>

                        {/* Referee attribution block / Reader Events details */}
                        <div className="border-t border-slate-800 mt-2 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium font-sans">
                          <span>👤 الحكم: {match.refereeName || 'لم يعين بعد'}</span>
                          
                          {isOrganizerVerified && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenMatchManager(match)}
                                className="bg-slate-800 text-emerald-400 hover:bg-slate-750 border border-slate-700 hover:text-white transition text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-1"
                              >
                                <Edit className="h-3 my-1" />
                                التحكم الفوري
                              </button>

                              <button
                                onClick={() => handleOpenMatchEditForm(match)}
                                className="bg-slate-800 text-amber-400 hover:bg-slate-750 border border-slate-700 hover:text-white transition p-1.5 rounded text-xs"
                                title="تعديل تفاصيل اللقاء والنتيجة يدوياً"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  const matchUrl = `${cleanUrl}?view=referee-portal&matchId=${match.id}`;
                                  setActiveQrModal({
                                    title: `مسح حكم الساحة: ${match.homeTeamName} × ${match.awayTeamName}`,
                                    subtitle: `تنزيل أو مسح الكود لفتح تقرير التحكم الفوري حياً بتسجيل الكروت والأهداف من أي هاتف.`,
                                    url: matchUrl,
                                  });
                                }}
                                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-emerald-400 p-1.5 rounded"
                                title="عرض كود QR لتسجيل النتيجة السريعة للّقاء"
                              >
                                <QrCode className="h-3.5 w-3.5 shrink-0" />
                              </button>

                              <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="text-red-400 hover:text-red-300 bg-red-500/10 p-1.5 rounded hover:bg-red-500/20 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Public match events / timeline details for fans */}
                        {!isOrganizerVerified && match.events && match.events.length > 0 && (
                          <div className="border-t border-slate-800/60 mt-3 pt-3 text-right">
                            <span className="text-[10px] text-slate-500 font-extrabold block mb-1.5">شريط أحداث ومسجلي اللقاء ⏱️</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {match.events.map(ev => (
                                <div key={ev.id} className="flex items-center justify-between text-[10px] text-slate-350 bg-slate-950/40 px-2 py-1 rounded border border-slate-800/30">
                                  <span className="text-slate-500 font-mono">د {ev.minute}'</span>
                                  <span className="flex items-center gap-1 font-bold">
                                    {ev.type === 'goal' && <span className="text-emerald-400">⚽ {ev.playerName}</span>}
                                    {ev.type === 'yellow_card' && <span className="text-yellow-400">🟨 {ev.playerName}</span>}
                                    {ev.type === 'red_card' && <span className="text-red-400">🟥 {ev.playerName}</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Spectator Match prediction block */}
                        {match.status !== 'finished' && (
                          <div className="border-t border-slate-800/50 mt-3 pt-3">
                            <div className="flex items-center justify-between text-[11px] mb-2 font-bold">
                              <span className="text-indigo-400 flex items-center gap-1">
                                <span>🔮</span>
                                <span>{t.predictionsTitle}</span>
                              </span>
                              {matchPredictions[match.id] ? (
                                <span className="text-emerald-400 text-[10px] font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  {t.votedForMatch.replace('{prediction}', 
                                    matchPredictions[match.id] === 'home' ? match.homeTeamName : 
                                    matchPredictions[match.id] === 'away' ? match.awayTeamName : t.draw
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px] font-medium">{t.predictPrompt}</span>
                              )}
                            </div>

                            {!matchPredictions[match.id] ? (
                              <div className="grid grid-cols-3 gap-1.5 pt-1">
                                <button
                                  onClick={() => handlePredictMatch(match.id, 'home')}
                                  className="bg-slate-950 hover:bg-slate-800 border border-slate-850 p-2 rounded-xl text-[10px] text-slate-300 font-black transition hover:border-indigo-500/30 truncate cursor-pointer"
                                  title={t.homeWins.replace('{team}', match.homeTeamName)}
                                >
                                  {match.homeTeamName}
                                </button>
                                <button
                                  onClick={() => handlePredictMatch(match.id, 'draw')}
                                  className="bg-slate-950 hover:bg-slate-800 border border-slate-850 p-2 rounded-xl text-[10px] text-slate-300 font-black transition hover:border-indigo-500/30 truncate cursor-pointer"
                                >
                                  {t.draw}
                                </button>
                                <button
                                  onClick={() => handlePredictMatch(match.id, 'away')}
                                  className="bg-slate-950 hover:bg-slate-800 border border-slate-850 p-2 rounded-xl text-[10px] text-slate-300 font-black transition hover:border-indigo-500/30 truncate cursor-pointer"
                                  title={t.awayWins.replace('{team}', match.awayTeamName)}
                                >
                                  {match.awayTeamName}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                                  <span>{t.votesCount}</span>
                                  <span>
                                    {((matchVotes[match.id]?.home || 0) + (matchVotes[match.id]?.draw || 0) + (matchVotes[match.id]?.away || 0))} {language === 'ar' ? 'صوت' : 'votes'}
                                  </span>
                                </div>
                                
                                {(() => {
                                  const hVotes = matchVotes[match.id]?.home || 0;
                                  const dVotes = matchVotes[match.id]?.draw || 0;
                                  const aVotes = matchVotes[match.id]?.away || 0;
                                  const total = hVotes + dVotes + aVotes || 1;
                                  
                                  const hPercent = Math.round((hVotes / total) * 100);
                                  const dPercent = Math.round((dVotes / total) * 100);
                                  const aPercent = Math.round((aVotes / total) * 100);

                                  return (
                                    <div className="space-y-1 text-[9px] font-bold">
                                      <div className="flex items-center justify-between text-slate-300 font-sans">
                                        <span className="truncate max-w-[120px]">{match.homeTeamName}</span>
                                        <span className="font-mono text-emerald-400">{hPercent}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${hPercent}%` }} />
                                      </div>

                                      <div className="flex items-center justify-between text-slate-300 pt-1 font-sans">
                                        <span>{t.draw}</span>
                                        <span className="font-mono text-slate-400">{dPercent}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-slate-600 h-full rounded-full" style={{ width: `${dPercent}%` }} />
                                      </div>

                                      <div className="flex items-center justify-between text-slate-300 pt-1 font-sans">
                                        <span className="truncate max-w-[120px]">{match.awayTeamName}</span>
                                        <span className="font-mono text-indigo-400">{aPercent}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${aPercent}%` }} />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 6: THE SPORTY RANDOM DRAW WIZARD */}
          {activeTab === 'draw' && (
            <motion.div
              key="tab-draw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md max-w-3xl mx-auto space-y-6 text-right font-sans"
              dir="rtl"
            >
              {isDrawingInProgress ? (
                <div className="space-y-6 py-2">
                  {/* Title & Status Block */}
                  <div className="text-center space-y-3">
                    <div className="relative inline-block">
                      {/* Outer spinning ring */}
                      <span className="absolute inset-x-0 inset-y-0 rounded-full border-2 border-dashed border-amber-500 animate-spin opacity-40"></span>
                      <div className="h-14 w-14 bg-gradient-to-tr from-amber-600 to-yellow-400 rounded-full flex items-center justify-center text-slate-950 mx-auto border-2 border-slate-900 shadow-xl">
                        <Sparkles className="h-7 w-7 text-slate-950 animate-pulse animate-bounce" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center justify-center gap-1.5 font-display">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                        بث القرعة الآلي العشوائي مباشر الآن... 🌐
                      </h3>
                      <p className="text-[11px] text-amber-400 font-bold mt-1.5 inline-block bg-amber-500/10 py-1.5 px-4 rounded-full border border-amber-500/20 max-w-full">
                        {drawingStepText}
                      </p>
                    </div>
                  </div>

                  {/* Shuffling Sphere Simulation (A Visual Drum) */}
                  <div className="relative bg-slate-950 p-5 rounded-3xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center select-none shadow-inner py-6">
                    {/* Glowing grid effect */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
                    
                    {/* Bouncing/Shuffling balls background visual */}
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-6 opacity-[0.07] pointer-events-none scale-95">
                      {teams.map((t, idx) => (
                        <div key={t.id} className={`h-10 w-10 rounded-full ${t.logoColor} flex items-center justify-center text-lg shadow-lg`} style={{ animation: `bounce 1.5s infinite ${idx * 0.15}s` }}>
                          {t.logoIcon}
                        </div>
                      ))}
                    </div>

                    {/* Progress with Countdown bar */}
                    <div className="w-full max-w-md space-y-2 relative z-10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>التقدم الكلي لعملية السحب</span>
                        <span className="font-mono text-emerald-400">{drawingProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-300 rounded-full" 
                          style={{ width: `${drawingProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Actively Drawing Pairing Block */}
                    <div className="w-full max-w-lg mt-6 relative z-10 grid grid-cols-7 items-center gap-2">
                      {/* Home Team Holder */}
                      <div className="col-span-3 bg-slate-900/80 backdrop-blur-md border border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-md relative min-h-[120px]">
                        {activelyDrawingM ? (
                          <motion.div 
                            key={activelyDrawingM.homeTeamName}
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="space-y-2"
                          >
                            <div className="h-10 w-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-lg shadow-lg relative">
                              ⚽
                            </div>
                            <span className="text-[11px] font-black text-slate-100 block truncate max-w-[110px]">
                              {activelyDrawingM.homeTeamName}
                            </span>
                            <span className="text-[9px] text-slate-450 block bg-slate-950 py-0.5 px-1.5 rounded-full border border-slate-800 mt-1">المستضيف</span>
                          </motion.div>
                        ) : (
                          <div className="space-y-1 opacity-30">
                            <div className="h-10 w-10 rounded-full border border-dashed border-slate-700 flex items-center justify-center mx-auto text-sm">❓</div>
                            <span className="text-[10px] font-bold text-slate-500 block">انتظار المضيف</span>
                          </div>
                        )}
                      </div>

                      {/* VS Divider badge */}
                      <div className="col-span-1 flex flex-col items-center justify-center">
                        <div className="h-7 w-7 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] font-display flex items-center justify-center shadow-lg border-2 border-slate-950 animate-pulse">
                          VS
                        </div>
                      </div>

                      {/* Away Team Holder */}
                      <div className="col-span-3 bg-slate-900/80 backdrop-blur-md border border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-md relative min-h-[120px]">
                        {activelyDrawingM ? (
                          <motion.div 
                            key={activelyDrawingM.awayTeamName}
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="space-y-2"
                          >
                            <div className="h-10 w-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-lg shadow-lg relative">
                              ⚽
                            </div>
                            <span className="text-[11px] font-black text-slate-100 block truncate max-w-[110px]">
                              {activelyDrawingM.awayTeamName}
                            </span>
                            <span className="text-[9px] text-slate-400 block bg-slate-950 py-0.5 px-1.5 rounded-full border border-slate-800 mt-1">
                              {language === 'ar' ? 'الضيف' : 'Away'}
                            </span>
                          </motion.div>
                        ) : (
                          <div className="space-y-1 opacity-30">
                            <div className="h-10 w-10 rounded-full border border-dashed border-slate-700 flex items-center justify-center mx-auto text-sm">❓</div>
                            <span className="text-[10px] font-bold text-slate-500 block">
                              {language === 'ar' ? 'انتظار الضيف' : 'Waiting...'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Drawn Pairings Log */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[11px] font-extrabold text-slate-400 tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      {language === 'ar' ? `المواجهات المسحوبة فعلياً (${drawnMatchesSoFar.length})` : `Drawn Matches (${drawnMatchesSoFar.length})`}
                    </h4>
                    
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/10 scrollbar-thin text-right" dir="rtl">
                      {drawnMatchesSoFar.length === 0 ? (
                        <p className="text-[10px] text-slate-500 font-semibold py-4 text-center">
                          {language === 'ar' ? 'يقوم الوعاء الرياضي بسحب أولى كرات القرعة حالاً...' : 'Drawing soon...'}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {drawnMatchesSoFar.map((m, idx) => (
                            <motion.div 
                              key={m.id || idx}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold gap-4 hover:border-slate-800 transition text-right"
                            >
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                <span>{language === 'ar' ? `لقاء ${idx + 1}` : `Match ${idx + 1}`}</span>
                              </div>

                              <div className="flex items-center gap-1 flex-1 justify-center">
                                <span className="text-slate-100 flex-1 text-left truncate">{m.homeTeamName}</span>
                                <span className="text-amber-500/80 px-2 text-[9px] font-black"> ضد </span>
                                <span className="text-slate-100 flex-1 text-right truncate">{m.awayTeamName}</span>
                              </div>

                              <div className="text-[9px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800/60 font-display">
                                {m.stage}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2 max-w-xl mx-auto border-b border-slate-800 pb-5">
                    <div className="h-14 w-14 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400 mx-auto transform rotate-6 border border-amber-500/20">
                      <Sparkles className="h-7 w-7 text-amber-400" />
                    </div>
                    <h2 className="text-base font-dead font-display text-white font-extrabold pb-1">
                      {language === 'ar' ? 'مساعد سحب القرعة الآمن تلقائياً ✨' : language === 'fr' ? 'Tirage au sort automatique ✨' : 'Secure Automated Draw Wizard ✨'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {language === 'ar' 
                        ? 'قم بتوليد جدول المباريات فوراً وبشكل عشوائي بنظام الكأس أو الدوري لمجموعة الفرق المسجلة.' 
                        : language === 'fr' 
                        ? 'Générez instantanément et aléatoirement le calendrier de tournoi (championnat, élimination ou groupes).' 
                        : 'Instantly generate random tournament schedule with league, groups or cup elimination format.'}
                    </p>
                  </div>

                  {/* Tournament structure configs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Mode Choosing */}
                    <div className="border border-slate-800 bg-slate-950/40 p-4 rounded-xl space-y-2">
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        {language === 'ar' ? 'حدد نظام المسابقة الكروية' : language === 'en' ? 'Select Tournament Competition System' : 'Sélectionner le mode de tournoi'}
                      </label>
                      
                      <div className="space-y-2.5">
                        <label className="flex items-start gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 cursor-pointer text-xs">
                          <input
                            type="radio"
                            checked={drawType === 'league'}
                            onChange={() => setDrawType('league')}
                            className="mt-0.5 accent-emerald-500 text-emerald-555 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="font-bold text-slate-200 block text-[11px]">
                              {t.leagueSystem}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal mt-0.5 leading-normal">
                              {t.leagueSystemDesc}
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 cursor-pointer text-xs">
                          <input
                            type="radio"
                            checked={drawType === 'knockout'}
                            onChange={() => setDrawType('knockout')}
                            className="mt-0.5 accent-emerald-500 text-emerald-555 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="font-bold text-slate-200 block text-[11px]">
                              {t.knockoutSystem}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal mt-0.5 leading-normal">
                              {t.knockoutSystemDesc}
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 cursor-pointer text-xs">
                          <input
                            type="radio"
                            checked={drawType === 'groups'}
                            onChange={() => setDrawType('groups')}
                            className="mt-0.5 accent-emerald-500 text-emerald-555 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="font-bold text-slate-200 block text-[11px]">
                              {t.groupsSystem}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal mt-0.5 leading-normal">
                              {t.groupsSystemDesc}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Participating Squad information selection */}
                    <div className="border border-slate-800 bg-slate-950/40 p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-300 block">
                            {language === 'ar' 
                              ? `تحديد الفرق المشاركة في هذه البطولة (${teams.filter(t => participatingTeamIds.includes(t.id)).length} / ${teams.length})` 
                              : `Select Participating Teams (${teams.filter(t => participatingTeamIds.includes(t.id)).length} / ${teams.length})`}
                          </label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setParticipatingTeamIds(teams.map(t => t.id))}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded transition font-bold"
                            >
                              {language === 'ar' ? 'تحديد الكل' : language === 'fr' ? 'Tout cocher' : 'Select All'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setParticipatingTeamIds([])}
                              className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded transition font-bold"
                            >
                              {language === 'ar' ? 'إلغاء الكل' : language === 'fr' ? 'Tout décocher' : 'Deselect All'}
                            </button>
                          </div>
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/40 scrollbar-thin">
                          {teams.map(t => {
                            const isSelected = participatingTeamIds.includes(t.id);
                            return (
                              <label
                                key={t.id}
                                className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-900/50 px-1.5 rounded-lg transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setParticipatingTeamIds(participatingTeamIds.filter(id => id !== t.id));
                                    } else {
                                      setParticipatingTeamIds([...participatingTeamIds, t.id]);
                                    }
                                  }}
                                  className="accent-emerald-500 rounded"
                                />
                                <span className="text-lg">{t.logoIcon}</span>
                                <span className={`text-[11px] font-bold ${isSelected ? 'text-slate-100' : 'text-slate-400'}`}>{t.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <button
                          onClick={handleGenerateDraw}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="h-4 w-4" />
                          {language === 'ar' ? 'توليد مباريات البطولة وسحب القرعة' : language === 'fr' ? 'Générer le tirage au sort' : 'Generate Tournament Fixtures & Draw'}
                        </button>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
      </main>

          {/* Match Edit Details Modal */}
          {matchEditFormOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in text-right font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                      ⚽
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {language === 'ar' ? 'تعديل بيانات وإحصائيات اللقاء' : language === 'fr' ? 'Modifier les détails du match' : 'Edit Match Details & Stats'}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold">
                        {language === 'ar' ? 'تعديل النتائج، الأهداف والمطابقة المباشرة' : language === 'fr' ? 'Mettre à jour les scores et statuts' : 'Update scores, timing, and referee status'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMatchEditFormOpen(false)}
                    className="text-slate-400 hover:text-white transition p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  {/* Scores Row */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">
                        {language === 'ar' ? 'أهداف المستضيف' : language === 'fr' ? 'Buts Domicile' : 'Home Goals'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={matchEditScoreHome}
                        onChange={e => setMatchEditScoreHome(Number(e.target.value))}
                        className="w-full bg-slate-950 text-xs p-2.5 rounded-xl border border-slate-800 outline-none text-slate-100 font-mono font-bold focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">
                        {language === 'ar' ? 'أهداف الضيف' : language === 'fr' ? 'Buts Extérieur' : 'Away Goals'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={matchEditScoreAway}
                        onChange={e => setMatchEditScoreAway(Number(e.target.value))}
                        className="w-full bg-slate-950 text-xs p-2.5 rounded-xl border border-slate-800 outline-none text-slate-100 font-mono font-bold focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Status and Stage Selection Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">
                        {language === 'ar' ? 'حالة المباراة' : language === 'fr' ? 'Statut du match' : 'Match Status'}
                      </label>
                      <select
                        value={matchEditStatus}
                        onChange={e => setMatchEditStatus(e.target.value as any)}
                        className="w-full bg-slate-950 text-xs p-2.5 rounded-xl border border-slate-850 outline-none text-slate-100 font-bold focus:border-amber-500"
                      >
                        <option value="not_started">{language === 'ar' ? 'مجدولة (Not Started)' : language === 'fr' ? 'Non commencé' : 'Not Started'}</option>
                        <option value="live">{language === 'ar' ? 'مباشر حياً (Live)' : language === 'fr' ? 'En direct' : 'Live'}</option>
                        <option value="finished">{language === 'ar' ? 'انتهت (Finished)' : language === 'fr' ? 'Terminé' : 'Finished'}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">
                        {language === 'ar' ? 'الجولة / المرحلة' : language === 'fr' ? 'Journée / Étape' : 'Round / Stage'}
                      </label>
                      <input
                        type="text"
                        value={matchEditStage}
                        onChange={e => setMatchEditStage(e.target.value)}
                        className="w-full bg-slate-950 text-xs p-2.5 rounded-xl border border-slate-850 outline-none text-slate-100 font-bold focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Date and Time Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">
                        {language === 'ar' ? 'تاريخ اللقاء' : language === 'fr' ? 'Date de rencontre' : 'Match Date'}
                      </label>
                      <input
                        type="date"
                        value={matchEditDate}
                        onChange={e => setMatchEditDate(e.target.value)}
                        className="w-full bg-slate-950 text-xs p-2.5 rounded-xl border border-slate-850 outline-none text-slate-100 focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">
                        {language === 'ar' ? 'وقت اللقاء' : language === 'fr' ? 'Heure de rencontre' : 'Match Time'}
                      </label>
                      <input
                        type="text"
                        value={matchEditTime}
                        onChange={e => setMatchEditTime(e.target.value)}
                        placeholder="17:00"
                        className="w-full bg-slate-950 text-xs p-2.5 rounded-xl border border-slate-850 outline-none text-slate-100 font-mono focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Referee Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      {language === 'ar' ? 'الحكم المعين' : language === 'fr' ? 'Arbitre assigné' : 'Match Referee'}
                    </label>
                    <select
                      value={matchEditRefereeId}
                      onChange={e => setMatchEditRefereeId(e.target.value)}
                      className="w-full bg-slate-950 text-xs p-2.5 rounded-xl border border-slate-850 outline-none text-slate-100 font-bold focus:border-amber-500"
                    >
                      <option value="">{language === 'ar' ? 'بدون تعيين حكم...' : language === 'fr' ? 'Aucun arbitre...' : 'No referee...'}</option>
                      {referees.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Footer buttons */}
                <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex gap-2 justify-end">
                  <button
                    onClick={() => setMatchEditFormOpen(false)}
                    className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveMatchEdit}
                    className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    {language === 'ar' ? 'حفظ التعديلات' : language === 'fr' ? 'Sauvegarder' : 'Save Changes'}
                  </button>
                </div>

              </div>
            </div>
          )}

      {/* Isolated User Profile Management Modal */}
      {profileModalOpen && registeredUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in text-right font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {language === 'ar' ? 'إدارة حسابي ورمزي السري' : language === 'fr' ? 'Gérer mon compte & code secret' : 'Manage Account & Passcode'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {language === 'ar' ? 'بوابة العزل والتحكم الفردي الخاص بك' : language === 'fr' ? 'Votre portail de contrôle privé' : 'Your isolated private account portal'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {editProfileError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-bold">
                  ⚠️ {editProfileError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block">
                  {language === 'ar' ? 'الاسم الكامل *' : language === 'fr' ? 'Nom complet *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 text-xs p-3 border border-slate-800 rounded-xl outline-none focus:border-indigo-500"
                  placeholder={language === 'ar' ? 'مثال: كابتن أحمد' : language === 'fr' ? 'Ex: Capitaine Ahmed' : 'Ex: Captain Ahmed'}
                />
              </div>





              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={editProfileEmail}
                  onChange={(e) => setEditProfileEmail(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 text-xs p-3 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-left placeholder:text-right"
                  placeholder="name@example.com"
                />
              </div>

              {registeredUser.role === 'spectator' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 block">تشجيع ودعم الفريق المفضل</label>
                  <select
                    value={editProfileFavTeamId}
                    onChange={(e) => setEditProfileFavTeamId(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 text-xs p-3 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="">-- بدون فريق مفضل --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        🏃 {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400">الرمز السري لحماية الحساب *</label>
                  <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-bold">خاص ومعزول</span>
                </div>
                <input
                  type="text"
                  value={editProfilePasscode}
                  onChange={(e) => setEditProfilePasscode(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 text-xs p-3 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 font-mono tracking-widest text-center"
                  placeholder="رموز أو أرقام سرية"
                />
                <p className="text-[9px] text-slate-505 text-slate-500 leading-normal">
                  هذا الرمز معزول تماماً عن كودات البطولة ولا يمكن لأي منظم عادي أو مشرف الاطلاع عليه حمايةً لنشاطك وتوقعاتك.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-850 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleUpdateUserProfile}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                حفظ تعديلات حسابي
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Organizer Login Portal Modal (Safe for iframe) */}
       {organizerLoginOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in text-right font-sans" 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className={`flex items-center gap-3 justify-between ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Key className="h-5 w-5" />
                </div>
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <h4 className="text-sm font-black text-white">
                    {language === 'ar' ? 'بوابة التحقق الآمنة' : language === 'fr' ? 'Portail de vérification' : 'Secure Entry Portal'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {language === 'ar' ? 'يرجى تسجيل الدخول لتفعيل الصلاحيات' : language === 'fr' ? 'Saisir vos accès pour continuer' : 'Please sign in to enable permissions'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setOrganizerLoginOpen(false);
                  setPendingAction(null);
                  setPinError(null);
                  setOrganizerPinInput('');
                  setIsSuperAdminLoginTab(false);
                }}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Account Switcher Tabs for Creator clarity */}
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsSuperAdminLoginTab(false);
                  setPinError(null);
                  setOrganizerPinInput('');
                }}
                className={`py-1.5 text-center text-[10px] sm:text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  !isSuperAdminLoginTab
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? '👤 منظم بطولة (PIN)' : language === 'fr' ? '👤 Organisateur (PIN)' : '👤 Organizer (PIN)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSuperAdminLoginTab(true);
                  setPinError(null);
                  setOrganizerPinInput('');
                }}
                className={`py-1.5 text-center text-[10px] sm:text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  isSuperAdminLoginTab
                    ? 'bg-indigo-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? '👑 المطور المالك' : language === 'fr' ? '👑 Super Admin / Dev' : '👑 Super Admin / Dev'}
              </button>
            </div>

            <div className={`space-y-3 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              {isSuperAdminLoginTab ? (
                <div className="bg-slate-950/60 rounded-xl p-3 border border-indigo-500/20 text-[10px] text-slate-400 leading-normal space-y-1.5">
                  <div className={`flex items-center gap-1.5 text-indigo-400 font-black ${language === 'ar' ? 'justify-start' : 'justify-start'}`}>
                    <span>👑 {language === 'ar' ? 'وضع مالك التطوير العام الفائق' : language === 'fr' ? 'Mode Développeur Super Admin' : 'Developer Super Admin Mode'}</span>
                  </div>
                  <div className="text-[10px]">
                    {language === 'ar' 
                      ? 'مرحباً بك يا كابتن حمادة 👋 لكونك منشئ ومطور هذا التطبيق، اكتب الرمز المخصص لمدير التطبيق العام هنا ليفتح لك فوراً لوحة التحكم الفائقة وإدارة أكواد المنظمين.' 
                      : language === 'fr'
                      ? 'Bienvenue Capitaine Hamada 👋 Saisissez votre code de développeur pour activer le panneau de contrôle suprême et gérer les privilèges.'
                      : 'Welcome Captain Hamada 👋 Enter your master developer credentials to unlock the supervisor control dock and manage system access keys.'
                    }
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/85 text-[10px] text-slate-400 leading-normal space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <span>🔒 {language === 'ar' ? 'حماية الخصوصية والأمن' : language === 'fr' ? 'Sécurité et Confidentialité' : 'Privacy & Security'}</span>
                  </div>
                  <div className="text-[10px]">
                    {language === 'ar' 
                      ? 'يرجى كتابة رمز المرور الخاص بك لإثبات صلاحيات المنظم. تم إعداد رمز الـ PIN تلقائيًا عند إنشاء هذه البطولة؛ يرجى التأكد من إدخال الرمز الصحيح للمتابعة.'
                      : language === 'fr'
                      ? 'Saisissez votre code d\'accès pour prouver vos droits d\'organisateur. Le code PIN a été généré lors de l\'initialisation de cette ligue.'
                      : 'Provide the tournament safety passcode for supervisor authorization. The secure security PIN is assigned at tournament registration.'
                    }
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-slate-400 block">
                  {isSuperAdminLoginTab 
                    ? (language === 'ar' ? 'أدخل كود المطور المالك الفائق *' : language === 'fr' ? 'Saisir le code Super Admin *' : 'Enter Developer Code *') 
                    : (language === 'ar' ? 'أدخل رمز المرور الآمن للبطولة (PIN) *' : language === 'fr' ? 'Saisir le code PIN sécurisé *' : 'Enter Tournament Safety PIN *')
                  }
                </label>
                <input
                  type="password"
                  maxLength={30}
                  placeholder={isSuperAdminLoginTab ? 'HAMADA-ADMIN...' : '••••'}
                  value={organizerPinInput}
                  onChange={e => {
                    setOrganizerPinInput(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleOrganizerLogin();
                    }
                  }}
                  autoFocus
                  className="w-full bg-slate-950 text-slate-100 font-mono tracking-widest text-center text-sm py-2.5 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 placeholder:tracking-normal placeholder:font-sans"
                />
              </div>

              {pinError && (
                <p className="text-[10px] text-rose-400 font-bold leading-normal">
                  ⚠️ {pinError}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setOrganizerLoginOpen(false);
                  setPendingAction(null);
                  setPinError(null);
                  setOrganizerPinInput('');
                }}
                className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
              >
                {language === 'ar' ? 'إلغاء والتراجع' : language === 'fr' ? 'Fermer' : 'Cancel'}
              </button>
              <button
                onClick={handleOrganizerLogin}
                className="flex-[1.5] w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                {language === 'ar' ? 'تحقق ودخول' : language === 'fr' ? 'Vérifier la clé' : 'Verify passcode'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Account Registration Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in text-right font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                  <span>👤</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {authMode === 'login' ? (language === 'ar' ? 'تسجيل الدخول الآمن' : language === 'fr' ? 'Connexion sécurisée' : 'Secure Account Login') : t.registerModalTitle}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {authMode === 'login' 
                      ? (language === 'ar' ? 'أدخل اسمك والرمز السري للولوج لحسابك' : language === 'fr' ? 'Saisissez vos identifiants pour continuer' : 'Enter your name & passcode to access profile') 
                      : (language === 'ar' ? 'التسجيل الذكي المجاني في ثوانٍ معدودة' : language === 'fr' ? 'Inscription rapide en quelques secondes' : 'Quick smart registration in seconds')
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setRegisterModalOpen(false);
                  setRegError(null);
                }}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Login / Register Tab Switcher inside the modal */}
            <div className="px-5 pt-4">
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-805">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setRegError(null);
                  }}
                  className={`py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.authModeLogin}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setRegError(null);
                  }}
                  className={`py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-650 bg-indigo-600 text-white font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.authModeRegister}
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable if small screen */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Error Alert */}
              {regError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{regError}</span>
                </div>
              )}

              {/* Form Input fields */}
              {authMode === 'login' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {language === 'ar' ? 'الاسم بالكامل المسجل به :' : language === 'fr' ? 'Nom complet enregistré :' : 'Your Registered Full Name :'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'اكتب اسمك بالكامل كما سجلت...' : language === 'fr' ? 'Saisissez votre nom complet enregistré...' : 'Type your registered full name...'}
                      value={loginNameInput}
                      onChange={e => {
                        setLoginNameInput(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-emerald-500 placeholder:text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {t.passwordLabel} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder={t.passwordPlaceholder}
                      value={loginPasswordInput}
                      onChange={e => {
                        setLoginPasswordInput(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      className="w-full bg-slate-950 text-slate-100 font-mono tracking-widest text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-emerald-500 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 font-medium"
                    />
                  </div>

                  <p className="text-[10px] text-slate-505 text-slate-500 leading-normal text-start">
                    ℹ️ {language === 'ar' 
                      ? 'يمكنك التبديل لخيار "إنشاء حساب جديد" من التبويب أعلاه لمشاهدة المباريات أو إدارة البطولة.' 
                      : language === 'fr' 
                      ? 'Vous pouvez créer un compte via l\'onglet ci-dessus pour suivre ou configurer la ligue.' 
                      : 'You can register a new account using the tab switcher at the top of the form.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-normal bg-indigo-500/5 p-3 rounded-2xl border border-indigo-500/10">
                    {t.registerModalSub}
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {t.fullNameLabel} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'اكتب اسمك الكامل (مثال: محمد السعيد)...' : language === 'fr' ? 'Saisissez votre nom complet...' : 'Type your full name...'}
                      value={regNameInput}
                      onChange={e => {
                        setRegNameInput(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-emerald-500 placeholder:text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {t.passwordLabel} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder={t.passwordPlaceholder}
                      value={regPasscode}
                      onChange={e => {
                        setRegPasscode(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      className="w-full bg-slate-950 text-slate-100 font-mono tracking-widest text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-650 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {t.emailLabel}
                    </label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={regEmailInput}
                      onChange={e => setRegEmailInput(e.target.value)}
                      className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 placeholder:text-slate-600 font-medium"
                    />
                  </div>

                  {/* Account Type Selector / Tabs */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 block">
                      {t.selectRoleLabel}
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setRegRole('spectator');
                          setRegError(null);
                        }}
                        className={`py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                          regRole === 'spectator'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'ar' ? '📣 مشاهد نتائج' : 'Spectator'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRegRole('organizer');
                          setRegError(null);
                        }}
                        className={`py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                          regRole === 'organizer'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'ar' ? '🔑 منظم بطولة' : 'Organizer'}
                      </button>
                    </div>
                  </div>

                  {/* Dynamic fields based on role selection */}
                  <AnimatePresence mode="wait">
                    {regRole === 'spectator' ? (
                      <motion.div
                        key="spectator-options"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="bg-slate-950/50 border border-slate-800/60 rounded-2xl p-3.5 space-y-3"
                      >
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          {t.spectatorDesc}
                        </p>

                        <div className="space-y-1 pt-1">
                          <label className="text-[10px] font-black text-emerald-400 block mb-1">
                            {t.favTeamLabel}
                          </label>
                          <select
                            value={regFavTeamId}
                            onChange={e => setRegFavTeamId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 font-bold"
                          >
                            <option value="">{t.noFavTeam}</option>
                            {teams.map(team => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                          </select>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="organizer-options"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="bg-slate-950/50 border border-slate-800/60 rounded-2xl p-3.5 space-y-3"
                      >
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          {t.organizerDesc}
                        </p>

                        <div className="space-y-1 pt-1">
                          <label className="text-[10px] font-black text-amber-400 block mb-1">
                            {t.organizerPinPass} <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="password"
                            placeholder="••••"
                            value={regPinInput}
                            onChange={e => {
                              setRegPinInput(e.target.value);
                              if (regError) setRegError(null);
                            }}
                            className="w-full bg-slate-950 text-slate-100 font-mono tracking-widest text-center text-sm py-2 px-3 border border-slate-800 rounded-xl outline-none focus:border-amber-500 placeholder:tracking-normal placeholder:font-sans"
                          />
                          <p className="text-[9px] text-slate-500 leading-tight">
                            {language === 'ar' 
                              ? 'اكتب الرمز السري للبطولة (يمكنك تجربة الرمز الافتراضي: 2026)' 
                              : 'Enter the tournament PIN code (Default is 2026)'}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setRegisterModalOpen(false);
                  setRegError(null);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-300 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              {authMode === 'login' ? (
                <button
                  onClick={handleLoginUserSubmit}
                  className="flex-[1.5] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {language === 'ar' ? 'تأكيد دخول الحساب 🔑' : language === 'fr' ? 'Confirmer la connexion 🔑' : 'Confirm Login 🔑'}
                </button>
              ) : (
                <button
                  onClick={handleRegisterUserSubmit}
                  className="flex-[1.5] bg-indigo-600 hover:bg-indigo-405 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {t.submitRegister}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Custom Safe Dialog Confirmation Box (Safe for iframe) */}
      {customConfirm && customConfirm.isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans" 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border ${
                customConfirm.type === 'danger' 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {customConfirm.type === 'danger' ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{customConfirm.title}</h4>
                <p className="text-[10px] text-slate-500 font-bold">
                  {language === 'ar' ? 'إخطار تأكيد من النظام' : language === 'fr' ? 'Notification de confirmation' : 'System confirmation notice'}
                </p>
              </div>
            </div>

            <p className={`text-xs text-slate-300 leading-relaxed font-semibold ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              {customConfirm.message}
            </p>

            <div className={`flex gap-2 justify-end pt-2 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
              <button
                onClick={() => setCustomConfirm(null)}
                className="bg-slate-805 text-slate-300 hover:bg-slate-800 bg-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={customConfirm.onConfirm}
                className={`text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition ${
                  customConfirm.type === 'danger' 
                    ? 'bg-rose-600 hover:bg-rose-500' 
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                الموافقة والاستمرار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Safe Alert Information Box (Safe for iframe) */}
      {customAlert && customAlert.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-right font-sans" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{customAlert.title}</h4>
                <p className="text-[10px] text-slate-500 font-bold">إشعار النظام</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              {customAlert.message}
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCustomAlert(null)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition"
              >
                حسناً، فهمت ذلك 👍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Tournament Creation Modal Overlay */}
      {newTourFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in text-right font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className={`flex justify-between items-center border-b border-slate-800 pb-3 ${language !== 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3 className="font-black text-sm text-white">{t.createTourTitle}</h3>
              </div>
              <button onClick={() => setNewTourFormOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-400 block pb-1">{t.newTourNameLabel}</label>
                <input
                  type="text"
                  placeholder={t.newTourNamePlaceholder}
                  value={newTourNameInput}
                  onChange={e => setNewTourNameInput(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 placeholder-slate-700 text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-400 block pb-1">{t.newTourOrganizerLabel}</label>
                <input
                  type="text"
                  placeholder={t.newTourOrganizerPlaceholder}
                  value={newTourOrganizerInput}
                  onChange={e => setNewTourOrganizerInput(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 placeholder-slate-700 text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-400 block pb-1">
                  {language === 'ar' ? 'رمز الدخول السري للبطولة (PIN مخصص - اختياري)' : language === 'en' ? 'Custom Tournament PIN (Optional)' : 'Code PIN personnalisé (Optionnel)'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'ضع رمزاً خاصاً بالمنظمين أو اتركه فارغاً للتوليد العشوائي' : language === 'en' ? 'Choose custom PIN or leave empty to auto-generate' : 'Entrez un code PIN ou laissez vide'}
                  value={newTourPinInput}
                  onChange={e => setNewTourPinInput(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 placeholder-slate-700 text-xs px-3 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850 text-[10px] text-slate-400 leading-relaxed font-semibold">
                ⚠️ <span className="text-amber-400">{language === 'ar' ? 'تنويه كروي:' : language === 'en' ? 'Football Note:' : 'Note de Football :'}</span> {t.newTourNotice}
              </div>
            </div>

            <div className={`flex gap-2 justify-end pt-2 ${language !== 'ar' ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => setNewTourFormOpen(false)}
                className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newTourNameInput.trim() || !newTourOrganizerInput.trim()) {
                    const alertTitle = language === 'ar' ? 'ملاحظة مهمة ⚠️' : language === 'en' ? 'Important Notice ⚠️' : 'Note Importante ⚠️';
                    const alertMsg = language === 'ar' ? 'يرجى تعبئة كافة الحقول المطلوبة (اسم البطولة واسم المنظم المسؤول) بشكل صحيح.' : language === 'en' ? 'Please fill in all required fields (Tournament Name and Organizer Name).' : 'Veuillez remplir tous les champs obligatoires (Nom du tournoi et Nom du directeur/superviseur).';
                    triggerAlert(alertTitle, alertMsg);
                    return;
                  }
                  const newId = `tour-${Date.now()}`;
                  const generatedPin = String(Math.floor(1000 + Math.random() * 9000));
                  const finalPin = newTourPinInput.trim() || generatedPin;
                  const newTour: Tournament = {
                    id: newId,
                    name: newTourNameInput.trim(),
                    organizerName: newTourOrganizerInput.trim(),
                    participatingTeamIds: teams.map(tItem => tItem.id),
                    matches: [],
                    drawType: 'league',
                    pin: finalPin
                  };
                  
                  // Add, activate, and pre-verify creator instantly for this tournament session
                  setTournaments(prev => [...prev, newTour]);
                  setVerifiedTournamentIds(prev => {
                    const next = [...prev, newId];
                    localStorage.setItem('ftm_verified_tournament_ids', JSON.stringify(next));
                    return next;
                  });
                  setIsOrganizerVerified(true);
                  localStorage.setItem('ftm_is_organizer_verified', 'true');
                  
                  setActiveTournamentId(newId);
                  setNewTourFormOpen(false);
                  
                  setTimeout(() => {
                    const successTitle = language === 'ar' ? 'تهانينا يا كابتن! 🎉' : language === 'en' ? 'Congratulations Captain! 🎉' : 'Félicitations Capitaine ! 🎉';
                    const successMsg = language === 'ar' 
                      ? `تم إنشاء بطولة "${newTour.name}" بنجاح وتعيين "${newTour.organizerName}" مشرفاً رسمياً عليها.\n\n🔑 كلمة مرور المنظم (رمز PIN) الخاصة بهذه البطولة هي: [ ${finalPin} ]\n\n(تم تفعيل صلاحياتك تلقائياً لبدء الإدارة فوراً دون الحاجة لإعادة كتابته!)` 
                      : language === 'en' 
                        ? `Tournament "${newTour.name}" has been created successfully with "${newTour.organizerName}" assigned as supervisor.\n\n🔑 The organizer password (PIN) for this tournament is: [ ${finalPin} ]\n\n(Organizer access is automatically activated for you to begin immediately!)` 
                        : `Le tournoi "${newTour.name}" a été créé avec succès avec "${newTour.organizerName}" désigné comme superviseur.\n\n🔑 Le mot de passe (PIN) de l'organisateur pour ce tournoi est : [ ${finalPin} ]`;
                    triggerAlert(successTitle, successMsg);
                  }, 200);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition"
              >
                {t.createAndStart}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
