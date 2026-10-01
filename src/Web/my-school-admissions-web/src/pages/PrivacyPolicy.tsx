import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Information we collect',
    paragraphs: [
      'We collect information you provide when you contact us, request information about a school, submit an admission inquiry or application, book a campus tour, make a payment, or use an account. This may include names, contact details, a child’s admission details, messages, and documents you choose to provide.',
      'When an institution uses the platform, we process information its authorized staff enter or receive to manage inquiries, applications, communications, appointments, and admissions. Institutions are responsible for the information they provide and for their own notices to parents and applicants.'
    ]
  },
  {
    title: 'How we use information',
    paragraphs: [
      'We use information to provide and secure the service; route inquiries to the relevant institution; support admission workflows, campus visits, and payments; respond to requests; maintain records; and improve the reliability of the platform.',
      'If an authorized administrator connects an advertising account, we use the account and page details and permissions granted to that account to prepare and publish the advertising content they request. We do not use those permissions to access unrelated personal messages or publish without an authorized user’s instruction.'
    ]
  },
  {
    title: 'When information is shared',
    paragraphs: [
      'Admission inquiry and application information is shared with the institution the parent or applicant contacts or applies to, and with that institution’s authorized staff who need it for admissions. We also use service providers that help operate the platform, communications, hosting, and payment features.',
      'When an institution or Super Admin connects Meta or Google, those providers process data under their own terms and privacy policies. We may also disclose information when required by law, to protect the service and its users, or as part of a business transfer. We do not sell personal information.'
    ]
  },
  {
    title: 'Advertising platform connections',
    paragraphs: [
      'A user who connects a Meta or Google account authorizes the platform to use the granted permissions for the selected advertising account. Connection tokens are stored in encrypted form. Authorized users can disconnect an account through the platform settings; disconnecting prevents future API access but does not remove ads already created in the provider account.'
    ]
  },
  {
    title: 'Children’s information',
    paragraphs: [
      'The service supports school admissions and may process information about children when a parent or guardian submits it, or when an institution enters it for an admissions purpose. A parent or legal guardian should provide a child’s information and contact the relevant institution or us to request access, correction, or deletion.'
    ]
  },
  {
    title: 'Retention and security',
    paragraphs: [
      'We retain information for as long as needed to provide the service, meet operational and legal obligations, resolve disputes, and enforce agreements. Institutions may have separate retention practices for records they manage.',
      'We use technical and organizational safeguards intended to protect information. No online service or transmission can be guaranteed completely secure.'
    ]
  },
  {
    title: 'Your choices and requests',
    paragraphs: [
      'You may ask us to access, correct, or delete personal information we hold, subject to applicable law and records an institution is required to keep. For an admission record held by a school, contact that school directly. You can also stop using the service and disconnect linked advertising accounts.'
    ]
  },
  {
    title: 'Cookies and device storage',
    paragraphs: [
      'The site may use browser storage and similar technologies to keep you signed in, remember settings, and protect account sessions. You can clear or block these technologies in your browser, though parts of the service may then stop working.'
    ]
  },
  {
    title: 'Changes and contact',
    paragraphs: [
      'We may update this policy as the service or applicable requirements change. We will post the revised policy on this page and update its effective date.',
      'For privacy questions or requests, email admin@myschooladmissions.in. Please do not include sensitive documents or a child’s full records in an initial email.'
    ]
  }
];

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <title>Privacy Policy | MySchoolAdmissions</title>
      <meta name="description" content="Privacy Policy for MySchoolAdmissions, including how admission information and connected advertising accounts are handled." />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link to="/" className="text-lg font-extrabold text-slate-900">MySchoolAdmissions</Link>
          <Link to="/" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Back to home</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Legal</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">Effective date: September 29, 2026</p>
        <p className="mt-8 text-lg leading-8 text-slate-700">
          This policy explains how MySchoolAdmissions handles information when you visit our website or use our admissions platform.
        </p>
        <div className="mt-10 space-y-9">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
              <div className="mt-3 space-y-3 text-base leading-7 text-slate-700">
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </article>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 MySchoolAdmissions</span>
          <Link to="/" className="font-medium text-blue-700 hover:text-blue-800">Home</Link>
        </div>
      </footer>
    </main>
  );
}
