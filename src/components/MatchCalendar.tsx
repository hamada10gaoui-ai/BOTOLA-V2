import { useState } from 'react';
import { Match, Team, Referee } from '../types';
import { Language } from '../translations';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, User, Clock, Play } from 'lucide-react';

interface MatchCalendarProps {
  matches: Match[];
  teams: Team[];
  referees: Referee[];
  language: Language;
  isOrganizer: boolean;
  onAddMatchOnDate?: (dateStr: string) => void;
  onManageMatch?: (match: Match) => void;
}

const MONTHS = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
};

const WEEKDAYS = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
};

export default function MatchCalendar({
  matches,
  teams,
  referees,
  language,
  isOrganizer,
  onAddMatchOnDate,
  onManageMatch
}: MatchCalendarProps) {
  // Use May 2026 as initial default since sample matches exist then, or fallback to current date
  const [currentDate, setCurrentDate] = useState(() => {
    // Check if there is any match, if yes, use its year/month
    if (matches.length > 0) {
      const firstMatchDate = new Date(matches[0].date);
      if (!isNaN(firstMatchDate.getTime())) {
        return new Date(firstMatchDate.getFullYear(), firstMatchDate.getMonth(), 1);
      }
    }
    return new Date(2026, 4, 1); // May 2026 default
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => {
    if (matches.length > 0) {
      return matches[0].date;
    }
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days in previous month (for padding)
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Padding cells from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevMonthVal = month === 0 ? 11 : month - 1;
    const prevYearVal = month === 0 ? year - 1 : year;
    const dayNum = daysInPrevMonth - i;
    cells.push({
      dayNum,
      dateStr: `${prevYearVal}-${String(prevMonthVal + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
      isCurrentMonth: false
    });
  }

  // Cells from current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      dayNum: i,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: true
    });
  }

  // Padding cells from next month
  const totalSlots = Math.ceil(cells.length / 7) * 7;
  const remainingSlots = totalSlots - cells.length;
  for (let i = 1; i <= remainingSlots; i++) {
    const nextMonthVal = month === 11 ? 0 : month + 1;
    const nextYearVal = month === 11 ? year + 1 : year;
    cells.push({
      dayNum: i,
      dateStr: `${nextYearVal}-${String(nextMonthVal + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: false
    });
  }

  // Selected date's matches
  const selectedMatches = matches.filter(m => m.date === selectedDateStr);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-6">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-emerald-400" />
          <h3 className="font-extrabold text-white text-base">
            {MONTHS[language][month]} {year}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(2026, 4, 1))}
            className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition font-bold"
          >
            {language === 'ar' ? 'مايو 2026' : 'May 2026'}
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels Grid */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-500 text-[11px]">
        {WEEKDAYS[language].map((day, idx) => (
          <div key={idx} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Monthly Days Cells Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, idx) => {
          const isSelected = selectedDateStr === cell.dateStr;
          const dayMatchesCount = matches.filter(m => m.date === cell.dateStr);
          const hasMatches = dayMatchesCount.length > 0;
          const hasLiveMatch = dayMatchesCount.some(m => m.status === 'live');
          const hasFinishedMatch = dayMatchesCount.every(m => m.status === 'finished') && hasMatches;

          return (
            <button
              key={idx}
              onClick={() => setSelectedDateStr(cell.dateStr)}
              className={`min-h-[64px] p-1.5 flex flex-col justify-between items-start rounded-xl border text-right transition relative overflow-hidden group ${
                !cell.isCurrentMonth
                  ? 'bg-slate-950/20 text-slate-600 border-transparent hover:bg-slate-950/40'
                  : isSelected
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950/60 border-slate-850 hover:border-slate-750 text-slate-300'
              }`}
            >
              {/* Day Number */}
              <span className={`text-xs font-bold font-mono px-1 rounded-md ${
                isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
              }`}>
                {cell.dayNum}
              </span>

              {/* Match Indicator Badges */}
              {hasMatches && (
                <div className="w-full mt-auto space-y-1">
                  {/* Colored indicator pill */}
                  <div className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${
                      hasLiveMatch 
                        ? 'bg-red-500 animate-pulse' 
                        : hasFinishedMatch 
                        ? 'bg-slate-500' 
                        : 'bg-emerald-400'
                    }`} />
                    <span className="text-[9px] text-slate-500 font-bold font-mono">
                      {dayMatchesCount.length} {language === 'ar' ? 'مباريات' : 'Matches'}
                    </span>
                  </div>

                  {/* Micro list of teams in the slot on hover/desktop */}
                  <div className="hidden sm:block truncate text-[9px] text-slate-400 font-medium tracking-tight">
                    {dayMatchesCount.map((m, mIdx) => (
                      <div key={m.id} className="truncate border-t border-slate-850/40 pt-0.5 mt-0.5">
                        {m.homeTeamName.slice(0, 4)} v {m.awayTeamName.slice(0, 4)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Match Details Panel */}
      {selectedDateStr && (
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <div className="text-xs text-slate-400 font-bold">
              📅 {language === 'ar' ? 'مباريات يوم:' : 'Matches on:'} <span className="text-emerald-400 font-mono text-xs">{selectedDateStr}</span>
            </div>
            {isOrganizer && onAddMatchOnDate && (
              <button
                onClick={() => onAddMatchOnDate(selectedDateStr)}
                className="bg-emerald-600/10 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:text-white transition font-black text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                {language === 'ar' ? 'جدولة لقاء اليوم' : 'Schedule on Day'}
              </button>
            )}
          </div>

          {selectedMatches.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 font-semibold">
              {language === 'ar' ? 'لا يوجد مباريات مجدولة في هذا اليوم.' : 'No matches scheduled on this day.'}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedMatches.map(match => (
                <div key={match.id} className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 flex flex-col sm:flex-row gap-3 justify-between items-center transition hover:border-slate-750">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded ${
                      match.status === 'live' ? 'bg-red-500/10 text-red-400 animate-pulse' :
                      match.status === 'finished' ? 'bg-slate-800 text-slate-300' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {match.status === 'live' ? '🔴 مباشر' : match.status === 'finished' ? 'انتهت' : 'مجدولة'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-sans">
                      {match.stage}
                    </span>
                  </div>

                  {/* Main score details */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white max-w-[90px] truncate">{match.homeTeamName}</span>
                    <div className="bg-slate-950 px-2 py-1 rounded text-xs font-black font-mono border border-slate-800">
                      {match.status === 'not_started' ? 'VS' : `${match.scoreHome} - ${match.scoreAway}`}
                    </div>
                    <span className="text-xs font-bold text-white max-w-[90px] truncate">{match.awayTeamName}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {match.time}</span>
                    <span className="flex items-center gap-0.5"><User className="h-3 w-3" /> {match.refereeName || 'غير معين'}</span>
                    
                    {isOrganizer && onManageMatch && (
                      <button
                        onClick={() => onManageMatch(match)}
                        className="bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded hover:bg-emerald-400 transition"
                      >
                        {match.status === 'live' ? 'تحكم مباشر' : 'تعديل'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
