import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Users,
  FileText,
  Database,
  Eye,
  KeyRound,
  CheckCircle2,
  Building2,
  PhoneCall,
  Search,
  Scale,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { getStoredBranding } from '../utils/branding';

interface PrivacyPolicyContentProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showSearch?: boolean;
}

export const PrivacyPolicyContent: React.FC<PrivacyPolicyContentProps> = ({
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  showSearch = true,
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const query = externalSearchQuery !== undefined ? externalSearchQuery : internalSearch;
  const setQuery = externalOnSearchChange || setInternalSearch;

  const branding = useMemo(() => getStoredBranding(), []);
  const appName = branding.appName || 'Terado CRM';

  const sections = useMemo(() => [
    {
      id: 'introduction',
      title: '1. Introduction & Platform Scope',
      icon: Building2,
      tag: 'Overview',
      content: `Welcome to ${appName} (hereinafter referred to as "${appName}", "we", "our", or "the Platform"). ${appName} is an enterprise-grade Channel Partner (CP) management, lead protection, and real estate sales facilitation system.

Our primary mission is to empower real estate developers, brokers, channel partners, and sales professionals with a transparent, tamper-proof, and streamlined platform for client onboarding, automated lead locking, site visit coordination, and commission tracking.

This Privacy Policy explains how we collect, process, disclose, protect, and retain personal, business, and transactional data when you access or interact with our web portal, API endpoints, mobile web experiences, and related services. By registering, logging in, or submitting any data on ${appName}, you acknowledge that you have read, understood, and consented to the practices detailed in this Policy.`,
      highlights: [
        'Applicable to Brokers, Channel Partners, Sales Executives, Calling Agents, and Visitors',
        'Built with strict compliance to applicable Information Technology and Digital Personal Data Protection laws',
        'Guaranteed zero unauthorized data monetization or third-party resale',
      ],
    },
    {
      id: 'information-collected',
      title: '2. Information We Collect',
      icon: Database,
      tag: 'Data Categories',
      content: `To provide secure authentication, conflict-free lead attribution, and statutory compliance, ${appName} collects data under several distinct categories:`,
      subsections: [
        {
          heading: 'A. Broker & Channel Partner Identification Data',
          details: 'When registering or updating your broker profile: Full legal name, agency/company name, primary mobile number, alternate mobile number, official email address, office address (Line 1, Line 2, City, State, PIN code), and company registration documents.',
        },
        {
          heading: 'B. Statutory & Regulatory Credentials (KYC)',
          details: 'To comply with Real Estate Regulatory Authority (RERA) mandates and taxation laws: Government-issued Permanent Account Number (PAN), Goods & Services Tax Identification Number (GSTIN), and State RERA Registration Number/Certificate.',
        },
        {
          heading: 'C. Client & Lead Information (Prospective Buyers)',
          details: 'Submitted exclusively for lead locking and site visit generation: Client full name, primary mobile number, secondary contact number, email address, property configuration preference (e.g., 2BHK, 3BHK, Villa, Commercial), budget bracket, and project interest.',
        },
        {
          heading: 'D. Transactional, Audit & Site Visit Data',
          details: 'Automated digital visit passes, QR code tokens, check-in timestamps recorded by on-site receptionists, sales executive meeting notes, lead reassignment histories, booking invoices, and approved commission payout schedules.',
        },
        {
          heading: 'E. Device, Technical & Telemetry Information',
          details: 'IP address, browser type and version, operating system, session access tokens, OTP request timestamps, device identifiers, and interaction logs captured to mitigate fraud, prevent unauthorized credential sharing, and debug platform latency.',
        },
      ],
    },
    {
      id: 'lead-locking-protection',
      title: '3. OTP-Based Lead Locking & Anti-Dispute Protocol',
      icon: Lock,
      tag: 'Core Feature',
      content: `The cornerstone of ${appName} is our proprietary OTP-based Lead Ownership Locking Mechanism, engineered specifically to eliminate channel partner disputes and ensure irrevocable broker attribution:`,
      bulletPoints: [
        'Instant OTP Verification: When a broker enters a prospective lead, a one-time passcode (OTP) is dispatched via secure SMS/WhatsApp to the customer\'s registered phone number.',
        '60-Second Customer Ownership Lock: Upon successful customer verification, the lead is cryptographically linked to the initiating broker for the defined exclusivity window. No competing broker or internal executive can duplicate, overwrite, or claim the lead during this tenure.',
        'Tamper-Evident Audit Trails: Every OTP generation, verification timestamp, IP origin, and receptionist check-in is logged into an immutable audit ledger, serving as definitive evidence in the event of any attribution dispute.',
        'Fair Round-Robin & Executive Allocation: Internal inbound inquiries and unassigned walk-ins are distributed via automated round-robin algorithms, preventing favoritism and maintaining strict data segregation.',
      ],
    },
    {
      id: 'data-usage',
      title: '4. How We Use Your Information',
      icon: Eye,
      tag: 'Processing Purpose',
      content: `We collect and process your information strictly for legitimate commercial and operational purposes, including:`,
      bulletPoints: [
        'Facilitating secure, passwordless authentication using time-sensitive OTP security PINs.',
        'Generating digital site-visit passes and instant visitor verification badges for security gates and reception desks.',
        'Calculating broker commission tranches, generating payout vouchers, and facilitating statutory TDS reporting.',
        'Notifying channel partners about lead status updates, site visit completions, booking milestones, and inventory releases.',
        'Preventing fraudulent lead stuffing, duplicate registrations, and unauthorized account access.',
        'Complying with regulatory directives under RERA, GST rules, and judicial subpoenas.',
      ],
    },
    {
      id: 'access-control-sharing',
      title: '5. Role-Based Access Control (RBAC) & Sharing',
      icon: Users,
      tag: 'Data Segregation',
      content: `Data confidentiality on ${appName} is enforced through strict Role-Based Access Control (RBAC). Data is partitioned so that users can only view information essential to their designated responsibilities:`,
      subsections: [
        {
          heading: 'Brokers & Channel Partners',
          details: 'Can only view their own registered leads, generated site passes, and respective commission payouts. They cannot view or search leads registered by other channel partners.',
        },
        {
          heading: 'Sales Executives',
          details: 'Can only access leads assigned to them by administrators or through the round-robin engine. Contact details may be masked or time-restricted in accordance with project governance policies.',
        },
        {
          heading: 'Front-Desk Receptionists',
          details: 'Can access visitor check-in queues, verify digital visit pass QR codes, and log customer arrival times without visibility into confidential commission agreements or financial balances.',
        },
        {
          heading: 'Platform Administrators & Management',
          details: 'Maintain overall oversight for master data, role permission allocations, audit dispute resolution, and organization branding settings.',
        },
      ],
      highlights: [
        'Zero Data Reselling: We will NEVER sell, lease, or monetize your client leads or broker databases to third-party telemarketers or advertisers.',
        'Service Partners: Data may only be processed by trusted infrastructure sub-processors (such as AWS cloud hosting, transactional SMS gateways, and secure object storage) bound by strict non-disclosure obligations.',
      ],
    },
    {
      id: 'security-infrastructure',
      title: '6. Data Security & Cloud Infrastructure',
      icon: ShieldCheck,
      tag: 'Security Measures',
      content: `${appName} employs enterprise-grade administrative, technical, and physical safeguards designed to preserve data integrity, confidentiality, and resilience:`,
      bulletPoints: [
        'Transport Layer Security (TLS): All web traffic, API transactions, and token exchanges are encrypted in transit using modern TLS 1.3 / HTTPS encryption.',
        'Encryption at Rest: Sensitive business documents (PAN cards, GST certificates, RERA licenses) stored in Amazon Web Services (AWS) S3 buckets are encrypted using AES-256 server-side encryption.',
        'Short-Lived Authorization Tokens: API access utilizes authenticated JSON Web Tokens (JWT) with strict expiration periods and cryptographically signed refresh tokens stored in secure, HttpOnly-capable storage.',
        'Masked Sensitive Identifiers: Customer contact numbers and email addresses displayed in operational summaries are automatically masked (e.g., +91 98••••123) to prevent unauthorized exfiltration or scraping.',
      ],
    },
    {
      id: 'cookies-storage',
      title: '7. Cookies & Local Storage Practices',
      icon: KeyRound,
      tag: 'Tokens & Sessions',
      content: `Our portal utilizes minimal, strictly necessary cookies and browser storage keys to ensure seamless, secure portal operations:`,
      subsections: [
        {
          heading: 'Essential Session Cookies ("token", "userRole")',
          details: 'Stores your active authentication token and assigned privilege role. These expire automatically after 7 days of inactivity or upon clicking "Sign Out".',
        },
        {
          heading: '"Remember Me" Cookie ("remember_me_email_or_phone")',
          details: 'If voluntarily checked during login, your username/email is retained locally for up to 30 days to expedite subsequent OTP requests. It does not store passwords or verification PINs.',
        },
        {
          heading: 'Local Storage State ("app_branding", "resend_otp_cooldown")',
          details: 'Used locally in your browser to maintain UI preferences (such as organization theme colors, active project filters, and the 30-second OTP resend countdown timer).',
        },
      ],
    },
    {
      id: 'retention-deletion',
      title: '8. Data Retention & Account Deletion',
      icon: Clock,
      tag: 'Lifecycle',
      content: `We retain personal and transactional information only for as long as is necessary to fulfill the purposes outlined in this Privacy Policy:`,
      bulletPoints: [
        'Active Lead Data: Preserved throughout the valid lifecycle of the customer enquiry, site visit cycle, and active negotiation period specified by developer rules.',
        'Audit & Commission Records: Financial statements, commission credit vouchers, and tax deductions (TDS) are retained for a minimum of 7 years in accordance with applicable corporate, GST, and income tax regulations.',
        'Deactivation & Deletion Requests: Channel partners who wish to terminate their partnership may submit an account deactivation request. KYC records that are not mandated by statutory retention requirements will be archived or permanently purged within 30 business days.',
      ],
    },
    {
      id: 'user-rights',
      title: '9. Your Privacy Rights & Controls',
      icon: Scale,
      tag: 'Legal Entitlements',
      content: `Subject to local data protection laws, all registered brokers and users enjoy the following rights regarding their data on ${appName}:`,
      bulletPoints: [
        'Right to Access & Review: You may view your registered personal profile, verified documents, and lead pipeline directly through your dashboard.',
        'Right to Rectification: You may update or correct outdated phone numbers, email addresses, or business details through the Broker Profile screen or by submitting an administrative change request.',
        'Right to Inquire Regarding Lead Attribution: You have the right to request an audit log snapshot regarding any contested lead ownership or OTP verification timestamp.',
        'Right to Restrict Marketing Communications: You can opt out of promotional broadcasts while continuing to receive critical transaction OTPs and visit pass confirmations.',
      ],
    },
    {
      id: 'grievance-contact',
      title: '10. Grievance Redressal & Support Desk',
      icon: PhoneCall,
      tag: 'Contact Us',
      content: `If you have any questions, concerns, or grievances regarding this Privacy Policy, your lead ownership locks, or our data handling practices, please contact our dedicated Data Protection and Grievance Officer:`,
      contactCard: {
        officer: 'Data Protection & Grievance Redressal Officer',
        organization: `${appName} Systems / Operations Department`,
        email: 'info@teradocrm.com',
        supportEmail: 'info@teradocrm.com',
        escalationTime: 'Responses provided within 48 business hours',
      },
    },
  ], [appName]);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!query.trim()) return sections;
    const lower = query.toLowerCase().trim();
    return sections.filter((sec) => {
      const matchTitle = sec.title.toLowerCase().includes(lower);
      const matchContent = sec.content.toLowerCase().includes(lower);
      const matchSub = sec.subsections?.some(
        s => s.heading.toLowerCase().includes(lower) || s.details.toLowerCase().includes(lower)
      );
      const matchBullets = sec.bulletPoints?.some(b => b.toLowerCase().includes(lower));
      const matchHighlights = sec.highlights?.some(h => h.toLowerCase().includes(lower));
      return matchTitle || matchContent || matchSub || matchBullets || matchHighlights;
    });
  }, [sections, query]);

  return (
    <div className="space-y-6 print:space-y-4 text-left">
      {/* Search Bar (Hidden when printing) */}
      {showSearch && (
        <div className="relative print:hidden">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search policy (e.g. 'lead lock', 'OTP', 'commission', 'KYC', 'cookies')..."
            className="w-full pl-10 pr-16 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1062AC] focus:border-[#1062AC] transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Notice Pill */}
      <div
        className="p-4 print:p-2.5 rounded-xl print:rounded-lg bg-blue-100/70 border border-blue-200 flex items-center gap-3 text-xs sm:text-sm text-blue-950 font-medium shadow-xs break-inside-avoid print:break-inside-avoid"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        <Sparkles className="w-4.5 h-4.5 text-[#1062AC] shrink-0" />
        <span className="leading-relaxed">
          <strong className="font-bold text-slate-900">Enterprise Transparency:</strong> This policy applies to all portal operations across{' '}
          <strong className="text-[#1062AC] underline decoration-blue-500 font-bold">{appName}</strong>.
        </span>
      </div>

      {/* Sections List */}
      {filteredSections.length === 0 ? (
        <div className="py-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800">
            No sections found matching "{query}"
          </p>
          <button
            onClick={() => setQuery('')}
            className="text-xs text-[#1062AC] hover:underline font-extrabold cursor-pointer"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {filteredSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <section
                key={sec.id}
                id={sec.id}
                className="scroll-mt-24 p-6 sm:p-7 print:p-5 rounded-2xl print:rounded-xl bg-white border border-slate-200/90 print:border-slate-300 shadow-sm print:shadow-none transition space-y-4 print:space-y-2.5 text-slate-900 break-inside-avoid print:break-inside-avoid policy-section"
                style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 print:pb-2.5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 print:w-8 print:h-8 rounded-xl bg-[#1062AC] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Icon className="w-5 h-5 print:w-4 print:h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#1062AC] block">
                        {sec.tag}
                      </span>
                      <h3 className="text-lg sm:text-xl print:text-base font-black text-slate-900 tracking-tight">
                        {sec.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Main Paragraph */}
                <p className="text-sm sm:text-[14.5px] print:text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                  {sec.content}
                </p>

                {/* Subsections if any */}
                {sec.subsections && sec.subsections.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print:gap-2.5 pt-2 print:pt-1">
                    {sec.subsections.map((sub, idx) => (
                      <div
                        key={idx}
                        className="p-4 print:p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 break-inside-avoid print:break-inside-avoid subsection-card"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                      >
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#1062AC] shrink-0"></span>
                          <span>{sub.heading}</span>
                        </h4>
                        <p className="text-xs sm:text-[13px] print:text-[11px] text-slate-700 leading-relaxed font-medium pl-4">
                          {sub.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bullet Points if any */}
                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <ul className="space-y-2.5 print:space-y-1.5 pt-2 print:pt-1">
                    {sec.bulletPoints.map((bp, bidx) => (
                      <li
                        key={bidx}
                        className="flex items-start gap-3 print:gap-2 text-xs sm:text-sm print:text-xs text-slate-800 font-medium break-inside-avoid print:break-inside-avoid"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                      >
                        <CheckCircle2 className="w-4.5 h-4.5 print:w-3.5 print:h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Highlights box if any */}
                {sec.highlights && sec.highlights.length > 0 && (
                  <div
                    className="p-4 print:p-3 rounded-xl bg-blue-50/70 border-l-4 border-[#1062AC] space-y-2 print:space-y-1 break-inside-avoid print:break-inside-avoid"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    {sec.highlights.map((hl, hidx) => (
                      <div key={hidx} className="flex items-start gap-2 text-xs sm:text-sm print:text-xs font-semibold text-slate-900">
                        <span className="text-[#1062AC] font-black text-base leading-none">•</span>
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact Card if Section 10 */}
                {sec.contactCard && (
                  <div
                    className="p-5 sm:p-6 print:p-4 rounded-2xl bg-gradient-to-br from-[#0B1528] via-[#0E1F38] to-[#1062AC] text-white space-y-3.5 print:space-y-2 shadow-md border border-white/10 mt-3 break-inside-avoid print:break-inside-avoid"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-300">
                        Official Redressal Channel
                      </span>
                      <span className="text-[11px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full">
                        {sec.contactCard.escalationTime}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-base font-bold text-white">{sec.contactCard.officer}</div>
                      <div className="text-xs sm:text-sm text-sky-100">{sec.contactCard.organization}</div>
                    </div>
                    <div className="pt-3 border-t border-white/15 text-xs sm:text-sm">
                      <span className="text-sky-200/80 text-[11px] uppercase font-bold block">Support &amp; Grievance Contact:</span>
                      <a
                        href={`mailto:${sec.contactCard.supportEmail}`}
                        className="text-white hover:text-sky-300 font-bold underline text-sm sm:text-base inline-flex items-center gap-1.5 pt-0.5"
                      >
                        {sec.contactCard.supportEmail}
                      </a>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
