import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Building2, 
  MapPin, 
  Search, 
  Sparkles, 
  Star, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  X, 
  Calendar, 
  Award,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  Check,
  CreditCard,
  Bot
} from 'lucide-react';
import api from '../lib/api';
import EduBotChat from '../components/ai/EduBotChat';
import PaymentCheckoutModal from '../components/payment/PaymentCheckoutModal';
import BookTourModal from '../components/calendar/BookTourModal';

interface Campus {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  isActive: boolean;
}

interface School {
  id: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  board: string;
  grades: string;
  isOpenForAdmissions: boolean;
  admissionSession: string;
  admissionDeadline?: string;
  rating: number;
  reviewCount: number;
  campuses: Campus[];
  facilities: string[];
  annualFees: string;
  scholarshipAvailable: boolean;
  featured: boolean;
  accentGradient: string;
}

// Default curated showcase schools (enhanced with any live DB institutions)
const DEFAULT_SCHOOLS: School[] = [
  {
    id: 'fc49d553-b44f-4c4c-96ad-4bf599016c01',
    name: 'Delhi International School',
    tagline: 'Empowering Young Minds Through Progressive Holistic Education',
    description: 'A premier educational institution known for academic excellence, state-of-the-art sports complexes, and global curriculum integration fostering critical thinking and leadership.',
    website: 'http://www.dis.com',
    contactEmail: 'admissions@dis.com',
    contactPhone: '+91 98765 43121',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE & Cambridge',
    grades: 'Pre-Nursery to Grade 12',
    isOpenForAdmissions: true,
    admissionSession: '2026–2027',
    admissionDeadline: 'Oct 31, 2026',
    rating: 4.9,
    reviewCount: 234,
    campuses: [
      {
        id: '866bc5ca-0dbd-4482-b52c-102398d4c65d',
        name: 'DIS Sector 23 Campus',
        address: 'Sector 23, Dwarka',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110075',
        isActive: true,
      },
      {
        id: 'campus-dis-2',
        name: 'DIS Rohini Campus',
        address: 'Institutional Area, Sector 9, Rohini',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110085',
        isActive: true,
      }
    ],
    facilities: ['Robotics & AI Lab', 'Olympic-size Pool', 'Smart Digital Classrooms', 'Air-Conditioned Fleet'],
    annualFees: '₹1.8L – ₹2.6L',
    scholarshipAvailable: true,
    featured: true,
    accentGradient: 'from-blue-600 to-indigo-700'
  },
  {
    id: 'school-oakridge',
    name: 'Oakridge International Academy',
    tagline: 'World-Class International Baccalaureate (IB) Continuum School',
    description: 'Recognized among top international schools offering IB Primary, Middle, and Diploma Programmes with an emphasis on student innovation, experiential learning, and university placements.',
    website: 'https://www.oakridge-edu.org',
    contactEmail: 'admissions@oakridge-edu.org',
    contactPhone: '+91 98112 34567',
    city: 'Gurugram',
    state: 'Haryana',
    board: 'IB World & Cambridge',
    grades: 'Nursery to Grade 12 (IB DP)',
    isOpenForAdmissions: true,
    admissionSession: '2026–2027',
    admissionDeadline: 'Nov 15, 2026',
    rating: 4.8,
    reviewCount: 189,
    campuses: [
      {
        id: 'oak-camp-1',
        name: 'Cyber City Flagship Campus',
        address: 'Golf Course Road, DLF Phase 5',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122002',
        isActive: true
      }
    ],
    facilities: ['Makerspace & FabLab', 'Performing Arts Auditorium', 'Tennis & Squash Academy', '100% University Placement Cell'],
    annualFees: '₹3.2L – ₹4.8L',
    scholarshipAvailable: true,
    featured: true,
    accentGradient: 'from-emerald-600 to-teal-800'
  },
  {
    id: 'school-xavier',
    name: "St. Xavier's Heritage School",
    tagline: 'Tradition of Excellence, Character Building & Leadership',
    description: 'A legacy institution renowned for rigorous ICSE academics, rich co-curricular programs, community values, and athletic achievements spanning over three decades.',
    website: 'https://www.stxaviersheritage.org',
    contactEmail: 'inquiries@stxaviersheritage.org',
    contactPhone: '+91 98223 45678',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'ICSE & ISC',
    grades: 'Kindergarten to Grade 12',
    isOpenForAdmissions: true,
    admissionSession: '2026–2027 (Round 2)',
    admissionDeadline: 'Oct 20, 2026',
    rating: 4.9,
    reviewCount: 310,
    campuses: [
      {
        id: 'xavier-camp-1',
        name: 'South Delhi Senior Campus',
        address: '42 Lodhi Estate, Near India Habitat Centre',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110003',
        isActive: true
      }
    ],
    facilities: ['Science Discovery Labs', 'Heritage Library (40k+ Books)', 'Cricket & Football Grounds', 'Language Center'],
    annualFees: '₹1.5L – ₹2.1L',
    scholarshipAvailable: false,
    featured: true,
    accentGradient: 'from-purple-600 to-indigo-800'
  },
  {
    id: 'school-greenwood',
    name: 'Greenwood Global High',
    tagline: 'Fostering Global Leaders with 21st-Century Competencies',
    description: 'Sprawling 15-acre eco-friendly green campus with top CBSE & IGCSE accreditation, dedicated STEM labs, and personalized counseling for competitive exams and study abroad.',
    website: 'https://www.greenwoodhigh.edu',
    contactEmail: 'connect@greenwoodhigh.edu',
    contactPhone: '+91 98334 56789',
    city: 'Bengaluru',
    state: 'Karnataka',
    board: 'CBSE & IGCSE',
    grades: 'Grade 1 to Grade 12',
    isOpenForAdmissions: true,
    admissionSession: '2026–2027',
    admissionDeadline: 'Nov 30, 2026',
    rating: 4.7,
    reviewCount: 165,
    campuses: [
      {
        id: 'gw-camp-1',
        name: 'Whitefield Campus',
        address: 'Varthur Main Road, Near ITPL',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560066',
        isActive: true
      }
    ],
    facilities: ['Eco Sustainability Center', 'Astronomy Observatory', 'Indoor Badminton Arena', 'Nutritious Dining Hall'],
    annualFees: '₹2.2L – ₹3.1L',
    scholarshipAvailable: true,
    featured: true,
    accentGradient: 'from-blue-700 to-cyan-800'
  },
  {
    id: 'school-heritage',
    name: 'The Heritage International School',
    tagline: 'Experiential Learning, Curiosity, and Academic Mastery',
    description: 'Pioneering design-thinking curriculum with project-based learning, inclusive education policies, and world-class international faculty mentorship.',
    website: 'https://www.theheritageschool.org',
    contactEmail: 'admissions@theheritageschool.org',
    contactPhone: '+91 98445 67890',
    city: 'Noida',
    state: 'Uttar Pradesh',
    board: 'CBSE & IB World',
    grades: 'Nursery to Grade 12',
    isOpenForAdmissions: true,
    admissionSession: '2026–2027',
    admissionDeadline: 'Dec 15, 2026',
    rating: 4.8,
    reviewCount: 142,
    campuses: [
      {
        id: 'heritage-camp-1',
        name: 'Noida Expressway Campus',
        address: 'Plot 8, Sector 128, Expressway',
        city: 'Noida',
        state: 'Uttar Pradesh',
        postalCode: '201304',
        isActive: true
      }
    ],
    facilities: ['Design Thinking Studio', 'Visual Arts Complex', 'Solar Powered Campus', 'Certified Counsellors Desk'],
    annualFees: '₹2.0L – ₹2.9L',
    scholarshipAvailable: true,
    featured: false,
    accentGradient: 'from-amber-600 to-rose-700'
  },
  {
    id: 'school-apex',
    name: 'Apex Doon Valley Residential School',
    tagline: 'Premier Boarding & Day School in the Foothills of the Himalayas',
    description: 'A disciplined, picturesque residential school setting fostering holistic development, equestrian sports, mountaineering, and exceptional board exam results.',
    website: 'https://www.apexdoonvalley.org',
    contactEmail: 'admissions@apexdoonvalley.org',
    contactPhone: '+91 98556 78901',
    city: 'Dehradun',
    state: 'Uttarakhand',
    board: 'CBSE & Cambridge Boarding',
    grades: 'Grade 4 to Grade 12 (Day & Boarding)',
    isOpenForAdmissions: true,
    admissionSession: '2026–2027',
    admissionDeadline: 'Jan 10, 2027',
    rating: 4.9,
    reviewCount: 215,
    campuses: [
      {
        id: 'apex-camp-1',
        name: 'Mussoorie Foothills Estate',
        address: 'Rajpur Road, Malsi Green Valley',
        city: 'Dehradun',
        state: 'Uttarakhand',
        postalCode: '248009',
        isActive: true
      }
    ],
    facilities: ['Equestrian & Horse Riding', 'Heated Indoor Pool', 'Multi-Cuisine Mess', 'Medical Center & In-house Doctor'],
    annualFees: '₹3.8L – ₹5.5L (Boarding)',
    scholarshipAvailable: true,
    featured: false,
    accentGradient: 'from-indigo-700 to-blue-900'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [schools, setSchools] = useState<School[]>(DEFAULT_SCHOOLS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [onlyOpenAdmissions, setOnlyOpenAdmissions] = useState(true);
  
  // Inquiry Modal State
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [selectedSchoolForInquiry, setSelectedSchoolForInquiry] = useState<School | null>(null);
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [targetGrade, setTargetGrade] = useState('Grade 1');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState('');

  // School Details Modal
  const [activeDetailsSchool, setActiveDetailsSchool] = useState<School | null>(null);

  // Live Payment Gateway Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentSchool, setSelectedPaymentSchool] = useState<string>('Delhi International School');
  const [paymentStudentName, setPaymentStudentName] = useState<string>('');
  const [paymentApplicationRef, setPaymentApplicationRef] = useState<string>('');
  
  // EduBot AI Help Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Campus Tour Booking Modal state
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  useEffect(() => {
    // Try to fetch institutions from API Gateway to complement the defaults
    api.get('/api/institutions')
      .then(response => {
        if (Array.isArray(response.data) && response.data.length > 0) {
          const apiSchools: School[] = response.data.map((inst: any) => ({
            id: inst.id,
            name: inst.name,
            tagline: inst.description || 'Excellence in Academics & Personal Growth',
            description: inst.description || 'Committed to nurturing students with rigorous academic standards and modern infrastructure.',
            website: inst.website || 'https://myschooladmissions.com',
            contactEmail: inst.contactEmail || 'info@myschooladmissions.com',
            contactPhone: inst.contactPhone || '+91 98765 00000',
            city: (inst.campuses && inst.campuses[0]?.city) || 'New Delhi',
            state: (inst.campuses && inst.campuses[0]?.state) || 'Delhi',
            board: 'CBSE & Cambridge',
            grades: 'Pre-Nursery to Grade 12',
            isOpenForAdmissions: true,
            admissionSession: '2026–2027',
            admissionDeadline: 'Oct 31, 2026',
            rating: 4.9,
            reviewCount: 150,
            campuses: inst.campuses || [],
            facilities: ['Digital Classrooms', 'Sports Complex', 'Science Labs', 'Library'],
            annualFees: '₹1.5L – ₹2.4L',
            scholarshipAvailable: true,
            featured: true,
            accentGradient: 'from-blue-600 to-indigo-700'
          }));

          // Merge without duplicate IDs
          const existingIds = new Set(apiSchools.map(s => s.id));
          const complementary = DEFAULT_SCHOOLS.filter(s => !existingIds.has(s.id));
          setSchools([...apiSchools, ...complementary]);
        }
      })
      .catch(err => {
        // Backend might have auth on gateway or be loading; fallback works automatically
        console.log('Using default curated partner schools', err);
      });
  }, []);

  const handleOpenInquiry = (school?: School) => {
    setSelectedSchoolForInquiry(school || schools[0] || null);
    setInquirySubmitted(false);
    setIsInquiryModalOpen(true);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refCode = `EDU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedRefId(refCode);
    setInquirySubmitted(true);
  };

  // Filter logic
  const filteredSchools = schools.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.board.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBoard = selectedBoard === 'ALL' || s.board.toLowerCase().includes(selectedBoard.toLowerCase());
    const matchesCity = selectedCity === 'ALL' || s.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesOpen = !onlyOpenAdmissions || s.isOpenForAdmissions;

    return matchesSearch && matchesBoard && matchesCity && matchesOpen;
  });

  const uniqueCities = Array.from(new Set(schools.map(s => s.city)));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. Urgent Admission Announcement Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white py-2.5 px-4 text-xs sm:text-sm font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-center sm:text-left">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
              ● Admissions 2026–27 Open
            </span>
            <span>Early-bird application window active across top CBSE, IB & ICSE partner schools!</span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsChatOpen(true)}
              className="text-white hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full border border-white/20 transition shadow-2xs"
              title="Open AI Admissions Help Chatbot"
            >
              <Bot className="w-3.5 h-3.5 text-amber-300" />
              <span>Ask AI Chat Bot</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
            <button 
              onClick={() => handleOpenInquiry()} 
              className="text-white hover:text-amber-200 underline underline-offset-2 text-xs font-semibold flex items-center"
            >
              Get Free Admission Guidance <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Bar (Header with Login option) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                MySchoolAdmissions
              </span>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">School Admissions & Enrollment Portal</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-7 text-sm font-semibold text-slate-700">
            <a href="#featured-schools" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <span>Featured Schools</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            </a>
            <a href="#admission-process" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#why-myschooladmissions" className="hover:text-blue-600 transition-colors">
              Why MySchoolAdmissions
            </a>
            <button 
              onClick={() => handleOpenInquiry()}
              className="text-blue-600 hover:text-blue-700 hover:underline transition font-semibold"
            >
              Inquire Online
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs group"
              title="Chat with EduBot 24/7 AI Admissions Consultant"
            >
              <Bot className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span>AI Help Bot</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          </nav>

          {/* Right Action: Login / Dashboard Button & Pay Online */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedPaymentSchool(schools[0]?.name || 'Delhi International School');
                setIsPaymentModalOpen(true);
              }}
              className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors gap-1.5"
              title="Pay application fee or seat booking deposit via UPI, Cards, NetBanking"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Fees / Seat Lock</span>
            </button>

            {token ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/25 transition-all hover:shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    navigate('/');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition"
                  title="Sign out of staff account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <LogIn className="w-4 h-4 mr-1.5 text-slate-500" />
                  <span>Login</span>
                </Link>
                <button
                  onClick={() => handleOpenInquiry()}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all hover:shadow"
                >
                  Apply Now
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Section with Search & Instant Filter */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-slate-50 to-white pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/60">
        {/* Background ambient glow circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40">
          <div className="absolute -top-10 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-semibold mb-6 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Simplified Nursery to K-12 School Admissions 2026–2027</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Find the Best School. <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                Apply Online Directly.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
              Explore accredited institutions open for admissions. Compare CBSE, ICSE, and IB World curricula, schedule campus tours, and track your admission application in real-time.
            </p>

            {/* Quick Hero Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsChatOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-sm shadow-md hover:shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-800 transition transform hover:-translate-y-0.5"
                title="Ask questions about schools, fees, admission dates"
              >
                <Bot className="w-4 h-4 text-amber-300" />
                <span>Chat with AI Counselor (EduBot)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
              <button
                onClick={() => handleOpenInquiry()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm border border-slate-200 shadow-2xs transition"
              >
                <span>Submit Admission Inquiry</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => setIsTourModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-sm border border-emerald-300 shadow-2xs transition"
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Schedule Campus Tour</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-bold text-blue-600">50+</div>
                <div className="text-xs text-slate-500 font-medium">Partner Campuses</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-bold text-emerald-600">100%</div>
                <div className="text-xs text-slate-500 font-medium">Verified Status</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-bold text-indigo-600">15,000+</div>
                <div className="text-xs text-slate-500 font-medium">Applications Handled</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-bold text-amber-600">Free</div>
                <div className="text-xs text-slate-500 font-medium">Counselor Support</div>
              </div>
            </div>
          </div>

          {/* Interactive School Search Box */}
          <div className="mt-10 max-w-4xl mx-auto bg-white p-4 sm:p-5 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search by Name / Keyword */}
              <div className="md:col-span-5 relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  School Name or Keyword
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. Delhi International, Oakridge..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* City Filter */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  City / Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    <option value="ALL">All Cities</option>
                    {uniqueCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Curriculum Board Filter */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Curriculum / Board
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedBoard}
                    onChange={(e) => setSelectedBoard(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    <option value="ALL">All Boards (CBSE, IB, ICSE)</option>
                    <option value="CBSE">CBSE</option>
                    <option value="IB">IB World School</option>
                    <option value="ICSE">ICSE / ISC</option>
                    <option value="Cambridge">Cambridge / IGCSE</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-500">Quick Filters:</span>
                <button
                  onClick={() => setOnlyOpenAdmissions(!onlyOpenAdmissions)}
                  className={`px-3 py-1 rounded-full font-medium transition flex items-center gap-1.5 ${
                    onlyOpenAdmissions 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${onlyOpenAdmissions ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  Open for Admissions 2026-27 Only
                </button>
                <button
                  onClick={() => setSelectedBoard(selectedBoard === 'IB' ? 'ALL' : 'IB')}
                  className={`px-3 py-1 rounded-full font-medium transition ${
                    selectedBoard === 'IB' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  IB Continuum
                </button>
                <button
                  onClick={() => setSelectedBoard(selectedBoard === 'CBSE' ? 'ALL' : 'CBSE')}
                  className={`px-3 py-1 rounded-full font-medium transition ${
                    selectedBoard === 'CBSE' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  CBSE Top Tier
                </button>
              </div>

              <div className="text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredSchools.length}</strong> matching schools
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Open for Admissions Spotlight Banner */}
      <section className="py-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs">
              <Calendar className="h-6 w-6 text-emerald-200" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-emerald-200">
                Active Admissions Cycle
              </div>
              <div className="text-lg font-bold">
                Academic Session 2026–2027 Admissions Underway
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Limited seats available for Pre-Nursery, KG, Grade 1, and Grade 11 Science/Commerce streams.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenInquiry()}
            className="whitespace-nowrap px-5 py-2.5 rounded-lg bg-white text-emerald-800 font-bold text-sm shadow-md hover:bg-emerald-50 transition transform hover:-translate-y-0.5"
          >
            Check Admission Criteria & Apply →
          </button>
        </div>
      </section>

      {/* 5. Featured Schools Section */}
      <section id="featured-schools" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
              <Building2 className="w-4 h-4" />
              Verified Partner Institutions
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Featured Schools Open for Admissions
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Browse top institutions accepting admissions for session 2026–2027.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBoard('ALL');
                setSelectedCity('ALL');
                setOnlyOpenAdmissions(false);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Schools Grid */}
        {filteredSchools.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <Building2 className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-lg font-bold text-slate-800">No schools match your search</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your search terms or clearing the curriculum board filter to view all accredited institutions.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBoard('ALL');
                setSelectedCity('ALL');
                setOnlyOpenAdmissions(false);
              }}
              className="mt-4 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View All Schools
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <div 
                key={school.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* School Card Header Graphic */}
                <div className={`h-28 bg-gradient-to-r ${school.accentGradient} p-4 text-white relative flex flex-col justify-between`}>
                  <div className="flex items-start justify-between">
                    {school.isOpenForAdmissions ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/90 text-white shadow-xs backdrop-blur-xs">
                        <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-ping"></span>
                        Open for Admissions
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                        Waitlist Only
                      </span>
                    )}

                    <div className="flex items-center space-x-1 bg-black/25 backdrop-blur-xs px-2 py-0.5 rounded-md text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>{school.rating}</span>
                      <span className="text-[10px] text-white/75">({school.reviewCount})</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80 bg-white/10 px-2 py-0.5 rounded">
                      {school.board}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {school.name}
                    </h3>
                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 mr-1 shrink-0" />
                      <span>{school.city}, {school.state}</span>
                      <span className="mx-1.5">•</span>
                      <span>{school.campuses.length} {school.campuses.length === 1 ? 'Campus' : 'Campuses'}</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                      {school.description}
                    </p>

                    {/* Key Attributes Tags */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Grades</span>
                        <span className="font-bold text-slate-800 truncate block">{school.grades}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Tuition Est.</span>
                        <span className="font-bold text-blue-700 truncate block">{school.annualFees}</span>
                      </div>
                    </div>

                    {/* Facilities Preview */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {school.facilities.slice(0, 3).map((facility, idx) => (
                        <span key={idx} className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          ✓ {facility}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenInquiry(school)}
                      className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition flex items-center justify-center gap-1"
                    >
                      <span>Apply / Inquire</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPaymentSchool(school.name);
                        setIsPaymentModalOpen(true);
                      }}
                      className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1"
                      title="Pay application fee or seat booking deposit"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pay Fee</span>
                    </button>
                    <button
                      onClick={() => setActiveDetailsSchool(school)}
                      className="py-2.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
                      title="View school & campus details"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Step-by-Step Admission Process Guide */}
      <section id="admission-process" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Simple & Transparent
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
              How MySchoolAdmissions Works
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              From finding the best school to final seat confirmation — we simplify every step for parents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative text-center p-6 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50/50 transition">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 shadow-sm">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Explore & Compare</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Filter schools by curriculum (CBSE, IB, ICSE), campus location, fee structure, and verified amenities.
              </p>
            </div>

            <div className="relative text-center p-6 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50/50 transition">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 shadow-sm">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Submit Application</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Fill a unified admission form online. Upload required birth certificates, academic records, and photos once.
              </p>
            </div>

            <div className="relative text-center p-6 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50/50 transition">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 shadow-sm">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Counselor Connect</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Connect directly with school admission officers, schedule on-campus walk-throughs, and attend interactions.
              </p>
            </div>

            <div className="relative text-center p-6 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50/50 transition">
              <div className="w-12 h-12 rounded-full bg-amber-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 shadow-sm">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900">Enrollment & Seat Lock</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Receive instant admission offer letters, pay enrollment fees securely, and confirm your child's seat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Why Choose MySchoolAdmissions Section */}
      <section id="why-myschooladmissions" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
              <Award className="w-4 h-4" />
              Direct Institution Partnership
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              No More Queues. No Confusion. <br />
              <span className="text-blue-600">Direct School Admission Gateway.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              MySchoolAdmissions bridges premier schools with aspiring parents. Our platform provides genuine fee disclosures, verified admission deadlines, and official counselor responses.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Official Direct Tie-ups</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Applications go straight into the school administrative database without third-party delay.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">100% Transparent Seat Status</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Live badges indicate whether admissions are Open, on Waitlist, or filling fast.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Institutional Management Suite</h4>
                  <p className="text-xs text-slate-500 mt-0.5">School admins log in to manage applications, schedule counseling, and issue enrollment letters.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center space-x-4">
              <button
                onClick={() => handleOpenInquiry()}
                className="px-6 py-3 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition"
              >
                Inquire For 2026–27 Session
              </button>
              <Link
                to="/login"
                className="px-5 py-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition"
              >
                Admin Portal Login
              </Link>
            </div>
          </div>

          {/* Right feature card showcase */}
          <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs mb-6">
                Admission Portal Summary
              </div>

              <h3 className="text-2xl font-bold mb-4">
                Are You a School Administrator or Principal?
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6">
                Join over 50+ campuses using MySchoolAdmissions to streamline admissions, lead inquiries, fee collection, and parent communications.
              </p>

              <div className="space-y-3 bg-white/10 p-5 rounded-xl border border-white/10 backdrop-blur-xs text-xs mb-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-300">Inquiry Response Time:</span>
                  <span className="font-bold text-emerald-300">&lt; 2 Hours</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-300">Application Processing:</span>
                  <span className="font-bold text-white">Paperless & Automated</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Staff Access:</span>
                  <span className="font-bold text-white">SuperAdmin, SchoolAdmin, Counsellor</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition shadow"
                >
                  <LogIn className="w-3.5 h-3.5 mr-2" />
                  Sign In to Staff Portal
                </Link>
                <button
                  onClick={() => handleOpenInquiry()}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition"
                >
                  Partner With MySchoolAdmissions
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 text-white font-extrabold text-xl mb-3">
                <GraduationCap className="h-6 w-6 text-blue-400" />
                <span>MySchoolAdmissions</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Empowering parents with direct school discovery, verified admission status, and seamless enrollment across premier institutions.
              </p>
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-[11px] font-bold text-emerald-400">● 2026–2027 Admissions Open</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#featured-schools" className="hover:text-white transition">Featured Schools</a></li>
                <li><a href="#admission-process" className="hover:text-white transition">How MySchoolAdmissions Works</a></li>
                <li><a href="#why-myschooladmissions" className="hover:text-white transition">School Partnerships</a></li>
                <li><button onClick={() => handleOpenInquiry()} className="hover:text-white transition">Inquiry Helpline</button></li>
                <li>
                  <button 
                    onClick={() => setIsChatOpen(true)} 
                    className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-semibold"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Ask EduBot AI (24/7 Help)</span>
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Curricula</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setSelectedBoard('CBSE')} className="hover:text-white transition">CBSE Schools</button></li>
                <li><button onClick={() => setSelectedBoard('IB')} className="hover:text-white transition">IB World Schools</button></li>
                <li><button onClick={() => setSelectedBoard('ICSE')} className="hover:text-white transition">ICSE & ISC Schools</button></li>
                <li><button onClick={() => setSelectedBoard('Cambridge')} className="hover:text-white transition">Cambridge / IGCSE</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Portal Access</h4>
              <p className="text-xs text-slate-400 mb-3">
                School administrators, admissions directors, and counsellors can sign in below:
              </p>
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
              >
                <LogIn className="w-3.5 h-3.5 mr-2" />
                Staff / Admin Login
              </Link>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>
              © 2026 MySchoolAdmissions. All rights reserved.
            </div>
            <div className="flex space-x-4">
              <Link to="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Admission Guidelines</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 9. Interactive Instant Admission Inquiry Modal */}
      {isInquiryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setIsInquiryModalOpen(false)}
            ></div>

            <div className="relative inline-block w-full max-w-lg p-6 my-8 text-left bg-white rounded-2xl shadow-2xl transform transition-all z-10 border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Direct School Inquiry • 2026–2027
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                    Admission Inquiry Form
                  </h3>
                </div>
                <button
                  onClick={() => setIsInquiryModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {inquirySubmitted ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Inquiry Successfully Submitted!</h4>
                  <p className="text-xs text-slate-600 mt-2">
                    Thank you, <strong className="text-slate-800">{parentName}</strong>. The admissions team at{' '}
                    <strong className="text-slate-800">{selectedSchoolForInquiry?.name}</strong> has received your inquiry.
                  </p>
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs inline-block">
                    <span className="text-slate-400">Reference ID:</span>{' '}
                    <span className="font-mono font-bold text-blue-600">{submittedRefId}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">
                    An admission counselor will contact you via phone or email within 24 hours.
                  </p>
                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setIsInquiryModalOpen(false);
                        setSelectedPaymentSchool(selectedSchoolForInquiry?.name || 'Delhi International School');
                        setPaymentStudentName(studentName);
                        setPaymentApplicationRef(submittedRefId);
                        setIsPaymentModalOpen(true);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Application Fee Online (₹1,500)</span>
                    </button>
                    <button
                      onClick={() => setIsInquiryModalOpen(false)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred School
                    </label>
                    <select
                      value={selectedSchoolForInquiry?.id || ''}
                      onChange={(e) => {
                        const s = schools.find(item => item.id === e.target.value);
                        setSelectedSchoolForInquiry(s || null);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name} ({school.city}) — {school.board}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Parent / Guardian Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={parentName}
                        onChange={e => setParentName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={e => setStudentName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Applying For Grade *
                      </label>
                      <select
                        value={targetGrade}
                        onChange={e => setTargetGrade(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Pre-Nursery">Pre-Nursery / Toddlers</option>
                        <option value="Nursery">Nursery</option>
                        <option value="Kindergarten">Kindergarten / Prep</option>
                        <option value="Grade 1">Grade 1</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Grade 3">Grade 3</option>
                        <option value="Grade 4">Grade 4</option>
                        <option value="Grade 5">Grade 5</option>
                        <option value="Grade 6">Grade 6</option>
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        disabled
                        value="2026–2027 (Active)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Questions / Specific Requirements (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={inquiryNotes}
                      onChange={e => setInquiryNotes(e.target.value)}
                      placeholder="e.g. Inquiring about transport routes, sibling discount, or scholarship test schedule..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                    >
                      Submit Admission Inquiry
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                      🔒 Your details are securely shared only with the selected institution's admissions office.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. School Details Modal */}
      {activeDetailsSchool && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setActiveDetailsSchool(null)}
            ></div>

            <div className="relative inline-block w-full max-w-2xl p-6 my-8 text-left bg-white rounded-2xl shadow-2xl transform transition-all z-10 border border-slate-200">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {activeDetailsSchool.isOpenForAdmissions ? '● Admissions Open 2026-27' : 'Admissions Closed'}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    {activeDetailsSchool.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeDetailsSchool.city}, {activeDetailsSchool.state} • Board: {activeDetailsSchool.board}
                  </p>
                </div>
                <button
                  onClick={() => setActiveDetailsSchool(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">About the School</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeDetailsSchool.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Grades Offered</span>
                    <span className="font-semibold text-slate-800">{activeDetailsSchool.grades}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Fee Bracket</span>
                    <span className="font-semibold text-blue-600">{activeDetailsSchool.annualFees}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Application Deadline</span>
                    <span className="font-semibold text-slate-800">{activeDetailsSchool.admissionDeadline || 'Open'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Campuses</h4>
                  <div className="space-y-2">
                    {activeDetailsSchool.campuses.map(c => (
                      <div key={c.id} className="p-3 rounded-lg border border-slate-200 bg-white flex items-start space-x-2 text-xs">
                        <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-slate-500">{c.address}, {c.city}, {c.state} {c.postalCode}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Facilities & Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeDetailsSchool.facilities.map((fac, idx) => (
                      <span key={idx} className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                        ✓ {fac}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                  <div className="text-slate-500">
                    <span>Contact: {activeDetailsSchool.contactPhone}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const sch = activeDetailsSchool;
                        setActiveDetailsSchool(null);
                        handleOpenInquiry(sch);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                    >
                      Apply / Inquire Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay & Stripe Live Payment Gateway Modal */}
      <PaymentCheckoutModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        schoolName={selectedPaymentSchool}
        defaultStudentName={paymentStudentName}
        defaultApplicationNumber={paymentApplicationRef}
      />

      {/* 24/7 AI Admissions Consultant Floating Chatbot (Ollama / Domain Intelligence) */}
      <EduBotChat 
        onOpenInquiry={() => handleOpenInquiry()} 
        isOpen={isChatOpen}
        onToggle={setIsChatOpen}
      />

      {/* In-Person Campus Tour Booking Modal */}
      <BookTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
      />
    </div>
  );
}
