import React, { useState } from 'react';
import { Team, Player, Match } from '../types';
import { Trophy, Calendar, Check, Users, UserPlus, X, ArrowLeft, ArrowRight, Shield, Award, Edit, Trash2 } from 'lucide-react';
import { Language } from '../translations';

interface TeamPortalProps {
  team: Team;
  players: Player[];
  matches: Match[];
  onAddPlayer: (newPlayer: Omit<Player, 'id'>) => void;
  onDeletePlayer: (id: string) => void;
  onBack: () => void;
  language?: Language;
}

export default function TeamPortal({ team, players, matches, onAddPlayer, onDeletePlayer, onBack, language = 'ar' }: TeamPortalProps) {
  const [playerFormOpen, setPlayerFormOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState<number>(10);
  const [playerPosition, setPlayerPosition] = useState<'GK' | 'DF' | 'MF' | 'FW'>('FW');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Delegate authorization states
  const [isManager, setIsManager] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinFormOpen, setPinFormOpen] = useState(false);

  // Filter squad players
  const squad = players.filter(p => p.teamId === team.id);

  // Filter team matches
  const teamMatches = matches.filter(
    m => m.homeTeamId === team.id || m.awayTeamId === team.id
  );

  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert(isAr ? 'الرجاء كتابة اسم اللاعب الثنائي أو الثلاثي.' : isFr ? 'Veuillez saisir le nom complet du joueur.' : 'Please enter the player first and last name.');
      return;
    }

    const hasDuplicate = squad.some(p => p.number === Number(playerNumber));
    if (hasDuplicate) {
      alert(isAr 
        ? `عذراً، رقم القميص (${playerNumber}) مكرر ومحجوز مسبقاً للاعب آخر في فريقك.` 
        : isFr 
        ? `Désolé, le numéro de maillot (${playerNumber}) est déjà attribué à un autre joueur.` 
        : `Sorry, the jersey number (${playerNumber}) is already taken by another player on your team.`
      );
      return;
    }

    onAddPlayer({
      name: playerName.trim(),
      teamId: team.id,
      teamName: team.name,
      number: Number(playerNumber),
      position: playerPosition,
      goals: 0,
      yellowCards: 0,
      redCards: 0
    });

    setPlayerName('');
    setPlayerNumber(prev => (prev + 1) % 99 || 10);
    setPlayerFormOpen(false);
    showToast(isAr ? 'تم تسجيل اللاعب وإضافته لكتيبة الفريق بنجاح! ⚽' : isFr ? 'Le joueur a été inscrit avec succès ! ⚽' : 'Player registered and added to the roster successfully! ⚽');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  // Translations dictionary for inside the team portal
  const textTitle = isAr ? 'بوابة الفريق الرسمية 🛡️' : isFr ? "Portail de l'Équipe 🛡️" : "Official Team Portal 🛡️";
  const textSub = isAr ? 'التحديثات والتشكيل والمعلومات الحية' : isFr ? 'Mises à jour, effectif et scores' : 'Updates, lineup and live scores';
  const textManager = isAr ? 'المندوب ⚡' : isFr ? 'Délégué ⚡' : 'Delegate ⚡';
  const textLoginManager = isAr ? '🔑 دخول المندوب' : isFr ? '🔑 Connexion Délégué' : '🔑 Delegate Login';
  
  const textVerifyTitle = isAr ? 'التحقق من هوية مندوب الفريق' : isFr ? 'Vérification de l\'identité' : 'Verify Delegate Identity';
  const textVerifyDesc = isAr 
    ? 'يرجى إدخال رمز التحقق لمندوب الفريق لتعديل التشكيلة وتسجيل اللاعبين. (الرمز السري الافتراضي: 2026)' 
    : isFr 
    ? "Saisissez le code PIN pour inscrire des joueurs. (PIN par défaut: 2026)" 
    : "Please enter verification PIN code to edit lineup and register players. (Default PIN: 2026)";
  
  const textPinPlaceholder = isAr ? 'أدخل الرمز السري من 4 أرقام' : isFr ? 'PIN à 4 chiffres' : '4-digit PIN';
  const textVerifyBtn = isAr ? 'تحقق' : isFr ? 'Vérifier' : 'Verify';
  const textPinError = isAr ? '⚠️ رمز الدخول السري غير صحيح (الرمز الافتراضي هو 2026).' : isFr ? '⚠️ Code secret de délégué incorrect (par défaut 2026).' : '⚠️ Incorrect passcode (Default is 2026).';
  const textLoginSuccessToast = isAr ? 'تم تسجيل دخول مندوب الفريق وصاحب الصلاحية بنجاح! ⚡' : isFr ? 'Connexion réussie du délégué ! ⚡' : 'Delegate session verified successfully! ⚡';
  
  const textPoints = isAr ? 'النقاط' : isFr ? 'Points' : 'Points';
  const textPointsSuffix = isAr ? 'ن' : isFr ? 'pts' : 'pts';
  const textPlayed = isAr ? 'لعب' : isFr ? 'MJ' : 'Pld';
  const textGoals = isAr ? 'أهداف' : isFr ? 'Buts' : 'Goals';
  const textDiff = isAr ? 'الفارق' : isFr ? 'Diff' : 'Diff';
  
  const h3Squad = isAr ? `كتيبة وتشكيلة اللاعبين الحاليين` : isFr ? `Taille de l'effectifs actuel` : `Current Squad Roster`;
  const btnNewPlayer = isAr ? 'تسجيل لاعب جديد' : isFr ? 'Inscrire un joueur' : 'Register Player';
  const btnModifyLineup = isAr ? '🔑 تعديل التشكيلة' : isFr ? '🔑 Modifier l\'effectif' : '🔑 Edit Lineup';
  
  const formAddPlayerTitle = isAr ? 'تسجيل لاعب وتعميده فوراً في البطولة' : isFr ? 'Inscrire un joueur pour ce tournoi' : 'Inscribe a new player directly';
  const formPlayerNameLabel = isAr ? 'اسم اللاعب الثنائي/الثلاثي *' : isFr ? 'Nom complet du joueur *' : 'Player Full Name *';
  const formPlayerNamePlaceholder = isAr ? 'مثل: عبد الرحمن اليوسف' : isFr ? 'Ex: Jean Dupont' : 'e.g. John Doe';
  const formJerseyLabel = isAr ? 'رقم القميص' : isFr ? 'Numéro de maillot' : 'Jersey Number';
  const formPositionLabel = isAr ? 'مركز اللعب المفضل' : isFr ? 'Poste de prédilection' : 'Preferred Position';
  
  const optFW = isAr ? 'مهاجم (FW)' : isFr ? 'Attaquant (FW)' : 'Forward (FW)';
  const optMF = isAr ? 'لاعب وسط (MF)' : isFr ? 'Milieu (MF)' : 'Midfielder (MF)';
  const optDF = isAr ? 'مدافع (DF)' : isFr ? 'Défenseur (DF)' : 'Defender (DF)';
  const optGK = isAr ? 'حارس مرمى (GK)' : isFr ? 'Gardien (GK)' : 'Goalkeeper (GK)';
  
  const btnSavePlayer = isAr ? `حفظ وضم اللاعب لكتيبة ${team.name} ✓` : isFr ? `Confirmer l'inscription de l'athlète ✓` : `Confirm Player Registration ✓`;
  const textNoPlayersYet = isAr ? 'لم يتم تقييد لاعبين في هذا الفريق بعد.' : isFr ? 'Aucun joueur inscrit dans cette équipe encore.' : 'No players listed in this team yet.';
  
  const textGoalsWord = isAr ? 'هدف' : isFr ? 'buts' : 'goals';
  const alertDeleteConfirm = isAr ? 'هل أنت متأكد من رغبتك في تجميد أو حذف تقييد هذا اللاعب من البطولة؟' : isFr ? 'Êtes-vous sûr de vouloir désinscrire ce joueur ?' : 'Are you sure you want to remove this player from the tournament?';
  const toastDeleted = isAr ? 'تم شطب وتعديل تدوين اللاعب.' : isFr ? 'Inscription du joueur modifiée/supprimée.' : 'Player registration removed.';
  
  const h3Matches = isAr ? 'مباريات وجدول مسابقات الفريق' : isFr ? 'Matchs et calendrier de l\'équipe' : 'Matches and Team Schedule';
  const textNoMatches = isAr ? 'لا يوجد مباريات مجدولة أو مسجلة لهذا الفريق حالياً.' : isFr ? 'Aucun match programmé pour cette équipe.' : 'No matches scheduled or logged for this team.';
  
  const textLive = isAr ? 'مباشر 🔴' : isFr ? 'En direct 🔴' : 'LIVE 🔴';
  const textDraw = isAr ? 'تعادل' : isFr ? 'Nul' : 'Draw';
  const textWin = isAr ? 'فوز ✓' : isFr ? 'Victoire ✓' : 'Win ✓';
  const textLoss = isAr ? 'خسارة' : isFr ? 'Défaite' : 'Loss';
  const textFooterBrand = isAr ? 'بوابة الفرق المدرسية والأهلية كود QR' : isFr ? 'Portail des équipes • Code QR intégré' : 'League Teams Portal • Integrated QR';

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top sticky bar */}
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

          {isManager ? (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              {textManager}
            </span>
          ) : (
            <button 
              onClick={() => setPinFormOpen(true)}
              className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:text-white transition font-bold px-2.5 py-1 rounded-full flex items-center gap-1 pointer cursor-pointer"
            >
              {textLoginManager}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5">
        
        {/* PIN Entry Drawer/Card */}
        {pinFormOpen && !isManager && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3 animate-fade-in text-center">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-amber-400 flex items-center gap-1 pb-1">
                <Shield className="h-4 w-4 text-amber-500" />
                {textVerifyTitle}
              </span>
              <button 
                onClick={() => {
                  setPinFormOpen(false);
                  setPinError(false);
                  setPinInput('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 pb-1 leading-relaxed">
              {textVerifyDesc}
            </p>

            <div className="flex gap-2">
              <input 
                type="password"
                placeholder={textPinPlaceholder}
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className={`flex-1 bg-slate-950 px-3 py-2 text-xs rounded-xl border outline-none text-center font-mono tracking-widest text-slate-100 ${
                  pinError ? 'border-red-500' : 'border-slate-800 focus:border-amber-500'
                }`}
              />
              <button 
                onClick={() => {
                  if (pinInput === '2026') {
                    setIsManager(true);
                    setPinFormOpen(false);
                    setPinInput('');
                    setPinError(false);
                    showToast(textLoginSuccessToast);
                  } else {
                    setPinError(true);
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-xl transition cursor-pointer"
              >
                {textVerifyBtn}
              </button>
            </div>
            {pinError && (
              <p className="text-[9px] text-red-400 font-bold">{textPinError}</p>
            )}
          </div>
        )}

        {/* Real-time feedback Toast */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white text-xs font-bold p-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
            <Check className="h-4 w-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Team Cover Banner Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl -mr-10 -mt-10"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className={`h-14 w-14 rounded-2xl ${team.logoColor} flex items-center justify-center text-3xl text-white shadow`}>
              {team.logoIcon}
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h2 className="text-lg font-black font-display text-white">{team.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {team.schoolClass || (isAr ? 'الفئة العامة' : isFr ? 'Classe Générale' : 'General Class')} • {isAr ? 'مدرسة او مدينة' : isFr ? 'Ville de' : 'City or school'} {team.city || (isAr ? 'العامة' : isFr ? 'Générale' : 'General')}
              </p>
            </div>
          </div>

          {/* Core performance Grid */}
          <div className="grid grid-cols-4 bg-slate-950 border border-slate-850/60 p-3 rounded-xl gap-2 text-center text-xs mt-5">
            <div>
              <span className="text-[10px] text-slate-500 block">{textPoints}</span>
              <span className="text-sm font-black text-emerald-400 mt-1 block font-mono">{team.points} {textPointsSuffix}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{textPlayed}</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block font-mono">{team.played}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{textGoals}</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block font-mono">{team.goalsFor}:{team.goalsAgainst}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{textDiff}</span>
              <span className={`text-sm font-bold mt-1 block font-mono ${team.goalDifference > 0 ? 'text-emerald-400' : team.goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
              </span>
            </div>
          </div>
        </div>

        {/* Squad players Section with quick registration trigger */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
              <h3 className="text-xs font-bold text-white uppercase truncate">{h3Squad} ({squad.length})</h3>
            </div>
            
            {isManager ? (
              <button
                onClick={() => setPlayerFormOpen(!playerFormOpen)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {btnNewPlayer}
              </button>
            ) : (
              <button
                onClick={() => setPinFormOpen(true)}
                className="bg-slate-950 hover:bg-slate-850 text-amber-400 border border-slate-850 text-[10px] font-bold px-2.5 py-1.5 rounded flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <span>{btnModifyLineup}</span>
              </button>
            )}
          </div>

          {/* Fast Player Creation Drawer */}
          {playerFormOpen && (
            <form onSubmit={handleCreatePlayer} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3.5 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-[10px] font-bold text-slate-300">{formAddPlayerTitle}</span>
                <button type="button" onClick={() => setPlayerFormOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 block">{formPlayerNameLabel}</label>
                  <input
                    type="text"
                    required
                    placeholder={formPlayerNamePlaceholder}
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 p-2 text-xs rounded outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block">{formJerseyLabel}</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={playerNumber}
                      onChange={e => setPlayerNumber(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 p-2 text-xs rounded outline-none focus:border-emerald-500 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block">{formPositionLabel}</label>
                    <select
                      value={playerPosition}
                      onChange={e => setPlayerPosition(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 p-2 text-xs rounded outline-none focus:border-emerald-500 text-white"
                    >
                      <option value="FW">{optFW}</option>
                      <option value="MF">{optMF}</option>
                      <option value="DF">{optDF}</option>
                      <option value="GK">{optGK}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 text-xs rounded transition cursor-pointer"
                >
                  {btnSavePlayer}
                </button>
              </div>
            </form>
          )}

          {/* Squad Roster List */}
          {squad.length === 0 ? (
            <p className="text-center py-6 text-slate-500 text-xs text-normal">{textNoPlayersYet}</p>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto pr-0.5 scrollbar-thin">
              {squad.map(player => (
                <div key={player.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-slate-400 text-[11px] font-bold">#{player.number}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{player.name}</span>
                      <span className="text-[9px] text-slate-500 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 font-bold">
                        {player.position === 'FW' ? (isAr ? 'مهاجم' : isFr ? 'Attaquant' : 'FW') : 
                         player.position === 'MF' ? (isAr ? 'وسط' : isFr ? 'Milieu' : 'MF') : 
                         player.position === 'DF' ? (isAr ? 'مدافع' : isFr ? 'Défenseur' : 'DF') : 
                         (isAr ? 'حارس' : isFr ? 'Gardien' : 'GK')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-slate-400">
                    <span className="font-extrabold text-emerald-400">⚽ {player.goals} {textGoalsWord}</span>
                    
                    {isManager && (
                      <button
                        onClick={() => {
                          if (confirm(alertDeleteConfirm)) {
                            onDeletePlayer(player.id);
                            showToast(toastDeleted);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition cursor-pointer"
                        title={isAr ? 'حذف اللاعب' : 'Remove Player'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule & History of Matches */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
            <Calendar className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
            <h3 className="text-xs font-bold text-white uppercase">{h3Matches} ({teamMatches.length})</h3>
          </div>

          {teamMatches.length === 0 ? (
            <p className="text-center py-6 text-slate-500 text-xs">{textNoMatches}</p>
          ) : (
            <div className="space-y-2.5 font-sans">
              {teamMatches.map(match => {
                const isHome = match.homeTeamId === team.id;
                const opponentName = isHome ? match.awayTeamName : match.homeTeamName;
                const isWinner = isHome ? (match.scoreHome > match.scoreAway) : (match.scoreAway > match.scoreHome);
                const isDraw = match.scoreHome === match.scoreAway;
                const scoreStr = isHome ? `${match.scoreHome} - ${match.scoreAway}` : `${match.scoreAway} - ${match.scoreHome}`;
                
                return (
                  <div key={match.id} className="bg-slate-950 p-2.5 border border-slate-850 rounded-xl flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 block font-normal truncate">{match.stage}</span>
                      <span className="font-extrabold text-slate-100 block mt-0.5 truncate">{isAr ? `ضد ${opponentName}` : `vs ${opponentName}`}</span>
                    </div>

                    <div className="shrink-0 text-right">
                      {match.status !== 'not_started' ? (
                        <div className="flex items-center gap-2 font-mono font-black">
                          <span className={`text-[9px] font-sans px-1.5 py-0.5 rounded ${
                            match.status === 'live' ? 'bg-red-500/10 text-red-00 animate-pulse' :
                            isDraw ? 'bg-slate-800 text-slate-400' :
                            isWinner ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {match.status === 'live' ? textLive : isDraw ? textDraw : isWinner ? textWin : textLoss}
                          </span>
                          <span className="text-slate-200">{scoreStr}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400 text-[10px] block">
                          {match.date} | {match.time}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-[10px] text-slate-500 shrink-0">
        {textFooterBrand}
      </footer>
    </div>
  );
}
