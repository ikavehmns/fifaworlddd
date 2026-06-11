import React, { useState } from 'react';
import { Match, UserPrediction, LeaderboardUser, UserProfileData } from '../types';
import { LogIn, LogOut, Trophy, CheckCircle2, XCircle, Clock, Star, Sparkles, Mail, User, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileViewProps {
  user: UserProfileData | null;
  userPredictions: UserPrediction[];
  matches: Match[];
  leaderboard: LeaderboardUser[];
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, password: string, displayName: string) => void;
  onGoogleSignIn: () => void;
  onLogout: () => void;
}

export default function ProfileView({
  user,
  userPredictions,
  matches,
  leaderboard,
  onLogin,
  onRegister,
  onGoogleSignIn,
  onLogout
}: ProfileViewProps) {
  const [emailForm, setEmailForm] = useState('');
  const [nameForm, setNameForm] = useState('');
  const [passwordForm, setPasswordForm] = useState('');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [profileTab, setProfileTab] = useState<'predictions' | 'leaderboard'>('predictions');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm || !passwordForm) return;
    if (authTab === 'login') {
      onLogin(emailForm, passwordForm);
    } else {
      const displayName = nameForm || emailForm.split('@')[0];
      onRegister(emailForm, passwordForm, displayName);
    }
  };

  const executeGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await onGoogleSignIn();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const getMatchForPrediction = (matchId: string) => {
    return matches.find(m => m.id === matchId);
  };

  return (
    <div className="space-y-4">
      {!user ? (
        /* Login Auth screen */
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950 p-5 shadow-sm font-sans max-w-sm mx-auto">
          <div className="text-center space-y-2 mb-6 select-none">
            <span className="text-4xl filter drop-shadow">🌎</span>
            <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight font-mono">
              Join World Cup Predictor
            </h3>
            <p className="text-xs text-slate-400">
              Unlock leaderboards, save your forecasts history, and compete globally!
            </p>
          </div>

          {/* Tab toggles */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl mb-4 text-xs font-bold font-mono">
            <button
              onClick={() => setAuthTab('login')}
              className={`py-2 rounded-lg leading-relaxed uppercase tracking-wider ${
                authTab === 'login' ? 'bg-slate-800 text-white border border-white/5' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setAuthTab('register')}
              className={`py-2 rounded-lg leading-relaxed uppercase tracking-wider ${
                authTab === 'register' ? 'bg-slate-800 text-white border border-white/5' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {authTab === 'register' && (
              <div className="relative">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 leading-tight block mb-1">
                  Display name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={nameForm}
                    onChange={(e) => setNameForm(e.target.value)}
                    placeholder="e.g. striker2026"
                    className="w-full rounded-xl bg-slate-900 border border-white/5 pl-10 pr-4 py-3 text-slate-200 placeholder-slate-550 focus:outline-none focus:border-emerald-500"
                    id="input-login-name"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 leading-tight block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={emailForm}
                  onChange={(e) => setEmailForm(e.target.value)}
                  placeholder="e.g. coach@worldcup.com"
                  className="w-full rounded-xl bg-slate-900 border border-white/5 pl-10 pr-4 py-3 text-slate-200 placeholder-slate-550 focus:outline-none focus:border-emerald-500"
                  id="input-login-email"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 leading-tight block mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500 select-none font-mono">🔑</span>
                <input
                  type="password"
                  required
                  minimum-length="6"
                  value={passwordForm}
                  onChange={(e) => setPasswordForm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-900 border border-white/5 pl-10 pr-4 py-3 text-slate-200 placeholder-slate-550 focus:outline-none focus:border-emerald-500 font-mono"
                  id="input-login-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black uppercase text-xs tracking-wider py-3 flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
              id="btn-login-submit"
            >
              <LogIn className="h-4 w-4" />
              <span>{authTab === 'login' ? 'Verify Credentials' : 'Create Account'}</span>
            </button>
          </form>

          {/* Social Google Splitter line */}
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-white/5" />
            <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-slate-500 font-bold">OR Connect via</span>
            <div className="flex-grow border-t border-white/5" />
          </div>

          {/* Google Sign-in Block */}
          <button
            onClick={executeGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-850 border border-white/10 py-3 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 hover:text-white transition-all active:scale-98"
            id="btn-google-signin"
          >
            {isGoogleLoading ? (
              <span className="animate-pulse">Connecting Google Account...</span>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.245-3.123C18.29 1.523 15.5 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.832 11.57-11.776 0-.792-.086-1.396-.188-1.939H12.24z"
                  />
                </svg>
                <span>Continue with Google Sign-In</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Authenticated profile view dashboard */
        <div className="space-y-4">
          
          {/* User badge container card */}
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950 p-4 shadow-sm font-sans flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar placeholder circle */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xl font-bold text-slate-950 select-none">
                {user.displayName.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-slate-100 font-mono">
                    {user.displayName}
                  </h3>
                  
                  {user.isPremium ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">
                      <Sparkles className="h-2.5 w-2.5 fill-amber-400" /> PREMIUM
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                      FREE AD PLAYER
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 font-sans tracking-wide">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1 px-2 border border-red-500/10 hover:border-red-550 hover:bg-red-950/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold active:scale-95"
              id="btn-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          </div>

          {/* User Score Stats strip */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {/* Stat point totals */}
            <div className="p-3 bg-slate-900/60 border border-white/5 rounded-2xl space-y-0.5 select-none">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black">Score Total</span>
              <h4 className="text-base font-black text-emerald-400 font-mono">
                {user.points} PTS
              </h4>
            </div>

            {/* Stat predicted count */}
            <div className="p-3 bg-slate-900/60 border border-white/5 rounded-2xl space-y-0.5 select-none">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black">Forecasts</span>
              <h4 className="text-base font-black text-slate-200 font-mono">
                {user.predictionsCount}
              </h4>
            </div>

            {/* Stat leaderboard status */}
            <div className="p-3 bg-slate-900/60 border border-white/5 rounded-2xl space-y-0.5 select-none animate-none">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black">World Rank</span>
              <h4 className="text-base font-black text-cyan-400 font-mono">
                #{leaderboard.find(l => l.userId === user.uid)?.rank || leaderboard.length}
              </h4>
            </div>
          </div>

          {/* Tab Subcontrols predictions vs leaderboard */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl text-xs font-bold font-mono">
            <button
              onClick={() => setProfileTab('predictions')}
              className={`py-2 rounded-lg tracking-tight uppercase ${
                profileTab === 'predictions' ? 'bg-slate-800 text-white border border-white/5' : 'text-slate-400 hover:text-white'
              }`}
              id="tab-user-preds"
            >
              📊 Predictions Feed
            </button>
            <button
              onClick={() => setProfileTab('leaderboard')}
              className={`py-2 rounded-lg tracking-tight uppercase ${
                profileTab === 'leaderboard' ? 'bg-slate-800 text-white border border-white/5' : 'text-slate-400 hover:text-white'
              }`}
              id="tab-user-leaderboard"
            >
              🏆 Global Leaderboard
            </button>
          </div>

          {profileTab === 'predictions' ? (
            /* Predictions history logger card */
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950 p-4 shadow-sm font-sans space-y-3.5">
              <div className="flex items-center gap-1 pb-1.5 border-b border-white/5">
                <Star className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest leading-none">
                  My Prediction Log
                </h4>
              </div>

              <div className="space-y-3.5">
                {userPredictions.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4 font-sans">
                    You haven't placed any match scores yet. Click the Matches tab to make your first predictions!
                  </p>
                ) : (
                  userPredictions.slice().reverse().map(pred => {
                    const match = getMatchForPrediction(pred.matchId);
                    if (!match) return null;

                    return (
                      <div key={pred.id} className="p-3 bg-slate-900 flex justify-between items-center rounded-xl border border-white/5">
                        <div className="space-y-1 font-sans">
                          {/* Teams display */}
                          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-350">
                            <span>{match.homeTeam.flag} {match.homeTeam.code}</span>
                            <span className="text-slate-600">vs</span>
                            <span>{match.awayTeam.code} {match.awayTeam.flag}</span>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                            {match.date} &middot; {match.group}
                          </div>
                        </div>

                        {/* Scores matching results */}
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-[10px] font-mono text-slate-400">Forecast:</span>
                            <span className="text-xs font-black font-mono bg-slate-950 text-slate-200 px-2 py-0.5 rounded border border-white/5">
                              {pred.homeScore} - {pred.awayScore}
                            </span>
                          </div>

                          {/* Result status label badge */}
                          <div className="mt-1 flex items-center justify-end">
                            {pred.status === 'correct' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold font-mono text-emerald-400 bg-emerald-950/40 px-1.5 border border-emerald-500/20 rounded">
                                <CheckCircle2 className="h-3 w-3" /> SUCCESS (+{pred.pointsEarned} PTS)
                              </span>
                            ) : pred.status === 'incorrect' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold font-mono text-red-400 bg-red-950/40 px-1.5 border border-red-500/20 rounded">
                                <XCircle className="h-3 w-3" /> MISSED (0 PTS)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold font-mono text-amber-400 bg-amber-950/40 px-1.5 border border-amber-500/20 rounded animate-pulse">
                                <Clock className="h-3 w-3" /> MATCH PENDING
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Global leaderboard stats ranking table */
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950 p-4 shadow-sm font-sans space-y-3.5">
              <div className="flex items-center gap-1 pb-1.5 border-b border-white/5">
                <Trophy className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest leading-none">
                  World Prediction Tables
                </h4>
              </div>

              <div className="space-y-2.5">
                {leaderboard.map((item, idx) => {
                  const isCur = item.userId === user.uid;

                  return (
                    <div
                      key={item.userId}
                      className={`p-3 rounded-xl flex items-center justify-between gap-3 ${
                        isCur
                          ? 'bg-emerald-950/20 border border-emerald-500/30'
                          : 'bg-slate-900 border border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 text-xs text-slate-300">
                        {/* Trophy badges for Top 3 */}
                        <div className="w-6 text-center select-none font-black font-mono">
                          {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                        </div>

                        <div>
                          <h4 className={`font-bold ${isCur ? 'text-emerald-300' : 'text-slate-100'}`}>
                            {item.displayName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Accuracy: {item.accuracy}% &middot; {item.points} PTS
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          {item.points} PTS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
