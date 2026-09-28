import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ArrowRight,
  Database
} from 'lucide-react';
import type { CampaignCopilotResponse } from '../../types/campaign';
import api from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenGenerator: () => void;
  institutionName?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  dataPoints?: string[];
  followups?: string[];
  actionBtnText?: string;
  actionRoute?: string;
  timestamp: Date;
}

export const CampaignCopilotDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenGenerator,
  institutionName
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: "Hello! I am your **Admissions Marketing AI Copilot**. I analyze real-time campaign funnels, cost per enrollment (CAC), counselor response latencies, and geographic conversion rates across all school campuses.\n\nAsk me anything or pick a quick question below!",
      followups: [
        "Which campaign produced the highest ROI?",
        "Which campaign produced highest ROI for Grade 11 Science?",
        "Where is our biggest admissions funnel leak?",
        "What are our top performing PIN codes?"
      ],
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputText.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.post('/api/campaigns/intelligence/copilot', {
        query: q,
        schoolFilter: institutionName || localStorage.getItem('selectedInstitutionName') || 'Assigned Institution',
        sessionFilter: '2026–2027'
      });
      const data: CampaignCopilotResponse = res.data;

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.answer,
        dataPoints: data.dataPointsCited,
        followups: data.suggestedFollowups,
        actionBtnText: data.actionableButtonText,
        actionRoute: data.actionableRoute,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Copilot query error', err);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: "I encountered an error querying the intelligence engine. Please ensure the marketing service is reachable.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (route?: string) => {
    if (!route) return;
    if (route.includes('generate')) {
      onOpenGenerator();
    } else if (route.includes('tab=')) {
      const tab = route.split('tab=')[1];
      onNavigateTab(tab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-gray-200 text-xs">
        {/* Top Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-amber-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Campaign Copilot</h3>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-blue-200">Conversational Marketing Intelligence & Data Analytics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.text.split('\n\n').map((para, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {para.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </p>
                  ))}
                </div>

                {/* Data Points Cited Box */}
                {msg.dataPoints && msg.dataPoints.length > 0 && (
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200/80 space-y-1 text-[11px]">
                    <span className="font-bold text-gray-600 flex items-center gap-1">
                      <Database className="w-3 h-3 text-indigo-600" /> Data Sources Cited:
                    </span>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      {msg.dataPoints.map((dp, idx) => (
                        <li key={idx}>{dp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actionable Button if available */}
                {msg.actionBtnText && (
                  <button
                    onClick={() => handleActionClick(msg.actionRoute)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
                  >
                    {msg.actionBtnText} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Follow-up Prompts */}
                {msg.followups && msg.followups.length > 0 && (
                  <div className="pt-2 border-t border-gray-200/60 space-y-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Suggested Questions</span>
                    <div className="flex flex-col gap-1">
                      {msg.followups.map((f, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(f)}
                          className="text-left text-[11px] text-blue-700 hover:text-blue-900 hover:underline py-0.5"
                        >
                          → {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[10px]">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-xs text-gray-400 pl-9">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Copilot is querying admissions database & computing ROI...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-gray-200 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about CAC, conversion rates, channel ROI, PIN codes..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
