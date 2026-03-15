import React, { useState, useEffect } from 'react';
import { InterestType, CalculationInput, CalculationResult, Language, HistoryItem } from './types';
import { TRANSLATIONS, LANGUAGES } from './translations';
import { calculateInterest } from './services/interestService';
import Logo from './components/Logo';
import { trackEvent, trackPageView } from './services/analytics';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calc' | 'history' | 'youtube' | 'plan'>('calc');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'te');
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('app_theme') || 'amber');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('calc_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState<CalculationInput>({
    principal: 10000,
    rate: 2,
    isAnnualRate: false,
    useMonthsInput: true,
    durationMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    interestType: InterestType.SIMPLE,
    compoundingFrequencyMonths: 12
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];

  const themeColors = [
    { name: 'Amber', class: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-600', value: 'amber' },
    { name: 'Emerald', class: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-600', value: 'emerald' },
    { name: 'Indigo', class: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-600', value: 'indigo' },
    { name: 'Rose', class: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-600', value: 'rose' },
    { name: 'Violet', class: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-600', value: 'violet' },
    { name: 'Slate', class: 'bg-slate-700', border: 'border-slate-700', text: 'text-slate-700', value: 'slate' },
  ];

  const getThemeClass = (type: 'bg' | 'text' | 'border' | 'shadow' | 'from' | 'to', weight: number = 500) => {
    if (themeColor === 'slate' && weight === 500) weight = 700;
    return `${type}-${themeColor}-${weight}`;
  };

  const currentThemeHex = themeColor === 'slate' ? '#334155' : (themeColor === 'amber' ? '#d97706' : (themeColor === 'emerald' ? '#059669' : (themeColor === 'indigo' ? '#4f46e5' : (themeColor === 'rose' ? '#e11d48' : '#7c3aed'))));

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('calc_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    trackPageView(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'plan' && result && !aiAdvice && !loadingAdvice) {
      fetchAdvice();
    }
  }, [activeTab, result]);

  const fetchAdvice = async () => {
    if (!result) return;
    setLoadingAdvice(true);
    try {
      const { getFinancialAdvice } = await import('./services/geminiService');
      const advice = await getFinancialAdvice(result, lang);
      setAiAdvice(advice);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInput(prev => ({
      ...prev,
      [name]: (name === 'principal' || name === 'rate' || name === 'durationMonths') 
        ? (value === '' ? 0 : parseFloat(value)) 
        : value
    }));
  };

  const handleCalculate = () => {
    const res = calculateInterest(input);
    setResult(res);
    setAiAdvice(''); // Reset advice for new calculation
    
    trackEvent('calculate', { 
      principal: input.principal, 
      rate: input.rate, 
      type: input.interestType 
    });

    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      input: { ...input },
      result: res
    };
    setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
  };

  const handleCopyResult = () => {
    if (!result) return;
    const shareText = `💰 *${t.TITLE}* 💰\n\n💵 *అసలు:* ₹${result.principal.toLocaleString('en-IN')}\n📈 *నెలవారీ వడ్డీ:* ₹${result.monthlyInterest.toLocaleString('en-IN')}\n📅 *కాలం:* ${result.years}సం ${result.months}నె ${result.days}రో\n✅ *మొత్తం:* ₹${result.totalAmount.toLocaleString('en-IN')}\n\n_Calculated using VS APPS_`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareResult = async (res: CalculationResult) => {
    const shareText = `💰 *${t.TITLE}* 💰\n\n💵 *అసలు:* ₹${res.principal.toLocaleString('en-IN')}\n📈 *నెలవారీ వడ్డీ:* ₹${res.monthlyInterest.toLocaleString('en-IN')}\n✅ *మొత్తం:* ₹${res.totalAmount.toLocaleString('en-IN')}\n\n_VS APPS_`;
    if (navigator.share) {
      try { await navigator.share({ title: t.TITLE, text: shareText }); } catch (e) {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
    }
  };

  return (
    <div className={`flex flex-col h-screen max-w-xl mx-auto bg-slate-50/30 relative overflow-hidden shadow-2xl border-x border-slate-100`}>
      
      {/* Compact Header */}
      <header className={`bg-gradient-to-br ${getThemeClass('from', 500)} ${getThemeClass('to', 600)} text-white px-4 py-2.5 rounded-b-3xl shadow-lg z-20 relative flex items-center justify-between`}>
        <div className="flex items-center space-x-2 overflow-hidden">
          <Logo themeColor={currentThemeHex} className="flex-shrink-0" />
          <div className="flex flex-col truncate">
            <h1 className="text-base font-black heading-font tracking-tight leading-none truncate">{t.TITLE}</h1>
            <p className="text-white/80 text-[7px] font-bold uppercase tracking-wider opacity-80 truncate">{t.SUBTITLE}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)} 
          className="flex-shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-md transition-colors ripple flex items-center space-x-1.5 border border-white/10"
        >
          <i className="fa-solid fa-circle-question text-[10px]"></i>
          <span className="text-[10px] font-black uppercase tracking-wider">{t.HELP_BTN}</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-5 pb-32 space-y-6">
        
        {activeTab === 'calc' && (
          <div className="space-y-6 animate-slide-up">
            {!result ? (
              <>
                {/* Principal Input */}
                <section className="bg-white rounded-[1.8rem] p-6 shadow-premium border border-slate-50">
                  <label className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 block">{t.PRINCIPAL}</label>
                  <div className={`flex items-center space-x-4 bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:${getThemeClass('border', 500)} transition-all`}>
                    <span className={`text-2xl font-black ${getThemeClass('text', 600)}`}>₹</span>
                    <input type="number" name="principal" value={input.principal || ''} onChange={handleInputChange} inputMode="numeric" className="bg-transparent text-3xl font-black w-full outline-none text-slate-900 placeholder:text-slate-200" placeholder="0" />
                  </div>
                </section>

                {/* Rate Input */}
                <section className="bg-white rounded-[1.8rem] p-6 shadow-premium border border-slate-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 block leading-none">{input.isAnnualRate ? t.RATE_ANNUAL : t.RATE_MONTHLY}</label>
                      <div className={`bg-slate-50 p-4 rounded-xl border-2 border-transparent focus-within:${getThemeClass('border', 500)} transition-all`}>
                        <input type="number" name="rate" value={input.rate || ''} onChange={handleInputChange} inputMode="decimal" className="bg-transparent text-xl font-black w-full outline-none text-slate-800" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 block leading-none">{t.RATE_TYPE}</label>
                      <button onClick={() => setInput(p => ({...p, isAnnualRate: !p.isAnnualRate}))} className={`w-full h-[60px] ${getThemeClass('bg', 600)} text-white rounded-xl text-[10px] font-black px-2 uppercase shadow-md ripple flex items-center justify-center text-center leading-tight`}>
                        {input.isAnnualRate ? 'Annual %' : t.VILLAGE_STYLE}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Duration */}
                <section className="bg-white rounded-[1.8rem] p-6 shadow-premium border border-slate-50">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-black text-slate-800 uppercase tracking-widest">{t.DURATION}</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => setInput(p => ({...p, useMonthsInput: true}))} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${input.useMonthsInput ? `bg-white shadow-sm ${getThemeClass('text', 600)}` : 'text-slate-500'}`}>{t.MONTHS}</button>
                      <button onClick={() => setInput(p => ({...p, useMonthsInput: false}))} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${!input.useMonthsInput ? `bg-white shadow-sm ${getThemeClass('text', 600)}` : 'text-slate-500'}`}>{t.DATES}</button>
                    </div>
                  </div>
                  {input.useMonthsInput ? (
                    <div className="bg-slate-50 p-5 rounded-2xl flex items-center space-x-4 shadow-inner">
                      <i className={`fa-solid fa-clock ${getThemeClass('text', 600)} text-lg`}></i>
                      <input type="number" name="durationMonths" value={input.durationMonths || ''} onChange={handleInputChange} inputMode="numeric" className="bg-transparent text-xl font-black w-full outline-none text-slate-800" placeholder={t.MONTHS} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" name="startDate" value={input.startDate} onChange={handleInputChange} className="p-4 bg-slate-50 rounded-xl outline-none font-black text-slate-800 text-xs shadow-inner border border-slate-100" />
                      <input type="date" name="endDate" value={input.endDate} onChange={handleInputChange} className="p-4 bg-slate-50 rounded-xl outline-none font-black text-slate-800 text-xs shadow-inner border border-slate-100" />
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="space-y-6 animate-slide-up">
                {/* Result Controls */}
                <div className="flex justify-between items-center">
                  <button onClick={() => setResult(null)} className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100 ripple">
                    <i className="fa-solid fa-arrow-left mr-1.5"></i> {t.CLEAR}
                  </button>
                  <div className="flex space-x-2">
                    <button onClick={handleCopyResult} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm border border-slate-100 ripple relative">
                      <i className="fa-solid fa-copy text-sm"></i>
                      {copied && <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[7px] py-1 px-1.5 rounded-md whitespace-nowrap">COPIED!</span>}
                    </button>
                    <button onClick={() => handleShareResult(result)} className={`w-10 h-10 flex items-center justify-center rounded-xl ${getThemeClass('bg', 600)} text-white shadow-lg ripple`}>
                      <i className="fa-solid fa-share-nodes text-sm"></i>
                    </button>
                  </div>
                </div>

                {/* Highlight Card: Monthly Interest */}
                <div className={`bg-gradient-to-br ${getThemeClass('from', 600)} ${getThemeClass('to', 800)} rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden`}>
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <i className="fa-solid fa-calendar-check text-7xl"></i>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1.5">{t.MONTHLY_AVG}</p>
                   <h3 className="text-4xl font-black mb-1">₹{result.monthlyInterest.toLocaleString('en-IN')}</h3>
                   <p className="text-xs font-bold opacity-80">ప్రతి నెల అయ్యే వడ్డీ (Monthly Interest)</p>
                </div>

                {/* Breakdown Card */}
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-100 space-y-6">
                   <div className="flex justify-between items-end border-b border-slate-50 pb-5">
                      <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.PRINCIPAL}</p>
                        <p className="text-2xl font-black text-slate-800">₹{result.principal.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.INTEREST}</p>
                        <p className={`text-2xl font-black ${getThemeClass('text', 600)}`}>₹{result.totalInterest.toLocaleString('en-IN')}</p>
                      </div>
                   </div>

                   <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                         <div className={`w-10 h-10 ${getThemeClass('bg', 50)} rounded-xl flex items-center justify-center ${getThemeClass('text', 500)} text-sm`}>
                            <i className="fa-solid fa-hourglass-start"></i>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Duration</p>
                            <p className="text-sm font-black text-slate-700">{result.years}y {result.months}m {result.days}d</p>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-0.5">{t.TOTAL}</p>
                        <p className="text-xl font-black text-slate-900 leading-none">₹{result.totalAmount.toLocaleString('en-IN')}</p>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-lg font-black text-slate-800 mb-3">{t.HISTORY}</h2>
            {history.length === 0 ? (
               <div className="py-20 text-center text-slate-300">
                  <i className="fa-solid fa-ghost text-3xl mb-3"></i>
                  <p className="text-xs font-black uppercase tracking-widest">{t.NO_HISTORY}</p>
               </div>
            ) : (
              history.map(item => (
                <div key={item.id} onClick={() => { 
                  setInput(item.input); 
                  setResult(item.result); 
                  setActiveTab('calc');
                  trackEvent('history_item_click', { id: item.id });
                }} className="bg-white p-4 rounded-xl border border-slate-50 shadow-sm flex justify-between items-center ripple">
                   <div>
                      <p className="text-base font-black text-slate-800">₹{item.result.principal.toLocaleString('en-IN')}</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">{item.result.totalDays} days @ {item.input.rate}%</p>
                   </div>
                   <div className="text-right">
                      <p className={`text-sm font-black ${getThemeClass('text', 600)}`}>+₹{item.result.totalInterest.toLocaleString('en-IN')}</p>
                      <p className="text-[8px] font-bold text-slate-300 uppercase">{new Date(item.timestamp).toLocaleDateString()}</p>
                   </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* YouTube Tab */}
        {activeTab === 'youtube' && (
          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">{t.YOUTUBE_TITLE}</h2>
              <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Live Channel</span>
            </div>
            
            <div className={`bg-white rounded-[2.5rem] overflow-hidden shadow-premium border ${getThemeClass('border', 100)}`}>
              <div className="aspect-video w-full bg-slate-900">
                <iframe 
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/yfRO89PlXMg?si=5H8Hq5SDcusNTBRV" 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-black text-slate-800 mb-1">Devotional AI Videos</h3>
                <p className="text-[10px] text-slate-400 mb-5 font-bold uppercase tracking-wider">Spiritual Wisdom via AI</p>
                <a 
                  href="https://www.youtube.com/@devotional-ai-videos/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-3 bg-red-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs shadow-xl shadow-red-100 ripple transition-transform hover:scale-105 active:scale-95"
                >
                  <i className="fa-brands fa-youtube text-base"></i>
                  <span>{t.WATCH_VIDEOS}</span>
                </a>
              </div>
            </div>

            <div className={`${getThemeClass('bg', 100)}/50 p-5 rounded-3xl border ${getThemeClass('border', 200)}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${getThemeClass('bg', 400)} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                  <i className="fa-solid fa-bell text-xs"></i>
                </div>
                <div>
                  <h4 className={`text-[10px] font-black ${getThemeClass('text', 800)} uppercase mb-1`}>Stay Blessed</h4>
                  <p className={`text-[10px] ${getThemeClass('text', 700)} leading-relaxed font-medium`}>
                    Subscribe to our channel for daily devotional content, mantras, and spiritual stories powered by Artificial Intelligence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan Tab */}
        {activeTab === 'plan' && (
          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">{t.PLAN_TITLE}</h2>
              {result && (
                <button onClick={fetchAdvice} disabled={loadingAdvice} className={`text-[9px] font-black ${getThemeClass('text', 600)} uppercase tracking-widest ${getThemeClass('bg', 50)} px-3 py-1.5 rounded-lg border ${getThemeClass('border', 100)}`}>
                  {loadingAdvice ? 'Refreshing...' : 'Refresh AI'}
                </button>
              )}
            </div>
            
            {!result ? (
              <div className="py-20 text-center text-slate-300">
                <i className="fa-solid fa-wand-magic-sparkles text-3xl mb-3"></i>
                <p className="text-[9px] font-black uppercase tracking-widest">Calculate first to see plan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Advice Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl border border-slate-700">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className={`w-6 h-6 ${getThemeClass('bg', 500)} rounded-full flex items-center justify-center`}>
                      <i className="fa-solid fa-brain text-[10px]"></i>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${getThemeClass('text', 400)}`}>AI Financial Insight</span>
                  </div>
                  {loadingAdvice ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-2 bg-slate-700 rounded w-full"></div>
                      <div className="h-2 bg-slate-700 rounded w-5/6"></div>
                      <div className="h-2 bg-slate-700 rounded w-4/6"></div>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-200 italic">
                      "{aiAdvice || "No advice generated yet. Tap refresh to get AI insights."}"
                    </p>
                  )}
                </div>

                {/* Projection Table */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.PROJECTION}</h3>
                  <div className="space-y-3">
                    {[1, 3, 6, 12, 24].map(m => {
                      const tempInput = { ...input, durationMonths: m, useMonthsInput: true };
                      const tempRes = calculateInterest(tempInput);
                      return (
                        <div key={m} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-xs font-black text-slate-600">{m} {t.MONTHS_UNIT}</span>
                          <span className={`text-xs font-black ${getThemeClass('text', 600)}`}>₹{tempRes.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky Action Button for Calc */}
      {activeTab === 'calc' && !result && (
        <div className="fixed bottom-24 left-0 right-0 max-w-xl mx-auto px-6 z-20">
          <button 
            onClick={handleCalculate} 
            className={`w-full ${getThemeClass('bg', 600)} text-white font-black py-5 rounded-[1.8rem] shadow-2xl ripple text-lg flex items-center justify-center space-x-3 transform active:scale-95 transition-transform border-4 border-white`}
          >
            <i className="fa-solid fa-calculator text-xl"></i>
            <span>{t.CALCULATE}</span>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto glass border-t border-slate-100 flex items-center justify-around h-20 px-4 pb-2 z-30">
        <button onClick={() => setActiveTab('calc')} className={`flex flex-col items-center transition-all ${activeTab === 'calc' ? `${getThemeClass('text', 600)} scale-110` : 'text-slate-400'}`}>
          <i className="fa-solid fa-calculator text-base mb-1"></i>
          <span className="text-[10px] font-black uppercase">Calc</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center transition-all ${activeTab === 'history' ? `${getThemeClass('text', 600)} scale-110` : 'text-slate-400'}`}>
          <i className="fa-solid fa-clock-rotate-left text-base mb-1"></i>
          <span className="text-[10px] font-black uppercase">History</span>
        </button>
        <button onClick={() => setActiveTab('youtube')} className={`flex flex-col items-center transition-all ${activeTab === 'youtube' ? 'text-red-600 scale-110' : 'text-slate-400'}`}>
          <i className="fa-brands fa-youtube text-base mb-1"></i>
          <span className="text-[10px] font-black uppercase">Videos</span>
        </button>
        <button onClick={() => setActiveTab('plan')} className={`flex flex-col items-center transition-all ${activeTab === 'plan' ? `${getThemeClass('text', 600)} scale-110` : 'text-slate-400'}`}>
          <i className="fa-solid fa-wand-magic-sparkles text-base mb-1"></i>
          <span className="text-[10px] font-black uppercase">Plan</span>
        </button>
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end">
           <div className="bg-white w-full rounded-t-[2rem] p-8 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-6"></div>
              
              <h2 className="text-xl font-black mb-4">Theme Color / రంగు</h2>
              <div className="grid grid-cols-6 gap-3 mb-8">
                {themeColors.map(c => (
                  <button 
                    key={c.value} 
                    onClick={() => { setThemeColor(c.value); localStorage.setItem('app_theme', c.value); }}
                    className={`w-full aspect-square rounded-full ${c.class} border-4 ${themeColor === c.value ? 'border-slate-200' : 'border-transparent'} shadow-sm`}
                  />
                ))}
              </div>

              <h2 className="text-xl font-black mb-4">Language / భాష</h2>
              <div className="grid grid-cols-2 gap-2.5 mb-8">
                 {LANGUAGES.map(l => (
                   <button key={l.code} onClick={() => { setLang(l.code); localStorage.setItem('app_lang', l.code); setShowSettings(false); }} className={`p-3.5 rounded-xl border-2 font-black text-[11px] ${lang === l.code ? `${getThemeClass('border', 500)} ${getThemeClass('bg', 50)}` : 'border-slate-50'}`}>
                     {l.native}
                   </button>
                 ))}
              </div>

              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className={`w-full ${getThemeClass('bg', 500)} text-white font-black py-4 rounded-xl text-sm mb-3 flex items-center justify-center space-x-2 shadow-lg ${themeColor === 'amber' ? 'shadow-amber-100' : ''}`}
                >
                  <i className="fa-solid fa-download"></i>
                  <span>Install App / యాప్‌ని ఇన్‌స్టాల్ చేయండి</span>
                </button>
              )}

              <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-sm">Close</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;