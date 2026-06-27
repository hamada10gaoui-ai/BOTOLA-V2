export type Language = 'ar' | 'en' | 'fr';

export interface TranslationDict {
  appName: string;
  appSubtitle: string;
  pro: string;
  welcomeTitle: string;
  welcomeDesc: string;
  welcomeFeatDraw: string;
  welcomeFeatLive: string;
  welcomeFeatStats: string;
  organizerExit: string;
  organizerLogin: string;
  liveBadge: string;
  publicViewBtn: string;
  qrScanBtn: string;
  resetBtn: string;
  tabDashboard: string;
  tabTeams: string;
  tabPlayers: string;
  tabReferees: string;
  tabMatches: string;
  tabDraw: string;
  tabMySQL: string;
  
  viewerModeTitle: string;
  viewerModeDesc: string;
  organizerModeTitle: string;
  organizerModeDesc: string;
  organizerLabel: string;
  
  multiTourName: string;
  activeTourLabel: string;
  selectTourLabel: string;
  newTourBtn: string;
  tourDirector: string;
  tourTeams: string;
  teamsParticipating: string;
  scheduledMatches: string;
  scheduledMatchesLabel: string;
  editTourName: string;
  tourSupervisor: string;
  deleteTourBtn: string;
  
  selectLang: string;
  arabic: string;
  english: string;
  french: string;

  // New Tournament Modal
  createTourTitle: string;
  newTourNameLabel: string;
  newTourNamePlaceholder: string;
  newTourOrganizerLabel: string;
  newTourOrganizerPlaceholder: string;
  newTourNotice: string;
  cancel: string;
  createAndStart: string;

  // Tabs translation
  dashboardStats: string;
  totalTeams: string;
  totalPlayers: string;
  totalReferees: string;
  matchesPlayed: string;
  liveMatches: string;
  goalsScored: string;
  yellowCards: string;
  redCards: string;
  
  standingsTable: string;
  rank: string;
  team: string;
  played: string;
  points: string;
  won: string;
  drawn: string;
  lost: string;
  goals: string;
  diff: string;
  classGroup: string;
  city: string;

  topScorers: string;
  player: string;
  position: string;
  
  // Dashboard events
  latestLogs: string;
  addLogBtn: string;
  noLogsYet: string;
  
  // Teams Tab
  addNewTeam: string;
  searchTeam: string;
  teamName: string;
  actions: string;
  noTeams: string;
  teamFormAdd: string;
  teamFormEdit: string;
  placeholderTeamName: string;
  placeholderTeamClass: string;
  placeholderTeamCity: string;
  save: string;
  
  // Players Tab
  addNewPlayer: string;
  searchPlayer: string;
  playerName: string;
  jerseyNumber: string;
  playerPosition: string;
  gk: string;
  df: string;
  mf: string;
  fw: string;
  allTeamsFilter: string;
  allPositionsFilter: string;

  // Referees Tab
  addNewReferee: string;
  refereeName: string;
  refereePhone: string;
  refereeRole: string;
  refMain: string;
  refAssistant: string;
  refFourth: string;

  // Matches Tab
  scheduleTitle: string;
  matchDate: string;
  matchTime: string;
  matchStatus: string;
  statusNotStarted: string;
  statusLive: string;
  statusFinished: string;
  addManualMatch: string;
  vs: string;
  score: string;
  eventsCount: string;
  deleteMatchConfirm: string;

  // Live simulation alert / wizard
  simulationAlert: string;
  runSimulationBtn: string;

  // Draw Magic tab
  drawWizardTitle: string;
  drawWizardDesc: string;
  drawTypeLabel: string;
  leagueSystem: string;
  leagueSystemDesc: string;
  knockoutSystem: string;
  knockoutSystemDesc: string;
  groupsSystem: string;
  groupsSystemDesc: string;
  groupStage: string;
  groupStageLabel: string;
  participatingTeamsSelection: string;
  selectAll: string;
  deselectAll: string;
  participating: string;
  excluded: string;
  drawNotice: string;
  runDrawBtn: string;
  drawDisclaimer: string;
  qrServiceBadge: string;
  qrTitle: string;
  qrDescription: string;
  copyPublicLink: string;
  openPublicView: string;
  scanMobile: string;
  spectatorNote: string;
  topFiveStandings: string;
  viewAllTeams: string;
  noGoalsScoredYet: string;
  goalsCountWord: string;
  ofWord: string;
  registerBtn: string;
  registerModalTitle: string;
  registerModalSub: string;
  fullNameLabel: string;
  emailLabel: string;
  selectRoleLabel: string;
  spectatorRole: string;
  spectatorDesc: string;
  organizerRole: string;
  organizerDesc: string;
  favTeamLabel: string;
  noFavTeam: string;
  organizerPinPass: string;
  submitRegister: string;
  profileTitle: string;
  registeredAs: string;
  unregistered: string;
  predictionsTitle: string;
  predictPrompt: string;
  homeWins: string;
  awayWins: string;
  draw: string;
  voteSuccess: string;
  cheerBtn: string;
  cheeredTo: string;
  votesCount: string;
  votedForMatch: string;
  authModeRegister: string;
  authModeLogin: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginErrorNotFound: string;
  registerErrorExists: string;
  loginSuccessMsg: string;
  downloadCenterTitle: string;
  downloadCenterDesc: string;
  downloadTeamsCsvBtn: string;
  downloadMatchesCsvBtn: string;
  downloadPlayersCsvBtn: string;
  downloadFullHtmlReportBtn: string;
}

