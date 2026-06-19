import React from 'react';
import { Player, Match, Team } from '../types';
import { X, Award, Shield, Activity, Calendar, Zap, AlertTriangle, TrendingUp, Eye } from 'lucide-react';
import { Language } from '../translations';

interface PlayerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  matches: Match[];
  teams: Team[];
  language?: Language;
}

export default function PlayerDetailsModal({ isOpen, onClose, player, matches, teams, language = 'ar' }: PlayerDetailsModalProps) {
  if (!isOpen || !player) return null;

  const isAr = language === 'ar';
  const isFr = language === 'fr';

  // Get player's team details to match theme/colors
  const team = teams.find(t => t.id === player.teamId);
  const teamColor = team ? team.logoColor : 'bg-slate-700';
  const teamIcon = team ? team.logoIcon : '⚽';

  // Find all matches where this player's team participated
  const teamMatches = matches.filter(
    m => m.homeTeamId === player.teamId || m.awayTeamId === player.teamId
  );

  // Group matches by tournament type
  const leagueMatches = teamMatches.filter(m => m.stage.includes('الجولة') || m.stage.toLowerCase().includes('round') || m.stage.toLowerCase().includes('journée'));
  const cupMatches = teamMatches.filter(m => !(m.stage.includes('الجولة') || m.stage.toLowerCase().includes('round') || m.stage.toLowerCase().includes('journée')));

  const calculateStats = (matchList: Match[]) => {
    let played = 0;
    let goals = 0;
    let yellow = 0;
    let red = 0;

    matchList.forEach(m => {
      if (m.status !== 'not_started') {
        played++;
      }
      
      m.events.forEach(ev => {
        if (ev.playerId === player.id) {
          if (ev.type === 'goal') goals++;
          if (ev.type === 'yellow_card') yellow++;
          if (ev.type === 'red_card') red++;
        }
      });
    });

    return { played, goals, yellow, red };
  };

  const leagueStats = calculateStats(leagueMatches);
  const cupStats = calculateStats(cupMatches);
  const overallStats = calculateStats(teamMatches);

  // Translations dictionary for the player modal
  const getTranslatedPosition = (pos: string) => {
    if (pos === 'FW') return isAr ? 'مهاجم (FW)' : isFr ? 'Attaquant (FW)' : 'Forward (FW)';
    if (pos === 'MF') return isAr ? 'وسط (MF)' : isFr ? 'Milieu (MF)' : 'Midfielder (MF)';
    if (pos === 'DF') return isAr ? 'مدافع (DF)' : isFr ? 'Défenseur (DF)' : 'Defender (DF)';
    return isAr ? 'حارس مرمى (GK)' : isFr ? 'Gardien (GK)' : 'Goalkeeper (GK)';
  };

  const getTranslatedJersey = (num: number) => {
    return isAr ? `رقم ${num}` : isFr ? `Maillot n° ${num}` : `Jersey #${num}`;
  };

  const textClose = isAr ? 'إغلاق' : isFr ? 'Fermer' : 'Close';
  const textOverallStats = isAr ? 'إجمالي إحصائيات المشاركة الحالية' : isFr ? 'Statistiques Globales' : 'Overall Statistics';
  const textMatches = isAr ? 'المباريات' : isFr ? 'Matchs' : 'Matches';
  const textGoals = isAr ? 'الأهداف' : isFr ? 'Buts' : 'Goals';
  const textYellowCards = isAr ? 'صفراء' : isFr ? 'Jaunes' : 'Yellow';
  const textRedCards = isAr ? 'حمراء' : isFr ? 'Rouges' : 'Red';
  const textStatsByTournament = isAr ? 'الإحصائيات المجمعة عبر المسابقات المشارك بها' : isFr ? 'Statistiques par Compétition' : 'Statistics Grouped by Competition';
  
  const textLeagueTitle = isAr ? 'بطولة دوري النقاط العام الدوري' : isFr ? 'Championnat par Points (Ligue)' : 'Points League Championship';
  const textLeagueDesc = isAr ? 'مسابقة ذهاب وإياب' : isFr ? 'Aller et Retour' : 'Round-robin season';
  const textCupTitle = isAr ? 'كأس التصفيات الإقصائية (خروج المغلوب)' : isFr ? 'Coupe Élimination Directe' : 'Single Elimination Cup';
  const textCupDesc = isAr ? 'مسابقة إقصاء المهزوم' : isFr ? 'Élimination Directe' : 'Knockout matches';

  const textPlayedLabel = isAr ? 'لعب' : isFr ? 'MJ' : 'Pld';
  const textGoalsLabel = isAr ? 'الأهداف' : isFr ? 'Buts' : 'Goals';
  const textYellowLabel = isAr ? 'صفراء' : isFr ? 'Jaunes' : 'Yellow';
  const textRedLabel = isAr ? 'حمراء' : isFr ? 'Rouges' : 'Red';

  const textMatchHistory = isAr ? 'سجل مباريات ومساهمات للاعب تفصيلياً' : isFr ? 'Historique détaillé et contributions' : 'Detailed Match Logs & Contributions';
  const textNoMatches = isAr ? 'لم يشارك اللاعب في أي مباراة مسجلة حتى الآن.' : isFr ? "Le joueur n'a participé à aucun match pour l'instant." : 'The player has not played in any recorded matches yet.';
  
  const textVersus = isAr ? 'ضد' : isFr ? 'vs' : 'vs';
  const textLiveLabel = isAr ? 'مباشر حياً' : isFr ? 'En direct' : 'Live Game';
  const textScheduledLabel = isAr ? 'مجدولة' : isFr ? 'Programmé' : 'Scheduled';
  const textCategoryLeague = isAr ? 'الدوري الدوري' : isFr ? 'Ligue' : 'League';
  const textCategoryCup = isAr ? 'كأس الإقصاء' : isFr ? 'Coupe' : 'Cup';

  const textContribution = isAr ? 'المساهمة:' : isFr ? 'Contribution :' : 'Contribution:';
  const textGoalWord = isAr ? '⚽ هدف' : isFr ? '⚽ But' : '⚽ Goal';
  const textYellowWord = isAr ? '🟨 كرت أصفر' : isFr ? '🟨 Carton Jaune' : '🟨 Yellow Card';
  const textRedWord = isAr ? '🟥 كرت أحمر' : isFr ? '🟥 Carton Rouge' : '🟥 Red Card';
  const textNoContribution = isAr ? 'شارك كلاعب أساسي/احتياط ولم يسجل أو يتلق كروت.' : isFr ? 'A joué sans marquer ni recevoir de carton.' : 'Played without goals or cards.';
  const textNotPlayedYet = isAr ? 'لم يلعب اللقاء حتى الآن.' : isFr ? "N'a pas encore joué le match." : 'Has not played this match yet.';

  const textConnectionSecure = isAr ? 'الاتصال: مشفر آمن HTTPS' : isFr ? 'Connexion: Sécurisée HTTPS' : 'Connection: Secure HTTPS';
  const textScoutReport = isAr ? 'تقارير الأداء الفردية المتقدمة للكشافين والمدربين' : isFr ? 'Rapport de performance individuelle' : 'Advanced Player Performance Scouting Reports';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header decoration match with Team Color */}
        <div className={`relative h-28 ${teamColor} p-5 flex items-end justify-between overflow-hidden shrink-0`}>
          {/* Subtle gradient pattern overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
          <div className="absolute -right-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-slate-900/90 text-xl h-12 w-12 rounded-xl border border-slate-700/35 flex items-center justify-center shadow-lg">
              {teamIcon}
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h3 className="text-base font-black font-display text-white">{player.name}</h3>
              <p className="text-[11px] text-slate-300 font-bold">{player.teamName} • {getTranslatedJersey(player.number)}</p>
            </div>
          </div>

          <span className="relative z-10 text-[10px] bg-slate-900/95 text-emerald-400 border border-slate-700/40 px-3 py-1 rounded-full font-bold">
            {getTranslatedPosition(player.position)}
          </span>

          <button 
            onClick={onClose}
            className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} bg-slate-950/60 hover:bg-slate-950 text-slate-300 p-1.5 rounded-full transition border border-white/5`}
            title={textClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable detailed statistics content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 scrollbar-thin">
          
          {/* Section 1: Dynamic Overall Stats Cards */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>{textOverallStats}</span>
            </h4>
            
            <div className="grid grid-cols-4 gap-2.5 text-center">
              <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-500 block font-bold mb-1">{textMatches}</span>
                <span className="text-sm font-black text-slate-200 mt-1 block">{overallStats.played}</span>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl">
                <span className="text-[10px] text-emerald-400 block font-bold mb-1">{textGoals}</span>
                <span className="text-sm font-black text-emerald-400 mt-1 block">⚽ {overallStats.goals}</span>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl">
                <span className="text-[10px] text-amber-400 block font-bold mb-1">{textYellowCards}</span>
                <span className="text-sm font-black text-amber-400 mt-1 block">🟨 {overallStats.yellow}</span>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-2xl">
                <span className="text-[10px] text-rose-400 block font-bold mb-1">{textRedCards}</span>
                <span className="text-sm font-black text-rose-400 mt-1 block">🟥 {overallStats.red}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Summary of Match Statistics across Tournaments */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <Award className="h-4 w-4 text-emerald-400" />
              <span>{textStatsByTournament}</span>
            </h4>

            <div className="space-y-2.5">
              
              {/* Tournament 1: دوري النقاط (League) */}
              <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2 rounded-lg">
                  <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    {textLeagueTitle}
                  </span>
                  <span className="text-[9px] bg-indigo-505/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-550/20 font-bold">
                    {textLeagueDesc}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium bg-slate-900/60 p-2 rounded-xl">
                  <div>
                    <span className="text-slate-500 block text-[9px]">{textPlayedLabel}</span>
                    <span className="text-slate-200 block font-bold mt-0.5">{leagueStats.played}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 block text-[9px]">{textGoalsLabel}</span>
                    <span className="text-emerald-400 block font-bold mt-0.5">{leagueStats.goals} ⚽</span>
                  </div>
                  <div>
                    <span className="text-amber-500 block text-[9px]">{textYellowLabel}</span>
                    <span className="text-yellow-500 block font-bold mt-0.5">{leagueStats.yellow} 🟨</span>
                  </div>
                  <div>
                    <span className="text-red-540 block text-[9px]">{textRedLabel}</span>
                    <span className="text-red-500 block font-bold mt-0.5">{leagueStats.red} 🟥</span>
                  </div>
                </div>
              </div>

              {/* Tournament 2: كأس خروج المغلوب (Knockout/Cup) */}
              <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2 rounded-lg">
                  <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    {textCupTitle}
                  </span>
                  <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-bold">
                    {textCupDesc}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium bg-slate-900/60 p-2 rounded-xl">
                  <div>
                    <span className="text-slate-500 block text-[9px]">{textPlayedLabel}</span>
                    <span className="text-slate-200 block font-bold mt-0.5">{cupStats.played}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 block text-[9px]">{textGoalsLabel}</span>
                    <span className="text-emerald-400 block font-bold mt-0.5">{cupStats.goals} ⚽</span>
                  </div>
                  <div>
                    <span className="text-amber-500 block text-[9px]">{textYellowLabel}</span>
                    <span className="text-yellow-500 block font-bold mt-0.5">{cupStats.yellow} 🟨</span>
                  </div>
                  <div>
                    <span className="text-red-540 block text-[9px]">{textRedLabel}</span>
                    <span className="text-red-500 block font-bold mt-0.5">{cupStats.red} 🟥</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Detailed Match Timeline */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>{textMatchHistory}</span>
            </h4>

            {teamMatches.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">{textNoMatches}</p>
            ) : (
              <div className="space-y-2.5">
                {teamMatches.map(match => {
                  const isHome = match.homeTeamId === player.teamId;
                  const opponentName = isHome ? match.awayTeamName : match.homeTeamName;
                  
                  const playerEvents = match.events.filter(ev => ev.playerId === player.id);
                  const isFinished = match.status === 'finished';
                  const isLive = match.status === 'live';
                  const isLeagueType = match.stage.includes('الجولة') || match.stage.toLowerCase().includes('round') || match.stage.toLowerCase().includes('journée');

                  return (
                    <div key={match.id} className="bg-slate-950 p-3 border border-slate-850 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[9px] ${
                            isLeagueType 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {isLeagueType ? textCategoryLeague : textCategoryCup}
                          </span>
                          <span className="text-slate-400">{match.stage}</span>
                        </div>
                        
                        <span className="text-[10px] text-slate-500 font-mono">
                          {match.date} | {match.time}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-900 border border-slate-850 p-2 rounded-xl text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{textVersus} {opponentName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isLive ? (
                            <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded animate-pulse font-bold">{textLiveLabel}</span>
                          ) : !isFinished ? (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{textScheduledLabel}</span>
                          ) : null}
                          <span className="text-slate-200 font-mono font-bold">
                            {isHome ? `${match.scoreHome} - ${match.scoreAway}` : `${match.scoreAway} - ${match.scoreHome}`}
                          </span>
                        </div>
                      </div>

                      {/* Display contributions inside this match */}
                      {playerEvents.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                          <span className="text-slate-500">{textContribution}</span>
                          {playerEvents.map(ev => (
                            <span 
                              key={ev.id}
                              className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                                ev.type === 'goal' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                                ev.type === 'yellow_card' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                              }`}
                            >
                              {ev.type === 'goal' ? textGoalWord : ev.type === 'yellow_card' ? textYellowWord : textRedWord}
                              <span className="text-[8px] opacity-70 font-mono">({isAr ? `د ${ev.minute}` : `${ev.minute}'`})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-500 italic">
                          {isFinished ? textNoContribution : textNotPlayedYet}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer info brand */}
        <div className={`border-t border-slate-800 p-4 bg-slate-950/40 text-[9px] text-slate-500 flex justify-between items-center shrink-0 ${isAr ? 'flex-row' : 'flex-row-reverse'}`}>
          <span>{textConnectionSecure}</span>
          <span>{textScoutReport}</span>
        </div>
      </div>
    </div>
  );
}
