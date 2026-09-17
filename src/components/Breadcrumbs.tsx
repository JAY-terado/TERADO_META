import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useBrokerConnect } from '../context/BrokerConnectContext';

export const Breadcrumbs: React.FC = () => {
  const { leads } = useBrokerConnect();
  const location = useLocation();
  const path = location.pathname;

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    localStorage.getItem('selectedLeadId')
  );
  const [selectedAdminLeadName, setSelectedAdminLeadName] = useState<string | null>(
    localStorage.getItem('selectedAdminLeadName')
  );
  const [cpBrokerName, setCpBrokerName] = useState<string | null>(
    localStorage.getItem('cpBrokerName')
  );
  const [cpLeadCustomerName, setCpLeadCustomerName] = useState<string | null>(
    localStorage.getItem('cpLeadCustomerName')
  );
  const [selectedNotificationEvent, setSelectedNotificationEvent] = useState<string | null>(
    localStorage.getItem('selectedNotificationEvent')
  );
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(
    localStorage.getItem('selectedProjectName')
  );
  const [receptionistCustomerName, setReceptionistCustomerName] = useState<string | null>(
    localStorage.getItem('receptionistCustomerName')
  );
  const [selectedUserName, setSelectedUserName] = useState<string | null>(
    localStorage.getItem('selectedUserName')
  );
  const [selectedBrokerName, setSelectedBrokerName] = useState<string | null>(
    localStorage.getItem('selectedBrokerName')
  );

  // Poll localStorage/state changes to keep breadcrumbs in sync
  useEffect(() => {
    const checkLeadSelection = () => {
      const current = localStorage.getItem('selectedLeadId');
      if (current !== selectedLeadId) setSelectedLeadId(current);

      const adminName = localStorage.getItem('selectedAdminLeadName');
      if (adminName !== selectedAdminLeadName) setSelectedAdminLeadName(adminName);

      const brokerName = localStorage.getItem('cpBrokerName');
      if (brokerName !== cpBrokerName) setCpBrokerName(brokerName);

      const customerName = localStorage.getItem('cpLeadCustomerName');
      if (customerName !== cpLeadCustomerName) setCpLeadCustomerName(customerName);

      const notifEvent = localStorage.getItem('selectedNotificationEvent');
      if (notifEvent !== selectedNotificationEvent) setSelectedNotificationEvent(notifEvent);

      const projName = localStorage.getItem('selectedProjectName');
      if (projName !== selectedProjectName) setSelectedProjectName(projName);

      const receptionistCustName = localStorage.getItem('receptionistCustomerName');
      if (receptionistCustName !== receptionistCustomerName) setReceptionistCustomerName(receptionistCustName);

      const userName = localStorage.getItem('selectedUserName');
      if (userName !== selectedUserName) setSelectedUserName(userName);

      const selectedBrkName = localStorage.getItem('selectedBrokerName');
      if (selectedBrkName !== selectedBrokerName) setSelectedBrokerName(selectedBrkName);
    };
    const interval = setInterval(checkLeadSelection, 200);
    window.addEventListener('storage', checkLeadSelection);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkLeadSelection);
    };
  }, [selectedLeadId, selectedAdminLeadName, cpBrokerName, cpLeadCustomerName, selectedNotificationEvent, selectedProjectName, receptionistCustomerName, selectedUserName, selectedBrokerName]);

  // Detect whether we are in the CP sub-app
  const isCpPath = path.startsWith('/channel-partner');

  const getBreadcrumbs = () => {
    const segments = path.split('/').filter(Boolean);
    const list: { name: string; url: string; active: boolean }[] = [];

    // Home base node
    list.push({ name: 'Home', url: '/', active: false });

    // ── Channel-Partner special handling ──────────────────────────────────────
    if (isCpPath) {
      if (segments[1] === 'dashboard') {
        list.push({ name: 'Dashboard', url: '/channel-partner/dashboard', active: true });
        return list;
      }
      if (segments[1] === 'profile') {
        list.push({ name: 'Profile', url: '/channel-partner/profile', active: true });
        return list;
      }

      // 'Brokers' root crumb always links to the main broker list
      list.push({ name: 'Brokers', url: '/channel-partner/leads', active: false });

      // segments: ['channel-partner', 'brokers', ':id', 'leads', ':leadId?']
      const brokerIdSeg = segments[2];
      const hasLeadsPath = segments[3] === 'leads';
      const leadIdSeg = segments[4];

      if (brokerIdSeg && hasLeadsPath) {
        // Broker name crumb
        const brokerLabel = cpBrokerName || `Broker #${brokerIdSeg}`;
        list.push({
          name: brokerLabel,
          url: `/channel-partner/brokers/${brokerIdSeg}/leads`,
          active: false,
        });

        // "Leads" intermediate crumb (only when drilling into a lead detail)
        if (leadIdSeg) {
          list.push({
            name: 'Leads',
            url: `/channel-partner/brokers/${brokerIdSeg}/leads`,
            active: false,
          });

          // Customer name crumb (leaf)
          const leadLabel = cpLeadCustomerName || `Lead #${leadIdSeg}`;
          list.push({ name: leadLabel, url: path, active: false });
        }
      }

      // Mark last active
      if (list.length > 0) list[list.length - 1].active = true;
      return list;
    }

    // ── All other portals (original logic) ───────────────────────────────────
    let runningUrl = '';
    segments.forEach((seg) => {
      runningUrl += `/${seg}`;
      if (['broker', 'receptionist', 'sales', 'calling', 'admin', 'dashboard'].includes(seg)) {
        return;
      }
      
      if (path.startsWith('/admin/leads/') && seg !== 'leads' && segments.indexOf(seg) > segments.indexOf('leads')) {
        return;
      }
      
      if (seg === 'notifications') {
        return;
      }

      const isNumeric = /^\d+$/.test(seg);
      if (isNumeric) {
        if (path.includes('/notifications/')) {
          const name = selectedNotificationEvent || 'Loading...';
          list.push({ name, url: runningUrl, active: false });
          return;
        }
        if (path.includes('/projects/')) {
          const name = selectedProjectName || 'Loading...';
          list.push({ name, url: runningUrl, active: false });
          return;
        }
        if (path.includes('/receptionist/checkin/')) {
          const name = receptionistCustomerName || 'Loading...';
          list.push({ name, url: runningUrl, active: false });
          return;
        }
        if (path.includes('/users/')) {
          const name = selectedUserName || 'Loading...';
          list.push({ name, url: runningUrl, active: false });
          return;
        }
        if (path.includes('/brokers/')) {
          const name = selectedBrokerName || 'Loading...';
          list.push({ name, url: runningUrl, active: false });
          return;
        }
      }
      
      let name = seg.charAt(0).toUpperCase() + seg.slice(1);
      
      if (seg === 'broker') name = 'Broker Portal';
      else if (seg === 'receptionist') name = 'Reception Desk';
      else if (seg === 'sales') name = 'Sales Desk';
      else if (seg === 'calling') name = 'Calling Desk';
      else if (seg === 'admin') name = 'Admin Portal';
      else if (seg === 'dashboard') name = 'Dashboard';
      else if (seg === 'activity') name = 'Activity';
      else if (seg === 'pending-actions') name = 'Pending Actions';
      else if (seg === 'tasks') name = 'Tasks';
      else if (seg === 'register-lead') name = 'Register Customer';
      else if (seg === 'leads') name = 'All Leads';
      else if (seg === 'visit-pass') name = 'Visit Pass';
      else if (seg === 'commission') name = 'Commissions';
      else if (seg === 'profile') name = 'Profile';
      else if (seg === 'checkin') name = 'Check-In';
      else if (seg === 'appointments') name = 'Appointments';
      else if (seg === 'verification') name = 'Verification';
      else if (seg === 'bookings') name = 'Bookings';
      else if (seg === 'inventory') name = 'Inventory';
      else if (seg === 'site-visits') name = 'Site Visits';
      else if (seg === 'reports') name = 'Reports';
      else if (seg === 'brokers') name = 'Brokers';
      else if (seg === 'projects') name = 'Projects';
      else if (seg === 'users') name = 'Staff Management';
      else if (seg === 'settings') name = 'Settings';
      else if (seg === 'permissions') name = 'Role Permissions';

      let finalUrl = runningUrl;
      if (seg === 'broker') finalUrl = '/broker/dashboard';
      else if (seg === 'receptionist') finalUrl = '/receptionist/dashboard';
      else if (seg === 'sales') finalUrl = '/sales/dashboard';
      else if (seg === 'calling') finalUrl = '/calling/dashboard';
      else if (seg === 'admin') finalUrl = '/admin/dashboard';

      list.push({ name, url: finalUrl, active: false });
    });

    if ((path === '/calling/leads' || path === '/sales/leads' || (path === '/sales/dashboard' && selectedLeadId) || (path === '/sales/activity' && selectedLeadId) || (path === '/sales/pending-actions' && selectedLeadId)) && selectedLeadId) {
      const activeLead = leads.find((l) => l.id === selectedLeadId);
      if (activeLead) {
        list.push({
          name: activeLead.name,
          url: (path === '/sales/dashboard' || path === '/sales/activity' || path === '/sales/pending-actions') ? `${path}?leadId=${selectedLeadId}` : path,
          active: false,
        });
      }
    }

    if ((path === '/admin/leads' || path.startsWith('/admin/leads/')) && selectedAdminLeadName) {
      list.push({ name: selectedAdminLeadName, url: path, active: false });
    }

    if (list.length > 0) list[list.length - 1].active = true;
    return list;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="hidden lg:flex items-center gap-2 text-[12px] text-slate-500 font-medium tracking-wide select-none animate-fade-in">
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        
        return (
          <React.Fragment key={`${crumb.url}-${idx}`}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
            {isLast ? (
              <span className="flex items-center gap-1.5 text-slate-800 font-semibold tracking-normal">
                {crumb.name === 'Home' && <Home className="w-3.5 h-3.5 text-slate-800 shrink-0" />}
                <span>{crumb.name}</span>
              </span>
            ) : (
              <Link
                to={crumb.url}
                onClick={() => {
                  localStorage.removeItem('selectedLeadId');
                  localStorage.removeItem('selectedAdminLeadName');
                  localStorage.removeItem('cpBrokerName');
                  localStorage.removeItem('cpLeadCustomerName');
                  localStorage.removeItem('selectedNotificationEvent');
                  localStorage.removeItem('selectedProjectName');
                  localStorage.removeItem('selectedUserName');
                  localStorage.removeItem('selectedBrokerName');
                  setSelectedLeadId(null);
                  setSelectedAdminLeadName(null);
                  setCpBrokerName(null);
                  setCpLeadCustomerName(null);
                  setSelectedNotificationEvent(null);
                  setSelectedProjectName(null);
                  setSelectedUserName(null);
                  setSelectedBrokerName(null);
                }}
                className="hover:text-blue-600 active:text-blue-700 transition-colors duration-150 flex items-center gap-1.5 font-medium text-slate-400 hover:text-slate-600"
              >
                {crumb.name === 'Home' && <Home className="w-3.5 h-3.5 text-slate-400/90 shrink-0 transition-colors" />}
                <span>{crumb.name}</span>
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

