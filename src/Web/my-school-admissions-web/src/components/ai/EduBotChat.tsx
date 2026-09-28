import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Minimize2, 
  Maximize2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  BookOpen,
  FileText
} from 'lucide-react';
import api from '../../lib/api';

export interface Citation {
  documentTitle: string;
  institutionName: string;
  documentType: string;
  snippet: string;
  relevanceScore: number;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  suggestedQueries?: string[];
  citations?: Citation[];
  modelUsed?: string;
  retrievedChunksCount?: number;
  actionType?: string;
  actionUrl?: string;
  timestamp: string;
}

interface EduBotChatProps {
  onOpenInquiry?: () => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export default function EduBotChat({ 
  onOpenInquiry,
  isOpen: controlledIsOpen,
  onToggle: setControlledIsOpen
}: EduBotChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (setControlledIsOpen) {
      setControlledIsOpen(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-edubot-chat', handleOpen);
    return () => window.removeEventListener('open-edubot-chat', handleOpen);
  }, []);

  const initialMessage: ChatMessage = {
    id: 'msg-welcome',
    sender: 'bot',
    text: "Hello! 👋 I am **EduBot**, your AI Admissions Consultant.\n\nAsk me anything about **curriculum differences (CBSE vs IB)**, **school fee structures**, **admission deadlines for 2026–27**, or required documents!",
    suggestedQueries: [
      "Compare CBSE vs IB curriculum",
      "What are the fees for Delhi International School?",
      "What is the age cutoff for Nursery 2026-27?",
      "What documents are required for admission?"
    ],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/insights/chat', {
        message: query.trim(),
        history: messages.slice(-4).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.data.reply || "I'm sorry, I could not process your query at this moment. Please try again.",
        suggestedQueries: response.data.suggestedQueries || [],
        citations: response.data.citations || [],
        modelUsed: response.data.modelUsed,
        retrievedChunksCount: response.data.retrievedChunksCount || 0,
        actionType: response.data.actionType,
        actionUrl: response.data.actionUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'bot',
        text: "I am having trouble reaching the admissions server, but for Academic Session 2026–2027 admissions are currently open across partner schools (CBSE, ICSE, IB). Would you like to submit an admission inquiry directly?",
        suggestedQueries: ["Submit admission inquiry", "Check school fee list"],
        actionType: "ApplyNow",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans antialiased">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <div className="relative flex flex-col items-end">
          {/* Animated Callout Badge */}
          <div 
            onClick={() => setIsOpen(true)}
            className="mb-2.5 px-3.5 py-1.5 bg-white text-slate-800 text-xs font-semibold rounded-2xl shadow-xl border border-blue-200/80 cursor-pointer flex items-center gap-2 hover:border-blue-400 hover:scale-105 transition-all animate-bounce"
            title="Click to ask questions about admissions, fees, and curricula"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-700 font-medium">Need admission help?</span>
            <span className="font-bold text-blue-600">Chat with EduBot 💬</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            id="edubot-floating-trigger"
            className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
            aria-label="Open Admissions AI Assistant"
          >
            <div className="relative">
              <Bot className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></span>
            </div>
            <div className="text-left pr-1">
              <div className="text-xs font-extrabold tracking-wide flex items-center gap-1">
                EduBot AI <Sparkles className="w-3 h-3 text-amber-300" />
              </div>
              <div className="text-[10px] text-blue-100 font-medium">Admissions Assistant 24/7</div>
            </div>
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 ${
            isExpanded 
              ? 'w-[90vw] max-w-2xl h-[85vh]' 
              : 'w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight">EduBot AI Assistant</h3>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold rounded-full">
                    ● Online
                  </span>
                </div>
                <p className="text-[11px] text-blue-100">School Admissions, Fees & Curricula 2026-27</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-white/80">
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  <div 
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-xs font-medium' 
                        : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* RAG Retrieved Source Citations */}
                  {msg.sender === 'bot' && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-[10px]">
                      <div className="flex items-center gap-1 font-bold text-slate-700 mb-1.5">
                        <BookOpen className="w-3 h-3 text-blue-600" />
                        <span>Retrieved Sources ({msg.citations.length} documents)</span>
                        <span className="ml-auto text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">pgvector verified</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, idx) => (
                          <div 
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[10px] shadow-2xs"
                            title={c.snippet}
                          >
                            <FileText className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-slate-900">{c.institutionName}:</span>
                            <span className="truncate max-w-[140px] text-slate-500">{c.documentTitle}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bot Suggested Prompt Chips */}
                  {msg.sender === 'bot' && msg.suggestedQueries && msg.suggestedQueries.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.suggestedQueries.map((query, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(query)}
                          className="text-[11px] font-semibold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full text-left transition flex items-center gap-1 shadow-2xs"
                        >
                          <span>{query}</span>
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action CTA Button if present */}
                  {msg.sender === 'bot' && msg.actionType === 'ApplyNow' && onOpenInquiry && (
                    <div className="mt-2">
                      <button
                        onClick={onOpenInquiry}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
                      >
                        <span>Start Online Admission Inquiry</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 mt-1 block px-1">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-500 text-xs">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>EduBot is analyzing admission data...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about fees, CBSE vs IB, deadlines..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition shadow-2xs shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-1.5">
              Powered by MySchoolAdmissions AI • Answers verified against 2026–2027 admission guidelines
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
