import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, Send, AlertCircle, Flame, Lightbulb, Zap } from 'lucide-react';
import { getGenerativeModel, ChatSession } from "firebase/ai";
import { ai } from './firebaseConfig';

// AI Model Initialization
const model = getGenerativeModel(ai, { model: "gemini-3.5-flash" });

interface Message {
  role: 'user' | 'model';
  content: string;
}

// A simple component to render text content while preserving whitespace and newlines.
const MarkdownContent = ({ content }: { content: string }) => {
  return (
    <div className="text-xs whitespace-pre-wrap font-mono">
      {content}
    </div>
  );
};

export default function TestKitchenHub() {
  const [activeSubTab, setActiveSubTab] = useState<'trends' | 'optimizer'>('trends');
  const [userInput, setUserInput] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const chatRef = useRef<ChatSession | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const startChat = () => {
    setSessionError(null);
    setMessages([]);
    chatRef.current = model.startChat({
      systemInstruction: `You are a world-class executive chef and culinary director for an upscale, modern restaurant. Your expertise lies in menu engineering, flavor pairing, and innovative dish creation. Respond to prompts with creativity, precision, and a deep understanding of both classic techniques and current food trends. Provide detailed recipes, costing analysis, or conceptual feedback as requested.`,
    });
  };

  const handleNewSession = () => {
    startChat();
  };

  useEffect(() => {
    if (activeSubTab === 'optimizer' && !chatRef.current) {
      startChat();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isGenerating || !chatRef.current) return;

    const userMessage: Message = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsGenerating(true);
    setSessionError(null);

    try {
      const result = await chatRef.current.sendMessage(userInput);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      setSessionError(error.message || "Failed to generate AI response. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 min-h-screen bg-black text-zinc-300">
      
      {/* HEADER SECTION: NAVIGATIONAL ARCHITECTURE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2 uppercase">
            <Sparkles className="w-6 h-6 text-emerald-500" /> Test Kitchen <span className="text-zinc-600">Hub</span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-widest">Advanced R\&D Terminal \& Commodity Intelligence Shell</p>
        </div>
        
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900">
          <button
            onClick={() => setActiveSubTab('trends')}
            className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'trends' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Trend Analysis
          </button>
          <button
            onClick={() => setActiveSubTab('optimizer')}
            className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'optimizer' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Recipe Optimizer
          </button>
        </div>
      </div>

      {/* SUB-VIEW NODE 1: CULINARY TREND ANALYSIS MATRIX */}
      {activeSubTab === 'trends' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4 hover:border-zinc-700 transition-colors shadow-lg">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500"><Flame className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-900/10 px-2 py-0.5 rounded uppercase tracking-tighter">Rising Fast</span>
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Garum-Based Fermentation</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-mono">Usage of ancient fish sauce techniques across non-traditional proteins (beef, venison) to enhance umami profiles without overt salinity.</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4 hover:border-zinc-700 transition-colors shadow-lg">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-900/20 rounded-lg text-blue-500"><Lightbulb className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold text-blue-500 bg-blue-900/10 px-2 py-0.5 rounded uppercase tracking-tighter">New Logic</span>
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hyper-Local Foraging</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-mono">Shift towards 5-mile radius ingredient sourcing for micro-seasonal adjustments in garniture and plating aesthetics.</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4 hover:border-zinc-700 transition-colors shadow-lg">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500"><Flame className="w-5 h-5" /></div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-900/10 px-2 py-0.5 rounded uppercase tracking-tighter">Hot Trend</span>
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Zero-Waste Citrus</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-mono">Utilizing entire fruit cycles (pith salts, dehydrated peel powders, fermented juice) to lower COGS and increase sustainability.</p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles className="w-32 h-32 text-emerald-500" /></div>
            <div className="relative z-10 max-w-2xl space-y-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Seasonal Intelligence Brief</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Our intelligence engine has identified a 14% increase in consumer interest for <span className="text-emerald-400">upcycled protein off-cuts</span>.
                Consider integrating heart or tongue preparations into the upcoming spring menu cycle to capture this margin-positive trend.
              </p>
              <button onClick={() => setActiveSubTab('optimizer')} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded-lg transition-colors uppercase tracking-widest shadow-lg shadow-emerald-900/20">
                Open Optimizer Shell
              </button>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-6 px-1">R\&D Visual Archives</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Card A */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg">
                <div className="h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800">
                  <span className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80')` }}></span>
                  <span className="relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400">🍖 Butcher Room</span>
                </div>
                <div className="p-4 bg-zinc-950">
                  <h4 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">Dry-Aged Wagyu Techniques</h4>
                </div>
              </div>

              {/* Card B */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg">
                <div className="h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800">
                  <span className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80')` }}></span>
                  <span className="relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400">🥗 Sourcing Matrix</span>
                </div>
                <div className="p-4 bg-zinc-950">
                  <h4 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">Hyper-localized Heirloom Vegetables</h4>
                </div>
              </div>

              {/* Card C */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg">
                <div className="h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800">
                  <span className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80')` }}></span>
                  <span className="relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400">🍯 Kitchen Operations</span>
                </div>
                <div className="p-4 bg-zinc-950">
                  <h4 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">Zero-Waste Fermented Garnishes</h4>
                </div>
              </div>

              {/* Card D */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg">
                <div className="h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800">
                  <span className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80')` }}></span>
                  <span className="relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400">🏺 Saucier Station</span>
                </div>
                <div className="p-4 bg-zinc-950">
                  <h4 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">Modernized 19th Century French Sauces</h4>
                </div>
              </div>

              {/* Card E */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg">
                <div className="h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800">
                  <span className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80')` }}></span>
                  <span className="relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400">🥫 Pantry Imports</span>
                </div>
                <div className="p-4 bg-zinc-950">
                  <h4 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">Tinned Fish \& Gourmet Conservas</h4>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW NODE 2: AI RECIPE OPTIMIZER NODE INTERFACE */}
      {activeSubTab === 'optimizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn font-mono tracking-tight"
        >
          
          {/* Main Chat Interface Body (Left 2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 min-h-[350px] flex flex-col justify-between relative shadow-lg">
              
              {/* Upper System Status Guidance Banner */}
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Interactive Formula Engineering Shell
                </div>
                <button onClick={handleNewSession} className="text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                  <RefreshCw className="w-3 h-3" /> New Session
                </button>
              </div>

              {/* Central Stream Terminal Container */}
              <div ref={chatContainerRef} className="flex-1 p-4 my-4 overflow-y-auto h-96">
                {messages.length === 0 && !isGenerating ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-xs text-zinc-600 uppercase max-w-md leading-relaxed tracking-wider">
                      Brainstorm and develop brand-new dishes from scratch. Get AI guidance on trending ingredients, flavor pairings, and precise menu costing adjustments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((msg, index) => (
                      <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>}
                        <div className={`max-w-xl p-3 rounded-xl ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-200' : 'bg-transparent'}`}>
                          <MarkdownContent content={msg.content} />
                        </div>
                      </div>
                    ))}
                    {isGenerating && messages[messages.length - 1]?.role === 'user' && (
                       <div className="flex gap-3 justify-start">
                         <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>
                         <div className="max-w-xl p-3 rounded-xl">
                           <span className="animate-pulse text-zinc-500">...</span>
                         </div>
                       </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lower Input Box Terminal */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-3">
                <div className="relative">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Describe a dish concept you want to develop, ingredients you want to work with..."
                    className="w-full bg-zinc-950 border border-zinc-800 p-3.5 pr-12 rounded-xl text-xs focus:outline-none focus:border-zinc-700 text-zinc-200 placeholder:text-zinc-700 font-mono disabled:opacity-50"
                    disabled={isGenerating}
                  />
                  <button type="submit" disabled={isGenerating} className="absolute right-3 top-3 text-zinc-700 hover:text-emerald-500 transition-colors disabled:opacity-50 disabled:hover:text-zinc-700">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Simulated Handshake Error Feedback Alert (Matches Screenshot exactly) */}
            {sessionError && (
              <div className="bg-zinc-950 border border-red-950 rounded-xl p-3 flex justify-between items-center shadow-md animate-slideUp">
                <div className="flex items-center gap-2.5 text-red-400 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0 text-red-500" /><span className="uppercase tracking-wider">{sessionError}</span></div>
                <button 
                  onClick={() => setSessionError(null)}
                  className="text-[9px] uppercase font-bold tracking-widest bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-800 transition-colors"
                >
                  Clear Status
                </button>
              </div>
            )}
          </div>

          {/* Context Criteria Side Sidebar (Right 1/3) */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-500" /> Co-Pilot Engineering Anchors
            </h3>
            
            <div className="space-y-3 text-[11px] text-zinc-500 leading-relaxed uppercase">
              <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                <span className="font-bold text-zinc-400 block mb-1">Target Margin Guardrails</span>
                Align ingredients natively against the custom <span className="text-blue-400">30% target ceiling matrix</span> to maximize plate yields.
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                <span className="font-bold text-zinc-400 block mb-1">Dynamic Saucier Assist</span>
                Auto-calculate batch reductions and emulsion stability benchmarks during ingredient ingestion passes.
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
