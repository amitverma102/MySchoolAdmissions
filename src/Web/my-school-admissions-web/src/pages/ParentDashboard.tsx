import { useState, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../lib/api';
import { type Enquiry, type Application, type Enrollment } from '../types';
import ApplicationTracker from '../components/parent/ApplicationTracker';

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  const token = localStorage.getItem('token');
  const userEmail = useMemo(() => {
    if (!token) return '';
    try {
      const decoded: any = jwtDecode(token);
      return decoded.email || '';
    } catch {
      return '';
    }
  }, [token]);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    // Fetch data specifically for this parent's email
    Promise.all([
      api.get<Enquiry[]>(`/api/leads?email=${encodeURIComponent(userEmail)}`).catch(() => ({ data: [] })),
      api.get<Application[]>(`/api/applications?parentEmail=${encodeURIComponent(userEmail)}`).catch(() => ({ data: [] })),
      api.get<Enrollment[]>(`/api/enrollments?parentEmail=${encodeURIComponent(userEmail)}`).catch(() => ({ data: [] }))
    ])
    .then(([leadsRes, appsRes, enrRes]) => {
      // For simplicity, take the most recent/first match
      if (leadsRes.data && leadsRes.data.length > 0) {
        setEnquiry(leadsRes.data[0]);
      }
      if (appsRes.data && appsRes.data.length > 0) {
        setApplication(appsRes.data[0]);
      }
      if (enrRes.data && enrRes.data.length > 0) {
        setEnrollment(enrRes.data[0]);
      }
    })
    .finally(() => setLoading(false));
  }, [userEmail]);

  if (loading) {
    return <div>Loading your dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white rounded-2xl p-6 shadow-sm border border-indigo-900">
        <h2 className="text-2xl font-bold">Welcome back!</h2>
        <p className="text-blue-100 text-sm mt-1">Track the progress of your child's admission journey here.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ApplicationTracker application={application} enquiry={enquiry} enrollment={enrollment} />
      </div>
      
      {/* Quick Links Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/calendar" className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition group">
          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition">Schedule Campus Tour</div>
          <p className="text-xs text-gray-500 mt-1">Visit our facilities and meet counselors</p>
        </a>
        <a href="/applications" className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition group">
          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition">Submit Documents</div>
          <p className="text-xs text-gray-500 mt-1">Upload required admission files</p>
        </a>
        <a href="/enrollments" className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition group">
          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition">Pay Fees</div>
          <p className="text-xs text-gray-500 mt-1">Clear pending application or term fees</p>
        </a>
      </div>
    </div>
  );
}
