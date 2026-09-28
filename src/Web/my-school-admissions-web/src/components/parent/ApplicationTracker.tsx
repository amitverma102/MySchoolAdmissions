import { CheckCircle2, Clock, FileText, CreditCard, GraduationCap, Building } from 'lucide-react';
import { type Application, type Enquiry, type Enrollment } from '../../types';

interface ApplicationTrackerProps {
  application: Application | null;
  enquiry: Enquiry | null;
  enrollment: Enrollment | null;
}

export default function ApplicationTracker({ application, enquiry, enrollment }: ApplicationTrackerProps) {
  const hasPaid = !!(enrollment?.status === 'Confirmed' || enrollment?.status === 'Onboarded' || (enrollment?.payments && enrollment.payments.some(p => p.status === 'Completed')));
  const paymentDate = enrollment?.payments?.[0]?.paymentDate;

  const steps = [
    {
      id: 'inquiry',
      title: 'Inquiry Submitted',
      description: 'Your initial inquiry has been received.',
      icon: <Building className="w-5 h-5" />,
      completed: !!enquiry,
      date: enquiry?.createdAt,
    },
    {
      id: 'application',
      title: 'Application Form',
      description: 'Submit your application and required documents.',
      icon: <FileText className="w-5 h-5" />,
      completed: !!application,
      date: application?.submittedDate || application?.createdAt,
      action: !application ? 'Submit Application' : null,
      actionUrl: '/applications/new'
    },
    {
      id: 'verification',
      title: 'Document Verification',
      description: 'The admissions team is verifying your documents.',
      icon: <Clock className="w-5 h-5" />,
      completed: application?.status === 'DocumentsVerified' || application?.status === 'Approved' || !!enrollment,
      date: null,
      pending: application && application.status === 'Submitted'
    },
    {
      id: 'fee',
      title: 'Fee Payment',
      description: 'Pay the application and seat reservation fees.',
      icon: <CreditCard className="w-5 h-5" />,
      completed: hasPaid,
      date: paymentDate,
      action: application?.status === 'Approved' && !hasPaid ? 'Pay Fees' : null,
      actionUrl: '/parent-portal',
      pending: application?.status === 'Approved' && !hasPaid
    },
    {
      id: 'enrolled',
      title: 'Enrollment Confirmed',
      description: 'Welcome to the institution!',
      icon: <GraduationCap className="w-5 h-5" />,
      completed: enrollment?.status === 'Confirmed' || enrollment?.status === 'Onboarded',
      date: null,
      pending: hasPaid && enrollment?.status !== 'Confirmed' && enrollment?.status !== 'Onboarded'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Application Journey</h3>
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100"></div>
        <div className="space-y-6">
          {steps.map((step, idx) => {
            const isCompleted = step.completed;
            const isPending = step.pending;
            const isLocked = !isCompleted && !isPending && !step.action;
            const isActionable = !!step.action;

            let bgColor = 'bg-gray-50';
            let iconColor = 'text-gray-400';
            let borderColor = 'border-gray-200';

            if (isCompleted) {
              bgColor = 'bg-green-50';
              iconColor = 'text-green-600';
              borderColor = 'border-green-200';
            } else if (isPending || isActionable) {
              bgColor = 'bg-blue-50';
              iconColor = 'text-blue-600';
              borderColor = 'border-blue-200';
            }

            return (
              <div key={step.id} className="relative flex items-start group">
                <div className={`absolute left-6 -ml-px w-0.5 h-full ${idx === steps.length - 1 ? 'hidden' : ''} ${isCompleted ? 'bg-green-500' : 'bg-gray-100'}`} />
                
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 bg-white ${isCompleted ? 'border-green-500' : (isPending || isActionable ? 'border-blue-500 shadow-sm' : 'border-gray-200')}`}>
                  {isCompleted ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <div className={iconColor}>{step.icon}</div>}
                </div>
                
                <div className={`ml-4 flex-1 rounded-xl border p-4 ${bgColor} ${borderColor} transition-colors ${isActionable ? 'hover:border-blue-300' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className={`text-sm font-bold ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{step.title}</h4>
                      <p className={`text-xs mt-1 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>{step.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {step.date && (
                        <span className="text-xs font-medium text-gray-500">
                          {new Date(step.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {isActionable && (
                        <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition">
                          {step.action}
                        </button>
                      )}
                      {isPending && !isActionable && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-full uppercase tracking-wide">
                          In Progress
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold rounded-full uppercase tracking-wide">
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
