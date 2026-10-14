import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Printer,
  ChevronRight,
  Building2,
  Lock,
  Database,
  Users,
  Eye,
  KeyRound,
  Clock,
  Scale,
  PhoneCall,
  ExternalLink,
  ChevronUp
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { PrivacyPolicyContent } from '../components/PrivacyPolicyContent';
import { getStoredBranding } from '../utils/branding';

const TOC_ITEMS = [
  { id: 'introduction', label: '1. Introduction & Scope', icon: Building2 },
  { id: 'information-collected', label: '2. Information We Collect', icon: Database },
  { id: 'lead-locking-protection', label: '3. Lead Locking Protocol', icon: Lock },
  { id: 'data-usage', label: '4. How We Use Data', icon: Eye },
  { id: 'access-control-sharing', label: '5. Access Control & RBAC', icon: Users },
  { id: 'security-infrastructure', label: '6. Security & Infrastructure', icon: ShieldCheck },
  { id: 'cookies-storage', label: '7. Cookies & Tokens', icon: KeyRound },
  { id: 'retention-deletion', label: '8. Retention & Deletion', icon: Clock },
  { id: 'user-rights', label: '9. Your Privacy Rights', icon: Scale },
  { id: 'grievance-contact', label: '10. Grievance Desk', icon: PhoneCall },
];

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const branding = getStoredBranding();
  const appName = branding.appName || 'Terado CRM';

  const [activeSection, setActiveSection] = useState('introduction');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitor scroll for active section & scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      // Check which section is in view
      const scrollPosition = window.scrollY + 200;
      for (let i = TOC_ITEMS.length - 1; i >= 0; i--) {
        const item = TOC_ITEMS[i];
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(item.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-[#1062AC] selection:text-white">
      {/* Top Navigation Bar (Hidden when printing) */}
      <header className="sticky top-0 z-40 bg-[#0B1528]/95 backdrop-blur-md border-b border-white/10 text-white transition-all print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/login" className="flex items-center gap-2 text-white hover:opacity-90 transition">
              <BrandLogo subtitle="Privacy &amp; Compliance" size="sm" />
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Policy</span>
            </button>

            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1062AC] hover:bg-[#0D4E8C] text-xs font-bold text-white transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner with Clean Print Adaptation */}
      <div className="bg-[#0B1528] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-b border-white/8 print:bg-white print:text-slate-900 print:pt-2 print:pb-4 print:px-0 print:border-b-2 print:border-slate-800 print:overflow-visible">
        {/* Decorative ambient glowing orbs - Hidden when printing */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1062AC]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none anim-orb print:hidden"></div>
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-[#EC3237]/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none anim-orb-slow print:hidden"></div>

        <div className="max-w-7xl mx-auto relative z-10 space-y-4 print:space-y-2 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-sky-300 print:text-slate-800 print:bg-slate-100 print:border-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400 print:text-slate-700" />
            <span>Official Legal &amp; Data Protection Charter</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl print:text-2xl font-black tracking-tight leading-tight max-w-3xl print:text-slate-900">
            Privacy Policy &amp; Lead Protection Framework
          </h1>

          <p className="text-xs sm:text-sm text-blue-200/80 print:text-slate-700 max-w-2xl leading-relaxed">
            How <strong>{appName}</strong> safeguards broker accounts, prospective buyer records, OTP-based
            customer ownership locks, and transaction settlements.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 print:py-4 print:px-0 print:m-0 print:max-w-none print:w-full">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column: Sticky Table of Contents (Desktop - Hidden in Print) */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 space-y-4 print:hidden">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Contents Navigator
                </span>
                <span className="text-[10px] text-slate-500 font-bold">10 Sections</span>
              </div>

              <nav className="space-y-1" aria-label="Table of contents">
                {TOC_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#1062AC] text-white font-extrabold shadow-xs'
                          : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-1">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Contact Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B1528] to-slate-900 text-white space-y-2 border border-white/10 shadow-sm text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-300 block">
                Direct Inquiries
              </span>
              <p className="text-xs text-white/80 leading-relaxed">
                Need clarification regarding lead dispute rules or customer data privacy?
              </p>
              <a
                href="mailto:info@teradocrm.com"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline pt-1"
              >
                <span>Email Support Team</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* Right Column: Full Content */}
          <div className="flex-1 w-full min-w-0">
            <PrivacyPolicyContent
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              showSearch={true}
            />
          </div>
        </div>
      </main>

      {/* Floating Scroll to Top (Hidden in Print) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-30 p-3 rounded-full bg-[#1062AC] hover:bg-[#0D4E8C] text-white shadow-xl transition-all hover:scale-105 cursor-pointer print:hidden"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* Comprehensive Web Footer (Hidden in Print) */}
      <footer className="mt-16 bg-[#0B1528] text-white border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <BrandLogo subtitle="Enterprise Lead Protection & CRM" size="sm" />
            </div>
            <p className="text-xs text-blue-200/60 pt-1">
              Securing real estate channel partner partnerships with transparency, trust, and tamper-proof lead locks.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-white/70">
            <Link to="/login" className="hover:text-white transition">
              Partner Login
            </Link>
            <span>•</span>
            <Link to="/register" className="hover:text-white transition">
              Register as Broker
            </Link>
            <span>•</span>
            <a href="mailto:info@teradocrm.com" className="hover:text-white transition">
              Partner Support
            </a>
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs text-white/50">
              © {new Date().getFullYear()} {appName} Systems. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Clean Formal Document Footer (Only Visible in Print) */}
      <div
        className="hidden print:block text-center text-xs text-slate-500 pt-6 border-t border-slate-300 mt-6 break-inside-avoid"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        <p className="font-semibold text-slate-700">
          © {new Date().getFullYear()} {appName} Systems. All rights reserved.
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Enterprise Lead Protection &amp; Real Estate Channel Partner CRM · Official Policy Document
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
