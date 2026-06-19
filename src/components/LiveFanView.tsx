import { useState } from 'react';
import { Match, Team, Player, Referee } from '../types';
import { computeStandings, computePlayerStats } from '../utils';
import { Trophy, Calendar, Award, Zap, Bell, ArrowRight, QrCode } from 'lucide-react';
import { Language, translations } from '../translations';
import MatchCalendar from './MatchCalendar';

interface LiveFanViewProps {
  teams: Team[];
  players: Player[];
  matches: Match[];
  referees: Referee[];
  onBackToAdmin?: () => void;
  isSimulated?: boolean;
  onOpenScanner?: () => void;
  organizerName?: string;
  language?: Language;
}

export default function LiveFanView({ 
  teams, 
  players, 
  matches, 
  referees, 
  onBackToAdmin, 
  isSimulated = false, 
  onOpenScanner, 
  organizerName, 
  language = 'ar' 
}: LiveFanViewProps) {
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'scorers'>('matches');
  const [matchViewMode, setMatchViewMode] = useState<'list' | 'calendar'>('list');
  const t = translations[language];
  
  const standings = computeStandings(teams, matches);
  const playerStats = computePlayerStats(players, matches);
  
  // Sort players for top scorer listing
  const topScorers = [...playerStats]
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, language))
    .slice(0, 15);

  const liveMatches = matches.filter(m => m.status === 'live');
  const otherMatches = matches.filter(m => m.status !== 'live');

  // Jakob's Law helper: Render team's recent form circles
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
                {s.type === 'own_goal' && <span className="text-rose-450 text-[8px]">(OG)</span>}
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
                    {s.type === 'own_goal' && <span className="text-rose-450 text-[8px]">(OG)</span>}
                  </>
                ) : (
                  <>
                    {s.type === 'own_goal' && <span className="text-rose-450 text-[8px]">(OG)</span>}
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

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col antialiased" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Trophy className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-display tracking-tight text-emerald-400">
                {language === 'ar' ? 'كأس الملعب والمدارس' : language === 'en' ? 'Stadium & School Cup' : 'Coupe du Stade & Écoles'}
              </h1>
              <p className="text-[10px] text-slate-400">
                {language === 'ar' ? 'البث المباشر للنتائج والإحصائيات' : language === 'en' ? 'Live Results & Statistics' : 'Scores en Direct & Statistiques'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {liveMatches.length > 0 && (
              <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-1 rounded-full text-[10px] font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                {language === 'ar' ? 'مباشر' : language === 'en' ? 'LIVE' : 'DIRECT'} ({liveMatches.length})
              </span>
            )}

            {onOpenScanner && (
              <button 
                onClick={onOpenScanner}
                className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:text-white transition text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow"
                title="مسح كود QR لتسجيل النتيجة السريعة"
              >
                <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                <span>{language === 'ar' ? 'كاشف QR 📸' : language === 'en' ? 'QR Code 📸' : 'Code QR 📸'}</span>
              </button>
            )}

            {onBackToAdmin && (
              <button 
                onClick={onBackToAdmin}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-emerald-500/15"
              >
                <ArrowRight className={`h-3.5 w-3.5 ${language !== 'ar' ? 'rotate-180' : ''}`} />
                {language === 'ar' ? 'التحكم' : language === 'en' ? 'Dashboard' : 'Tableau'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Welcome Unit */}
      <section className="bg-gradient-to-b from-slate-950 to-slate-900 px-4 pt-6 pb-4">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1 rounded-full text-xs text-slate-300 mb-3">
            <Bell className="h-3 w-3 text-emerald-400 animate-bounce" />
            <span>{language === 'ar' ? 'تحديث فوري لبطولة كرة القدم المدرسية والمحلية' : language === 'en' ? 'Instant updates for school & local tournaments' : 'Mises à jour instantanées du tournoi scolaire & local'}</span>
          </div>
          <h2 className="text-xl font-extrabold font-display leading-tight text-white">{language === 'ar' ? 'تابع نتائج وتفاصيل البطولة ثانية بثانية' : language === 'en' ? 'Follow Live Results & Stats Second by Second' : 'Suivez le Tournoi Seconde par Seconde'}</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            {language === 'ar' ? 'تم مسح هذا الرمز لمشاهدة المباريات الحية والترتيب وقائمة الهدافين من أي هاتف بشكل مباشر.' : language === 'en' ? 'Scan this code to watch live matches, standings, and top scorers directly from any phone.' : 'Scannez ce code pour suivre les matchs en direct, les classements et les meilleurs buteurs depuis votre téléphone.'}
          </p>
          {organizerName && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-amber-400 text-[10px] font-black px-3.5 py-1.5 rounded-full shadow-inner animate-fade-in">
              <span className="text-amber-500 text-xs">👑</span>
              <span>{t.tourSupervisor}:</span>
              <span className="text-slate-100">{organizerName}</span>
            </div>
          )}
        </div>
      </section>

      {/* Tab Navigation */}
      <nav className="bg-slate-950 border-y border-slate-800 px-2 py-1 sticky top-[56px] z-30">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'matches'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {language === 'ar' ? 'المباريات' : language === 'en' ? 'Matches' : 'Matchs'}
          </button>
          
          <button
            onClick={() => setActiveTab('standings')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'standings'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            {language === 'ar' ? 'جدول الترتيب' : language === 'en' ? 'Standings' : 'Classement'}
          </button>
          
          <button
            onClick={() => setActiveTab('scorers')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scorers'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            {language === 'ar' ? 'الهدافين' : language === 'en' ? 'Scorers' : 'Buteurs'}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {/* TAB 1: MATCHES */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            {/* Live Matches Special Section */}
            {liveMatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">{language === 'ar' ? 'المباريات الجارية حالياً' : language === 'en' ? 'Live Matches Currently' : 'Matchs récents en direct'}</h3>
                </div>
                
                <div className="space-y-3">
                  {liveMatches.map(match => (
                    <div key={match.id} className="bg-gradient-to-l from-red-950/40 to-slate-900 border border-red-900/40 rounded-xl p-4 shadow-xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Zap className="h-3 w-3 text-red-400 animate-pulse" />
                          {language === 'ar' ? 'شوط مباشر / جارٍ' : language === 'en' ? 'Live / In Progress' : 'En progress / En Direct'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-display">{match.stage}</span>
                      </div>
                      
                      {/* Scoreline */}
                      <div className="grid grid-cols-7 items-center justify-center text-center py-2">
                        {/* Home Team */}
                        <div className="col-span-2 flex flex-col items-center gap-1.5">
                          <span className={`h-11 w-11 rounded-full ${match.homeTeamId === 'team-1' ? 'bg-emerald-500' : match.homeTeamId === 'team-2' ? 'bg-red-500' : 'bg-sky-500'} flex items-center justify-center text-xl shadow-md`}>
                            ⚽
                          </span>
                          <span className="text-xs font-bold truncate w-full">{match.homeTeamName}</span>
                        </div>
                        
                        {/* Score and vs */}
                        <div className="col-span-3 flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl font-extrabold font-display leading-none text-emerald-400">{match.scoreHome}</span>
                            <span className="text-slate-600 text-sm font-bold">:</span>
                            <span className="text-3xl font-extrabold font-display leading-none text-emerald-400">{match.scoreAway}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono mt-2 bg-slate-800 px-2 py-0.5 rounded self-center">د 58'</span>
                        </div>
                        
                        {/* Away Team */}
                        <div className="col-span-2 flex flex-col items-center gap-1.5">
                          <span className={`h-11 w-11 rounded-full ${match.awayTeamId === 'team-1' ? 'bg-emerald-500' : match.awayTeamId === 'team-2' ? 'bg-red-500' : 'bg-sky-500'} flex items-center justify-center text-xl shadow-md`}>
                            🏃‍♂️
                          </span>
                          <span className="text-xs font-bold truncate w-full">{match.awayTeamName}</span>
                        </div>
                      </div>

                      {/* Display Events inside the match (SofaScore Inline Scorers) */}
                      {renderInlineScorers(match)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Matches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {language === 'ar' ? 'جدول مباريات البطولة' : language === 'en' ? 'Tournament Match Schedule' : 'Calendrier des rencontres'}
                </h3>
                
                {/* Mode Selectors */}
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800/85">
                  <button 
                    onClick={() => setMatchViewMode('list')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      matchViewMode === 'list' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'قائمة' : 'List'}
                  </button>
                  <button 
                    onClick={() => setMatchViewMode('calendar')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-0.5 ${
                      matchViewMode === 'calendar' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    {language === 'ar' ? 'تقويم' : 'Calendar'}
                  </button>
                </div>
              </div>
              
              {matchViewMode === 'calendar' ? (
                <MatchCalendar 
                  matches={matches}
                  teams={teams}
                  referees={referees}
                  language={language}
                  isOrganizer={false}
                />
              ) : otherMatches.length === 0 && liveMatches.length === 0 ? (
                <div className="text-center py-10 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500">
                  <Calendar className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                  <p className="text-sm">
                    {language === 'ar' ? 'لم يتم توليد أو جدولة مباريات بعد.' : language === 'en' ? 'No matches scheduled yet.' : 'Aucun match programmé pour le moment.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {otherMatches.map(match => (
                    <div key={match.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 card-hover">
                      <div className="flex justify-between items-center mb-3 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          match.status === 'finished' 
                            ? 'bg-slate-800 text-slate-300' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {match.status === 'finished' 
                            ? (language === 'ar' ? 'انتهت' : language === 'en' ? 'Finished' : 'Terminé') 
                            : (language === 'ar' ? 'مجدولة' : language === 'en' ? 'Scheduled' : 'Prévu')}
                        </span>
                        
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>{match.date}</span>
                          <span>|</span>
                          <span>{match.time}</span>
                        </span>

                        <span className="text-slate-400 font-display font-medium bg-slate-900 px-2 py-0.5 rounded-lg">{match.stage}</span>
                      </div>

                      {/* Scoreline */}
                      <div className="grid grid-cols-7 items-center justify-center text-center">
                        {/* Home Team */}
                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <span className="text-xs font-bold truncate w-full">{match.homeTeamName}</span>
                        </div>
                        
                        {/* Outcome Score */}
                        <div className="col-span-3 flex items-center justify-center">
                          {match.status === 'finished' ? (
                            <div className="flex items-center justify-center bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800/80 gap-3">
                              <span className="text-lg font-bold font-display text-emerald-400">{match.scoreHome}</span>
                              <span className="text-slate-500 text-xs">-</span>
                              <span className="text-lg font-bold font-display text-emerald-400">{match.scoreAway}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-bold font-display">
                              {match.time}
                            </span>
                          )}
                        </div>
                        
                        {/* Away Team */}
                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <span className="text-xs font-bold truncate w-full">{match.awayTeamName}</span>
                        </div>
                      </div>

                      {/* Display events for finished matches (SofaScore Inline Scorers) */}
                      {renderInlineScorers(match)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STANDINGS */}
        {activeTab === 'standings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'ترتيب فرق الدوري العام' : language === 'en' ? 'League Standings Table' : 'Tableau des Classements'}</h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">{language === 'ar' ? 'تحديث حي ⚡' : language === 'en' ? 'Live Updates ⚡' : 'En direct ⚡'}</span>
            </div>

            {(() => {
              const groupsWithTeams = Array.from(new Set(standings.filter(t => t.group).map(t => t.group as string))).sort();
              const hasGroups = groupsWithTeams.length > 0;

              if (!hasGroups) {
                return (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px] font-bold">
                          <tr>
                            <th className="px-2 py-3 w-8 text-center">#</th>
                            <th className="px-3 py-3">{t.team}</th>
                            <th className="px-2 py-3 text-center">{t.played}</th>
                            <th className="px-2 py-3 text-center">{t.won}</th>
                            <th className="px-2 py-3 text-center">{t.drawn}</th>
                            <th className="px-2 py-3 text-center">{t.lost}</th>
                            <th className="px-2 py-3 text-center">{t.diff}</th>
                            <th className="px-2 py-3 text-center">{t.goals}</th>
                            <th className="px-3 py-3 text-center text-emerald-400">{t.points}</th>
                            <th className="px-2 py-3 text-center">{language === 'ar' ? 'آخر 5' : language === 'fr' ? 'Forme' : 'Form'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {standings.map((team, idx) => (
                            <tr key={team.id} className="hover:bg-slate-900/40 transition">
                              <td className="px-2 py-3.5 text-center font-bold font-display">
                                <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] ${
                                  idx === 0 ? 'bg-amber-500 text-slate-950 font-extrabold' :
                                  idx === 1 ? 'bg-slate-300 text-slate-950 font-extrabold' :
                                  idx === 2 ? 'bg-amber-700 text-white font-extrabold' :
                                  'bg-slate-800 text-slate-300'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-3 py-3.5 font-bold flex items-center gap-2">
                                <span className={`h-6 w-6 rounded-full ${team.logoColor || 'bg-slate-700'} flex items-center justify-center text-xs shadow shadow-black/40`}>
                                  {team.logoIcon || '⚽'}
                                </span>
                                <div className="truncate">
                                  <span className="block">{team.name}</span>
                                  <span className="text-[9px] text-slate-500 block font-normal">{team.schoolClass || team.city}</span>
                                </div>
                              </td>
                              <td className="px-2 py-3.5 text-center font-mono text-slate-300">{team.played}</td>
                              <td className="px-2 py-3.5 text-center font-mono text-slate-400">{team.wins}</td>
                              <td className="px-2 py-3.5 text-center font-mono text-slate-400">{team.draws}</td>
                              <td className="px-2 py-3.5 text-center font-mono text-slate-400">{team.losses}</td>
                              <td className="px-2 py-3.5 text-center font-mono text-slate-400 font-bold" dir="ltr">
                                {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                              </td>
                              <td className="px-2 py-3.5 text-center font-mono text-slate-500 text-[11px]" dir="ltr">
                                {team.goalsFor}:{team.goalsAgainst}
                              </td>
                              <td className="px-3 py-3.5 text-center font-bold text-emerald-400 text-sm font-display">{team.points}</td>
                              <td className="px-2 py-3.5 text-center">
                                {renderFormCircles(team.id)}
                              </td>
                            </tr>
                          ))}
                          {standings.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-10 text-slate-600">
                                {language === 'ar' ? 'لا توجد فرق مضافة لترتيبها حالياً.' : language === 'en' ? 'No teams added to standings yet.' : 'Aucune équipe pour le moment.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {groupsWithTeams.map(grp => {
                    const grpTeams = standings.filter(t => t.group === grp);
                    return (
                      <div key={grp} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3 animate-fade-in">
                        <h4 className="font-extrabold text-xs text-amber-400 font-display flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                          <Trophy className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                          {language === 'ar' ? `المجموعة ${grp}` : language === 'en' ? `Group ${grp}` : `Groupe ${grp}`}
                        </h4>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-850 text-[10px] font-bold">
                              <tr>
                                <th className="px-2 py-2 w-8 text-center">#</th>
                                <th className="px-3 py-2">{t.team}</th>
                                <th className="px-2 py-2 text-center">{t.played}</th>
                                <th className="px-2 py-2 text-center">{t.won}</th>
                                <th className="px-2 py-2 text-center">{t.drawn}</th>
                                <th className="px-2 py-2 text-center">{t.lost}</th>
                                <th className="px-2 py-2 text-center">{t.diff}</th>
                                <th className="px-2 py-2 text-center">{t.goals}</th>
                                <th className="px-3 py-2 text-center text-emerald-400">{t.points}</th>
                                <th className="px-2 py-2 text-center">{language === 'ar' ? 'آخر 5' : language === 'fr' ? 'Forme' : 'Form'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900">
                              {grpTeams.map((team, idx) => (
                                <tr key={team.id} className="hover:bg-slate-900/40 transition">
                                  <td className="px-2 py-2.5 text-center font-bold font-display">
                                    <span className={`inline-flex items-center justify-center h-4.5 w-4.5 rounded-full text-[9px] ${
                                      idx === 0 ? 'bg-amber-500 text-slate-950 font-extrabold' :
                                      idx === 1 ? 'bg-slate-300 text-slate-950 font-extrabold' :
                                      'bg-slate-800 text-slate-300'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 font-bold flex items-center gap-2">
                                    <span className={`h-5 w-5 rounded-full ${team.logoColor || 'bg-slate-700'} flex items-center justify-center text-[10px] shadow shadow-black/40`}>
                                      {team.logoIcon || '⚽'}
                                    </span>
                                    <div className="truncate">
                                      <span className="block text-slate-100 text-[11px] font-medium">{team.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2.5 text-center font-mono text-slate-400">{team.played}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-slate-500">{team.wins}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-slate-500">{team.draws}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-slate-500">{team.losses}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-slate-500 font-bold" dir="ltr">
                                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                                  </td>
                                  <td className="px-2 py-2.5 text-center font-mono text-slate-500 text-[11px]" dir="ltr">
                                    {team.goalsFor}:{team.goalsAgainst}
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-bold text-emerald-400 text-xs font-display">{team.points}</td>
                                  <td className="px-2 py-2.5 text-center">
                                    {renderFormCircles(team.id)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-300">
                {language === 'ar' ? 'ماتريكس حسم النقاط:' : language === 'en' ? 'Points system matrix:' : 'Système de calcul de points :'}
              </p>
              <p>• {language === 'ar' ? 'الفوز: ٣ نقاط | التعادل: نقطة واحدة | الخسارة: صفر.' : language === 'en' ? 'Win: 3 points | Draw: 1 point | Loss: 0 points.' : 'Victoire : 3 points | Nul : 1 point | Défaite : 0 point.'}</p>
              <p>• {language === 'ar' ? 'في حال تساوي النقاط، يتم الرجوع أولاً إلى فارق الأهداف (له - عليه) ثم الأهداف المسجلة.' : language === 'en' ? 'In case of a tie, Goal Difference is computed first, then Goals Scored.' : 'En cas d\'égalité de points, la différence de buts départage, puis les buts marqués.'}</p>
            </div>
          </div>
        )}

        {/* TAB 3: SCORERS */}
        {activeTab === 'scorers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.topScorers}</h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">{language === 'ar' ? 'الحذاء الذهبي 🏆' : language === 'en' ? 'Golden Boot 🏆' : 'Soulier d\'Or 🏆'}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="divide-y divide-slate-800/60">
                {topScorers.map((player, idx) => (
                  <div key={player.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-900/40 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500 w-5 text-center">{idx + 1}</span>
                      <div>
                        <span className="font-bold text-sm block">{player.name}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {language === 'ar' ? `قميص #${player.number} • ${player.teamName}` : `Jersey #${player.number} • ${player.teamName}`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                        {player.position === 'FW' ? (language === 'ar' ? 'مهاجم' : 'FW') : player.position === 'MF' ? (language === 'ar' ? 'وسط' : 'MF') : player.position === 'DF' ? (language === 'ar' ? 'مدافع' : 'DF') : (language === 'ar' ? 'حارس' : 'GK')}
                      </span>
                      <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <span className="text-sm font-extrabold font-display leading-none">{player.goals}</span>
                        <span className="text-[10px] font-bold">{t.goalsCountWord}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {topScorers.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    {language === 'ar' ? 'لم يحرز أي لاعب أهدافاً حتى الآن. سجل أهدافاً من لوحة تحكم المباريات لتظهر هنا.' : language === 'en' ? 'No players recorded goals yet. Add goals from the tournament match sheets to display them here.' : 'Aucun buteur enregistré. Ajoutez des buts depuis l\'arbitrage pour les afficher.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding for Fans */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-600">
        <div className="max-w-md mx-auto flex flex-col items-center gap-2">
          <QrCode className="h-6 w-6 text-slate-500 opacity-60" />
          <p className="font-bold font-display text-slate-400">{t.appName}</p>
          <p className="text-[10px] text-slate-500">{t.appSubtitle}</p>
        </div>
      </footer>
    </div>
  );
}
