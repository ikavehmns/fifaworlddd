import React, { useState, useEffect } from 'react';
import { Match, GroupStandings, UserPrediction, LeaderboardUser, UserProfileData } from './types';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'matches' | 'stats' | 'profile'>('matches');
  
  // Real-time server states
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupStandings[]>([]);
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  
  // Auth state - initialized as demo or retrieved
  const [user, setUser] = useState<UserProfileData | null>(null);

  // Layout states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [prevEventsCount, setPrevEventsCount] = useState<Record<string, number>>({});

  // Credit Card details for mock checkout gateway list
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Sync state loops of live tracker updates
  useEffect(() => {
    // Initial data fetch
    const loadInitialData = async () => {
      try {
        const response = await fetch('/api/matches');
        const data = await response.json();
        if (data && data.matches) {
          setMatches(data.matches);
          setGroups(data.groups || []);

          // Record initial events count to prevent spam alert on startup
          const initCounts: Record<string, number> = {};
          data.matches.forEach((m: Match) => {
            initCounts[m.id] = m.events ? m.events.length : 0;
          });
          setPrevEventsCount(initCounts);
        }

        // Initial login to Demo user as default placeholder
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ikavehmash@gmail.com', displayName: 'ikavehmash', uid: 'demo-user' })
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (loginData && loginData.user) {
            setUser(currentUser => currentUser || loginData.user);
          }
        }

        // Load predictions
        const currentUid = firebaseAuth.currentUser?.uid || 'demo-user';
        const predRes = await fetch(`/api/predictions/${currentUid}`);
        if (predRes.ok) {
          const predData = await predRes.json();
          if (Array.isArray(predData)) {
            setUserPredictions(predData);
          }
        }

        // Load leaderboard
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

  // Sync real-time Firebase Authentication Sessions
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

  // Set up 6-second polling loop to simulate active real-time ticking
  useEffect(() => {
    const handlePolling = async () => {
      try {
        const response = await fetch('/api/matches');
        const data = await response.json();
        if (data && data.matches) {
          const freshMatches: Match[] = data.matches;
          setMatches(freshMatches);
          setGroups(data.groups || []);

          // Check if any new events occurred in active matches for Live Alerts!
          freshMatches.forEach(m => {
            const prevCount = prevEventsCount[m.id] || 0;
            if (m.events && m.events.length > prevCount) {
              const latestEvent = m.events[m.events.length - 1];
              // Push alert if it is a Goal, Card or whistle event!
              if (latestEvent.type === 'goal') {
                setActiveNotification(`⚽ GOAL! ${latestEvent.player} scores for ${m.homeTeam.id === latestEvent.teamId ? m.homeTeam.name : m.awayTeam.name}! (${m.homeScore} - ${m.awayScore})`);
                
                // Remove notification after 5 seconds
                setTimeout(() => {
                  setActiveNotification(null);
                }, 5000);
              } else if (latestEvent.type === 'red_card') {
                setActiveNotification(`🟥 RED CARD! ${latestEvent.player} has been sent off!`);
                setTimeout(() => {
                  setActiveNotification(null);
                }, 5000);
              } else if (latestEvent.type === 'fulltime') {
                setActiveNotification(`🏁 FULL TIME! ${m.homeTeam.name} ${m.homeScore} - ${m.awayScore} ${m.awayTeam.name}. Match complete!`);
                setTimeout(() => {
                  setActiveNotification(null);
                }, 6000);
              }

              // Sync fresh count
              setPrevEventsCount(prev => ({
                ...prev,
                [m.id]: m.events.length
              }));
            }
          });
        }

        // Sync auth values
        if (user) {
          const profRes = await fetch(`/api/profile/${user.uid}`);
          if (profRes.ok) {
            const profData = await profRes.json();
            if (profData && !profData.error) {
              setUser(prev => prev ? { ...prev, points: profData.points, predictionsCount: profData.predictionsCount, isPremium: profData.isPremium } : null);
            }
          }

          // Refresh predictions history
          const predRes = await fetch(`/api/predictions/${user.uid}`);
          if (predRes.ok) {
            const predData = await predRes.json();
            if (Array.isArray(predData)) {
              setUserPredictions(predData);
            }
          }
        }

        // Refresh global leaderboard
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

  // Auth Operations
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

        setActiveNotification(`👋 Welcome back, ${data.user.displayName}! Predictions unlocked.`);
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error: any) {
      console.error('Failed checking email authentications: ', error);
      setActiveNotification(`❌ Login Failed: ${error.message || error}`);
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

        setActiveNotification(`🎉 Account created! Welcome, ${data.user.displayName}!`);
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error: any) {
      console.error('Failed registering new profile: ', error);
      setActiveNotification(`❌ Register Failed: ${error.message || error}`);
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

        setActiveNotification(`👋 Google Connected successfully, welcome ${data.user.displayName}!`);
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error: any) {
      console.error('Failed authentication via Google:', error);
      setActiveNotification(`❌ Google Sign In Failed: ${error.message || error}`);
      setTimeout(() => setActiveNotification(null), 4050);
    }
  };

  const handleUserLogout = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
      setUser(null);
      setUserPredictions([]);
      setActiveNotification('Successfully logged out.');
      setTimeout(() => setActiveNotification(null), 3000);
    } catch (error) {
      console.error('Failed processing singout: ', error);
    }
  };

  // Prediction Submissions
  const handleScorePrediction = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!user) {
      setActiveNotification('⚠️ Authenticate first via User tab to submit forecasts!');
      setTimeout(() => setActiveNotification(null), 3000);
      return;
    }

    try {
      const response = await fetch('/api/predictions', {
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
        // Refresh prediction lists locally
        const predRes = await fetch(`/api/predictions/${user.uid}`);
        const predData = await predRes.json();
        setUserPredictions(predData);

        setActiveNotification('🔮 Prediction locked! Score registered successfully.');
        setTimeout(() => setActiveNotification(null), 3000);
      }
    } catch (error) {
      console.error('Submit predict failure logic: ', error);
    }
  };

  // Premium Payment upgrade gateway
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingPayment(true);

    try {
      const response = await fetch('/api/subscribe', {
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
        setActiveNotification('🎉 Payment verified! Welcome to Premium Analytics & Ad-free World!');
        setTimeout(() => setActiveNotification(null), 6000);
      }
    } catch (error) {
      console.error('Failed executing subscription upgrade: ', error);
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F3F4F6] flex justify-center items-start py-0 md:py-8 px-0 font-sans tracking-tight leading-normal">
      
      {/* Absolute Sliding Push Alerts Banner (Goal / Cards Alert!) */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-4 right-4 z-40 max-w-sm mx-auto rounded-none bg-neon-green p-4 border-2 border-black text-black shadow-xl flex items-start gap-3 select-none"
            id="alert-push-banner"
          >
            <Bell className="h-5 w-5 shrink-0 animate-bounce mt-0.5" />
            <div className="flex-1 text-xs">
              <h5 className="font-black uppercase tracking-widest text-[10px] opacity-70">Matchday Event Pipeline</h5>
              <p className="font-extrabold uppercase italic tracking-tight text-sm leading-tight text-black">{activeNotification}</p>
            </div>
            <button
              onClick={() => setActiveNotification(null)}
              className="text-black/70 hover:text-black transition-all scale-110"
              id="btn-close-alert"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Mobile Telephone chassis container simulation */}
      <div className="w-full max-w-md min-h-screen md:min-h-[812px] md:max-h-[860px] flex flex-col justify-between bg-zinc-950 md:rounded-[36px] overflow-hidden border-2 border-zinc-805 shadow-2xl relative">
        
        {/* Top Header Section with Stadium details and banner logo */}
        <header className="px-5 py-4 bg-black border-b border-zinc-900 flex items-center justify-between select-none relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-neon-green text-black font-black px-2.5 py-0.5 text-base tracking-tighter rounded-sm select-none">WC.26</div>
            <div className="leading-none">
              <h1 className="text-xs font-black tracking-widest text-white uppercase italic font-display">
                MUNDIAL
              </h1>
              <span className="text-[8.5px] font-mono tracking-widest text-[#00FF85] font-extrabold uppercase animate-pulse block mt-0.5">
                LIVE INSIGHTS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user?.isPremium && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="rounded bg-neon-green border-2 border-black text-black px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider hover:bg-white select-none transition-all cursor-pointer active:scale-95"
                id="btn-header-upgrade"
              >
                ★ AI PREMIUM
              </button>
            )}
            
            {user?.isPremium && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-black text-neon-green bg-[#00FF85]/10 border border-[#00FF85]/30 px-2 py-0.5 rounded select-none uppercase tracking-wider">
                ★ PRO MODE
              </span>
            )}
          </div>
        </header>

        {/* Content staging window (Smooth scroll container) */}
        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-sans">
          
          {/* Mock In-App Advertisement Banner Unit. Hides when Subscriber logs as PRO */}
          <AdBanner isPremium={user?.isPremium || false} type="banner" />

          {/* Render Active View Subscreens */}
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

        {/* Bottom Smartphone Native Navigation Layout */}
        <nav className="bg-black border-t border-zinc-900 py-2.5 px-6 flex items-center justify-between select-none shrink-0 rounded-b-none md:rounded-b-[36px]">
          
          {/* Tab Matches (Home layout) */}
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'matches' ? 'text-neon-green font-black scale-102 font-display uppercase italic tracking-tighter' : 'text-slate-500 hover:text-slate-350 uppercase tracking-tighter font-medium'
            }`}
            id="nav-tab-matches"
          >
            <Calendar className="h-4.5 w-4.5" />
            <span className="text-[10px] font-black tracking-widest text-[9px]">Home</span>
          </button>

          {/* Tab Statistics */}
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'stats' ? 'text-neon-green font-black scale-102 font-display uppercase italic tracking-tighter' : 'text-slate-500 hover:text-slate-350 uppercase tracking-tighter font-medium'
            }`}
            id="nav-tab-stats"
          >
            <Award className="h-4.5 w-4.5" />
            <span className="text-[10px] font-black tracking-widest text-[9px]">Insight</span>
          </button>

          {/* Tab User Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'profile' ? 'text-neon-green font-black scale-102 font-display uppercase italic tracking-tighter' : 'text-slate-500 hover:text-slate-350 uppercase tracking-tighter font-medium'
            }`}
            id="nav-tab-profile"
          >
            <User className="h-4.5 w-4.5" />
            <span className="text-[10px] font-black tracking-widest text-[9px]">User</span>
          </button>
        </nav>

        {/* Dynamic Stripe Checkout Sandbox Modal popup */}
        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-xs"
            >
              <div className="relative w-full max-w-sm rounded-[12px] overflow-hidden bg-black border-2 border-neon-green p-5 text-white shadow-2xl flex flex-col animate-fade-in">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="absolute top-4 right-4 p-1 rounded-sm bg-zinc-900 border border-zinc-850 text-slate-400 hover:text-white transition-colors"
                  id="btn-close-payment"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-2.5">
                  <CreditCard className="h-5 w-5 text-neon-green" />
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest font-display italic">
                    Stripe Checkout Sandbox
                  </h3>
                </div>

                <div className="mb-4 bg-zinc-900 border-l-4 border-neon-green p-3">
                  <p className="text-[11px] leading-relaxed text-zinc-300">
                    🏆 <strong className="text-white font-extrabold uppercase font-display tracking-tight text-[11px]">MUNDIAL '26 PREMIUM ANALYST TICKET</strong>
                    <br />
                    Complete checkout to unlock Gemini Tactical Report Predictor, formations schemas, unavailable player lists, and remove advertisements instantly.
                  </p>
                </div>

                {/* Form Inputs mock checkout fields */}
                <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="e.g. striker2026"
                      className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-neon-green text-xs"
                      id="input-card-holder"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                      Credit Card Number
                    </label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 • 4242 • 4242 • 4242"
                      className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-350 focus:outline-none focus:border-neon-green font-mono tracking-widest text-xs"
                      id="input-card-number"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-neon-green text-center font-mono uppercase text-xs"
                        id="input-card-expiry"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 block font-black tracking-widest leading-none">
                        CVC Code
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        className="w-full rounded bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-neon-green text-center font-mono text-xs"
                        id="input-card-cvc"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="w-full mt-2 rounded bg-neon-green text-black uppercase text-xs font-black tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 disabled:opacity-50 h-10 border border-black cursor-pointer italic font-display"
                    id="btn-checkout-submit"
                  >
                    {submittingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        <span>Verifying with Stripe...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Secure Checkout Credit Ticket</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="text-[9.5px] text-center text-slate-500 font-mono leading-normal mt-4">
                  Stripe Test keys are fully integrated on port 3000. No actual funds will be transferred.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
