export type Position = 'GK' | 'DF' | 'MF' | 'FW'; // حارس مرمى، مدافع، وسط، مهاجم

export type TournamentType = 'league' | 'knockout' | 'groups';

export interface Team {
  id: string;
  name: string;
  logoColor: string; // Tailwind class, e.g. 'bg-red-500'
  logoIcon: string; // Emoji or preset shape
  schoolClass?: string; // الصف الدراسي أو الجهة
  city?: string; // المدينة
  participating?: boolean; // هل الفريق مشارك في البطولة الحالية؟
  group?: string; // اسم المجموعة مثلاً "المجموعة أ" أو "Group A"
  // Stats dynamically computed or synced
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  number: number;
  position: Position;
  goals: number;
  yellowCards: number;
  redCards: number;
}

export interface Referee {
  id: string;
  name: string;
  phone?: string;
  type: 'main' | 'assistant' | 'fourth'; // حكم ساحة، مساعد، حكم رابع
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'own_goal';
  playerId: string;
  playerName: string;
  teamId: string;
  minute: number;
}

export interface Match {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  refereeId?: string;
  refereeName?: string;
  date: string; // ISO date or custom string
  time: string; // Custom time, e.g., "16:00"
  scoreHome: number;
  scoreAway: number;
  status: 'not_started' | 'live' | 'finished';
  stage: string; // e.g., "الجولة 1", "نصف النهائي", "النهائي"
  events: MatchEvent[];
  group?: string; // اسم المجموعة مثلاً "المجموعة أ" أو "Group A"
  chronoSeconds?: number;
  isChronoRunning?: boolean;
  chronoSpeed?: 'normal' | 'fast';
}

export interface Tournament {
  id: string;
  name: string;
  organizerName: string;
  participatingTeamIds: string[];
  matches: Match[];
  drawType: TournamentType;
  pin?: string;
}

export interface TournamentState {
  type: TournamentType;
  teams: Team[];
  players: Player[];
  referees: Referee[];
  matches: Match[];
  isStarted: boolean;
}
