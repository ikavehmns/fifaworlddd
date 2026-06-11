import { useState, useEffect } from 'react';
import { X, ExternalLink, HelpCircle } from 'lucide-react';

interface AdProps {
  isPremium: boolean;
  type?: 'banner' | 'interstitial';
}

export default function AdBanner({ isPremium, type = 'banner' }: AdProps) {
  const [showAd, setShowAd] = useState(true);

  if (isPremium) return null;

  const ads = [
    {
      title: 'Real Magic, Real Matchday',
      brand: 'Coca-Cola',
      text: 'Grab an ice-cold Coke and fuel your World Cup passion. Share the magic!',
      cta: 'Buy Now',
      bg: 'from-red-600 to-red-800',
    },
    {
      title: 'Mundial 2026 Epic Odds',
      brand: 'DraftKings',
      text: 'Place your prediction on upcoming Group A matches and get 10x back in free bets!',
      cta: 'Bet Safely',
      bg: 'from-green-700 to-slate-900',
    },
    {
      title: 'Fly Better to North America',
      brand: 'Emirates',
      text: 'Official Airline of MUNDIAL 2026. Book your flights to SoFi, MetLife or Azteca now.',
      cta: 'Explore Flights',
      bg: 'from-red-700 to-rose-600',
    },
  ];

  const randomAd = ads[Math.floor((Date.now() / 15000) % ads.length)];

  if (type === 'banner') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r p-3 text-white shadow-md transition-all duration-300 transform hover:-translate-y-0.5 border border-white/5 my-3 bg-slate-900">
        <div className={`absolute inset-0 bg-gradient-to-r ${randomAd.bg} opacity-85`} />
        
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider bg-black/40 px-1.5 py-0.5 rounded text-yellow-300 font-bold">
                Sponsored Ad
              </span>
              <span className="text-xs font-semibold font-mono text-white/95">
                {randomAd.brand}
              </span>
            </div>
            <h4 className="text-sm font-bold tracking-tight text-white line-clamp-1">
              {randomAd.title}
            </h4>
            <p className="text-xs text-white/80 line-clamp-1 font-sans">
              {randomAd.text}
            </p>
          </div>
          <button className="whitespace-nowrap rounded bg-white px-3 py-1.5 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100 flex items-center gap-1 active:scale-95">
            <span>{randomAd.cta}</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // Interstitial Ad
  if (!showAd) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in animate-duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 p-6 text-white text-center shadow-2xl">
        <button
          onClick={() => setShowAd(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/75 hover:text-white transition-colors border border-white/5"
          id="btn-close-ad"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-yellow-400 text-[10px] font-mono tracking-widest uppercase font-bold mb-4">
          Sponsored break
        </div>

        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 bg-gradient-to-tr ${randomAd.bg} flex items-center justify-center text-2xl font-black shadow-lg`}>
          🏆
        </div>

        <h3 className="text-lg font-black tracking-tight mb-2">
          {randomAd.title}
        </h3>
        <p className="text-sm text-slate-300 px-2 mb-6">
          {randomAd.text}
        </p>

        <div className="space-y-2">
          <button 
            onClick={() => setShowAd(false)}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-98 transition-transform"
          >
            {randomAd.cta}
          </button>
          <button 
            onClick={() => setShowAd(false)}
            className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Skip Ad in 1s
          </button>
        </div>

        <p className="text-[10px] text-slate-500 mt-6 flex items-center justify-center gap-1">
          <HelpCircle className="h-3 w-3" /> Remove ads instantly by subscribing to WC Premium!
        </p>
      </div>
    </div>
  );
}
