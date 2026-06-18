import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, Send, AlertCircle, Flame, Lightbulb, Zap } from 'lucide-react';
import { getAI, getGenerativeModel, GoogleAIBackend, ChatSession } from "firebase/ai";
import { app } from './firebaseConfig';

// AI Model Initialization
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (!apiKey) {
  // This is a common setup issue.
  throw new Error("VITE_FIREBASE_API_KEY is not set. Please add it to your .env file.");
}

const ai = getAI(app); // The API key is passed via the app instance.
const model = getGenerativeModel(ai, { model: "gemini-1.5-flash" });

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
      systemInstruction: {
        parts: [{
          text: `You are a world-class executive chef and culinary director for an upscale, modern restaurant. Your expertise lies in menu engineering, flavor pairing, and innovative dish creation. Respond to prompts with creativity, precision, and a deep understanding of both classic techniques and current food trends. Provide detailed recipes, costing analysis, or conceptual feedback as requested.`
        }]
      },
    });
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
  }, [messages]);

  const handleNewSession = () => {
    startChat();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isGenerating || !chatRef.current) return;

    setIsGenerating(true);
    setSessionError(null);
    const userMessage: Message = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    const prompt = userInput;
    setUserInput('');

    try {
      const result = await chatRef.current.sendMessageStream(prompt);
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', content: modelResponse }]);

      for await (const chunk of result.stream) {
        modelResponse += chunk.text();
        setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: modelResponse } : msg));
      }
    } catch (error: any) {
      setSessionError(error.message || "An error occurred while communicating with the AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-zinc-100 selection:bg-emerald-800">
      
      {/* SECTION CONTAINER HEADER */}
      <div className="border-b border-zinc-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-wider uppercase">Test Kitchen & Trend Matrix</h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">
            Develop new dishes and reform existing profiles with real-time AI assistance
          </p>
        </div>
        
        {/* Toggle Controls matching original sub-tab layout */}
        <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner">
          <button
            onClick={() => setActiveSubTab('trends')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all border ${
              activeSubTab === 'trends'
                ? 'bg-zinc-900 text-emerald-400 border-zinc-700 shadow-md'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent'
            }`}
          >
            Hot Trends
          </button>
          <button
            onClick={() => setActiveSubTab('optimizer')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 border ${
              activeSubTab === 'optimizer'
                ? 'bg-zinc-900 text-emerald-400 border-zinc-700 shadow-md'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Dish Optimizer
          </button>
        </div>
      </div>

      {/* SUB-VIEW NODE 1: HOT TRENDS OVERVIEW */}
      {activeSubTab === 'trends' && (
        <div className="space-y-6 animate-fadeIn font-mono tracking-tight">
          
          {/* Executive Intelligence Summary Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Sector Market Summary
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-5xl">
              The upscale wine bar segment is currently driven by "luxury-lite" experiences, where guests prioritize visually intricate appetizers and high-provenance proteins over traditional heavy entrees. Sustainability and transparency in sourcing, particularly regarding "Heritage" and "Regenerative" labels, have become mandatory for the 2026 luxury consumer.
            </p>
          </div>

          {/* Graphical Concept Catalog Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
              <Flame className="w-4 h-4 text-orange-500" /> Hot Consumer Vectors
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Card A */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg">
                <div className="h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800">
                  <span className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80')` }}></span>
                  <span className="relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400">🥩 Protein Component</span>
                </div>
                <div className="p-4 bg-zinc-950">
                  <h4 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">Regenerative Agriculture Proteins</h4>
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
                  <h4 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">Tinned Fish & Gourmet Conservas</h4>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW NODE 2: AI RECIPE OPTIMIZER NODE INTERFACE */}
      {activeSubTab === 'optimizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn font-mono tracking-tight"
          // This logic is being moved into the component itself
          // The user's request is to implement the chat functionality
          // I will now proceed with the implementation
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