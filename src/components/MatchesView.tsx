import { useState } from 'react';
import { Match, GroupStandings, UserPrediction } from '../types';
import { Calendar, Play, CheckCircle, Shield, Goal, AlertCircle, TrendingUp, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MatchesViewProps {
  matches: Match[];
  groups: GroupStandings[];
  userId: string;
  userPredictions: UserPrediction[];
  onPredict: (matchId: string, homeScore: number, awayScore: number) => void;
  isPremium: boolean;
}

export default function MatchesView({
  matches = [],
  groups = [],
  userId,
  userPredictions = [],
  onPredict,
  isPremium
}: MatchesViewProps) {
  const [filterTab, setFilterTab] = useState<'live' | 'schedule' | 'results' | 'groups'>('live');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Score Predict Inputs state map
  const [predictScores, setPredictScores] = useState<Record<string, { home: number; away: number }>>({});

  const hasLiveMatches = (matches || []).some(m => m.status === 'live');

  const filteredMatches = (matches || []).filter(m => {
    if (filterTab === 'live') return m.status === 'live';
    if (filterTab === 'schedule') return m.status === 'upcoming';
    if (filterTab === 'results') return m.status === 'finished';
    return false;
  });

  const getPredictionForMatch = (matchId: string) => {
    return userPredictions.find(p => p.matchId === matchId);
  };

  const incrementHome = (matchId: string) => {
    const current = predictScores[matchId] || { home: 0, away: 0 };
    setPredictScores({
      ...predictScores,
      [matchId]: { ...current, home: current.home + 1 }
    });
  };

  const decrementHome = (matchId: string) => {
    const current = predictScores[matchId] || { home: 0, away: 0 };
    if (current.home === 0) return;
    setPredictScores({
      ...predictScores,
      [matchId]: { ...current, home: current.home - 1 }
    });
  };

  const incrementAway = (matchId: string) => {
    const current = predictScores[matchId] || { home: 0, away: 0 };
    setPredictScores({
      ...predictScores,
      [matchId]: { ...current, away: current.away + 1 }
    });
  };

  const decrementAway = (matchId: string) => {
    const current = predictScores[matchId] || { home: 0, away: 0 };
    if (current.away === 0) return;
    setPredictScores({
      ...predictScores,
      [matchId]: { ...current, away: current.away - 1 }
    });
  };

  const handlePredictSubmit = (matchId: string) => {
    const state = predictScores[matchId] || { home: 0, away: 0 };
    onPredict(matchId, state.home, state.away);
  };

  return (
    <div className="space-y-4">
      {/* Visual filter tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-none bg-zinc-900 border border-zinc-800 select-none">
        {[
          { id: 'live', label: '🔴 LIVE' },
          { id: 'schedule', label: '📅 Matches' },
          { id: 'results', label: '✅ Results' },
          { id: 'groups', label: '📊 Groups' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`py-2 text-[10px] uppercase tracking-widest transition-all duration-200 ${
              filterTab === tab.id
                ? 'bg-neon-green text-black font-black italic border border-black'
                : 'text-zinc-500 hover:text-white font-bold h-full'
            }`}
            id={`tab-${tab.id}`}
          >
            {tab.id === 'live' && hasLiveMatches ? (
              <span className="flex items-center justify-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-black italic">LIVE</span>
              </span>
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      {filterTab === 'groups' ? (
        <div className="space-y-6">
          {groups.map((grp, gIdx) => (
            <div key={gIdx} className="overflow-hidden rounded-none border border-zinc-900 bg-black/60 p-4">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-black text-white tracking-[0.15em] font-display uppercase italic">
                  ⚡ {grp.groupName}
                </h3>
                <span className="text-[8px] font-mono tracking-widest text-[#00FF85] uppercase font-bold">
                  MUNDIAL '26 Stage 1
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                  <thead>
                    <tr className="text-[9px] text-zinc-500 font-mono uppercase font-black tracking-widest border-b border-zinc-900 pb-1">
                      <th className="py-2">Country</th>
                      <th className="py-2 text-center w-8">P</th>
                      <th className="py-2 text-center w-8">GD</th>
                      <th className="py-2 text-center w-10">PTS</th>
                      <th className="py-2 text-center w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-xs">
                    {grp.standings.map((stand, sIdx) => (
                      <tr key={sIdx} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-2.5 flex items-center gap-2 font-medium text-slate-200">
                          <span className="text-zinc-600 text-[10px] w-3 font-mono">
                            {sIdx + 1}
                          </span>
                          <span className="text-base leading-none select-none">
                            {stand.flag}
                          </span>
                          <span className="font-extrabold uppercase font-display tracking-tight text-xs">{stand.name}</span>
                          <span className="text-[10px] tracking-wider font-mono text-zinc-600 font-bold uppercase">
                            {stand.code}
                          </span>
                        </td>
                        <td className="py-2 text-center font-mono text-zinc-400">
                          {stand.played}
                        </td>
                        <td className="py-2 text-center font-mono text-zinc-400">
                          {stand.gd > 0 ? `+${stand.gd}` : stand.gd}
                        </td>
                        <td className="py-2 text-center font-mono text-neon-green font-black text-xs italic">
                          {stand.points}
                        </td>
                        <td className="py-2 text-center">
                          {stand.status === 'Q' ? (
                            <span className="inline-block bg-neon-green/10 border border-neon-green/30 px-2 py-0.5 text-[8.5px] font-black text-neon-green font-mono uppercase tracking-wider">
                              Q
                            </span>
                          ) : stand.status === 'E' ? (
                            <span className="inline-block bg-red-950/20 border border-red-500/30 px-2 py-0.5 text-[8.5px] font-black text-red-500 font-mono uppercase tracking-wider">
                              E
                            </span>
                          ) : (
                            <span className="inline-block bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[8px] font-bold text-zinc-650 font-mono uppercase tracking-wider">
                              --
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.length === 0 ? (
            <div className="text-center rounded-2xl bg-slate-950 p-8 border border-white/5 text-slate-400 space-y-2">
              <div className="text-3xl">⚽</div>
              <h4 className="font-bold text-sm text-slate-200">No {filterTab} matches</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {filterTab === 'live' 
                  ? 'There are no active matches in play right now. Take a look at the upcoming Schedule tab to submit predictions!'
                  : 'Check back later for matches schedules.'}
              </p>
              {filterTab === 'live' && (
                <button
                  onClick={() => setFilterTab('schedule')}
                  className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                >
                  View Schedule &rsaquo;
                </button>
              )}
            </div>
          ) : (
            filteredMatches.map(match => {
              const pred = getPredictionForMatch(match.id);
              const customScore = predictScores[match.id] || { home: 0, away: 0 };
              const isEventSelected = selectedMatch?.id === match.id;

              return (
                <div
                  key={match.id}
                  className="overflow-hidden rounded-none border border-zinc-900 bg-black/40 shadow-xl transition-all duration-300"
                >
                  {/* Header metadata row */}
                  <div className="flex items-center justify-between bg-zinc-950 px-4 py-2 border-b border-zinc-900 select-none">
                    <span className="text-[9px] font-mono tracking-wider text-zinc-500 font-bold uppercase">
                      STAD: {match.stadium.split(',')[0].toUpperCase()}
                    </span>
                    <span className="text-[9px] font-black text-neon-green font-mono bg-[#00FF85]/10 px-2 py-0.5 border border-neon-green/20 uppercase tracking-widest leading-none">
                      {match.group}
                    </span>
                  </div>

                  {/* Scoreboard visual row */}
                  <div className="p-4 flex items-center justify-between text-white relative">
                    {/* Home Team */}
                    <div className="flex flex-col items-center justify-center flex-1 text-center select-none">
                      <span className="text-3xl filter drop-shadow mb-1.5 transition-transform duration-200 hover:scale-105">
                        {match.homeTeam.flag}
                      </span>
                      <h4 className="text-xs font-black tracking-tighter max-w-[100px] text-white line-clamp-1 font-display uppercase italic">
                        {match.homeTeam.name}
                      </h4>
                      <span className="text-[9.5px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                        {match.homeTeam.code}
                      </span>
                    </div>

                    {/* Arena Score Node */}
                    <div className="flex flex-col items-center justify-center px-4 shrink-0 min-w-[100px]">
                      {match.status === 'live' ? (
                        <>
                          <div className="text-2xl font-black font-mono tracking-tighter bg-red-950/20 text-red-500 border border-red-550/30 px-3 py-1 flex items-center gap-1 italic rounded-sm leading-none">
                            <span>{match.homeScore}</span>
                            <span className="animate-pulse mx-0.5 text-xs text-red-500">:</span>
                            <span>{match.awayScore}</span>
                          </div>
                          
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-mono font-black text-red-500 animate-pulse uppercase tracking-widest italic">
                              LIVE {match.minute}'
                            </span>
                          </div>
                        </>
                      ) : match.status === 'finished' ? (
                        <>
                          <div className="text-2xl font-black font-display tracking-tighter text-zinc-100 bg-zinc-900 px-3 py-1 rounded-sm leading-none border border-zinc-805 italic">
                            {match.homeScore} - {match.awayScore}
                          </div>
                          
                          <span className="mt-1.5 text-[9px] font-black text-zinc-500 font-mono tracking-widest uppercase flex items-center gap-1">
                            ● FULL TIME
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-black font-mono text-zinc-200 bg-zinc-900 border border-zinc-805 px-3 py-1.5 rounded-sm text-center leading-none tracking-wider select-none uppercase">
                            {match.time}
                          </div>
                          
                          <span className="mt-1.5 text-[9px] font-black text-neon-green font-mono tracking-widest uppercase">
                            {match.date.split('-')[1]}/{match.date.split('-')[2]}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center justify-center flex-1 text-center select-none">
                      <span className="text-3xl filter drop-shadow mb-1.5 transition-transform duration-200 hover:scale-105">
                        {match.awayTeam.flag}
                      </span>
                      <h4 className="text-xs font-black tracking-tighter max-w-[100px] text-white line-clamp-1 font-display uppercase italic">
                        {match.awayTeam.name}
                      </h4>
                      <span className="text-[9.5px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                        {match.awayTeam.code}
                      </span>
                    </div>
                  </div>

                  {/* Realtime Events & Lineup Collapse button */}
                  {match.status !== 'upcoming' && (
                    <div className="border-t border-white/5 bg-slate-900/40">
                      <button
                        onClick={() => setSelectedMatch(isEventSelected ? null : match)}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                        id={`btn-toggle-events-${match.id}`}
                      >
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide">
                          <Goal className="h-3.5 w-3.5 text-emerald-400" />
                          {match.status === 'live' ? 'View Live Events Stream' : 'View Core Events & Lineups'}
                        </span>
                        {isEventSelected ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      <AnimatePresence>
                        {isEventSelected && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden border-t border-white/5 divide-y divide-white/5"
                          >
                            {/* Live Events Stream ticker */}
                            <div className="p-4 bg-slate-950 font-sans space-y-3">
                              <h5 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                                📊 Events Log Timeline
                              </h5>
                              <div className="relative border-l border-white/5 pl-4 ml-2 space-y-3">
                                {match.events.length === 0 ? (
                                  <div className="text-slate-500 text-xs py-1">Ready for kickoff...</div>
                                ) : (
                                  match.events.slice().reverse().map((ev, evIdx) => (
                                    <div key={ev.id} className="relative text-xs">
                                      {/* Event bullet point */}
                                      <div className={`absolute -left-[21px] top-0.5 h-2 w-2 rounded-full border border-black ${
                                        ev.type === 'goal' ? 'bg-emerald-400 ring-2 ring-emerald-400/20' :
                                        ev.type === 'yellow_card' ? 'bg-amber-400' :
                                        ev.type === 'red_card' ? 'bg-red-500' : 'bg-slate-400'
                                      }`} />

                                      <div className="flex items-baseline justify-between">
                                        <div className="font-semibold text-slate-200">
                                          {ev.type === 'goal' && '⚽ GOAL! '}
                                          {ev.type === 'yellow_card' && '🟨 Card '}
                                          {ev.type === 'red_card' && '🟥 Red Card '}
                                          {ev.type === 'substitution' && '🔄 Sub '}
                                          {ev.type === 'kickoff' && '⏱️ '}
                                          {ev.type === 'fulltime' && '🏁 '}
                                          {ev.player}
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500">{ev.minute}'</span>
                                      </div>
                                      {ev.detail && <p className="text-[11px] text-slate-400 mt-0.5">{ev.detail}</p>}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Lineups section if present */}
                            {match.lineups && (
                              <div className="p-4 bg-slate-900/60 font-sans space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Home Lineup */}
                                  <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-2 flex items-center gap-1">
                                      🛡️ {match.homeTeam.name} ({match.lineups.home.formation})
                                    </h5>
                                    <div className="space-y-1">
                                      {match.lineups.home.starting.map((p, pIdx) => (
                                        <div key={pIdx} className="flex items-center justify-between text-[11px] text-slate-300">
                                          <span>{p.name}</span>
                                          <span className="font-mono text-[9px] text-slate-500 font-bold bg-slate-950 px-1 rounded">{p.position} {p.number}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Away Lineup */}
                                  <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-2 flex items-center gap-1">
                                      ⚡ {match.awayTeam.name} ({match.lineups.away.formation})
                                    </h5>
                                    <div className="space-y-1">
                                      {match.lineups.away.starting.map((p, pIdx) => (
                                        <div key={pIdx} className="flex items-center justify-between text-[11px] text-slate-300">
                                          <span>{p.name}</span>
                                          <span className="font-mono text-[9px] text-slate-500 font-bold bg-slate-950 px-1 rounded">{p.position} {p.number}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                      {/* Inline predictions card drawer */}
                  {match.status === 'upcoming' && (
                    <div className="bg-zinc-950 border-t border-zinc-900 p-4 font-sans space-y-3">
                      <div className="flex items-center justify-between select-none">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-display italic">
                          🔮 PREDICTION PANEL
                        </span>
                        
                        {pred ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-neon-green bg-[#00FF85]/10 px-2 py-0.5 border border-neon-green/25 uppercase tracking-wider">
                            LOCKED: {pred.homeScore} - {pred.awayScore}
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest font-bold">
                            NO FORECAST REGISTERED
                          </span>
                        )}
                      </div>

                      {/* Score dials */}
                      <div className="flex items-center justify-between gap-4 bg-black p-3 border border-zinc-900">
                        {/* Home selection */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-500 font-black">{match.homeTeam.code}</span>
                          <button
                            onClick={() => decrementHome(match.id)}
                            className="bg-zinc-90 w-7 h-7 border border-zinc-800 text-white flex items-center justify-center font-black text-base active:bg-zinc-850 hover:bg-zinc-850"
                            id={`btn-dec-home-${match.id}`}
                          >
                            -
                          </button>
                          <span className="text-xs font-black font-mono text-neon-green w-5 text-center">
                            {customScore.home}
                          </span>
                          <button
                            onClick={() => incrementHome(match.id)}
                            className="bg-zinc-90 w-7 h-7 border border-zinc-800 text-white flex items-center justify-center font-black text-base active:bg-zinc-850 hover:bg-zinc-850"
                            id={`btn-inc-home-${match.id}`}
                          >
                            +
                          </button>
                        </div>

                        <span className="text-xs font-black text-zinc-650">:</span>

                        {/* Away selection */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementAway(match.id)}
                            className="bg-zinc-90 w-7 h-7 border border-zinc-800 text-white flex items-center justify-center font-black text-base active:bg-zinc-850 hover:bg-zinc-850"
                            id={`btn-dec-away-${match.id}`}
                          >
                            -
                          </button>
                          <span className="text-xs font-black font-mono text-neon-green w-5 text-center">
                            {customScore.away}
                          </span>
                          <button
                            onClick={() => incrementAway(match.id)}
                            className="bg-zinc-90 w-7 h-7 border border-zinc-800 text-white flex items-center justify-center font-black text-base active:bg-zinc-850 hover:bg-zinc-850"
                            id={`btn-inc-away-${match.id}`}
                          >
                            +
                          </button>
                          <span className="text-[10px] font-mono text-zinc-500 font-black">{match.awayTeam.code}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePredictSubmit(match.id)}
                        className="w-full bg-neon-green hover:bg-white text-black py-2.5 text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.98] border border-black italic font-display duration-200 cursor-pointer"
                        id={`btn-submit-predict-${match.id}`}
                      >
                        {pred ? 'Modify Score Prediction' : 'Lock Prediction & Submit'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
