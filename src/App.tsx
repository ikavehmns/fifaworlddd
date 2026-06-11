import React, { useState, useEffect } from 'react';
import { Match, GroupStandings, UserPrediction, LeaderboardUser, UserProfileData, TeamStanding } from './types';
import MatchesView from './components/MatchesView';
import StatsView from './components/StatsView';
import ProfileView from './components/ProfileView';
import AdBanner from './components/AdBanner';
import { Calendar, Award, User, Sparkles, CreditCard, X, ShieldAlert, Award as TrophyIcon, Bell, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth as firebaseAuth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

// آدرس پایه برای دریافت اطلاعات محلی اپلیکیشن (مانند لاگین و پیش‌بینی‌ها)
const API_BASE = ""; 

export default function App() {
  const [activeTab, setActiveTab] = useState<'matches' | 'stats' | 'profile'>('matches');
  
  // وضعیت‌های زنده دریافتی از سرور واقعی
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupStandings[]>([]);
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  
  // Statuses of Auth
  const [user, setUser] = useState<UserProfileData | null>(null);

  // وضعیت‌های مربوط به چیدمان
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [prevEventsCount, setPrevEventsCount] = useState<Record<string, number>>({});

  // جزئیات درگاه تستی خرید نسخه ویژه
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // متد هوشمند برای دور زدن CORS با استفاده از پروکسی‌های پشتیبان (Fallback)
  const fetchWithProxy = async (endpoint: string) => {
    const targetUrl = `https://worldcup26.ir/get/${endpoint}`;
    
    // لیست پروکسی‌های معتبر و فعال جهانی برای دور زدن فایروال سرور مقصد
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const text = await res.text();
          // بررسی صحت داشتن اطلاعات به صورت JSON
          const data = JSON.parse(text);
          return data;
        }
      } catch (err) {
        console.warn(`خطا در پروکسی ${proxyUrl}، تلاش برای پروکسی پشتیبان بعدی...`, err);
      }
    }
    throw new Error("برقراری ارتباط با وب‌سرویس جام جهانی از طریق تمام پروکسی‌ها ناموفق بود.");
  };

  // واکشی داده‌های زنده و تبدیل آن‌ها به مدل پروژه شما
  const loadLiveWorldCupData = async () => {
    try {
      // ۱. ابتدا دریافت اطلاعات ۴۸ تیم با استفاده از سیستم پروکسی هوشمند
      const teamsList = await fetchWithProxy("teams");
      
      // بررسی دفاعی برای جلوگیری از وقوع خطای ساختاری جاوااسکریپت
      if (!Array.isArray(teamsList)) {
        console.warn("اطلاعات تیم‌ها به صورت آرایه دریافت نشد:", teamsList);
        return;
      }

      // ساخت نقشه راهنما برای دستیابی سریع به مشخصات تیم‌ها با ID
      const teamsMap: Record<string, { name_fa: string; name_en: string; fifa_code: string; flag: string }> = {};
      teamsList.forEach((t: any) => {
        teamsMap[t.id] = {
          name_fa: t.name_fa || t.name_en,
          name_en: t.name_en,
          fifa_code: t.fifa_code,
          flag: t.flag || "🏳️"
        };
      });

      // ۲. دریافت ۱۰۴ مسابقه جام جهانی
      const gamesData = await fetchWithProxy("games");
      const rawGames = gamesData.games || [];

      if (!Array.isArray(rawGames)) {
        console.warn("اطلاعات بازی‌ها دریافت نشد:", gamesData);
        return;
      }

      // تبدیل قالب داده‌های API به قالب کلاس‌های Match در پروژه شما
      const mappedMatches: Match[] = rawGames.map((game: any): Match => {
        const homeTeamInfo = teamsMap[game.home_team_id] || { name_fa: game.home_team_name_fa || game.home_team_name_en, name_en: game.home_team_name_en, fifa_code: "T1", flag: "🏳️" };
        const awayTeamInfo = teamsMap[game.away_team_id] || { name_fa: game.away_team_name_fa || game.away_team_name_en, name_en: game.away_team_name_en, fifa_code: "T2", flag: "🏳️" };

        // تشخیص وضعیت مسابقه
        let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
        if (game.finished === "TRUE") {
          status = 'finished';
        } else if (game.time_elapsed !== "notstarted" && game.time_elapsed !== "null") {
          status = 'live';
        }

        // استخراج تاریخ و ساعت شمسی
        const dateParts = game.persian_date ? game.persian_date.split(' ') : ["1405-03-21", "13:00"];
        const matchDate = dateParts[0];
        const matchTime = dateParts[1] || "13:00";

        return {
          id: game.id.toString(),
          homeTeam: {
            id: game.home_team_id.toString(),
            name: homeTeamInfo.name_fa,
            code: homeTeamInfo.fifa_code,
            flag: homeTeamInfo.flag
          },
          awayTeam: {
            id: game.away_team_id.toString(),
            name: awayTeamInfo.name_fa,
            code: awayTeamInfo.fifa_code,
            flag: awayTeamInfo.flag
          },
          homeScore: parseInt(game.home_score) || 0,
          awayScore: parseInt(game.away_score) || 0,
          status,
          date: matchDate,
          time: matchTime,
          group: game.group ? `گروه ${game.group}` : "مرحله حذفی",
          stadium: game.stadium_name_fa || game.stadium_name_en || "ورزشگاه نامعلوم",
          minute: parseInt(game.time_elapsed) || 0,
          events: []
        };
      });

      setMatches(mappedMatches);

      // ۳. دریافت جداول رده‌بندی از سرور زنده
      const rawGroups = await fetchWithProxy("groups");
      
      if (!Array.isArray(rawGroups)) {
        console.warn("اطلاعات گروه‌ها دریافت نشد:", rawGroups);
        return;
      }

      const mappedGroups: GroupStandings[] = rawGroups.map((g: any): GroupStandings => {
        return {
          groupName: `گروه ${g.group}`,
          standings: g.teams.map((t: any): TeamStanding => {
            const teamInfo = teamsMap[t.team_id] || { name_fa: `تیم ${t.team_id}`, name_en: '', fifa_code: 'T', flag: '🏳️' };
            return {
              teamId: t.team_id.toString(),
              name: teamInfo.name_fa,
              code: teamInfo.fifa_code,
              flag: teamInfo.flag,
              played: parseInt(t.played) || 0,
              won: parseInt(t.won) || 0,
              drawn: parseInt(t.drawn) || 0,
              lost: parseInt(t.lost) || 0,
              gf: parseInt(t.gf) || 0,
              ga: parseInt(t.ga) || 0,
              gd: (parseInt(t.gf) || 0) - (parseInt(t.ga) || 0),
              points: parseInt(t.pts) || 0,
              status: 'Pending'
            };
          })
        };
      });

      setGroups(mappedGroups);

    } catch (e) {
      console.error("خطا در همگام‌سازی با سرور زنده جام جهانی:", e);
    }
  };

  // دریافت اولیه داده‌ها هنگام باز شدن برنامه
  useEffect(() => {
    const loadInitialData = async () => {
      // بارگذاری داده‌های زنده جام جهانی از وب‌سرویس
      await loadLiveWorldCupData();

      try {
        // ورود پیش‌فرض به عنوان کاربر دمو
        const loginRes = await fetch(`/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ikavehmash@gmail.com', displayName: 'کاوه‌مش', uid: 'demo-user' })
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (loginData && loginData.user) {
            setUser(currentUser => currentUser || loginData.user);
          }
        }

        // بارگذاری پیش‌بینی‌ها
        const currentUid = firebaseAuth.currentUser?.uid || 'demo-user';
        const predRes = await fetch(`/api/predictions/${currentUid}`);
        if (predRes.ok) {
          const predData = await predRes.json();
          if (Array.isArray(predData)) {
            setUserPredictions(predData);
          }
        }

        // بارگذاری لیدربورد
        const leaderRes = await fetch('/api/leaderboard');
        if (leaderRes.ok) {
          const leaderData = await leaderRes.json();
          if (Array.isArray(leaderData)) {
            setLeaderboard(leaderData);
          }
        }

      } catch (error) {
        console.error('Failure initializing application maps: ', error);
      }
    };

    loadInitialData();
  }, []);

  // هماهنگ‌سازی نشست‌های Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const res = await fetch(`/api/profile/${firebaseUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            if (data && !data.error) {
              setUser(data);
              
              const predRes = await fetch(`/api/predictions/${firebaseUser.uid}`);
              if (predRes.ok) {
                const predData = await predRes.json();
                if (Array.isArray(predData)) {
                  setUserPredictions(predData);
                }
              }
            }
          }
        } catch (error) {
          console.error('Session sync error: ', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // پایش ۶ ثانیه‌ای برای دریافت نتایج و بروزرسانی پیش‌بینی‌ها
  useEffect(() => {
    const handlePolling = async () => {
      // به‌روزرسانی مسابقات زنده جام جهانی از وب‌سرویس
      await loadLiveWorldCupData();

      try {
        // به‌روزرسانی پروفایل کاربر
        if (user) {
          const profRes = await fetch(`/api/profile/${user.uid}`);
          if (profRes.ok) {
            const profData = await profRes.json();
            if (profData && !profData.error) {
              setUser(prev => prev ? { ...prev, points: profData.points, predictionsCount: profData.predictionsCount, isPremium: profData.isPremium } : null);
            }
          }

          // به‌روزرسانی تاریخچه پیش‌بینی‌ها
          const predRes = await fetch(`/api/predictions/${user.uid}`);
          if (predRes.ok) {
            const predData = await predRes.json();
            if (Array.isArray(predData)) {
              setUserPredictions(predData);
            }
          }
        }

        // به‌روزرسانی جدول جهانی کاربران
        const leaderRes = await fetch('/api/leaderboard');
        if (leaderRes.ok) {
          const leaderData = await leaderRes.json();
          if (Array.isArray(leaderData)) {
            setLeaderboard(leaderData);
          }
        }

      } catch (error) {
        console.error('Errors sync matching items: ', error);
      }
    };

    const intervalId = setInterval(handlePolling, 6000);
    return () => clearInterval(intervalId);
  }, [prevEventsCount, user]);

  // عملیات ورود و ثبت نام
  const handleUserLogin = async (email: string, passwordAndPasswordPlain: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, passwordAndPasswordPlain);
      const firebaseUser = userCredential.user;

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: firebaseUser.email, displayName: firebaseUser.displayName || email.split('@')[0], uid: firebaseUser.uid })
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        
        const predRes = await fetch(`/api/predictions/${data.user.uid}`);
        const predData = await predRes.json();
        setUserPredictions(predData);

        const leaderRes = await fetch('/api/leaderboard');
        const leaderData = await leaderRes.json();
        setLeaderboard(leaderData);

        setActiveNotification(`👋 خوش آمدید، ${data.user.displayName}! بخش پیش‌بینی باز شد.`);
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error: any) {
      console.error('Failed checking email authentications: ', error);
      setActiveNotification(`❌ ورود ناموفق: اطلاعات صحیح نیست.`);
      setTimeout(() => setActiveNotification(null), 4000);
    }
  };

  const handleUserRegister = async (email: string, passwordAndPasswordPlain: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, passwordAndPasswordPlain);
      const firebaseUser = userCredential.user;

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: firebaseUser.email, displayName, uid: firebaseUser.uid })
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setUserPredictions([]);

        const leaderRes = await fetch('/api/leaderboard');
        const leaderData = await leaderRes.json();
        setLeaderboard(leaderData);

        setActiveNotification(`🎉 حساب کاربری با موفقیت ساخته شد! خوش آمدی، ${data.user.displayName}!`);
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error: any) {
      console.error('Failed registering new profile: ', error);
      setActiveNotification(`❌ ثبت‌نام ناموفق: ${error.message}`);
      setTimeout(() => setActiveNotification(null), 4000);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const firebaseUser = result.user;

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          uid: firebaseUser.uid
        })
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        
        const predRes = await fetch(`/api/predictions/${data.user.uid}`);
        const predData = await predRes.json();
        setUserPredictions(predData);

        const leaderRes = await fetch('/api/leaderboard');
        const leaderData = await leaderRes.json();
        setLeaderboard(leaderData);

        setActiveNotification(`👋 ورود موفقیت‌آمیز با گوگل. خوش آمدید ${data.user.displayName}!`);
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error: any) {
      console.error('Failed authentication via Google:', error);
      setActiveNotification(`❌ ورود با گوگل ناموفق بود.`);
      setTimeout(() => setActiveNotification(null), 4050);
    }
  };

  const handleUserLogout = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
      setUser(null);
      setUserPredictions([]);
      setActiveNotification('با موفقیت خارج شدید.');
      setTimeout(() => setActiveNotification(null), 3000);
    } catch (error) {
      console.error('Failed processing singout: ', error);
    }
  };

  // ثبت پیش‌بینی‌ها
  const handleScorePrediction = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!user) {
      setActiveNotification('⚠️ ابتدا از تب حساب کاربری وارد شوید تا امکان ثبت پیش‌بینی فراهم شود!');
      setTimeout(() => setActiveNotification(null), 3000);
      return;
    }

    try {
      const response = await fetch(`/api/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          matchId,
          homeScore,
          awayScore
        })
      });

      const resData = await response.json();
      if (resData.success) {
        const predRes = await fetch(`/api/predictions/${user.uid}`);
        const predData = await predRes.json();
        setUserPredictions(predData);

        setActiveNotification('🔮 پیش‌بینی شما با موفقیت ثبت شد!');
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error) {
      console.error('Submit predict failure logic: ', error);
    }
  };

  // فعال‌سازی نسخه ویژه (تستی)
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingPayment(true);

    try {
      const response = await fetch(`/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          cardName: cardHolder
        })
      });

      const data = await response.json();
      if (data.success) {
        setUser(prev => prev ? { ...prev, isPremium: true } : null);
        setShowPaymentModal(false);
        setActiveNotification('🎉 پرداخت تایید شد! دسترسی ویژه هوش مصنوعی و نسخه بدون تبلیغ فعال گردید!');
        setTimeout(() => setActiveNotification(null), 6000);
      }
    } catch (error) {
      console.error('Failed executing subscription upgrade: ', error);
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-[#F3F4F6] flex justify-center items-start py-0 md:py-8 px-0 font-sans tracking-tight leading-normal">
      
      {/* اعلان‌های کشویی بالای صفحه */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-4 right-4 z-40 max-w-sm mx-auto rounded-xl bg-green-400 p-4 border-2 border-black text-black shadow-xl flex items-start gap-3 select-none"
            id="alert-push-banner"
          >
            <Bell className="h-5 w-5 shrink-0 animate-bounce mt-0.5" />
            <div className="flex-1 text-xs text-right">
              <h5 className="font-black uppercase tracking-widest text-[10px] opacity-70">اطلاعات زنده مسابقات</h5>
              <p className="font-extrabold uppercase italic tracking-tight text-sm leading-tight text-black">{activeNotification}</p>
            </div>
            <button
              onClick={() => setActiveNotification(null)}
              className="text-black/70 hover:text-black transition-all scale-110 mr-auto ml-0"
              id="btn-close-alert"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ابعاد تلفن همراه */}
      <div className="w-full max-w-md min-h-screen md:min-h-[812px] md:max-h-[860px] flex flex-col justify-between bg-zinc-950 md:rounded-[36px] overflow-hidden border-2 border-zinc-900 shadow-2xl relative">
        
        {/* هدر بالایی */}
        <header className="px-5 py-4 bg-black border-b border-zinc-900 flex items-center justify-between select-none relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-green-400 text-black font-black px-2.5 py-0.5 text-base tracking-tighter rounded-sm select-none">WC.26</div>
            <div className="leading-none text-right">
              <h1 className="text-xs font-black tracking-widest text-white uppercase italic font-display">
                جام جهانی ۲۰۲۶
              </h1>
              <span className="text-[8.5px] font-mono tracking-widest text-green-400 font-extrabold uppercase animate-pulse block mt-0.5">
                گزارش و تحلیل زنده
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user?.isPremium && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="rounded bg-green-400 border-2 border-black text-black px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider hover:bg-white select-none transition-all cursor-pointer active:scale-95"
                id="btn-header-upgrade"
              >
                ★ نسخه ویژه هوش مصنوعی
              </button>
            )}
            
            {user?.isPremium && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-black text-green-400 bg-green-400/10 border border-green-400/30 px-2 py-0.5 rounded select-none uppercase tracking-wider">
                ★ حالت حرفه‌ای فعال
              </span>
            )}
          </div>
        </header>

        {/* بخش اسکرول محتوای اصلی */}
        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-sans">
          
          {/* بنر تبلیغاتی موقت */}
          <AdBanner isPremium={user?.isPremium || false} type="banner" />

          {/* رندر کردن زیرصفحه‌ها */}
          {activeTab === 'matches' && (
            <MatchesView
              matches={matches}
              groups={groups}
              userId={user?.uid || ''}
              userPredictions={userPredictions}
              onPredict={handleScorePrediction}
              isPremium={user?.isPremium || false}
            />
          )}

          {activeTab === 'stats' && (
            <StatsView
              matches={matches}
              userId={user?.uid || ''}
              isPremium={user?.isPremium || false}
              onUpgrade={() => setShowPaymentModal(true)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={user}
              userPredictions={userPredictions}
              matches={matches}
              leaderboard={leaderboard}
              onLogin={handleUserLogin}
              onRegister={handleUserRegister}
              onGoogleSignIn={handleGoogleSignIn}
              onLogout={handleUserLogout}
            />
          )}
        </main>

        {/* نوار ناوبری پایین صفحه */}
        <nav className="bg-black border-t border-zinc-900 py-2.5 px-6 flex items-center justify-between select-none shrink-0 rounded-b-none md:rounded-b-[36px]">
          
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'matches' ? 'text-green-400 font-black scale-102 font-display uppercase italic tracking-tighter' : 'text-slate-500 hover:text-slate-350 uppercase tracking-tighter font-medium'
            }`}
            id="nav-tab-matches"
          >
            <Calendar className="h-4.5 w-4.5" />
            <span className="text-[10px] font-black tracking-widest text-[9px]">بازی‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'stats' ? 'text-green-400 font-black scale-102 font-display uppercase italic tracking-tighter' : 'text-slate-500 hover:text-slate-350 uppercase tracking-tighter font-medium'
            }`}
            id="nav-tab-stats"
          >
            <Award className="h-4.5 w-4.5" />
            <span className="text-[10px] font-black tracking-widest text-[9px]">جداول و آمار</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'profile' ? 'text-green-400 font-black scale-102 font-display uppercase italic tracking-tighter' : 'text-slate-500 hover:text-slate-350 uppercase tracking-tighter font-medium'
            }`}
            id="nav-tab-profile"
          >
            <User className="h-4.5 w-4.5" />
            <span className="text-[10px] font-black tracking-widest text-[9px]">کاربر</span>
          </button>
        </nav>

        {/* مدال پرداخت تستی */}
        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-xs"
            >
              <div className="relative w-full max-w-sm rounded-[12px] overflow-hidden bg-black border-2 border-green-400 p-5 text-white shadow-2xl flex flex-col animate-fade-in text-right">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="absolute top-4 left-4 p-1 rounded-sm bg-zinc-900 border border-zinc-850 text-slate-400 hover:text-white transition-colors"
                  id="btn-close-payment"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-2.5">
                  <CreditCard className="h-5 w-5 text-green-400" />
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest font-display italic">
                    شبیه‌ساز پرداخت ایمن زرین‌پال / استرایپ
                  </h3>
                </div>

                <div className="mb-4 bg-zinc-900 border-r-4 border-green-400 p-3">
                  <p className="text-[11px] leading-relaxed text-zinc-300">
                    🏆 <strong className="text-white font-extrabold uppercase font-display tracking-tight text-[11px]">بلیت آنالیز پیشرفته جام جهانی ۲۰۲۶</strong>
                    <br />
                    با خرید نسخه ویژه، قفل آنالیزهای تاکتیکی هوش مصنوعی جمینی (Gemini)، الگوهای چیدمان تیم‌ها، وضعیت مصدومان/محرومان را باز کرده و تبلیغات برنامه را کاملاً حذف کنید.
                  </p>
                </div>

                <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                      نام و نام خانوادگی دارنده کارت
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="مانند: کاوه مش"
                      className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-green-400 text-xs text-right"
                      id="input-card-holder"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                      شماره کارت بانکی
                    </label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="۶۰۳۷ - ۹۹۱۹ - ۹۹۱۹ - ۹۹۱۹"
                      className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-green-400 font-mono tracking-widest text-xs text-center"
                      id="input-card-number"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                        تاریخ انقضا (ماه/سال)
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="۰۴/۰۹"
                        className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-green-400 text-center font-mono uppercase text-xs"
                        id="input-card-expiry"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                        کد امنیتی CVV2
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="••••"
                        className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-green-400 text-center font-mono text-xs"
                        id="input-card-cvc"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="w-full mt-2 rounded bg-green-400 text-black uppercase text-xs font-black tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 disabled:opacity-50 h-10 border border-black cursor-pointer italic font-display"
                    id="btn-checkout-submit"
                  >
                    {submittingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        <span>در حال بررسی با درگاه بانکی...</span>
                      </>
                    ) : (
                      <>
                        <span>پرداخت شبیه‌سازی‌شده و ارتقای بلیت</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="text-[9.5px] text-center text-slate-500 font-mono leading-normal mt-4">
                  تست درگاه پرداخت به صورت آفلاین متصل است. هیچ وجه واقعی کسر نخواهد شد.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