export const translations: Record<Language, TranslationDict> = {
  ar: {
    appName: 'منصة إدارة البطولات',
    appSubtitle: 'المنصة الذكية للمسابقات المحلية والمدرسية',
    pro: 'برو',
    welcomeTitle: 'مرحباً بك في منصة إدارة البطولات الذكية! 🏆',
    welcomeDesc: 'المنصة المتكاملة لتنظيم وإدارة ومتابعة الدوريات والمسابقات الرياضية المحلية والمدرسية. نوفر لك أدوات ذكية لتوليد جداول المباريات تلقائياً، إجراء القرعة السحرية، وبث النتائج مباشرة للجمهور واللاعبين عبر كود QR وبلمحة بصر.',
    welcomeFeatDraw: 'سحب القرعة وجدولة المباريات التلقائية بنقرة واحدة ⚡',
    welcomeFeatLive: 'بث فوري مباشر للنتائج والأحداث والترتيب عبر كود الـ QR 📱',
    welcomeFeatStats: 'إحصائيات دقيقة وشاملة للفرق، الهدافين، والإنذارات 📊',
    organizerExit: 'خروج المنظم 🚪 (تأمين النظام)',
    organizerLogin: 'دخول كمنظم للبطولة 🔐 (الرمز: 2026)',
    liveBadge: 'بث مباشر',
    publicViewBtn: 'معاينة واجهة الجمهور 📱',
    qrScanBtn: 'مسح بالـ QR 📸',
    resetBtn: 'إعادة تصفير البيانات',
    tabDashboard: 'الرئيسية',
    tabTeams: 'الفرق',
    tabPlayers: 'اللاعبين',
    tabReferees: 'الحكام',
    tabMatches: 'المباريات',
    tabDraw: 'سحب القرعة السحرية ✨',
    tabMySQL: 'قاعدة بيانات MySQL 🗄️',
    
    viewerModeTitle: 'وضع الزائر والمشاهد المباشر (للقراءة فقط)',
    viewerModeDesc: 'أنت الآن في وضع متابعة النتائج والترتيب وإحصائيات الهدافين العامة حياً دون تعديل. إذا لم تكن زائرًا وكان لك صلاحيات تعديل وجدولة البطولة، فيرجى تفعيل وضع المنظم.',
    organizerModeTitle: 'وضع منظم البطولة مفعّل بالكامل',
    organizerModeDesc: 'لديك الآن كامل صلاحيات التحكم وسحب القرعة، وإضافة وتعديل بيانات الفرق واللاعبين، وإدخال نتائج المباريات والحدث الفوري.',
    organizerLabel: 'اسم المنظم المسؤول عن هذه البطولة:',
    
    multiTourName: 'نظام إدارة البطولات المتعددة النشط 🏆',
    activeTourLabel: 'البطولة النشطة حالياً:',
    selectTourLabel: 'عرض وتحديد البطولة:',
    newTourBtn: 'بطولة جديدة 🚀',
    tourDirector: 'مدير هذه البطولة:',
    tourTeams: 'الفرق المشاركة:',
    teamsParticipating: 'فريقاً مشاركاً في القرعة',
    scheduledMatches: 'جدول المباريات والمواجهات الكروية:',
    scheduledMatchesLabel: 'مواجهة مجدولة حالياً',
    editTourName: 'تعديل اسم البطولة الحالية:',
    tourSupervisor: 'مشرف البطولة:',
    deleteTourBtn: 'حذف البطولة 🗑️',
    
    selectLang: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    french: 'Français',

    createTourTitle: 'تأسيس بطولة جديدة',
    newTourNameLabel: 'اسم البطولة الجديدة *',
    newTourNamePlaceholder: 'مثال: دوري الفصول للكرة - الفصل الثاني',
    newTourOrganizerLabel: 'اسم المنظم / المشرف المسؤول *',
    newTourOrganizerPlaceholder: 'مثال: أ. أحمد الحربي',
    newTourNotice: 'سيتم إنشاء هذه البطولة بطاقم فارغ من المواجهات (غير مجدولة)، ومفعّل فيها كافة الفرق الحالية بشكل تلقائي. يمكنك تعديل واستبعاد الفرق التي لا تود مشاركتها من تبويب "القرعة" قبل إجراء السحب التلقائي.',
    cancel: 'إلغاء',
    createAndStart: 'تأسيس البطولة والبدء 🚀',

    dashboardStats: 'إحصائيات البطولة ومؤشرات الأداء الرياضي العامة',
    totalTeams: 'إجمالي الفرق المسجلة',
    totalPlayers: 'اللاعبين المقيدين',
    totalReferees: 'الحكام المعتمدين',
    matchesPlayed: 'المباريات الملعوبة',
    liveMatches: 'مباريات تجري حالياً',
    goalsScored: 'إجمالي الأهداف المسجلة',
    yellowCards: 'الإنذارات الصفراء',
    redCards: 'الكروت الحمراء المباشرة',
    
    standingsTable: 'جدول ترتيب الفرق الإجمالي للبطولة الحالية',
    rank: 'م',
    team: 'الفريق',
    played: 'لعب',
    points: 'نقاط',
    won: 'فاز',
    drawn: 'تعادل',
    lost: 'خسر',
    goals: 'له/عليه',
    diff: 'الفرق',
    classGroup: 'الفئة/الصف',
    city: 'المدينة',

    topScorers: 'جدول قائمة الهدافين وحساب الكرات الذهبية',
    player: 'اللاعب',
    position: 'المركز',
    
    latestLogs: 'شريط الأحداث المكتوبة وإعلانات المنظم الرسمية',
    addLogBtn: 'إضافة إعلان أو حدث مكتوب للجمهور 📢',
    noLogsYet: 'لا توجد أحداث عامة أو منشورات مكتوبة في شريط الأخبار حتى الآن.',
    
    addNewTeam: 'إضافة فريق جديد 🛡️',
    searchTeam: 'البحث عن فرقة معينة بمسماها أو الصف...',
    teamName: 'اسم الفريق',
    actions: 'العمليات والتعديل',
    noTeams: 'لم يتم العثور على أي فريق مسجل في بطولة هذا الموسم.',
    teamFormAdd: 'تسجيل فريق رياضي جديد بالبطولة',
    teamFormEdit: 'تعديل بيانات وإعدادات الفريق الحالية',
    placeholderTeamName: 'مثال: مدريد ب، نمور البرشا، الرياض، إلخ...',
    placeholderTeamClass: 'مثال: الصف الثالث المتوسط / فئة الناشئين',
    placeholderTeamCity: 'مثال: الرياض، جدة، الدمام، إلخ...',
    save: 'حفظ التعديلات والبيانات',
    
    addNewPlayer: 'قيد لاعب جديد بالمنصة 🏃‍♂️',
    searchPlayer: 'البحث بـاسم اللاعب أو رقم القميص...',
    playerName: 'اسم اللاعب الثلاثي الكروي',
    jerseyNumber: 'رقم القميص',
    playerPosition: 'مركز اللعب المعتمد',
    gk: 'حارس مرمى (GK)',
    df: 'مدافع (DF)',
    mf: 'وسط (MF)',
    fw: 'مهاجم (FW)',
    allTeamsFilter: 'جميع الفرق المسجلة',
    allPositionsFilter: 'جميع المراكز الكروية',

    addNewReferee: 'تسجيل حكم معتمد ومصنف 🏁',
    refereeName: 'اسم الحكم المعتمد الكروي',
    refereePhone: 'رقم الهاتف للمتابعة والتحكيم',
    refereeRole: 'مستوى التصنيف والدور والتحكيم المساعد',
    refMain: 'حكم ساحة معتمد أول',
    refAssistant: 'حكم راية ومساعد خط أول',
    refFourth: 'حكم رابع بديل ومراقب طاولة',

    scheduleTitle: 'جدول المباريات والقرعة الزمنية المجدولة للبطولة',
    matchDate: 'تاريخ إقامة المباراة',
    matchTime: 'توقيت ركلة البداية',
    matchStatus: 'حالة اللقاء',
    statusNotStarted: 'المباراة لم تبدأ بعد',
    statusLive: 'المواجهة جارية حياً الآن ⚽',
    statusFinished: 'انتهت كاملة بصفارة الحكم ✅',
    addManualMatch: 'إضافة مباراة يدوية للجدول 📅',
    vs: 'ضد',
    score: 'النتيجة',
    eventsCount: 'أحداث',
    deleteMatchConfirm: 'هل أنت متأكد من حذف هذه المباراة من جدول ومنافسات البطولة؟',

    simulationAlert: 'تنبيه: محاكاة المباريات تلقائياً تولد أحداث وأهداف عشوائية للمرح والتجربة وتنهي اللقاءات بنشاط وحماس!',
    runSimulationBtn: 'تشغيل محاكاة اللعب المباشر السريع 🕹️',

    drawWizardTitle: 'معالج سحب القرعة الرياضية السحرية وتوليد الجدولة 🔮',
    drawWizardDesc: 'قم بتوليد جدول المباريات فوراً وبشكل عشوائي بنظام الكأس أو الدوري لمجموعة الفرق المسجلة.',
    drawTypeLabel: 'اختر نوع ونظام القرعة المعتمد:',
    leagueSystem: 'نظام الدوري العام الكامل (الكل ضد الكل)',
    leagueSystemDesc: 'يلعب كل فريق ضد كل الفرق الأخرى مرتين أو مواجهات متبادلة، ويحصل الفائز على 3 نقاط.',
    knockoutSystem: 'نظام الكأس الإقصائي (خروج المغلوب)',
    knockoutSystemDesc: 'قرعة إقصائية مباشرة من خروج المغلوب فوراً. مواجهات ثنائية، ويتأهل الفائز للدور التالي.',
    groupsSystem: 'نظام المجموعات (تقسيم الفرق ومجموعات دوري)',
    groupsSystemDesc: 'يتم تقسيم الفرق المشاركة تلقائياً إلى مجموعات متوازنة (أ، ب، ج، د)، ويلعب كل فريق ضد فرق مجموعته بنظام الدوري لتحديد متصدري المجموعات.',
    groupStage: 'المجموعة',
    groupStageLabel: 'دور المجموعات',
    participatingTeamsSelection: 'تحديد الفرق المشاركة في هذه البطولة',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء الكل',
    participating: 'مشارك ✅',
    excluded: 'مستبعد ❌',
    drawNotice: 'تنبيه: توليد قرعة جديدة مجدولة سيؤدي لتصفير سجلات المباريات القديمة في قواعد الذاكرة المحلية والبدء نظيفاً.',
    runDrawBtn: 'إجراء القرعة العشوائية وبدء البطولة مجدداً ⚡',
    drawDisclaimer: 'يقوم التطبيق الفوري بربط المواجهات وجدولتها فورياً في التاب السابق.',
    qrServiceBadge: 'خدمة البث الفوري للنتائج ⚡',
    qrTitle: 'متابعة البطولة مباشرة وبثوانٍ معدودة عبر كود QR!',
    qrDescription: 'يقوم هذا التطبيق بإنشاء صفحة مخصصة للجمهور واللاعبين. بمجرد توجيه كاميرا الهاتف نحو الـ QR Code، سيتمكن المتابعون من رؤية التحديثات التي تجريها للنتائج والأهداف فوراً دون الحاجة لتسجيل دخول أو لوحة تحكم.',
    copyPublicLink: 'نسخ الرابط المباشر للجمهور',
    openPublicView: 'فتح واجهة الجمهور هنا',
    scanMobile: 'امسح الكود بهاتف جوال',
    spectatorNote: 'لعرض نتائج البطولة على أجهزة المشاهدين',
    topFiveStandings: 'جدول الصدارة الحالي للفرق',
    viewAllTeams: 'تفاصيل الفرق',
    noGoalsScoredYet: 'لم يتم إحراز أهداف بعد.',
    goalsCountWord: 'أهداف',
    ofWord: 'من',
    registerBtn: 'إنشاء حساب / تسجيل الدخول 👤',
    registerModalTitle: 'التسجيل في منصة البطولات 🏆',
    registerModalSub: 'سجل الآن لتخصيص تجربتك كمشاهد مباشر أو تفعيل صلاحيات المنظم.',
    fullNameLabel: 'الاسم بالكامل:',
    emailLabel: 'البريد الإلكتروني (اختياري):',
    selectRoleLabel: 'اختر نوع الحساب / الدور:',
    spectatorRole: '📣 مشاهد مباشر للنتائج ومتابع',
    spectatorDesc: 'الحساب المثالي للجمهور واللاعبين. تصفح الإحصائيات، شجّع فريقك المفضل، صوّت لرجل المباراة، وتوقع الفائز!',
    organizerRole: '🔑 منظم بطولة ومسؤول عام',
    organizerDesc: 'حساب المنظمين والمسؤولين. يتطلب إدخال الرمز السري للبطولة لتعديل النتائج والفرق وسحب القرعة.',
    favTeamLabel: 'فريقك المفضل لتشجيعه:',
    noFavTeam: '-- لا يوجد فريق محدد حالياً --',
    organizerPinPass: 'رمز المرور للبطولة (PIN) لإثبات الصلاحية:',
    submitRegister: 'تأكيد التسجيل والدخول ✨',
    profileTitle: 'الملف الشخصي للمستخدم 👤',
    registeredAs: 'مسجل بصيغة:',
    unregistered: 'غير مسجل',
    predictionsTitle: 'توقعات المباريات الخاصة بك 🔮',
    predictPrompt: 'توقع الفائز بمجرد التسجيل كمشاهد!',
    homeWins: 'فوز {team}',
    awayWins: 'فوز {team}',
    draw: 'تعادل',
    voteSuccess: 'تم تسجيل صوتك/توقعك بنجاح! 🎉',
    cheerBtn: 'شحذ المعنويات 📣',
    cheeredTo: 'لقد قمت بتشجيع فريق {team}! 📣🔥',
    votesCount: 'نسبة التوقعات للجماهير:',
    votedForMatch: 'توقعك: {prediction}',
    authModeRegister: '📝 إنشاء حساب جديد',
    authModeLogin: '🔐 تسجيل دخول لحساب ساب',
    passwordLabel: 'الرمز السري الخاص بك (الباسورد لحماية حسابك):',
    passwordPlaceholder: 'اكتب رمزاً سرياً مخصصاً لك فقط...',
    loginErrorNotFound: 'اسم المستخدم غير متواجد، أو الرمز السري الخاص بك غير صحيح أو مكرر!',
    registerErrorExists: 'اسم المستخدم الرياضي هذا مسجل محلياً بالفعل! الرجاء إدخال الرمز السري المطابق له لتسجيل الدخول، أو اختر اسماً فريداً آخر.',
    loginSuccessMsg: 'مرحباً بعبقرية كرتك! تم التحقق وتأكيد دخولك السري بنجاح.',
    downloadCenterTitle: 'مركز تحميل التقارير والإحصائيات 📊',
    downloadCenterDesc: 'تصدير كامل بيانات البطولة الحالية مباشرة بصيغة Excel/CSV أو تحميل تقرير ورقي تفاعلي كامل قابل للطباعة والحفظ بصيغة PDF.',
    downloadTeamsCsvBtn: 'تحميل ترتيب الفرق (CSV)',
    downloadMatchesCsvBtn: 'تحميل نتائج ومواعيد المباريات (CSV)',
    downloadPlayersCsvBtn: 'تحميل قائمة الهدافين والإحصائيات (CSV)',
    downloadFullHtmlReportBtn: 'تحميل التقرير الورقي الشامل للبطولة (HTML / PDF)'
  },
  en: {
    appName: 'Tournament Hub',
    appSubtitle: 'Interactive platform for local and school sports leagues',
    pro: 'PRO',
    welcomeTitle: 'Welcome to the Smart Tournament Hub! 🏆',
    welcomeDesc: 'The ultimate platform to organize, manage, and track local & school league championships in real-time. We provide smart tools for automated match scheduling, magic draws, and broadcasting live results directly to fans and players via simple QR codes.',
    welcomeFeatDraw: 'Automated match scheduling and magic tournament draws ⚡',
    welcomeFeatLive: 'Live result streaming, standings & event feeds via easy QR 📱',
    welcomeFeatStats: 'Comprehensive tracking for squads, top goalscorers & cards 📊',
    organizerExit: 'Locks Panel 🚪',
    organizerLogin: 'Access Organizer Mode 🔐 (PIN: 2026)',
    liveBadge: 'LIVE BROADCAST',
    publicViewBtn: 'View Public Screen 📱',
    qrScanBtn: 'Scan QR 📸',
    resetBtn: 'Reset All Data',
    tabDashboard: 'Dashboard',
    tabTeams: 'Teams',
    tabPlayers: 'Players',
    tabReferees: 'Referees',
    tabMatches: 'Matches',
    tabDraw: 'Magic Draw Magic 🔮',
    tabMySQL: 'MySQL Database 🗄️',
    
    viewerModeTitle: 'Spectator View (Read-Only Mode)',
    viewerModeDesc: 'You are currently observing the results, standings and top scorer tables live in read-only mode. If you are authorized to edit and schedule the tournament, please activate Organizer mode.',
    organizerModeTitle: 'Organizer Mode Activated',
    organizerModeDesc: 'You have granted full permission to run draws, add/edit teams and players, edit live scores and manage match events.',
    organizerLabel: 'Organizer in charge of this tournament:',
    
    multiTourName: 'Multi-Tournament Management System 🏆',
    activeTourLabel: 'Current Active Tournament:',
    selectTourLabel: 'Select Tournament to View & Manage:',
    newTourBtn: 'New Tournament 🚀',
    tourDirector: 'Tournament Director:',
    tourTeams: 'Participating Teams:',
    teamsParticipating: 'teams registered in the draw',
    scheduledMatches: 'Scheduled Football Fixtures:',
    scheduledMatchesLabel: 'active fixtures scheduled',
    editTourName: 'Edit Current Tournament Name:',
    tourSupervisor: 'Tournament Supervisor:',
    deleteTourBtn: 'Delete Tournament 🗑️',
    
    selectLang: 'Language',
    arabic: 'Arabic (العربية)',
    english: 'English',
    french: 'French (Français)',

    createTourTitle: 'Create New Tournament',
    newTourNameLabel: 'Tournament Name *',
    newTourNamePlaceholder: 'e.g., Football Class Cup - Spring Semesters',
    newTourOrganizerLabel: 'Organizer Name *',
    newTourOrganizerPlaceholder: 'e.g., Prof. Alex Smith',
    newTourNotice: 'This tournament will be initialized with no assigned matches. All currently registered teams are included by default; you can toggle individual team participation from the "Draw" tab before running the draw.',
    cancel: 'Cancel',
    createAndStart: 'Initialize Tournament 🚀',

    dashboardStats: 'Overall Tournament Statistics & KPI Metrics',
    totalTeams: 'Total Teams Listed',
    totalPlayers: 'Registered Players',
    totalReferees: 'Certified Referees',
    matchesPlayed: 'Matches Played',
    liveMatches: 'Active Matches Happening Now',
    goalsScored: 'Total Goals Logged',
    yellowCards: 'Yellow Cards Issued',
    redCards: 'Straight Red Cards',
    
    standingsTable: 'Tournament League Standings Table',
    rank: 'Pos',
    team: 'Team',
    played: 'Pld',
    points: 'Pts',
    won: 'W',
    drawn: 'D',
    lost: 'L',
    goals: 'G (F/A)',
    diff: 'GD',
    classGroup: 'Class/Category',
    city: 'City',

    topScorers: 'Top Scorers Leaderboard',
    player: 'Player',
    position: 'Position',
    
    latestLogs: 'Bulletin Feed & Official Announcements',
    addLogBtn: 'Post Announcement 📢',
    noLogsYet: 'No bulletin announcements have been posted yet.',
    
    addNewTeam: 'Add New Team 🛡️',
    searchTeam: 'Search teams by name, class, division or group...',
    teamName: 'Team Name',
    actions: 'Actions & Edits',
    noTeams: 'No registered teams found for this tournament.',
    teamFormAdd: 'Register New Sports Team',
    teamFormEdit: 'Edit Team Bio & Configurations',
    placeholderTeamName: 'e.g., Real Madrid B, Tigers FC, Dallas FC...',
    placeholderTeamClass: 'e.g., Grade 10 / Youth Division',
    placeholderTeamCity: 'e.g., London, Paris, New York...',
    save: 'Save Changes',
    
    addNewPlayer: 'Register New Player 跑',
    searchPlayer: 'Search by player name or shirt number...',
    playerName: 'Player Full Name',
    jerseyNumber: 'Jersey Number',
    playerPosition: 'Position',
    gk: 'Goalkeeper (GK)',
    df: 'Defender (DF)',
    mf: 'Midfielder (MF)',
    fw: 'Forward (FW)',
    allTeamsFilter: 'All Team Rosters',
    allPositionsFilter: 'All Play Styles',

    addNewReferee: 'Register Official Referee 🏁',
    refereeName: 'Referee Name',
    refereePhone: 'Contact Number / Phone',
    refereeRole: 'Referee Classification Level',
    refMain: 'Main Field Referee',
    refAssistant: 'Lineman / Assistant 1st',
    refFourth: 'Fourth Official / Monitor',

    scheduleTitle: 'Tournament Match Schedule & General Fixtures',
    matchDate: 'Event Date',
    matchTime: 'Kick-off Time',
    matchStatus: 'Match State',
    statusNotStarted: 'Fixture Scheduled (Not Started)',
    statusLive: 'Game Active Currently ⚽',
    statusFinished: 'Match Concluded Successfully ✅',
    addManualMatch: 'Add Custom Fixture 📅',
    vs: 'vs',
    score: 'Scoreline',
    eventsCount: 'Events',
    deleteMatchConfirm: 'Are you sure you want to permanently delete this match from the schedule?',

    simulationAlert: 'Note: Simulating match days automatically produces randomized events and goals for stress/mock testing!',
    runSimulationBtn: 'Run Instant Match Day Simulation 🕹️',

    drawWizardTitle: 'Tournament Matchmaker & Magic Draw Wizard 🔮',
    drawWizardDesc: 'Generate a symmetrical bracket or league scheduling matrix immediately and dynamically for the selected squads.',
    drawTypeLabel: 'Select Tournament Competition System:',
    leagueSystem: 'Round Robin (League Format - All Play All)',
    leagueSystemDesc: 'Each team plays every other team once or twice. The leader on points wins the championship (W: 3pts, D: 1pt).',
    knockoutSystem: 'Single Elimination (Knockout Bracket System)',
    knockoutSystemDesc: 'Standard cup style bracket. Loser is excluded immediately, winner progresses to the next qualifying stage.',
    groupsSystem: 'Group Stage System (Division Round-Robin)',
    groupsSystemDesc: 'Teams are automatically distributed into balanced groups (Group A, B, C, etc.). Each group plays a round-robin format to determine standings.',
    groupStage: 'Group',
    groupStageLabel: 'Group Stage',
    participatingTeamsSelection: 'Select Teams Allowed to Participate in This Draw:',
    selectAll: 'Select All',
    deselectAll: 'Clear All Selection',
    participating: 'Participating ✅',
    excluded: 'Excluded ❌',
    drawNotice: 'Warning: Generating a new draw schedule deletes the existing active matches record and replaces it cleanly.',
    runDrawBtn: 'Perform Magic Draw & Restart Matches ⚡',
    drawDisclaimer: 'Matches will be structured dynamically and appear in the "Matches" schedule matrix tab instantly.',
    qrServiceBadge: 'Instant Broadcast Service ⚡',
    qrTitle: 'Follow scores live with a simple QR Code scan!',
    qrDescription: 'This application deploys a unique layout for spectators and players. Simply scan the QR code to watch match updates, live standings, and stats with no logging or passwords needed.',
    copyPublicLink: 'Copy Live Fan Link',
    openPublicView: 'Open Fan Interface Here',
    scanMobile: 'Scan with mobile camera',
    spectatorNote: 'To monitor the league live on mobile devices',
    topFiveStandings: 'Current League Standings',
    viewAllTeams: 'Detailed Standings',
    noGoalsScoredYet: 'No goals recorded yet.',
    goalsCountWord: 'goals',
    ofWord: 'of',
    registerBtn: 'Sign In / Register 👤',
    registerModalTitle: 'Register on Tournament Hub 🏆',
    registerModalSub: 'Sign up now to customize your live spectator experience or activate organizer rights.',
    fullNameLabel: 'Full Name:',
    emailLabel: 'Email Address (Optional):',
    selectRoleLabel: 'Choose Account Role / Type:',
    spectatorRole: '📣 Live Results Spectator',
    spectatorDesc: 'Perfect account for fans and players. Browse stats, support your favorite team, vote for Man of the Match, and predict winners!',
    organizerRole: '🔑 Tournament Organizer / Staff',
    organizerDesc: 'For tournament staff. Requires entering the tournament PIN code to modify scores, manage squads, and start draws.',
    favTeamLabel: 'Your Favorite Team to Support:',
    noFavTeam: '-- No favorite team --',
    organizerPinPass: 'Tournament PIN Code for Verification:',
    submitRegister: 'Confirm & Sign In ✨',
    profileTitle: 'User Profile 👤',
    registeredAs: 'Registered as:',
    unregistered: 'Not registered',
    predictionsTitle: 'Your Match Predictions 🔮',
    predictPrompt: 'Predict the winner once registered as spectator!',
    homeWins: '{team} Wins',
    awayWins: '{team} Wins',
    draw: 'Draw',
    voteSuccess: 'Your prediction recorded successfully! 🎉',
    cheerBtn: 'Boost Morale 📣',
    cheeredTo: 'You cheered for {team}! 📣🔥',
    votesCount: 'Fan Prediction Stats:',
    votedForMatch: 'Your Prediction: {prediction}',
    authModeRegister: '📝 Register New Account',
    authModeLogin: '🔐 Log In to My Account',
    passwordLabel: 'Your Passcode / Password:',
    passwordPlaceholder: 'Enter a private password to protect your profile...',
    loginErrorNotFound: 'Account Name not found, or Password does not match!',
    registerErrorExists: 'This Account Name is already registered! Please enter the correct passcode to Log In, or choose another unique name.',
    loginSuccessMsg: 'Welcome back! Your personal passcode verified successfully.',
    downloadCenterTitle: 'Reports & Stats Download Center 📊',
    downloadCenterDesc: 'Export live data and configurations directly into Excel/CSV files, or download/save a complete print-ready tournament report document as PDF.',
    downloadTeamsCsvBtn: 'Download Standings & Teams (CSV)',
    downloadMatchesCsvBtn: 'Download Match Results (CSV)',
    downloadPlayersCsvBtn: 'Download Goalscorers & Players (CSV)',
    downloadFullHtmlReportBtn: 'Generate & Save Full Printable Report (HTML / PDF)'
  },
  fr: {
    appName: 'Pôle Tournois',
    appSubtitle: 'La plateforme intelligente pour les ligues et compétitions scolaires locales',
    pro: 'PRO',
    welcomeTitle: 'Bienvenue sur le Pôle Tournois Intelligent ! 🏆',
    welcomeDesc: 'La plateforme intégrée idéale pour planifier, administrer et suivre vos compétitions sportives locales et scolaires. Profitez d\'outils magiques pour générer des calendriers instantanés, lancer des tirages au sort et diffuser les scores en direct aux spectateurs grâce à un simple QR code.',
    welcomeFeatDraw: 'Génération automatique de calendriers et tirages au sort en 1 clic ⚡',
    welcomeFeatLive: 'Diffusion en direct des scores, classements et activites par QR Code 📱',
    welcomeFeatStats: 'Statistiques précises des équipes, meilleurs buteurs et cartons 📊',
    organizerExit: 'Déconnexion Organisateur 🚪',
    organizerLogin: 'Accéder Mode Organisateur 🔐 (Code: 2026)',
    liveBadge: 'DIFFUSION EN DIRECT',
    publicViewBtn: 'Aperçu Public 📱',
    qrScanBtn: 'Scanner QR 📸',
    resetBtn: 'Réinitialiser toutes les données',
    tabDashboard: 'Tableau de bord',
    tabTeams: 'Équipes',
    tabPlayers: 'Joueurs',
    tabReferees: 'Arbitres',
    tabMatches: 'Matchs',
    tabDraw: 'Tirage Magique 🔮',
    tabMySQL: 'Base de données MySQL 🗄️',
    
    viewerModeTitle: 'Mode Spectateur (Aperçu en lecture seule)',
    viewerModeDesc: 'Vous observez actuellement les scores, classements et statistiques en direct. Si vous préparez la ligue et possédez les droits, veuillez passer en mode Organisateur.',
    organizerModeTitle: 'Mode Organisateur Activé',
    organizerModeDesc: 'Permissions élargies activées : modifications des équipes, inscription des joueurs, gestion du tirage au sort et modifications des scores.',
    organizerLabel: 'Directeur en charge de ce tournoi :',
    
    multiTourName: 'Système de gestion globale multi-tournois 🏆',
    activeTourLabel: 'Tournoi Général Actif :',
    selectTourLabel: 'Choisir le Tournoi à Gérer :',
    newTourBtn: 'Nouveau Tournoi 🚀',
    tourDirector: 'Directeur de Tournoi :',
    tourTeams: 'Équipes Sélectionnées :',
    teamsParticipating: 'équipes incluses au tirage',
    scheduledMatches: 'Rencontres Footballistiques Programmées :',
    scheduledMatchesLabel: 'rencontres au calendrier',
    editTourName: 'Modifier Nom du Tournoi Actif :',
    tourSupervisor: 'Superviseur de Tournoi :',
    deleteTourBtn: 'Supprimer le Tournoi 🗑️',
    
    selectLang: 'Langue',
    arabic: 'Arabe (العربية)',
    english: 'Anglais (English)',
    french: 'Français',

    createTourTitle: 'Organiser un Nouveau Tournoi',
    newTourNameLabel: 'Nom de la nouvelle Compétition *',
    newTourNamePlaceholder: 'Ex: Championnat Inter-classes - Printemps',
    newTourOrganizerLabel: 'Nom du Directeur / Superviseur *',
    newTourOrganizerPlaceholder: 'Ex: M. Jean-Claude Duval',
    newTourNotice: 'Cette compétition commencera vierge, sans matchs programmés. Tout l\'effectif des équipes sera inclus par défaut ; vous pouvez les masquer ou les inclure depuis l\'onglet de Tirage au Sort.',
    cancel: 'Annuler',
    createAndStart: 'Créer le Tournoi & Commencer 🚀',

    dashboardStats: 'Tableau des statistiques globales et performances sportives',
    totalTeams: 'Total Équipes',
    totalPlayers: 'Joueurs Inscrits',
    totalReferees: 'Arbitres Certifiés',
    matchesPlayed: 'Matchs Joués',
    liveMatches: 'Matchs en cours d\'exécution',
    goalsScored: 'Buts Inscrits',
    yellowCards: 'Cartons Jaunes',
    redCards: 'Cartons Rouges Directs',
    
    standingsTable: 'Classement Général de la Ligue Actuelle',
    rank: 'Pos',
    team: 'Équipe',
    played: 'MJ',
    points: 'Pts',
    won: 'G',
    drawn: 'N',
    lost: 'P',
    goals: 'Buts (P/C)',
    diff: 'Diff',
    classGroup: 'Classe/Division',
    city: 'Ville',

    topScorers: 'Meilleurs Buteurs & Soulier d\'Or',
    player: 'Joueur',
    position: 'Poste',
    
    latestLogs: 'Tableau d\'annonces et d\'actualités sportives',
    addLogBtn: 'Poster une annonce publique 📢',
    noLogsYet: 'Aucune actualité ou annonce officielle n\'a été publiée.',
    
    addNewTeam: 'Inscrire une Équipe 🛡️',
    searchTeam: 'Chercher par nom d\'équipe, classe, division, groupe...',
    teamName: 'Nom de l\'équipe',
    actions: 'Opérations',
    noTeams: 'Aucune équipe enregistrée pour ce tournoi.',
    teamFormAdd: 'Création et enregistrement de l\'équipe',
    teamFormEdit: 'Modifier les attributs de l\'équipe sélectionnée',
    placeholderTeamName: 'Ex: Real Madrid B, Lions de Lyon, FC Paris...',
    placeholderTeamClass: 'Ex: 4ème Année / Section Cadets',
    placeholderTeamCity: 'Ex: Lyon, Nice, Marseille...',
    save: 'Sauvegarder les Données',
    
    addNewPlayer: 'Inscrire un Joueur 跑',
    searchPlayer: 'Chercher par nom, numéro de dossard...',
    playerName: 'Nom complet du joueur',
    jerseyNumber: 'Numéro de maillot',
    playerPosition: 'Poste préféré',
    gk: 'Gardien (GK)',
    df: 'Défenseur (DF)',
    mf: 'Milieu (MF)',
    fw: 'Attaquant (FW)',
    allTeamsFilter: 'Tous les clubs',
    allPositionsFilter: 'Tous les postes sportifs',

    addNewReferee: 'Enregistrer un Arbitre Officiel 🏁',
    refereeName: 'Nom de l\'arbitre',
    refereePhone: 'Téléphone de contact',
    refereeRole: 'Position / Attribution',
    refMain: 'Arbitre Principal',
    refAssistant: 'Arbitre Assistant (Ligne)',
    refFourth: 'Quatrième Arbitre Officiel',

    scheduleTitle: 'Calendrier des rencontres et matchs de la ligue',
    matchDate: 'Date du match',
    matchTime: 'Heure du coup d\'envoi',
    matchStatus: 'État du Match',
    statusNotStarted: 'Match programmé (Non Démarré)',
    statusLive: 'Match en cours actuellement ⚽',
    statusFinished: 'Match fini définitivement ✅',
    addManualMatch: 'Ajouter un Match à la Carte 📅',
    vs: 'contre',
    score: 'Score',
    eventsCount: 'Buts/Cartons',
    deleteMatchConfirm: 'Voulez-vous vraiment supprimer définitivement ce match du calendrier ?',

    simulationAlert: 'Simuler le déroulement des matchs génère des scores et des événements aléatoires pour l\'expérience fun !',
    runSimulationBtn: 'Simuler de Rencontres instantanées 🕹️',

    drawWizardTitle: 'Générateur et Tirage au Sort de Rencontres 🔮',
    drawWizardDesc: 'Générez un calendrier de match ou une structure de tournoi instantanément pour les clubs sélectionnés.',
    drawTypeLabel: 'Système et format de la compétition :',
    leagueSystem: 'Système de Championnat (Type Poules / Aller Simple)',
    leagueSystemDesc: 'Chaque équipe rencontre toutes les autres une fois. Victoire 3pts, Nul 1pt.',
    knockoutSystem: 'Brackets à Élimination Directe (Type Coupe)',
    knockoutSystemDesc: 'Doublets d\'équipes, le vainqueur est qualifié directement pour l\'étape suivante. Le perdant sort.',
    groupsSystem: 'Système de Phase de Groupes (Championnat fractionné)',
    groupsSystemDesc: 'Les équipes sont réparties de manière équilibrée dans des groupes (Groupe A, B, C, etc.). Chaque groupe fonctionne sous forme de mini-championnat.',
    groupStage: 'Groupe',
    groupStageLabel: 'Phase de Groupes',
    participatingTeamsSelection: 'Choisir les clubs admis au tirage au sort :',
    selectAll: 'Sélectionner Tout',
    deselectAll: 'Désélectionner Tout',
    participating: 'Admis ✅',
    excluded: 'Exclu ❌',
    drawNotice: 'Attention : Générer un nouveau tirage écrasera et effacera l\'historique des matchs précédents pour démarrer à blanc !',
    runDrawBtn: 'Lancer le tirage au sort assisté ⚡',
    drawDisclaimer: 'Les rencontres structurées apparaîtront instantanément dans l\'onglet Calendrier des Matchs.',
    qrServiceBadge: 'Diffusion de Résultats Instantanée ⚡',
    qrTitle: 'Suivez le score en direct avec un simple scan de Code QR !',
    qrDescription: 'Cette application déploie une vue optimisée et unique pour les spectateurs et les athlètes. Pointez simplement l\'appareil photo sur le Code QR pour rester informé des derniers scores, classements et statistiques, sans compte ni mot de passe.',
    copyPublicLink: 'Copier le lien public direct',
    openPublicView: 'Ouvrir l\'aperçu spectateur ici',
    scanMobile: 'Scanner avec un mobile',
    spectatorNote: 'Pour suivre le tournoi sur les écrans des spectateurs',
    topFiveStandings: 'Classement Général Actuel',
    viewAllTeams: 'Détails des Équipes',
    noGoalsScoredYet: 'Aucun but marqué pour le moment.',
    goalsCountWord: 'buts',
    ofWord: 'sur',
    registerBtn: 'Connexion / S\'enregistrer 👤',
    registerModalTitle: 'Inscription sur Pôle Tournois 🏆',
    registerModalSub: 'Inscrivez-vous maintenant pour personnaliser votre expérience de spectateur ou activer le mode organisateur.',
    fullNameLabel: 'Nom complet :',
    emailLabel: 'Adresse E-mail (Optionnel) :',
    selectRoleLabel: 'Choisir le Type de Compte / Rôle :',
    spectatorRole: '📣 Spectateur des Résultats en Direct',
    spectatorDesc: 'Idéal pour le public et les joueurs. Parcourez les stats, encouragez votre équipe favorite, votez pour l\'homme du match et faites des pronostics !',
    organizerRole: '🔑 Organisateur de Tournois / Administrateur',
    organizerDesc: 'Pour le personnel. Requiert le code PIN du tournoi pour inscrire les scores, gérer les effectifs et lancer des tirages.',
    favTeamLabel: 'Votre Équipe Favorite à Soutenir :',
    noFavTeam: '-- Aucune équipe favorite --',
    organizerPinPass: 'Code PIN du Tournoi pour Vérification :',
    submitRegister: 'Valider & Se connecter ✨',
    profileTitle: 'Profil Utilisateur 👤',
    registeredAs: 'Inscrit en tant que :',
    unregistered: 'Non inscrit',
    predictionsTitle: 'Vos Pronostics de Matchs 🔮',
    predictPrompt: 'Pronostiquez le vainqueur une fois inscrit !',
    homeWins: 'Victoire de {team}',
    awayWins: 'Victoire de {team}',
    draw: 'Match Nul',
    voteSuccess: 'Votre pronostic a été enregistré avec succès ! 🎉',
    cheerBtn: 'Encourager 📣',
    cheeredTo: 'Vous avez encouragé {team} ! 📣🔥',
    votesCount: 'Stats des pronostics des fans :',
    votedForMatch: 'Votre pronostic : {prediction}',
    authModeRegister: '📝 Créer un nouveau compte',
    authModeLogin: '🔐 Se connecter à mon compte',
    passwordLabel: 'Votre Code / Mot de passe :',
    passwordPlaceholder: 'Saisissez un mot de passe pour protéger votre profil...',
    loginErrorNotFound: 'Nom de compte introuvable, ou mot de passe incorrect !',
    registerErrorExists: 'Ce nom de compte est déjà enregistré ! Veuillez entrer le bon code secret pour vous connecter, ou choisissez un autre nom unique.',
    loginSuccessMsg: 'Bon retour ! Votre code d\'authentification unique a été vérifié avec succès.',
    downloadCenterTitle: 'Centre de Téléchargement des Rapports et Stats 📊',
    downloadCenterDesc: 'Exportez toutes les données de la compétition en fichiers Excel/CSV, ou générez un rapport complet prêt pour impression sous format PDF/HTML.',
    downloadTeamsCsvBtn: 'Télécharger le Classement des Équipes (CSV)',
    downloadMatchesCsvBtn: 'Télécharger les Résultats des Matchs (CSV)',
    downloadPlayersCsvBtn: 'Télécharger les Statistiques des Buteurs (CSV)',
    downloadFullHtmlReportBtn: 'Générer le Rapport Complet Imprimable (HTML / PDF)'
  }
};
