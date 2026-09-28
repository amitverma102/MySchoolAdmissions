import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Flame, 
  Sun, 
  Snowflake, 
  MessageCircle, 
  Phone, 
  CreditCard, 
  Receipt as ReceiptIcon, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  FileText, 
  Clock, 
  BookOpen, 
  ExternalLink,
  Mic,
  Radio,
  Camera,
  Cloud,
  Calendar,
  Award
} from 'lucide-react';

interface Chapter {
  id: number;
  title: string;
  duration: string;
  category: string;
  narration: string;
  keyPoints: string[];
  visualType: 'command-center' | 'heat-scoring' | 'whatsapp-hub' | 'call-disposition' | 'ai-drafter' | 'payment-receipt' | 'campus-tour' | 'direct-application' | 'call-recording-drive' | 'fee-concessions';
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "1. The Counselor Command Center",
    duration: "01:10",
    category: "Dashboard & Lead Triage",
    narration: "Welcome to MySchoolAdmissions. As an admissions counselor, your day begins right here on the Leads Command Center. Inquiries from your website, portals like Shiksha or Collegedunia, and digital campaigns land in your queue automatically with zero manual entry.",
    keyPoints: [
      "Real-time multi-channel lead ingestion",
      "Instant search, filter by program/grade, and walk-in entry",
      "High-velocity pipeline metrics at a glance"
    ],
    visualType: 'command-center'
  },
  {
    id: 2,
    title: "2. AI Intent Heat Scoring & Triage",
    duration: "01:10",
    category: "AI Intelligence",
    narration: "Traditional CRMs treat every lead equally. MySchoolAdmissions changes the game with AI Intent Heat Scoring. Multi-signal algorithms evaluate inquiry velocity, scholarship queries, and engagement to assign HOT, WARM, or COLD badges. Reaching a HOT lead within 15 minutes increases admissions by 300%!",
    keyPoints: [
      "🔥 HOT (Score ≥ 75): Urgent follow-up needed within 15 minutes",
      "☀️ WARM (Score 45–74): Active inquiry requiring structured nurture",
      "❄️ COLD (Score < 45): Re-engagement drip campaign candidate"
    ],
    visualType: 'heat-scoring'
  },
  {
    id: 3,
    title: "3. 1-Click WhatsApp Outreach Hub",
    duration: "01:15",
    category: "Omnichannel Outreach",
    narration: "No more manual dialing or copying and pasting numbers. With MySchoolAdmissions's 1-Click WhatsApp Hub, click 'WhatsApp' on any student drawer, pick a high-conversion template, and launch WhatsApp Web instantly with the pre-filled personalized message. Best of all, it's auto-logged to the timeline!",
    keyPoints: [
      "Automated wa.me deep links with dynamic student token replacement",
      "Pre-loaded templates: Campus Tours, Scholarships, Fee Links",
      "Automatic logging to candidate's central activity timeline"
    ],
    visualType: 'whatsapp-hub'
  },
  {
    id: 4,
    title: "4. Call Dispositions & Live Timeline",
    duration: "01:10",
    category: "Counselor Productivity",
    narration: "When speaking with parents, MySchoolAdmissions eliminates messy scratchpads. Standardized call dispositions let you categorize every interaction—whether qualified, callback scheduled, or unreachable. Your notes appear on the candidate feed so any teammate has full context.",
    keyPoints: [
      "Standardized dispositions: Interested, Callback, Busy, Not Interested",
      "Omnichannel timeline uniting phone calls, visits, and WhatsApp logs",
      "Zero context loss across counselor handoffs"
    ],
    visualType: 'call-disposition'
  },
  {
    id: 5,
    title: "5. AI Counselor Follow-Up Drafter",
    duration: "01:00",
    category: "Generative AI",
    narration: "Need to write a persuasive invitation or address parent concerns? MySchoolAdmissions's AI Counselor Assistant writes custom letters in under two seconds. Select your objective, enter student-specific notes, and generate polished, tailored emails or messages ready to send.",
    keyPoints: [
      "Tailored for Campus Tours, Merit Scholarships, and Fee Reminders",
      "Incorporates candidate academic background and specific objections",
      "Saves counselors over 80% of manual drafting time"
    ],
    visualType: 'ai-drafter'
  },
  {
    id: 6,
    title: "6. Online Fee Payments & Digital Receipts",
    duration: "01:00",
    category: "Enrollment & Collections",
    narration: "Once a student is qualified, fee collection is frictionless. Parents pay securely online via UPI, Cards, or NetBanking. Payments reconcile automatically, confirming the admission seat and generating a tamper-proof digital fee receipt with automated numbering and QR verification.",
    keyPoints: [
      "Collexo-style instant online fee checkout (UPI / Card / NetBanking)",
      "Instant webhook reconciliation & automated seat confirmation",
      "Printable branded digital fee receipt with QR verification"
    ],
    visualType: 'payment-receipt'
  },
  {
    id: 7,
    title: "7. Self-Serve Campus Tour & Open House Booker",
    duration: "01:15",
    category: "Parent Engagement",
    narration: "Physical school tours are the decisive factor in enrollment. Our self-serve Campus Tour booker lets parents pick real-time hourly slots directly on the public homepage. The engine checks daily slot availability, books the calendar activity, and auto-routes the family to an on-duty counselor.",
    keyPoints: [
      "Public hourly slot availability (09:30 AM – 04:30 PM) with live capacity counter",
      "Instant confirmation code (e.g. TOUR-2609-9019) with SMS/WhatsApp confirmation",
      "Direct synchronization with Counselor Activity Calendar"
    ],
    visualType: 'campus-tour'
  },
  {
    id: 8,
    title: "8. Direct Applications with Student Photograph",
    duration: "01:10",
    category: "Admissions Operations",
    narration: "Walk-in parents and offline registrations are streamlined with Direct Applications. Counselors register candidates in one click, capturing guardian details, applying grade, and uploading passport photographs with automatic client-side compression for ID cards and admission dossiers.",
    keyPoints: [
      "1-Click '+ New Application' registration from the Applications toolbar",
      "Client-side compressed passport photograph upload (JPG, PNG, WebP)",
      "Full lifecycle tracking: Draft, Submitted, Under Review, Assessment scoring"
    ],
    visualType: 'direct-application'
  },
  {
    id: 9,
    title: "9. Telephone Call Recording & Google Drive Archival",
    duration: "01:20",
    category: "Compliance & Telephony",
    narration: "Never lose critical conversation context again. Counselors can record live phone calls with browser microphone capture or upload external PBX audio. Every recording is automatically uploaded and synced to Google Drive with an embedded audio playback player right in the timeline.",
    keyPoints: [
      "Live browser MediaRecorder audio capture with pulsing visualizer and timer",
      "Automated sync to institutional Google Drive with structured folder mapping",
      "Inline audio player playback, call duration pill, and 1-click Drive download"
    ],
    visualType: 'call-recording-drive'
  },
  {
    id: 10,
    title: "10. Fee Concession & Scholarship Approvals",
    duration: "01:15",
    category: "Financial Workflows",
    narration: "Managing sibling, merit, or defense quotas is completely automated. Counselors request concessions with real-time discount calculations against tuition fees. Principals and finance directors review pending concessions with one click, automatically recalculating the student's net balance.",
    keyPoints: [
      "Structured concession categories: Sibling (15%), Merit (25%), Defense (20%), Staff (50%)",
      "Real-time final fee recalculation and concession deduction audit history",
      "1-Click School Admin review drawer with remarks and approval tracking"
    ],
    visualType: 'fee-concessions'
  }
];

