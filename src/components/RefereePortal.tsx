import { useState, useEffect } from 'react';
import { Match, Player, MatchEvent } from '../types';
import { Trophy, Calendar, Check, Play, Square, User, Plus, X, ArrowLeft, ArrowRight, Shield, Clock, AlertTriangle } from 'lucide-react';
import { Language } from '../translations';

interface RefereePortalProps {
  match: Match;
  players: Player[];
  onUpdateMatch: (updatedMatch: Match) => void;
  onBack: () => void;
  language?: Language;
}

export default function RefereePortal({ match, players, onUpdateMatch, onBack, language = 'ar' }: RefereePortalProps) {
  const [matchEventTimer, setMatchEventTimer] = useState<number>(1);
  const [matchEventTeam, setMatchEventTeam] = useState<'home' | 'away'>('home');
  const [matchEventPlayer, setMatchEventPlayer] = useState<string>('');
  const [matchEventType, setMatchEventType] = useState<'goal' | 'yellow_card' | 'red_card'>('goal');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isAr = language === 'ar';
  const isFr = language === 'fr';

  // Automatic Game Chrono helpers derived from match prop
  const chronoSeconds = match.chronoSeconds ?? 0;
  const isChronoRunning = match.isChronoRunning ?? false;
  const chronoSpeed = match.chronoSpeed ?? 'normal';

  const handleUpdateRefereeChrono = (updates: { isChronoRunning?: boolean; chronoSeconds?: number; chronoSpeed?: 'normal' | 'fast' }) => {
    onUpdateMatch({
      ...match,
      ...updates
    });
  };

  // Keep event minute input in sync with running chrono for automatic timestamp logging
  useEffect(() => {
    if (match.status === 'live') {
      const liveMin = Math.min(120, Math.floor((match.chronoSeconds ?? 0) / 60) + 1);
      if (match.isChronoRunning) {
        setMatchEventTimer(liveMin);
      }
    }
  }, [match.chronoSeconds, match.isChronoRunning, match.status]);

  const formatChronoTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Filter players by team
  const homePlayers = players.filter(p => p.teamId === match.homeTeamId);
  const awayPlayers = players.filter(p => p.teamId === match.awayTeamId);
  const activeTeamPlayers = matchEventTeam === 'home' ? homePlayers : awayPlayers;

  // Localizations variables
  const textTitle = isAr ? 'بوابة الحكم والتحكيم الفوري 🏁' : isFr ? 'Portail Arbitre & Contrôle Direct 🏁' : 'Referee Match Scoring Portal 🏁';
  const textSub = isAr ? 'تدوين مباشر وحي لأحداث اللقاء للجمهور' : isFr ? 'Saisie en direct des scores, buts et cartons' : 'Live scores and match events dashboard';
  
  const textMatchAdmin = isAr ? 'مباراة الحكم:' : isFr ? 'Match arbitré :' : 'Match Referee:';
  const textStage = isAr ? 'الصف / الجولة:' : isFr ? 'Étape :' : 'Stage / Round:';
  const textChrono = isAr ? 'ساعة المباراة' : isFr ? 'Chrono du Match' : 'Match Chrono';
  
  const textBtnStart = isAr ? 'بدء اللقاء والساعة ⏱️' : isFr ? 'Démarrer le Chrono ⏱️' : 'Start Chrono ⏱️';
  const textBtnPause = isAr ? 'إيقاف مؤقت ⏸️' : isFr ? 'Pause Chrono ⏸️' : 'Pause ⏸️';
  const textBtnSpeed = isAr ? '⚡ محاكاة سريعة' : isFr ? '⚡ Mode Accéléré' : '⚡ Fast Mode';
  const textBtnNormal = isAr ? '⏳ سرعة طبيعية' : isFr ? '⏳ Vitesse Normale' : '⏳ Normal Speed';
  const textResetChrono = isAr ? 'تصفير الساعة' : isFr ? 'Réinitialiser' : 'Reset Chrono';
  
  const h3MatchStatus = isAr ? 'حالة اللقاء الرسمية' : isFr ? 'Statut Officiel du Match' : 'Official Match State';
  const textNotStartedStatus = isAr ? 'مجدولة لم تبدأ بعد' : isFr ? 'Non Démarré (Programmé)' : 'Scheduled (Not Started)';
  const textLiveStatus = isAr ? 'مباشرة جارية الآن' : isFr ? 'Match en Cours Currently' : 'Game Active (Live)';
  const textFinishedStatus = isAr ? 'منتهية بصفارة الحكم' : isFr ? 'Match Conclut (Terminé)' : 'Match Finished (Concluded)';
  
  const h3ActiveScore = isAr ? 'لوحة النتيجة الفورية للبطولة' : isFr ? 'Ajustement du Tableau d\'Affichage' : 'Adjust Live Scoreline';
  
  const h3LogEvents = isAr ? 'تدوين وتسجيل الأحداث والإنذارات' : isFr ? 'Inscrire un Événement (But, Cartons)' : 'Inscribe Match Events & Cards';
  const textSelectTeam = isAr ? 'اختر الفريق ذو الفاعلية' : isFr ? 'Équipe de l\'action' : 'Select Team of Action';
  const textSelectPlayer = isAr ? 'اختر اللاعب الكروي' : isFr ? 'Sélectionner l\'athlète' : 'Select Player';
  const textSelectPlayerDefault = isAr ? '-- الكل أو اختر اللاعب فاعلاً --' : isFr ? '-- Choisir l\'athlète --' : '-- Choose player --';
  const textEventType = isAr ? 'نوع الحدث الرياضي' : isFr ? 'Nature de l\'action' : 'Action Type';
  const textGoalWord = isAr ? '⚽ هدف لصالح الفريق' : isFr ? '⚽ But inscrit' : '⚽ Goal Scored';
  const textYellowWord = isAr ? '🟨 كرت أصفر (انذار)' : isFr ? '🟨 Carton Jaune' : '🟨 Yellow Card';
  const textRedWord = isAr ? '🟥 كرت أحمر (مطرود مباشر)' : isFr ? '🟥 Carton Rouge Direct' : '🟥 Straight Red Card';
  
  const textMinuteLabel = isAr ? 'دقيقة تسجيل الحدث' : isFr ? 'Minute de l\'action' : 'Minute of Action';
  const btnSaveEvent = isAr ? 'تسجيل الحدث 📝' : isFr ? 'Enregistrer l\'action 📝' : 'Record Event 📝';
  
  const h3Timeline = isAr ? 'شريط أحداث وتوقيت المباراة الجارية' : isFr ? 'Fil d\'actualités et chronologie du match' : 'Match Events & Chronological Timeline';
  const textNoEventsYet = isAr ? 'لم يتم تسجيل أي أحداث (أهداف أو إنذارات) للقاء حتى الآن.' : isFr ? 'Aucun événement (buts ou cartons) enregistré pour l\'instant.' : 'No match events (goals or cards) recorded yet.';
  
  const textInstructionTitle = isAr ? 'بوابة البث الحي والتحكم الفوري:' : isFr ? 'Portail Arbitre Direct :' : 'Live Scoring & Stream Controller:';
  const textInstructions = isAr 
    ? 'أي بيانات تقوم بتغييرها هنا من هاتفك أو أي متصفح، يتم تدوينها وحفظها في قاعدة الذاكرة السريعة للبطولة. يتم إعادة احتساب جدول الترتيب وأقوى الهدافين تلقائياً ومباشرة لجميع الجماهير والمتابعين!' 
    : isFr 
    ? 'Toutes les données saisies sur ce portail mettent à jour le classement général, les tableaux de buteurs et les fiches spectateurs en temps réel !' 
    : 'Any actions logged here updates the leaderboard and top goalscorers instantly for all live spectators and screens with absolute zero delay!';
  
  const textFooter = isAr ? 'تطبيق إدارة بطولات كرة القدم المدرسية والمحلية الرقمية' : isFr ? 'Pôle de Gestion de Championnat de Football Scolaire et Local' : 'School & Local Football Leagues Coordinator Hub';

  const alertSelectPlayerFirst = isAr ? 'الرجاء اختيار اللاعب الفاعل أولاً.' : isFr ? 'Veuillez d\'abord choisir l\'athlète.' : 'Please select the participating player first.';
  const toastScoreUpdated = isAr ? 'تم تحديث النتيجة فوراً! ⚽' : isFr ? 'Tableau des scores mis à jour ! ⚽' : 'Scoreline updated instantly! ⚽';
  const toastEventSaved = isAr ? 'تم تدوين الحدث في تقرير اللقاء بنجاح! 📝' : isFr ? 'Événement inscrit dans le rapport officiel ! 📝' : 'Match event recorded in report successfully! 📝';
  const toastEventDeleted = isAr ? 'تم حذف الحدث بنجاح من شريط اللقاء ومراجعة الأهداف والترتيب!' : isFr ? 'Événement retiré du rapport et scores recalculés !' : 'Event deleted from report. Scores and stats recalculated!';

  const toastStatusUpdated = (status: string) => {
    if (isAr) return `تم تغيير حالة المباراة إلى: ${status === 'live' ? 'مباشرة 🔴' : status === 'finished' ? 'انتهت ✅' : 'مجدولة 📅'}`;
    if (isFr) return `Statut du match mis à jour : ${status === 'live' ? 'En direct 🔴' : status === 'finished' ? 'Terminé ✅' : 'Programmé 📅'}`;
    return `Match status changed to: ${status === 'live' ? 'Live Game 🔴' : status === 'finished' ? 'Concluded ✅' : 'Scheduled 📅'}`;
  };

  const handleUpdateScore = (team: 'home' | 'away', change: number) => {
    const updatedHomeScore = team === 'home' ? Math.max(0, match.scoreHome + change) : match.scoreHome;
    const updatedAwayScore = team === 'away' ? Math.max(0, match.scoreAway + change) : match.scoreAway;

    const updatedMatch: Match = {
      ...match,
      scoreHome: updatedHomeScore,
      scoreAway: updatedAwayScore,
    };
    onUpdateMatch(updatedMatch);
    showTempMessage(toastScoreUpdated);
  };

  const handleUpdateStatus = (status: Match['status']) => {
    const updatedMatch: Match = {
      ...match,
      status
    };
    onUpdateMatch(updatedMatch);
    showTempMessage(toastStatusUpdated(status));
  };

  const handleAddEvent = () => {
    if (!matchEventPlayer) {
      alert(alertSelectPlayerFirst);
      return;
    }

    const selectedPlayer = players.find(p => p.id === matchEventPlayer);
    if (!selectedPlayer) return;

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      type: matchEventType,
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      teamId: selectedPlayer.teamId,
      minute: Number(matchEventTimer)
    };

    // Calculate goals adjust if event is a goal
    let goalHomeBonus = 0;
    let goalAwayBonus = 0;

    if (matchEventType === 'goal') {
      if (selectedPlayer.teamId === match.homeTeamId) {
        goalHomeBonus = 1;
      } else {
        goalAwayBonus = 1;
      }
    }

    const updatedMatch: Match = {
      ...match,
      scoreHome: match.scoreHome + goalHomeBonus,
      scoreAway: match.scoreAway + goalAwayBonus,
      events: [...match.events, newEvent]
    };

    onUpdateMatch(updatedMatch);
    setMatchEventPlayer('');
    showTempMessage(toastEventSaved);
  };

  const handleDeleteEvent = (eventId: string) => {
    const targetEvent = match.events.find(e => e.id === eventId);
    if (!targetEvent) return;

    let goalHomeReduction = 0;
    let goalAwayReduction = 0;

    if (targetEvent.type === 'goal') {
      if (targetEvent.teamId === match.homeTeamId) {
        goalHomeReduction = 1;
      } else {
        goalAwayReduction = 1;
      }
    }

    const updatedMatch: Match = {
      ...match,
      scoreHome: Math.max(0, match.scoreHome - goalHomeReduction),
      scoreAway: Math.max(0, match.scoreAway - goalAwayReduction),
      events: match.events.filter(ev => ev.id !== eventId)
    };

    onUpdateMatch(updatedMatch);
    showTempMessage(toastEventDeleted);
  };

  const showTempMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Header sticky bar */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur sticky top-0 z-50 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={onBack}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title={isAr ? 'رجوع' : 'Back'}
            >
              {isAr ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </button>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h1 className="text-sm font-black font-display text-emerald-400">{textTitle}</h1>
              <p className="text-[10px] text-slate-400">{textSub}</p>
            </div>
          </div>

          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
            {isAr ? 'لوحة تحكم الحكم' : isFr ? 'Arbitrage en Ligne' : 'Referee Module'}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5">
        
        {/* Toast status updates drawer */}
        {statusMessage && (
          <div className="bg-emerald-600 text-slate-50 text-xs font-bold p-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
            <Check className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Match Basic Details Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl -mr-10 -mt-10"></div>
          
          <div className="space-y-3 relative z-10">
            <div className={`flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-800 pb-2 ${isAr ? 'flex-row' : 'flex-row-reverse'}`}>
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                {match.date} | {match.time}
              </span>
              <span>{textStage} <span className="text-emerald-400 font-black">{match.stage}</span></span>
            </div>

            <div className="flex items-center justify-between text-center py-2.5">
              <div className="flex-1">
                <span className="text-base font-black text-slate-200 block truncate">{match.homeTeamName}</span>
                <span className="text-[10px] text-slate-400">{isAr ? 'صاحب الأرض' : isFr ? 'Hôte' : 'Home'}</span>
              </div>
              <div className="text-xl font-bold font-mono px-4 text-emerald-400">{match.scoreHome} - {match.scoreAway}</div>
              <div className="flex-1">
                <span className="text-base font-black text-slate-200 block truncate">{match.awayTeamName}</span>
                <span className="text-[10px] text-slate-400">{isAr ? 'الضيف' : isFr ? 'Visiteur' : 'Away'}</span>
              </div>
            </div>

            {/* MATCH AUTOMATIC CHRONOMETRE INTERACTIVE UNIT */}
            <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex flex-col items-center justify-center gap-2.5 mt-2 shadow-inner">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{textChrono}</span>
              </div>
              
              <div className="text-3xl font-mono font-black tracking-widest text-emerald-300 select-all">
                {formatChronoTime(chronoSeconds)}
              </div>

              <div className="flex items-center gap-2 w-full pt-1 text-xs">
                {isChronoRunning ? (
                  <button 
                    onClick={() => handleUpdateRefereeChrono({ isChronoRunning: false })}
                    className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 py-2 px-1 rounded-lg font-black transition cursor-pointer"
                  >
                    {textBtnPause}
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (match.status !== 'live') {
                        handleUpdateStatus('live');
                      }
                      handleUpdateRefereeChrono({ isChronoRunning: true });
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-1 rounded-lg font-black transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{textBtnStart}</span>
                  </button>
                )}

                <button 
                  onClick={() => handleUpdateRefereeChrono({ chronoSpeed: chronoSpeed === 'normal' ? 'fast' : 'normal' })}
                  className="bg-slate-900 border border-slate-850 py-2 px-3 rounded-lg text-slate-300 hover:text-white transition font-bold"
                  title={chronoSpeed === 'normal' ? textBtnSpeed : textBtnNormal}
                >
                  {chronoSpeed === 'normal' ? '🏃‍♂️' : '🐢'}
                </button>

                <button 
                  onClick={() => {
                    if (confirm(isAr ? 'هل تود تصفير ساعة المباراة والبدء ثانية؟' : 'Reset chrono to 00:00?')) {
                      handleUpdateRefereeChrono({ chronoSeconds: 0, isChronoRunning: false });
                    }
                  }}
                  className="bg-slate-900 border border-slate-850 text-slate-400 hover:text-red-400 py-2 px-2.5 rounded-lg transition"
                  title={textResetChrono}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Match State official switch buttons */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">{h3MatchStatus}</span>
          
          <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
            <button
              onClick={() => handleUpdateStatus('not_started')}
              className={`py-2.5 rounded-xl border transition ${
                match.status === 'not_started'
                  ? 'bg-slate-800 text-slate-100 border-slate-600 shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-900 hover:text-slate-300'
              }`}
            >
              📅 {isAr ? 'مجدولة' : 'Scheduled'}
            </button>
            <button
              onClick={() => handleUpdateStatus('live')}
              className={`py-2.5 rounded-xl border transition ${
                match.status === 'live'
                  ? 'bg-red-500/10 text-red-400 border-red-500/35 shadow animate-pulse'
                  : 'bg-slate-950 text-slate-400 border-slate-900 hover:text-slate-300'
              }`}
            >
              🔴 {isAr ? 'مباشرة' : 'Live'}
            </button>
            <button
              onClick={() => {
                handleUpdateRefereeChrono({ isChronoRunning: false });
                handleUpdateStatus('finished');
              }}
              className={`py-2.5 rounded-xl border transition ${
                match.status === 'finished'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35 shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-900 hover:text-slate-300'
              }`}
            >
              ✅ {isAr ? 'منتهية' : 'Finished'}
            </button>
          </div>
        </div>

        {/* Live Manual score adjust tool */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">{h3ActiveScore}</span>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-400 truncate w-full text-center font-bold">{match.homeTeamName}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleUpdateScore('home', -1)}
                  className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white transition font-black text-sm shrink-0"
                >
                  -
                </button>
                <span className="text-xl font-mono font-black text-slate-100 w-4 text-center">{match.scoreHome}</span>
                <button
                  onClick={() => handleUpdateScore('home', 1)}
                  className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 transition font-black text-sm shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-400 truncate w-full text-center font-bold">{match.awayTeamName}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleUpdateScore('away', -1)}
                  className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white transition font-black text-sm shrink-0"
                >
                  -
                </button>
                <span className="text-xl font-mono font-black text-slate-100 w-4 text-center">{match.scoreAway}</span>
                <button
                  onClick={() => handleUpdateScore('away', 1)}
                  className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 transition font-black text-sm shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Registered Events Timeline logging system */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">{h3LogEvents}</span>
          
          <div className="space-y-3.5 text-xs font-medium">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 block">{textSelectTeam}</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-850">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchEventTeam('home');
                      setMatchEventPlayer('');
                    }}
                    className={`py-1 rounded text-[10px] font-black truncate transition ${matchEventTeam === 'home' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    {match.homeTeamName}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchEventTeam('away');
                      setMatchEventPlayer('');
                    }}
                    className={`py-1 rounded text-[10px] font-black truncate transition ${matchEventTeam === 'away' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    {match.awayTeamName}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 block">{textSelectPlayer}</label>
                <select
                  value={matchEventPlayer}
                  onChange={e => setMatchEventPlayer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2 text-xs rounded-lg outline-none text-white focus:border-emerald-500"
                >
                  <option value="">{textSelectPlayerDefault}</option>
                  {activeTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.number} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 block">{textEventType}</label>
              <select
                value={matchEventType}
                onChange={e => setMatchEventType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-850 p-2 text-xs rounded-lg outline-none text-white focus:border-emerald-500"
              >
                <option value="goal">{textGoalWord}</option>
                <option value="yellow_card">{textYellowWord}</option>
                <option value="red_card">{textRedWord}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 block">{textMinuteLabel}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={matchEventTimer}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setMatchEventTimer(v);
                    handleUpdateRefereeChrono({ chronoSeconds: (v - 1) * 60 });
                  }}
                  className="w-20 bg-slate-950 text-center text-xs p-2 rounded-lg border border-slate-850 outline-none font-bold text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddEvent}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3 rounded-lg flex-1 transition shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {btnSaveEvent}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline details output list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">{h3Timeline}</span>
          
          {match.events.length === 0 ? (
            <p className="text-center py-6 text-slate-500 text-xs">{textNoEventsYet}</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5 scrollbar-thin">
              {match.events.map(ev => {
                const isHomeEvent = ev.teamId === match.homeTeamId;
                return (
                  <div 
                    key={ev.id} 
                    className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🟨' : '🟥'}
                      </span>
                      <div>
                        <span className="font-bold block text-slate-200">{ev.playerName}</span>
                        <span className="text-[9px] text-slate-500 block">
                          {isHomeEvent ? match.homeTeamName : match.awayTeamName} ({isAr ? 'لاعب' : isFr ? 'Joueur' : 'Player'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[11px] text-slate-400 font-bold">{isAr ? `د ${ev.minute}` : `${ev.minute}'`}</span>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition cursor-pointer"
                        title={isAr ? 'حذف الحدث' : 'Delete Event'}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instructions block */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-[11px] text-slate-400 leading-normal font-sans">
          💡 <strong>{textInstructionTitle}</strong> {textInstructions}
        </div>

      </main>

      <footer className="bg-slate-950 border-t border-slate-905 py-6 text-center text-[10px] text-slate-500 font-sans">
        {textFooter}
      </footer>
    </div>
  );
}
