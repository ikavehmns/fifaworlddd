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

  // پیام‌های چرخان لودینگ شبیه‌سازی هوش مصنوعی
  const loaderMessages = [
    'در حال آنالیز آمار و تاریخچه بازی‌های رو در رو...',
    'در حال ارزیابی ترکیب فعلی تیم‌ها و بازیکنان غایب...',
    'شبیه‌سازی ۱,۰۰۰ سناریوی بازی با موتور تاکتیکی هوش مصنوعی جمینی...',
    'بررسی سیستم چیدمان و الگوهای انتقال هافبک‌ها...',
    'نهایی‌سازی گزارش پیش‌بینی و جدول احتمالات برد...'
  ];

  const triggerAIPrediction = async () => {
    if (!selectedMatchId) return;
    setIsLoading(true);
    setAiAnalysis(null);

    // تغییر نوبتی پیام‌ها جهت پویایی فرآیند آنالیز
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
    <div className="space-y-4 text-right" dir="rtl">
      {/* دکمه‌های ناوبری تغییر بخش‌های آماری */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-sm bg-zinc-900 border border-zinc-800 select-none">
        {[
          { id: 'ai', label: '🔮 هوش مصنوعی ویژه' },
          { id: 'scorers', label: '⚽ کفش طلا' },
          { id: 'mvp', label: '🏆 برترین بازیکنان' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`py-2 text-[10px] font-black tracking-wider transition-all duration-200 rounded-sm ${
              activeSubTab === tab.id
                ? 'bg-green-400 text-black italic border border-black'
                : 'text-zinc-500 hover:text-white'
            }`}
            id={`btn-sub-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'scorers' && (
        <div className="overflow-hidden rounded-xl border border-zinc-900 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-2">
            <Trophy className="h-5 w-5 text-green-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wide font-display italic">
              جدول رده‌بندی کفش طلا
            </h3>
          </div>

          <div className="space-y-4">
            {topScorers.map((scorer, idx) => {
              // محاسبه درصد پهنای نوار پیشرفت گرافیکی
              const goalsRatio = (scorer.goals / 6) * 100;

              return (
                <div key={idx} className="space-y-1.5 bg-zinc-950 p-3 border border-zinc-900 select-none rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-500 w-3">
                        #{scorer.rank}
                      </span>
                      <span className="text-base select-none">{scorer.flag}</span>
                      <div className="leading-tight text-right">
                        <h4 className="font-bold text-slate-200">{scorer.name}</h4>
                        <span className="text-[10px] text-slate-400">{scorer.team}</span>
                      </div>
                    </div>
                    
                    <div className="text-left font-mono">
                      <span className="text-xs font-black text-green-400 uppercase italic">{scorer.goals} گل</span>
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider mt-0.5">{scorer.assists} پاس گل · {scorer.matchesPlayed} بازی</span>
                    </div>
                  </div>

                  {/* نوار گرافیکی میزان گل‌های زده */}
                  <div className="h-2 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden flex justify-end">
                    <div
                      className="h-full bg-green-400 rounded-full"
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
        <div className="overflow-hidden rounded-xl border border-zinc-900 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-2">
            <Award className="h-5 w-5 text-green-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wide font-display italic animate-none">
              ارزشمندترین بازیکنان جام (MVP)
            </h3>
          </div>

          <div className="space-y-3">
            {mvpRankings.map((player, idx) => (
              <div key={idx} className="flex gap-3 bg-zinc-950 p-3.5 border border-zinc-900 hover:border-zinc-800 transition-all select-none rounded-xl">
                {/* مدال رتبه‌بندی */}
                <div className="flex flex-col items-center justify-center bg-zinc-90 w-10 h-10 border border-zinc-800 text-center font-mono rounded">
                  <span className="text-[8px] text-zinc-500 uppercase font-black leading-none">رتبه</span>
                  <span className="text-sm font-black text-green-400 leading-none mt-0.5">{player.rank}</span>
                </div>

                {/* جزئیات مشخصات بازیکن */}
                <div className="flex-1 font-sans text-xs text-right">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <span>{player.flag}</span>
                      <span className="font-extrabold font-display uppercase tracking-tight text-[11px] text-white">{player.name}</span>
                      <span className="text-[8px] bg-zinc-900 text-zinc-500 font-bold font-mono px-1 rounded uppercase tracking-wider">
                        {player.position}
                      </span>
                    </div>
                    
                    <span className="font-mono text-green-400 font-black bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded text-[10px] tracking-tight">
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
            /* معرفی قابلیت پرمیوم برای کاربران غیر ویژه */
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black p-5 shadow-xl relative select-none text-right">
              <div className="absolute top-0 left-0 p-3 select-none opacity-20">
                <Sparkles className="h-8 w-8 text-green-400 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded bg-green-400/10 border border-green-400/35 px-2.5 py-0.5 text-[8.5px] font-black text-green-400 font-mono tracking-widest uppercase mb-3">
                ★ قابلیت ویژه پرمیوم
              </div>

              <h3 className="text-sm font-black text-white tracking-normal leading-snug mb-2 font-display italic">
                دریافت گزارش‌های استراتژیک و پیش‌بینی نتایج با هوش مصنوعی Gemini
              </h3>
              
              <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-5 font-bold">
                قفل تحلیل‌های جزئی، چیدمان‌ها، وضعیت بازیکنان محروم و مصدوم و همچنین نمودار تخمین احتمال برد را براساس لیست واقعی بازیکنان شروع‌کننده بازی باز کنید.
              </p>

              {/* موارد ویژه */}
              <div className="space-y-2 mb-6 text-[10.5px] font-sans text-zinc-300 font-black tracking-wide">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span>نمودار احتمال تعاملی شانس پیروزی</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span>پیش‌نمایش چیدمان و سیستم تاکتیکی پنهان تیم‌ها</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span>دنبال کردن بازی‌ها در محیطی کاملاً بدون تبلیغات</span>
                </div>
              </div>

              <button
                onClick={onUpgrade}
                className="w-full rounded-xl bg-green-400 hover:bg-white text-black py-3 text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] border border-black cursor-pointer italic font-display duration-200"
                id="btn-stats-upgrade"
              >
                <span>ارتقا به بلیت ویژه مسابقات ›</span>
              </button>
            </div>
          ) : (
            /* پنل فعال پیش‌بینی زنده با هوش مصنوعی برای کاربران ویژه */
            <div className="overflow-hidden rounded-xl border border-zinc-900 bg-black/60 p-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wide font-display italic">
                    مجموعه پیش‌بینی هوش مصنوعی
                  </h3>
                </div>
                
                <span className="text-[9px] font-mono font-black text-green-400 bg-green-400/15 border border-green-400/30 px-2 py-0.5 rounded-sm uppercase tracking-widest">
                  حالت حرفه‌ای فعال
                </span>
              </div>

              {/* لیست کشویی مسابقات */}
              <div className="space-y-3 font-sans">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase font-black text-zinc-500 tracking-wider leading-none block">
                    مسابقه جام جهانی را انتخاب کنید
                  </label>
                  <select
                    value={selectedMatchId}
                    onChange={(e) => {
                      setSelectedMatchId(e.target.value);
                      setAiAnalysis(null);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-sans cursor-pointer focus:outline-none focus:border-green-400 uppercase font-bold text-right"
                    id="select-match-ai"
                  >
                    {matches.map(m => (
                      <option key={m.id} value={m.id} className="text-right">
                        {m.homeTeam.flag} {m.homeTeam.name} در برابر {m.awayTeam.name} {m.awayTeam.flag} ({m.date.split('-')[1]}/{m.date.split('-')[2]})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={triggerAIPrediction}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-green-400 hover:bg-white text-black py-2.5 text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.98] border border-black italic font-display duration-200 cursor-pointer disabled:opacity-50"
                  id="btn-trigger-ai"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span>در حال اجرای مدل‌های تاکتیکی...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="h-3.5 w-3.5 text-black fill-current" />
                      <span>تولید گزارش و پیش‌بینی جمینی (Gemini)</span>
                    </>
                  )}
                </button>
              </div>

              {/* لودر فرآیند پردازش */}
              {isLoading && (
                <div className="mt-4 p-8 text-center bg-zinc-950 rounded-xl border border-zinc-900 space-y-3 flex flex-col justify-center items-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-10 w-10 border border-green-400/15 animate-ping rounded-full" />
                    <Loader2 className="h-6 w-6 animate-spin text-green-400" />
                  </div>
                  <p className="text-xs font-mono font-black text-green-400 animate-pulse tracking-wide uppercase italic">
                    {loadingMessage}
                  </p>
                  <p className="text-[9px] text-zinc-500 max-w-xs leading-normal uppercase font-bold tracking-wide">
                    هوش مصنوعی در حال بررسی ترکیب‌ها، آمارهای تاریخی و سیستم‌های بازی است.
                  </p>
                </div>
              )}

              {/* کارت جزئیات آنالیز نتایج جمینی */}
              {aiAnalysis && (
                <div className="mt-4 space-y-4 pt-3 border-t border-zinc-900 font-sans text-xs">
                  
                  {/* نتیجه حدودی پیش‌بینی شده */}
                  <div className="p-3 text-center bg-zinc-950 border border-zinc-900 rounded-xl space-y-1 select-none">
                    <span className="text-[9px] font-mono uppercase font-black text-zinc-500 tracking-wider block">
                      نتیجه حدودی پیش‌بینی شده مسابقه
                    </span>
                    <h4 className="text-sm font-black font-mono text-green-400 uppercase italic">
                      {aiAnalysis.predictedScore}
                    </h4>
                  </div>

                  {/* چارت احتمال برنده شدن */}
                  <div className="space-y-2 select-none text-right">
                    <span className="text-[9px] font-mono uppercase font-black text-zinc-500 tracking-wider block leading-none">
                      درصد احتمال پیروزی تیم‌ها
                    </span>
                    <div className="flex h-6 w-full rounded-lg overflow-hidden text-[9px] text-black font-black font-mono shadow-sm border border-zinc-900 bg-zinc-950">
                      {/* شانس پیروزی میزبان */}
                      <div
                        className="bg-green-400 flex items-center justify-center transition-all duration-300"
                        style={{ width: `${aiAnalysis.probabilities.home}%` }}
                      >
                        {selectedMatch?.homeTeam.code} ({aiAnalysis.probabilities.home}%)
                      </div>
                      {/* شانس مساوی */}
                      <div
                        className="bg-zinc-400 flex items-center justify-center border-l border-r border-black/10 transition-all duration-300"
                        style={{ width: `${aiAnalysis.probabilities.draw}%` }}
                      >
                        مساوی ({aiAnalysis.probabilities.draw}%)
                      </div>
                      {/* شانس پیروزی میهمان */}
                      <div
                        className="bg-zinc-600 text-white flex items-center justify-center transition-all duration-300"
                        style={{ width: `${aiAnalysis.probabilities.away}%` }}
                      >
                        {selectedMatch?.awayTeam.code} ({aiAnalysis.probabilities.away}%)
                      </div>
                    </div>
                  </div>

                  {/* تحلیل‌های متنی هوش مصنوعی */}
                  <div className="space-y-3 pt-1 select-none">
                    {/* دوئل کلیدی */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-1.5">
                      <h4 className="font-extrabold uppercase tracking-wide text-[9.5px] text-green-400 font-display italic">
                        ⚡ تقابل کلیدی و سرنوشت‌ساز بازی
                      </h4>
                      <p className="text-zinc-300 leading-normal text-[11px] font-medium font-sans">
                        {aiAnalysis.keyMatchup}
                      </p>
                    </div>

                    {/* چیدمان‌های تاکتیکی */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-1.5">
                      <h4 className="font-extrabold uppercase tracking-wide text-[9.5px] text-green-400 font-display italic">
                        🛡️ سیستم‌های بازی و چیدمان‌های تاکتیکی
                      </h4>
                      <p className="text-zinc-300 leading-normal text-[11px] font-medium font-sans">
                        {aiAnalysis.tacticalAnalysis}
                      </p>
                    </div>

                    {/* دسترسی به بازیکنان */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-1.5">
                      <h4 className="font-extrabold uppercase tracking-wide text-[9.5px] text-green-400 font-display italic">
                        📋 عمق ترکیب و محرومیت/مصدومیت‌ها
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