export default function VideoTutorial() {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Available Voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  // Subtitle Char Index
  const [spokenCharIndex, setSpokenCharIndex] = useState<number>(0);

  // Interactive Scene States
  const [activeTab, setActiveTab] = useState<'video' | 'playbook'>('video');
  const [demoSelectedTemplate, setDemoSelectedTemplate] = useState('Campus Tour Invitation');
  const [demoCallDisposition, setDemoCallDisposition] = useState('Interested - Qualified');
  const [demoAiObjective, setDemoAiObjective] = useState('CampusTour');
  const [copiedDraft, setCopiedDraft] = useState(false);

  const currentChapter = CHAPTERS[currentChapterIndex];
  const timerRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load browser speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const englishVoices = voices.filter(v => v.lang.startsWith('en'));
          setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);

          if (!selectedVoiceName) {
            const preferred = englishVoices.find(v => 
              v.name.includes('Natural') || 
              v.name.includes('Online') || 
              v.name.includes('Google') || 
              v.name.includes('David') || 
              v.name.includes('Zira') ||
              v.name.includes('Samantha')
            );
            setSelectedVoiceName(preferred ? preferred.name : (englishVoices[0]?.name || voices[0].name));
          }
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceName]);

  // Web Audio chime generator
  const playTone = (freq: number, type: OscillatorType = 'sine', duration: number = 0.2, volume: number = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext error:", e);
    }
  };

  const playChapterChime = () => {
    playTone(523.25, 'sine', 0.15, 0.12); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.22, 0.12), 110); // E5
  };

  // Speaks narration aloud using Web Speech API
  const speakNarration = (text: string, force = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    setSpokenCharIndex(0);

    if (isMuted && !force) {
      setIsSpeaking(false);
      return;
    }

    playChapterChime();

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = utterance; // prevent GC

    utterance.rate = playbackSpeed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (selectedVoiceName) {
      const v = window.speechSynthesis.getVoices().find(voice => voice.name === selectedVoiceName);
      if (v) utterance.voice = v;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAudioInitialized(true);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setSpokenCharIndex(event.charIndex);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      setIsSpeaking(false);
    };

    // Small delay to ensure clean audio start
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const stopNarration = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Playback timer & progress
  useEffect(() => {
    if (isPlaying) {
      // Speak when starting
      speakNarration(currentChapter.narration);

      timerRef.current = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            // Next chapter
            if (currentChapterIndex < CHAPTERS.length - 1) {
              setCurrentChapterIndex(c => c + 1);
              return 0;
            } else {
              setIsPlaying(false);
              stopNarration();
              return 100;
            }
          }
          return prev + (2.2 * playbackSpeed);
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      stopNarration();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopNarration();
    };
  }, [isPlaying, currentChapterIndex, playbackSpeed]);

  const handleSelectChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setPlaybackProgress(0);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (playbackProgress >= 100 && currentChapterIndex === CHAPTERS.length - 1) {
      setCurrentChapterIndex(0);
      setPlaybackProgress(0);
    }
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (!nextState) {
      stopNarration();
    }
  };

  const handleNext = () => {
    if (currentChapterIndex < CHAPTERS.length - 1) {
      setCurrentChapterIndex(c => c + 1);
      setPlaybackProgress(0);
    }
  };

  const handlePrev = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(c => c - 1);
      setPlaybackProgress(0);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      stopNarration();
    } else if (isPlaying) {
      speakNarration(currentChapter.narration);
    }
  };

  const handleTestAudio = () => {
    setAudioInitialized(true);
    setIsMuted(false);
    playChapterChime();
    speakNarration("Hello! Welcome to MySchoolAdmissions Admissions. Your voiceover sound is enabled and working perfectly.", true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Interactive Video Masterclass
            </span>
            <span className="text-xs text-blue-200/70">6 Modules • 6m 45s • Voiceover Enabled</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Mastering Admissions with MySchoolAdmissions
          </h1>
          <p className="text-blue-100/80 text-sm mt-1 max-w-2xl">
            Step-by-step counselor training video tutorial covering lead triage, AI intent heat scoring, 1-click WhatsApp, dispositions, and online fee closures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'video' 
                ? 'bg-white text-blue-900 shadow-md' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🎬 Watch Video
          </button>
          <button
            onClick={() => setActiveTab('playbook')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'playbook' 
                ? 'bg-white text-blue-900 shadow-md' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            📋 Counselor Playbook
          </button>
        </div>
      </div>

      {/* Audio Ready Banner */}
      {!audioInitialized && activeTab === 'video' && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-yellow-300 animate-pulse" />
            <div>
              <span className="font-bold text-sm">Voiceover Audio Narration Ready!</span>
              <p className="text-white/80 text-[11px]">Click "Play" or "Test Sound" to hear the AI admissions tutor read the tutorial aloud.</p>
            </div>
          </div>
          <button
            onClick={handleTestAudio}
            className="px-4 py-1.5 bg-white text-indigo-900 font-bold rounded-xl text-xs hover:bg-yellow-300 transition shadow-sm shrink-0"
          >
            🔊 Test Audio Voiceover
          </button>
        </div>
      )}

      {activeTab === 'video' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Video Screen & Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
              
              {/* Video Player Header Bar */}
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="font-semibold text-white">MySchoolAdmissions Theater:</span>
                  <span>{currentChapter.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isSpeaking && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold animate-pulse">
                      <Radio className="w-3.5 h-3.5" /> Live Voiceover Audio
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50 text-[11px]">
                    {currentChapter.category}
                  </span>
                  <span className="text-slate-400">{currentChapter.duration}</span>
                </div>
              </div>

              {/* Interactive Video Stage */}
              <div className="relative aspect-video bg-gradient-to-b from-slate-900 to-slate-950 p-6 flex flex-col justify-center items-center overflow-hidden">
                
                {/* Background decorative grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* SCENE 1: COMMAND CENTER */}
                {currentChapter.visualType === 'command-center' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-fadeIn">
                    <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-blue-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live Leads Ingestion Queue
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Shiksha / Collegedunia Sync</span>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-blue-50/70 rounded-lg border border-blue-100">
                        <div>
                          <div className="font-bold text-xs text-slate-900">Aarav Sharma (B.Tech Computer Science)</div>
                          <div className="text-[11px] text-slate-500">aarav.sharma@example.com • +91 98765 43210</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-red-600" /> HOT (88 pts)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <div className="font-bold text-xs text-slate-900">Rohan Verma (MBA Admissions)</div>
                          <div className="text-[11px] text-slate-500">rohan.v@example.com • +91 98111 22334</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-600" /> WARM (58 pts)
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                      <span>Round-Robin Counselor Pool: <b>Assigned Sequentially</b></span>
                      <span className="text-emerald-600 font-semibold">✓ Automated Deduplication Active</span>
                    </div>
                  </div>
                )}

                {/* SCENE 2: AI INTENT HEAT SCORING */}
                {currentChapter.visualType === 'heat-scoring' && (
                  <div className="relative z-10 w-full max-w-xl bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 p-5 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span className="font-bold text-sm">AI Intent Heat Algorithm</span>
                      </div>
                      <span className="text-xs text-amber-300 font-mono">Real-time Multi-Signal Score</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60">
                        <Flame className="w-6 h-6 text-red-500 mx-auto mb-1" />
                        <div className="font-bold text-xs text-red-300">HOT (≥ 75)</div>
                        <div className="text-[10px] text-red-200/70 mt-0.5">Reach within 15 mins</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800/60">
                        <Sun className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <div className="font-bold text-xs text-amber-300">WARM (45–74)</div>
                        <div className="text-[10px] text-amber-200/70 mt-0.5">Active engagement</div>
                      </div>
                      <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-800/60">
                        <Snowflake className="w-6 h-6 text-cyan-500 mx-auto mb-1" />
                        <div className="font-bold text-xs text-cyan-300">COLD (&lt; 45)</div>
                        <div className="text-[10px] text-cyan-200/70 mt-0.5">Drip re-engagement</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/80 rounded-lg text-xs space-y-1.5 border border-slate-700">
                      <div className="text-slate-300 font-semibold">Candidate: Aarav Sharma • Calculated Score: 88/100</div>
                      <div className="text-[11px] text-slate-400">
                        Signals: High inquiry velocity (+30), Scholarship inquiry (+25), Completed brochure request (+20), Callback scheduled (+13).
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 3: 1-CLICK WHATSAPP HUB */}
                {currentChapter.visualType === 'whatsapp-hub' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 p-5 text-slate-800 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">1-Click WhatsApp Outreach Hub</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-semibold">wa.me Deep Linking</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Admission Template:</label>
                        <select 
                          value={demoSelectedTemplate}
                          onChange={(e) => setDemoSelectedTemplate(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                        >
                          <option>Campus Tour Invitation</option>
                          <option>Merit Scholarship Assessment</option>
                          <option>Welcome & Admission Brochure</option>
                          <option>Fee Confirmation & Token Link</option>
                        </select>
                      </div>

                      <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100 text-xs font-sans">
                        <div className="text-emerald-950 font-medium">
                          "Hi Aarav Sharma! 🏫 We are hosting an exclusive Campus Walkthrough & Faculty Interaction session this Saturday. Would 11:00 AM or 2:30 PM work better for you and your parents?"
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">Recipient: <b>+91 98765 43210</b></span>
                        <a 
                          href={`https://wa.me/919876543210?text=${encodeURIComponent("Hi Aarav Sharma! We are hosting a campus walkthrough this Saturday.")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                        >
                          Launch WhatsApp Web <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 4: CALL DISPOSITIONS & TIMELINE */}
                {currentChapter.visualType === 'call-disposition' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 p-5 text-slate-800 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">Call Disposition & Outcome Logger</span>
                      </div>
                      <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">Standardized Logging</span>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Interaction Channel</label>
                          <select className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50">
                            <option>Phone Call</option>
                            <option>Campus Visit</option>
                            <option>Video Counseling</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Call Outcome</label>
                          <select 
                            value={demoCallDisposition}
                            onChange={(e) => setDemoCallDisposition(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50"
                          >
                            <option>Interested - Qualified</option>
                            <option>Callback Scheduled</option>
                            <option>Busy / No Answer</option>
                            <option>Not Interested</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-700">Counselor Notes:</div>
                        <div className="text-slate-600 mt-0.5">Candidate discussed robotics lab, parents confirmed visiting Friday at 11 AM.</div>
                      </div>

                      <div className="p-2 bg-indigo-50/60 rounded border border-indigo-100 text-[11px] text-indigo-900 flex items-center justify-between">
                        <span>Timeline Entry: <b>Auto-Updated for All Counselors</b></span>
                        <span className="font-bold text-indigo-700">✓ Logged</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 5: AI COUNSELOR DRAFTER */}
                {currentChapter.visualType === 'ai-drafter' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 p-5 text-slate-800 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">AI Counselor Follow-Up Drafter</span>
                      </div>
                      <span className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold">Powered by LLM</span>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Objective</label>
                          <select 
                            value={demoAiObjective}
                            onChange={(e) => setDemoAiObjective(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50"
                          >
                            <option value="CampusTour">Campus Tour Invitation</option>
                            <option value="Scholarship">Merit Scholarship Grant</option>
                            <option value="FeeReminder">Token Fee Reminder</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Candidate Note</label>
                          <input 
                            type="text" 
                            defaultValue="Inquired about robotics lab" 
                            className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50/80 rounded-lg border border-purple-100 text-xs">
                        <div className="font-bold text-purple-900 mb-1">
                          Subject: Invitation: Private Campus Tour & Robotics Lab Walkthrough for Aarav
                        </div>
                        <div className="text-slate-700 text-[11px] line-clamp-3">
                          Dear Aarav, We noticed your keen interest in our B.Tech program and robotics initiatives. We would love to host you and your parents for an exclusive lab walkthrough with our faculty this weekend...
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setCopiedDraft(true);
                            setTimeout(() => setCopiedDraft(false), 2000);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          {copiedDraft ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedDraft ? 'Copied to Clipboard' : 'Copy AI Draft'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 6: ONLINE FEE & RECEIPTS */}
                {currentChapter.visualType === 'payment-receipt' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 p-5 text-slate-800 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                          <ReceiptIcon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">Collexo Fee Gateway & Official Receipt</span>
                      </div>
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">✓ Confirmed Seat</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Official Receipt No:</span>
                        <span className="font-mono font-bold text-slate-800">REC-202609-75351</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Student Name:</span>
                        <span className="font-semibold text-slate-800">Aarav Sharma</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Amount Paid:</span>
                        <span className="font-extrabold text-emerald-600 text-sm">₹18,500 INR</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Payment Mode:</span>
                        <span className="font-medium text-slate-700">UPI / Google Pay (Captured)</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[11px] text-slate-500">Status: <b>Automated Webhook Reconciliation</b></span>
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm">
                        Print Digital Receipt
                      </button>
                    </div>
                  </div>
                )}

                {/* SCENE 7: SELF-SERVE CAMPUS TOUR BOOKER */}
                {currentChapter.visualType === 'campus-tour' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-fadeIn">
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-3 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-300" />
                        <span className="font-bold text-xs">Self-Serve Campus Tour Booker</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                        ● Public Slot Booking
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Selected Campus & Date</span>
                          <span className="font-bold text-slate-900">DIS Sector 23 (Dwarka) • Friday, Sept 26</span>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[11px]">Confirmation: TOUR-2609-9019</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Real-Time Hourly Slots</span>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 border border-slate-200 rounded-lg text-center bg-slate-50 text-slate-400 line-through">09:30 AM (Full)</div>
                          <div className="p-2 border-2 border-blue-600 bg-blue-50 text-blue-700 font-bold rounded-lg text-center shadow-xs">11:00 AM (4 left)</div>
                          <div className="p-2 border border-slate-200 rounded-lg text-center hover:bg-slate-50 cursor-pointer">02:00 PM (8 left)</div>
                        </div>
                      </div>

                      <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-emerald-900 font-medium">Assigned On-Duty Counselor: <b>Rajesh Kumar</b></span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Calendar Synced</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 8: DIRECT APPLICATION WITH STUDENT PHOTOGRAPH */}
                {currentChapter.visualType === 'direct-application' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-fadeIn">
                    <div className="bg-slate-900 px-4 py-2.5 text-white flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-xs">Direct Walk-In Student Application</span>
                      </div>
                      <span className="font-mono text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-bold">
                        APP20260923121820
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white shrink-0">
                          RM
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">Reyansh Malhotra</h4>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Grade 3</span>
                          </div>
                          <p className="text-slate-500 text-[11px]">Parent: Vikram Malhotra • +91 98112 23344</p>
                          <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Passport Photograph Captured (Client-Side Compressed)
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 text-[10px] block font-bold">Academic Year</span>
                          <span className="font-semibold text-slate-800">2026–2027</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 text-[10px] block font-bold">Application Status</span>
                          <span className="font-semibold text-blue-600">Submitted</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 text-[10px] block font-bold">Assessment</span>
                          <span className="font-semibold text-purple-600">Entrance Scheduled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 9: TELEPHONE RECORDING TO GOOGLE DRIVE */}
                {currentChapter.visualType === 'call-recording-drive' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-fadeIn">
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-4 py-3 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <span className="font-bold text-xs">Telephone Conversation Recorder</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                        <Cloud className="w-3 h-3" /> Synced to Google Drive
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-blue-950 flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4 text-blue-600" />
                            Counselor Call Recording Audio Playback
                          </span>
                          <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded font-bold text-[10px] border border-blue-200">
                            ⏱️ 02:25 (145s)
                          </span>
                        </div>
                        <div className="w-full bg-white h-7 rounded-lg border border-slate-300 flex items-center px-3 gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span className="text-[11px] font-mono text-slate-600 flex-1">▶ 00:42 / 02:25 • WebM Audio Stream</span>
                          <span className="text-[10px] text-blue-600 font-bold">1.0x</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Drive Storage Location</span>
                          <span className="font-mono text-[11px] text-slate-800">📁 MySchoolAdmissions/Recordings/2026-27/Harpreet_Singh.webm</span>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded">Open in Drive ↗</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 10: FEE CONCESSIONS & SCHOLARSHIP APPROVALS */}
                {currentChapter.visualType === 'fee-concessions' && (
                  <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-fadeIn">
                    <div className="bg-slate-900 px-4 py-2.5 text-white flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-xs">Fee Concession & Scholarship Workflow</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        Admin 1-Click Review
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">Sibling Concession (Elder sibling in Grade 7)</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Approved by Principal
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 text-[11px]">
                          <span>Standard Tuition Fee: <del>₹1,25,000</del></span>
                          <span className="font-bold text-emerald-700">Applied Discount: -₹25,000 (20%)</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-900 font-bold text-xs pt-1 border-t border-amber-200/60">
                          <span>Recalculated Net Annual Fee:</span>
                          <span className="font-extrabold text-blue-700 text-sm">₹1,00,000 INR</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                        <span className="text-slate-500">Audit Status: <b>Reconciled in Enrollment Ledger</b></span>
                        <span className="font-mono text-[10px] text-slate-400">Reviewed 23 Sep 2026</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Progress Bar & Scrubber */}
              <div className="px-4 pt-2 bg-slate-900 border-t border-slate-800">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden cursor-pointer">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${playbackProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Controls Toolbar */}
              <div className="px-4 py-3 bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-slate-300">
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={handlePrev} 
                    disabled={currentChapterIndex === 0}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40"
                    title="Previous Chapter"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition font-semibold text-xs flex items-center gap-1.5"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    {isPlaying ? 'Pause' : 'Play Video'}
                  </button>
                  <button 
                    onClick={handleNext} 
                    disabled={currentChapterIndex === CHAPTERS.length - 1}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40"
                    title="Next Chapter"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setPlaybackProgress(0);
                      if (isPlaying) speakNarration(currentChapter.narration);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    title="Restart Chapter"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Voice Selector */}
                  {availableVoices.length > 0 && (
                    <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                      <Mic className="w-3.5 h-3.5 text-blue-400" />
                      <select 
                        value={selectedVoiceName}
                        onChange={(e) => {
                          setSelectedVoiceName(e.target.value);
                          if (isPlaying) {
                            setTimeout(() => speakNarration(currentChapter.narration), 100);
                          }
                        }}
                        className="bg-transparent text-[11px] text-slate-200 focus:outline-hidden max-w-[120px] truncate"
                      >
                        {availableVoices.map((v, i) => (
                          <option key={i} value={v.name} className="bg-slate-900 text-white">
                            {v.name.replace(/Microsoft |Google |English /gi, '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Speed Selector */}
                  <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Speed:</span>
                    {[1, 1.25, 1.5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => {
                          setPlaybackSpeed(spd);
                          if (isPlaying) speakNarration(currentChapter.narration);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          playbackSpeed === spd ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Audio Mute & Test Button */}
                  <button 
                    onClick={toggleMute}
                    className={`p-1.5 rounded-lg border transition ${
                      isMuted 
                        ? 'bg-red-950/60 border-red-800 text-red-400 hover:bg-red-900/60' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title={isMuted ? "Unmute Voiceover" : "Mute Voiceover"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleTestAudio}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-lg text-[11px] font-medium"
                    title="Test speakers with voice synthesis"
                  >
                    🔊 Test Sound
                  </button>
                </div>
              </div>

              {/* Voiceover Captions & Narration Teleprompter with Live Word Highlighting */}
              <div className="px-5 py-3.5 bg-slate-900/95 border-t border-slate-800/80 flex items-start gap-3">
                <div className={`p-1.5 rounded-lg border mt-0.5 shrink-0 ${
                  isSpeaking 
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60 animate-pulse' 
                    : 'bg-blue-950 text-blue-400 border-blue-800/50'
                }`}>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold">
                    <span className="text-blue-400">
                      {isSpeaking ? '🎙️ Speaking Voiceover Live Audio' : 'Narration Audio & Subtitles'}
                    </span>
                    {isSpeaking && (
                      <span className="text-emerald-400 font-semibold normal-case text-[11px]">Audio Streaming</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed font-sans">
                    {/* Live Highlighted Subtitle */}
                    <span>
                      {currentChapter.narration.slice(0, spokenCharIndex)}
                    </span>
                    <span className="text-yellow-300 font-bold underline decoration-yellow-400 decoration-2">
                      {currentChapter.narration.slice(spokenCharIndex, spokenCharIndex + 12)}
                    </span>
                    <span>
                      {currentChapter.narration.slice(spokenCharIndex + 12)}
                    </span>
                  </p>
                </div>
              </div>

            </div>

            {/* Chapter Key Learning Points */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Key Counselor Takeaways for this Module
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {currentChapter.keyPoints.map((pt, i) => (
                  <div key={i} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-xs text-blue-950 font-medium">{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Playlist & Module Navigator (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm">Video Chapters</h3>
                <span className="text-xs text-gray-500 font-medium">6 Lessons</span>
              </div>

              <div className="space-y-2.5">
                {CHAPTERS.map((ch, idx) => {
                  const isActive = idx === currentChapterIndex;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChapter(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3 ${
                        isActive 
                          ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-500/20' 
                          : 'bg-gray-50/50 border-gray-200 hover:bg-gray-100/70'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                            {ch.title}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium shrink-0 ml-1">{ch.duration}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate">{ch.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Link to Storyboard File */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-blue-100 text-xs space-y-2">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Full Production Storyboard
              </div>
              <p className="text-blue-700 text-[11px]">
                A comprehensive word-for-word voiceover script, visual camera directions, and graphics overlays document has been generated in your workspace.
              </p>
              <div className="pt-1">
                <a
                  href="file:///C:/Users/amitv/.gemini/antigravity-ide/brain/1a158090-0df6-4911-85fd-719678c70a73/video_tutorial_script_and_storyboard.md"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 text-[11px]"
                >
                  View Storyboard Markdown <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* COUNSELOR PLAYBOOK & ROUTINE TAB */
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Admissions Counselor Daily Action Playbook</h2>
            <p className="text-sm text-gray-500 mt-0.5">High-impact daily workflows to maximize candidate conversions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/40 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <Flame className="w-4 h-4" /> 1. Triage Hot Leads (0–5 min)
              </div>
              <p className="text-xs text-slate-600">
                Filter the Leads table by 🔥 <b>HOT</b>. Ensure every newly ingested lead is contacted within 15 minutes to take advantage of peak student interest.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <MessageCircle className="w-4 h-4" /> 2. 1-Click WhatsApp (5–10 min)
              </div>
              <p className="text-xs text-slate-600">
                Open student drawer and click <b>WhatsApp</b>. Select the Campus Tour or Scholarship template and dispatch the deep-link immediately.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Phone className="w-4 h-4" /> 3. Standardize Dispositions
              </div>
              <p className="text-xs text-slate-600">
                Always log phone outcomes using standardized dropdowns: <i>Connected: Interested</i>, <i>Callback Scheduled</i>, or <i>Busy</i>.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <Sparkles className="w-4 h-4" /> 4. AI Objection Drafter
              </div>
              <p className="text-xs text-slate-600">
                If parents have doubts about hostel facilities, fee structure, or placements, click <b>AI Assistant</b> to generate tailored follow-ups.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <CreditCard className="w-4 h-4" /> 5. Online Fee Closure
              </div>
              <p className="text-xs text-slate-600">
                Guide qualified candidates to pay their seat reservation fee via the Collexo gateway. The system auto-confirms admission.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ReceiptIcon className="w-4 h-4" /> 6. Instant Digital Receipt
              </div>
              <p className="text-xs text-slate-600">
                Open the digital receipt modal, verify the transaction number and QR stamp, and share the official receipt with the student.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
