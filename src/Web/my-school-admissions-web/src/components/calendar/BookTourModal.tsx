import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  X, 
  Building2, 
  Sparkles, 
  Phone, 
  Mail, 
  User 
} from 'lucide-react';
import api from '../../lib/api';

interface BookTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTourBooked?: () => void;
  defaultCampusId?: string;
}

interface TourSlot {
  institutionId?: string;
  campusId?: string;
  institutionName?: string;
  campusName?: string;
  timeSlot: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedCount: number;
  maxCapacity: number;
  assignedRepresentativeId?: string;
  assignedRepresentativeName?: string;
  assignedRepresentativePhone?: string;
}

interface TourInstitution {
  id: string;
  name: string;
  campuses: { id: string; name: string; address: string; city: string; state: string }[];
}

interface BookingResult {
  confirmationCode: string;
  scheduledTime: string;
  counselorName: string;
  message: string;
}

export default function BookTourModal({ isOpen, onClose, onTourBooked, defaultCampusId }: BookTourModalProps) {
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('Grade 1');
  const [tourDate, setTourDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM - 11:45 AM');
  const [attendees, setAttendees] = useState(2);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TourSlot[]>([]);
  const [tourInstitutions, setTourInstitutions] = useState<TourInstitution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState(defaultCampusId || '');
  const [bookingSuccess, setBookingSuccess] = useState<BookingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedInstitution = tourInstitutions.find(i => i.id === selectedInstitutionId);
  const selectedCampus = selectedInstitution?.campuses.find(c => c.id === selectedCampusId);

  useEffect(() => {
    if (!isOpen) return;
    api.get<TourInstitution[]>('/api/institutions/public')
      .then(res => {
        let institutions = res.data || [];
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const loggedInInstitution = localStorage.getItem('selectedInstitutionId');
        
        if (user && (user.role === 'InstituteAdmin' || user.role === 'Counselor' || user.role === 'Staff')) {
          const targetInst = user.institutionId || loggedInInstitution;
          if (targetInst && targetInst !== 'all') {
            institutions = institutions.filter(i => i.id === targetInst);
          }
        } else if (user && user.role === 'SuperAdmin' && loggedInInstitution && loggedInInstitution !== 'all') {
          institutions = institutions.filter(i => i.id === loggedInInstitution);
        }
        
        setTourInstitutions(institutions);
        const initialInstitution = institutions.find(i => i.campuses.some(c => c.id === (defaultCampusId || selectedCampusId))) || institutions[0];
        if (initialInstitution) {
          setSelectedInstitutionId(initialInstitution.id);
          setSelectedCampusId(defaultCampusId && initialInstitution.campuses.some(c => c.id === defaultCampusId) ? defaultCampusId : initialInstitution.campuses[0]?.id || '');
        }
      })
      .catch(() => setErrorMessage('Unable to load institute campuses right now.'));
  }, [isOpen, defaultCampusId]);

  // Fetch real-time available slots when date changes
  useEffect(() => {
    if (!isOpen) return;

    if (!selectedCampusId) {
      setAvailableSlots([]);
      setSelectedSlot('');
      setErrorMessage('');
      return;
    }

    const fetchSlots = async () => {
      setSlotsLoading(true);
      setErrorMessage('');
      try {
        const res = await api.get(`/api/leads/activities/public/slots`, {
          params: { date: tourDate, campusId: selectedCampusId }
        });
        setAvailableSlots(res.data);
        const firstAvailable = res.data.find((s: TourSlot) => s.isAvailable);
        if (firstAvailable) {
          setSelectedSlot(firstAvailable.timeSlot);
        }
      } catch (err) {
        setAvailableSlots([]);
        setSelectedSlot('');
        setErrorMessage('No tour availability is published for this campus and date.');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [tourDate, isOpen, selectedCampusId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const payload = {
        parentName: parentName.trim(),
        studentName: studentName.trim() || parentName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        gradeInterested: grade,
        tourDate: new Date(tourDate).toISOString(),
        timeSlot: selectedSlot,
        institutionId: selectedInstitutionId || null,
        campusId: selectedCampusId || null,
        notes: notes.trim(),
        numberOfAttendees: Number(attendees)
      };

      const res = await api.post('/api/leads/activities/public/book-tour', payload);
      setBookingSuccess(res.data);
      if (onTourBooked) onTourBooked();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to book campus tour. Please verify your contact details.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBookingSuccess(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Schedule an In-Person Campus Tour</h3>
              <p className="text-xs text-blue-100">Walk the grounds, inspect lab & sports facilities, meet our counselors</p>
            </div>
          </div>
          <button 
            onClick={resetForm}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {bookingSuccess ? (
          /* Confirmation Success Screen */
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full mb-2">
                Booking Confirmed
              </span>
              <h4 className="text-2xl font-extrabold text-gray-900">We're Excited to Host You!</h4>
              <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">
                A confirmation has been scheduled on our school calendar. Our admissions team will be ready to guide your family.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Confirmation Code:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{bookingSuccess.confirmationCode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Student & Grade:</span>
                <span className="font-semibold text-slate-800">{studentName || parentName} ({grade})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Date & Slot:</span>
                <span className="font-semibold text-slate-800">{new Date(tourDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Designated Counselor:</span>
                <span className="font-semibold text-indigo-700">{bookingSuccess.counselorName}</span>
              </div>
            </div>

            {/* Instant Notification Confirmation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <span className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="font-black text-[11px]">WhatsApp Dispatched</div>
                  <div className="text-[10px] text-emerald-700 truncate">{phone}</div>
                </div>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800">
                <span className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="font-black text-[11px]">Email Dispatched</div>
                  <div className="text-[10px] text-blue-700 truncate">{email || 'On file'}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
              <a
                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, my campus tour booking is confirmed (Ref: ${bookingSuccess.confirmationCode}) for ${studentName || parentName} (${grade}) on ${new Date(tourDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${selectedSlot}. Host: ${bookingSuccess.counselorName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
              >
                <span>📱 Open WhatsApp Details</span>
              </a>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          /* Tour Booking Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Institute to Visit *</label>
                <select
                  required
                  value={selectedInstitutionId}
                  onChange={e => {
                    const institution = tourInstitutions.find(i => i.id === e.target.value);
                    setSelectedInstitutionId(e.target.value);
                    setSelectedCampusId(institution?.campuses[0]?.id || '');
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Select institute</option>
                  {tourInstitutions.map(institution => <option key={institution.id} value={institution.id}>{institution.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Campus to Visit *</label>
                <select
                  required
                  value={selectedCampusId}
                  onChange={e => setSelectedCampusId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Select campus</option>
                  {(selectedInstitution?.campuses || []).map(campus => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                </select>
              </div>
              {selectedCampus && <div className="sm:col-span-2 text-[11px] text-blue-800">{selectedInstitution?.name} - {selectedCampus.name}, {selectedCampus.address}, {selectedCampus.city}</div>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Parent / Guardian Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contact Mobile (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Prospective Student Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Grade Seeking Admission *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="Nursery">Nursery / Playgroup</option>
                  <option value="LKG">LKG / Pre-Primary</option>
                  <option value="UKG">UKG</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={`Grade ${i + 1}`}>{`Grade ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Attendees (Family Members)
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <select
                    value={attendees}
                    onChange={(e) => setAttendees(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value={1}>1 Person</option>
                    <option value={2}>2 Persons (Parents)</option>
                    <option value={3}>3 Persons (Parents + Student)</option>
                    <option value={4}>4+ Family Members</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Date and Slot Picker */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 text-blue-600" />
                  Preferred Tour Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={tourDate}
                  onChange={(e) => setTourDate(e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Available Tour Slots:
                  </span>
                  {slotsLoading && <span className="text-[10px] text-blue-600 animate-pulse">Checking capacity...</span>}
                </label>

                {!selectedCampusId && (
                  <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    Select an institute and campus to view available tour slots.
                  </p>
                )}
                {selectedCampusId && !slotsLoading && availableSlots.length === 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No tour slots are available for this campus on the selected date.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.timeSlot}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot.timeSlot)}
                      className={`p-2.5 text-xs rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                        selectedSlot === slot.timeSlot
                          ? 'border-blue-600 bg-blue-50/90 text-blue-950 font-bold shadow-xs ring-2 ring-blue-500/20'
                          : slot.isAvailable
                          ? 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800'
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{slot.timeSlot}</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>Published ({slot.maxCapacity} seats)</span>
                          {slot.assignedRepresentativeName && (
                            <span className="text-purple-700 ml-1 truncate">• Host: {slot.assignedRepresentativeName}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold shrink-0 border ${
                        selectedSlot === slot.timeSlot 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : slot.isAvailable 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}>
                        {slot.isAvailable ? `${slot.maxCapacity - slot.bookedCount} left` : 'Full'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Any specific areas of interest? (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Want to inspect STEM laboratories, sports complex, school bus route."
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="pt-2 flex space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="w-1/3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {loading ? (
                  <span>Securing Tour Slot...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Confirm Campus Tour Booking</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
