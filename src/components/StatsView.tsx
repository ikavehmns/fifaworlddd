import { useState } from 'react';
import { Match, TopScorer, MVPPlayer } from '../types';
import { topScorers, mvpRankings } from '../data/worldCupData';
import { Sparkles, Trophy, Loader2, Award, Zap, Heart, CheckCircle, Flame, ShieldAlert, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StatsViewProps {
  matches: Match[];
  userId: string;
  isPremium: boolean;
  onUpgrade: () => void;
}

interface AIAnalysisResult {
  probabilities: { home: number; draw: number; away: number };
  predictedScore: string;
  keyMatchup: string;
  tacticalAnalysis: string;
  playerAvailability: string;
}

export default function StatsView({
  matches,
  userId,
  isPremium,
  onUpgrade
}: StatsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'scorers' | 'mvp' | 'ai'>('ai');
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matches[2]?.id || matches[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  // Loading messages for reassuring UX
  const loaderMessages = [
    'Scanning head-to-head history stats...',
    'Analyzing current team roster availability...',
    'Simulating 1,000 matches with Gemini AI tactical module...',
    'Reviewing formation strength and midfield transition dynamics...',
    'Finalizing match expected probabilities report...'
  ];

  const triggerAIPrediction = async () => {
    if (!selectedMatchId) return;
    setIsLoading(true);
    setAiAnalysis(null);

    // Rotate messages for amazing UX
    let msgIdx = 0;
    setLoadingMessage(loaderMessages[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loaderMessages.length;
      setLoadingMessage(loaderMessages[msgIdx]);
    }, 1800);

    try {
      const response = await fetch('/api/predict-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchId: selectedMatchId,
          userId
        })
      });

      const resData = await response.json();
      if (resData.error) {
        throw new Error(resData.error);
      }
      setAiAnalysis(resData.analysis);
    } catch (error) {
      console.error('AI predicting error: ', error);
    } finally {
      clearInterval(msgInterval);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab control toggle */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-none bg-zinc-900 border border-zinc-800 select-none">
        {[
          { id: 'ai', label: '🔮 Premium AI' },
          { id: 'scorers', label: '⚽ Golden Boot' },
          { id: 'mvp', label: '🏆 MVP Rank' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`py-2 text-[10px] uppercase tracking-wider transition-all duration-200 font-bold ${
              activeSubTab === tab.id
                ? 'bg-neon-green text-black font-black italic border border-black'
                : 'text-zinc-500 hover:text-white'
            }`}
            id={`btn-sub-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'scorers' && (
        <div className="overflow-hidden rounded-none border border-zinc-900 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-2">
            <Trophy className="h-5 w-5 text-neon-green" />
            <h3 className="text-xs font-black text-white uppercase tracking-[0.12em] font-display italic">
              Golden Boot Leaderboard
            </h3>
          </div>

          <div className="space-y-4">
            {topScorers.map((scorer, idx) => {
              // Calculate width ratio for visual visualizer
              const goalsRatio = (scorer.goals / 6) * 100;

              return (
                <div key={idx} className="space-y-1.5 bg-zinc-950 p-3 border border-zinc-900 select-none">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-500 w-3">
                        #{scorer.rank}
                      </span>
                      <span className="text-base select-none">{scorer.flag}</span>
                      <div className="leading-tight">
                        <h4 className="font-bold text-slate-200">{scorer.name}</h4>
                        <span className="text-[10px] text-slate-400">{scorer.team}</span>
                      </div>
                    </div>
                    
                    <div className="text-right font-mono">
                      <span className="text-xs font-black text-neon-green uppercase italic">{scorer.goals} Goals</span>
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider mt-0.5">{scorer.assists} AST · {scorer.matchesPlayed} GP</span>
                    </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="h-2 w-full bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
                    <div
                      className="h-full bg-neon-green"
                      style={{ width: `${Math.min(goalsRatio, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'mvp' && (
        <div className="overflow-hidden rounded-none border border-zinc-900 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-2">
            <Award className="h-5 w-5 text-neon-green" />
            <h3 className="text-xs font-black text-white uppercase tracking-[0.12em] font-display italic animate-none">
              Tournament MVP Ratings
            </h3>
          </div>

          <div className="space-y-3">
            {mvpRankings.map((player, idx) => (
              <div key={idx} className="flex gap-3 bg-zinc-950 p-3.5 border border-zinc-900 hover:border-zinc-805 transition-all select-none">
                {/* Ranking Emblem */}
                <div className="flex flex-col items-center justify-center bg-zinc-90 w-10 h-10 border border-zinc-800 text-center font-mono">
                  <span className="text-[8px] text-zinc-650 uppercase font-black leading-none">Rank</span>
                  <span className="text-sm font-black text-neon-green leading-none mt-0.5">{player.rank}</span>
                </div>

                {/* Player details */}
                <div className="flex-1 font-sans text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <span>{player.flag}</span>
                      <span className="font-extrabold font-display uppercase tracking-tight text-[11px] text-white">{player.name}</span>
                      <span className="text-[8px] bg-zinc-900 text-zinc-500 font-bold font-mono px-1 rounded uppercase tracking-wider">
                        {player.position}
                      </span>
                    </div>
                    
                    <span className="font-mono text-neon-green font-black bg-[#00FF85]/10 border border-neon-green/20 px-1.5 py-0.5 rounded text-[10px] tracking-tight">
                      ⭐ {player.rating}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal font-sans">
                    {player.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'ai' && (
        <div className="space-y-4">
          {!isPremium ? (
            /* Premium Sales pitch block if user is Free account */
            <div className="overflow-hidden rounded-none border border-zinc-800 bg-black p-5 shadow-xl relative select-none">
              <div className="absolute top-0 right-0 p-3 select-none opacity-20">
                <Sparkles className="h-8 w-8 text-neon-green animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-none bg-[#00FF85]/10 border border-neon-green/35 px-2.5 py-0.5 text-[8.5px] font-black text-neon-green font-mono tracking-widest uppercase mb-3">
                ★ PREMIUM FEATURE
              </div>

              <h3 className="text-sm font-black text-white tracking-[0.11em] uppercase leading-snug mb-2 font-display italic">
                Get Tactical Reports & Forecast Predictions with Gemini AI
              </h3>
              
              <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-5 uppercase font-bold tracking-tight">
                Unlock detailed strategic insights, formations previews, player-availability details, and expected outcome probability charts based on real squads and starting lists.
              </p>

              {/* Bullet checks */}
              <div className="space-y-2 mb-6 text-[10.5px] font-sans text-zinc-300 uppercase font-black tracking-wide">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-neon-green shrink-0" />
                  <span>Interactive probability metrics charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-neon-green shrink-0" />
                  <span>Under-the-hood formations & tactical previews</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-neon-green shrink-0" />
                  <span>Ad-Free matches tracking</span>
                </div>
              </div>

              <button
                onClick={onUpgrade}
                className="w-full rounded-none bg-neon-green hover:bg-white text-black py-3 text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] border border-black cursor-pointer italic font-display duration-200"
                id="btn-stats-upgrade"
              >
                <span>Upgrade to Match Premium &rsaquo;</span>
              </button>
            </div>
          ) : (
            /* Loaded Premium AI prediction engine interface */
            <div className="overflow-hidden rounded-none border border-zinc-900 bg-black/60 p-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-neon-green" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest font-display italic">
                    AI Predictions Suite
                  </h3>
                </div>
                
                <span className="text-[9px] font-mono font-black text-neon-green bg-[#00FF85]/15 border border-neon-green/30 px-2 py-0.5 rounded-none uppercase tracking-widest">
                  PRO Mode Active
                </span>
              </div>

              {/* Fixture Selector dropdown */}
              <div className="space-y-3 font-sans">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase font-black text-zinc-500 tracking-widest leading-none block">
                    Select World Cup Fixture
                  </label>
                  <select
                    value={selectedMatchId}
                    onChange={(e) => {
                      setSelectedMatchId(e.target.value);
                      setAiAnalysis(null);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-none px-3 py-2.5 text-xs text-zinc-300 font-sans cursor-pointer focus:outline-none focus:border-neon-green uppercase font-bold"
                    id="select-match-ai"
                  >
                    {matches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.homeTeam.flag} {m.homeTeam.name} vs {m.awayTeam.name} {m.awayTeam.flag} ({m.date.split('-')[1]}/{m.date.split('-')[2]})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={triggerAIPrediction}
                  disabled={isLoading}
                  className="w-full rounded-none bg-neon-green hover:bg-white text-black py-2.5 text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.98] border border-black italic font-display duration-200 cursor-pointer disabled:opacity-50"
                  id="btn-trigger-ai"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span>Running tactical models...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="h-3.5 w-3.5 text-black fill-current" />
                      <span>Generate Gemini Tactical Prediction</span>
                    </>
                  )}
                </button>
              </div>

              {/* Ticking loader if active */}
              {isLoading && (
                <div className="mt-4 p-8 text-center bg-zinc-950 rounded-none border border-zinc-900 space-y-3 flex flex-col justify-center items-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-10 w-10 border border-neon-green/15 animate-ping" />
                    <Loader2 className="h-6 w-6 animate-spin text-neon-green" />
                  </div>
                  <p className="text-xs font-mono font-black text-neon-green animate-pulse tracking-wide uppercase italic">
                    {loadingMessage}
                  </p>
                  <p className="text-[9px] text-zinc-500 max-w-xs leading-normal uppercase font-bold tracking-wide">
                    Gemini AI is analyzing rosters, historical charts and formations.
                  </p>
                </div>
              )}

              {/* Display Result Analysis card */}
              {aiAnalysis && (
                <div className="mt-4 space-y-4 pt-3 border-t border-zinc-900 font-sans text-xs">
                  
                  {/* Score forecast flag */}
                  <div className="p-3 text-center bg-zinc-950 border border-zinc-900 rounded-none space-y-1 select-none">
                    <span className="text-[9px] font-mono uppercase font-black text-zinc-500 tracking-widest block">
                      Expected Predicted Outcome
                    </span>
                    <h4 className="text-sm font-black font-mono text-neon-green uppercase italic">
                      {aiAnalysis.predictedScore}
                    </h4>
                  </div>

                  {/* Probability charts */}
                  <div className="space-y-2 select-none">
                    <span className="text-[9px] font-mono uppercase font-black text-zinc-500 tracking-widest block leading-none">
                      Win Probability split
                    </span>
                    <div className="flex h-5 w-full rounded-none overflow-hidden text-[9px] text-black font-black font-mono shadow-sm border border-zinc-900 bg-zinc-950">
                      {/* Home odds */}
                      <div
                        className="bg-neon-green flex items-center justify-center transition-all duration-300"
                        style={{ width: `${aiAnalysis.probabilities.home}%` }}
                      >
                        {selectedMatch?.homeTeam.code} ({aiAnalysis.probabilities.home}%)
                      </div>
                      {/* Draw odds */}
                      <div
                        className="bg-zinc-400 flex items-center justify-center border-l border-r border-black/10 transition-all duration-300"
                        style={{ width: `${aiAnalysis.probabilities.draw}%` }}
                      >
                        DRAW ({aiAnalysis.probabilities.draw}%)
                      </div>
                      {/* Away odds */}
                      <div
                        className="bg-zinc-600 text-white flex items-center justify-center transition-all duration-300"
                        style={{ width: `${aiAnalysis.probabilities.away}%` }}
                      >
                        {selectedMatch?.awayTeam.code} ({aiAnalysis.probabilities.away}%)
                      </div>
                    </div>
                  </div>

                  {/* Matchup highlights bulletin card */}
                  <div className="space-y-3 pt-1 select-none">
                    {/* Key matchup */}
                    <div className="bg-zinc-950 p-3 rounded-none border border-zinc-800 space-y-1.5">
                      <h4 className="font-extrabold uppercase tracking-widest text-[9.5px] text-neon-green font-display italic">
                        ⚡ Elite Matchup Duel
                      </h4>
                      <p className="text-zinc-300 leading-normal text-[11px] font-medium font-sans">
                        {aiAnalysis.keyMatchup}
                      </p>
                    </div>

                    {/* Tactical summary */}
                    <div className="bg-zinc-950 p-3 rounded-none border border-zinc-800 space-y-1.5">
                      <h4 className="font-extrabold uppercase tracking-widest text-[9.5px] text-neon-green font-display italic">
                        🛡️ Formations & Tactical Scheme
                      </h4>
                      <p className="text-zinc-300 leading-normal text-[11px] font-medium font-sans">
                        {aiAnalysis.tacticalAnalysis}
                      </p>
                    </div>

                    {/* Availability */}
                    <div className="bg-zinc-950 p-3 rounded-none border border-zinc-800 space-y-1.5">
                      <h4 className="font-extrabold uppercase tracking-widest text-[9.5px] text-neon-green font-display italic">
                        📋 Squad Depth & Roster Report
                      </h4>
                      <p className="text-zinc-300 leading-normal text-[11px] font-medium font-sans">
                        {aiAnalysis.playerAvailability}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
