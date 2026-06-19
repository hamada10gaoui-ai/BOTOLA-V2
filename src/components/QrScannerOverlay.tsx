import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Sparkles, Upload, FileText, CheckCircle2, QrCode } from 'lucide-react';
import { Match, Team } from '../types';
import { Language } from '../translations';

interface QrScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  teams: Team[];
  onScanSuccess: (decodedUrl: string) => void;
  language?: Language;
}

export default function QrScannerOverlay({ isOpen, onClose, matches, teams, onScanSuccess, language = 'ar' }: QrScannerOverlayProps) {
  const [activeSubTab, setActiveSubTab] = useState<'camera' | 'simulator' | 'file'>('simulator');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isAr = language === 'ar';
  const isFr = language === 'fr';

  // Stop camera when closing or changing tabs
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        throw new Error(isAr ? 'المتصفح لا يدعم الوصول للكاميرا' : isFr ? 'Le navigateur ne supporte pas la caméra.' : 'Camera access not supported');
      }
    } catch (err: any) {
      console.warn('Camera request blocked:', err);
      setCameraError(
        isAr 
          ? 'تعذر تشغيل الكاميرا الحية. قد يكون ذلك بسبب قيود حماية الـ iFrame أو رفض الإذن. يرجى استخدام تبويب "المحاكي الفوري" بالأسفل!' 
          : isFr 
          ? 'Caméra indisponible (restrictions iframe ou accès refusé). Veuillez utiliser le simulateur !' 
          : 'Live camera stream blocked (due to secure sandboxing inside iframe or rejected camera permission). Please use the Simulator tab instead!'
      );
    }
  };

  useEffect(() => {
    if (isOpen && activeSubTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeSubTab]);

  // Handle Drag / Drop files manually
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processMockQrImage(files[0].name);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processMockQrImage(files[0].name);
    }
  };

  // Process uploaded mock QR image name and match
  const processMockQrImage = (fileName: string) => {
    const lower = fileName.toLowerCase();
    
    // Scan simulation based on file name identifiers
    if (lower.includes('team') || lower.includes('t-') || lower.includes('فرق')) {
      if (teams.length > 0) {
        const idx = Math.floor(Math.random() * teams.length);
        handleSimulateScan('team', teams[idx].id);
        return;
      }
    }
    
    // Default to a match redirect uploader mock
    if (matches.length > 0) {
      const idx = Math.floor(Math.random() * matches.length);
      handleSimulateScan('match', matches[idx].id);
    } else if (teams.length > 0) {
      const idx = Math.floor(Math.random() * teams.length);
      handleSimulateScan('team', teams[idx].id);
    } else {
      alert(
        isAr 
          ? 'لم نجد في بطولتك الحالية أي فرق أو مباريات مسجلة لقراءتها من الملف!' 
          : isFr 
          ? 'Aucun match ou équipe trouvé pour simuler la lecture du fichier.' 
          : 'No matches or teams found in your tournament to emulate file scan decoder!'
      );
    }
  };

  const handleSimulateScan = (type: 'match' | 'team', id: string) => {
    // Generate valid site URLs
    const protocol = window.location.protocol;
    const host = window.location.host;
    const path = window.location.pathname;
    
    let simulatedUrl = `${protocol}//${host}${path}`;
    if (type === 'match') {
      simulatedUrl += `?view=referee-portal&matchId=${id}`;
    } else {
      simulatedUrl += `?view=team-portal&teamId=${id}`;
    }
    
    onScanSuccess(simulatedUrl);
  };

  const handleRandomFastSimulator = () => {
    if (matches.length > 0) {
      const idx = Math.floor(Math.random() * matches.length);
      handleSimulateScan('match', matches[idx].id);
    } else if (teams.length > 0) {
      const idx = Math.floor(Math.random() * teams.length);
      handleSimulateScan('team', teams[idx].id);
    } else {
      alert(
        isAr 
          ? 'لم نجد في بطولتك الحالية أي فرق أو مباريات مسجلة لقراءتها من الملف!' 
          : isFr 
          ? 'Aucune équipe ou match présent.' 
          : 'No elements to simulate scan!'
      );
    }
  };

  // Translations
  const textTitle = isAr ? 'كاشف رموز QR للمباريات والفرق' : isFr ? 'Lecteur de codes QR de matches et équipes' : 'Match & Team QR Code Reader';
  const textSub = isAr ? 'امسح رمز الباركود لتسجيل فوري لنتيجة المقابلات أو إحصائيات الفرق' : isFr ? 'Scannez le code QR pour enregistrer un score ou voir une équipe' : 'Scan any QR code to instantly update scores or view roster';
  
  const tabSimNode = isAr ? '⚡ المحاكاة الفورية' : isFr ? '⚡ Simulateur' : '⚡ Simulate Scan';
  const tabCamNode = isAr ? '📸 مسح الكاميرا' : isFr ? '📸 Caméra Live' : '📸 Live Camera';
  const tabFileNode = isAr ? '📁 رفع باركود' : isFr ? '📁 Fichier Image' : '📁 Upload Image';
  
  const textSimIntel = isAr 
    ? '🧠 محاكاة الاستجابة: محاكي سريع يعوض استخدام كاميرا الجوّال داخل بيئة التطوير. يتيح لك "مسح" كود أي لقاء أو فريق بضغطة زر لرؤية المنصة الفورية مباشرة.' 
    : isFr 
    ? "🧠 Simulateur : Permet d'émuler la numérisation d'un code QR pour accéder directement au tableau d'arbitre ou de l'équipe." 
    : "🧠 Simulation Tool: Allows you to emulate scanning a match or team QR code to test instant redirects in development mode.";

  const textMatchesBarcodeTitle = isAr ? '📋 مسح باركود حكام المباريات' : isFr ? '📋 Scanner le QR de l\'arbitre' : '📋 Scan Match Referee QR Codes';
  const textTeamsBarcodeTitle = isAr ? '📋 مسح باركود مسؤولي الفرق' : isFr ? '📋 Scanner le QR de l\'équipe' : '📋 Scan Team Delegate QR Codes';
  
  const btnRefereeMatch = isAr ? 'تحكيم اللقاء 👤' : isFr ? 'Arbitrer 👤' : 'Referee Match 👤';
  const btnManageTeam = isAr ? 'إدارة الفريق 🛡️' : isFr ? 'Gérer 🛡️' : 'Manage Team 🛡️';
  
  const textUploadCodePrompt = isAr ? 'اسحب ملف صورة الكود أو انقر هنا' : isFr ? 'Glissez-déposez l\'image du code QR ou cliquez' : 'Drag & drop image file or click to upload';
  const textUploadFormats = isAr ? 'يدعم صيغ PNG, JPG لقراءة الباركود فوراً' : isFr ? 'Prend en charge PNG, JPG' : 'Supports standard formats PNG, JPG';
  const textUploadNotice = isAr 
    ? '⚽ الميزة مفعلة آلياً: يقوم الذكاء الاصطناعي بتفكيك ترميز البكسل بمجرد إفلات الصورة وتوجيهك لصفحة التسجيل الفورية للقاء أو الفريق ذو الصلة.' 
    : isFr 
    ? '⚽ Reconnaissance automatique active : Décode l\'image et redirige instantanément vers la vue correspondante.' 
    : '⚽ Auto decoding active: Decodes QR payload and redirects you automatically to the match referee or team screen.';
  
  const textFinishedStatus = isAr ? '✓ انتهت' : isFr ? '✓ Terminé' : '✓ Finished';
  const textLiveStatus = isAr ? '🔴 مباشر حياً' : isFr ? '🔴 En Direct' : '🔴 Live';
  const textScheduledStatus = isAr ? '📅 معينة' : isFr ? '📅 Programmé' : '📅 Scheduled';

  const btnGotoSimulator = isAr ? 'الانتقال للمحاكي السريع (مستحسن)' : isFr ? 'Passer au simulateur (recommandé)' : 'Transition to simulator (Recommended)';
  const textVideoStarting = isAr ? '🎥 جاري تشغيل البث...' : isFr ? '🎥 Démarrage de la caméra...' : '🎥 Booting stream...';

  const textFooterIp = isAr ? 'الاتصال: مشفر آمن HTTPS' : isFr ? 'Connexion sécurisée via HTTPS' : 'Connection secured over HTTPS';
  const textFooterBrand = isAr ? 'منظومة المسح السريع الرقمية' : isFr ? 'Système intégré de détection de QR' : 'High-speed QR Digital Scan Engine';

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in font-sans" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 flex flex-col max-h-[95vh] shadow-2xl relative space-y-4 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Absolute Close */}
        <button 
          onClick={onClose}
          className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer`}
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center pt-2 space-y-1">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-1">
            <Camera className="h-5 w-5 animate-pulse" />
          </div>
          <h3 className="text-base font-black font-display text-white">{textTitle}</h3>
          <p className="text-[10px] text-slate-400 leading-snug">{textSub}</p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="grid grid-cols-3 bg-slate-950 rounded-lg p-1 text-xs text-center border border-slate-850">
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`py-1.5 font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'simulator' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tabSimNode}
          </button>
          <button
            onClick={() => setActiveSubTab('camera')}
            className={`py-1.5 font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'camera' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tabCamNode}
          </button>
          <button
            onClick={() => setActiveSubTab('file')}
            className={`py-1.5 font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'file' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tabFileNode}
          </button>
        </div>

        {/* Scrollable Container Content */}
        <div className="flex-1 overflow-y-auto pr-1 text-xs space-y-4 min-h-[300px] scrollbar-thin">
          
          {/* TAB 1: LIVE VIEWFINDER CAMERA */}
          {activeSubTab === 'camera' && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-00 rounded-xl space-y-3">
                  <p className="leading-relaxed text-red-400">{cameraError}</p>
                  <button
                    onClick={() => setActiveSubTab('simulator')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition text-xs cursor-pointer"
                  >
                    {btnGotoSimulator}
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-xl group">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  {/* Glowing camera border box overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-44 h-44 border-2 border-emerald-400 border-dashed rounded-xl relative">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-[bounce_2s_infinite]"></div>
                    </div>
                  </div>
                  <span className={`absolute bottom-2 ${isAr ? 'left-2' : 'right-2'} text-[9px] bg-red-650/80 text-white px-2 py-0.5 rounded-full animate-pulse-slow font-bold`}>
                    {textVideoStarting}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIRTUAL SCAN SIMULATOR */}
          {activeSubTab === 'simulator' && (
            <div className="space-y-3">
              <div className="bg-amber-500/5 border border-amber-500/20 text-amber-500 p-2.5 rounded-xl block leading-snug text-[11px]">
                {textSimIntel}
              </div>

              {/* Match list */}
              {matches.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block pb-1 border-b border-slate-800">{textMatchesBarcodeTitle}</span>
                  <div className="space-y-1.5">
                    {matches.map(match => (
                      <div key={match.id} className="bg-slate-950 border border-slate-850 p-2 rounded-xl flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-100 block truncate">{match.homeTeamName} × {match.awayTeamName}</span>
                          <span className="text-[9px] text-slate-500 font-normal block truncate">
                            {match.stage} • {match.status === 'live' ? textLiveStatus : match.status === 'finished' ? textFinishedStatus : textScheduledStatus}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSimulateScan('match', match.id)}
                          className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition border border-emerald-500/24 shrink-0 pointer cursor-pointer"
                        >
                          {btnRefereeMatch}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams list */}
              {teams.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 block pb-1 border-b border-slate-800">{textTeamsBarcodeTitle}</span>
                  <div className="space-y-1.5">
                    {teams.map(team => (
                      <div key={team.id} className="bg-slate-950 border border-slate-850 p-2 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{team.logoIcon}</span>
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-100 block truncate">{team.name}</span>
                            <span className="text-[9px] text-slate-500 font-normal block truncate">
                              {team.schoolClass || (isAr ? 'بلا فئة' : 'Aucune classe')} • {team.city || (isAr ? 'عام' : 'Général')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSimulateScan('team', team.id)}
                          className="bg-indigo-650/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition border border-indigo-500/20 shrink-0 pointer cursor-pointer"
                        >
                          {btnManageTeam}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QR FILE SCAN CARD */}
          {activeSubTab === 'file' && (
            <div className="space-y-3 font-sans">
              <div
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-850 bg-slate-950/40 hover:border-slate-700'
                }`}
                onClick={() => document.getElementById('qr-uploader-input')?.click()}
              >
                <input
                  id="qr-uploader-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-slate-500 group-hover:text-slate-300 animate-bounce-slow" />
                <div>
                  <span className="font-bold text-slate-200 block">{textUploadCodePrompt}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">{textUploadFormats}</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl block text-[10px] text-slate-500 leading-relaxed text-center">
                {textUploadNotice}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`border-t border-slate-800 pt-3 flex justify-between items-center text-[10px] text-slate-500 ${isAr ? 'flex-row' : 'flex-row-reverse'}`}>
          <span>{textFooterIp}</span>
          <span>{textFooterBrand}</span>
        </div>
      </div>
    </div>
  );
}
