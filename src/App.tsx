import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BrokerConnectProvider } from './context/BrokerConnectContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotificationDetailPage } from './pages/NotificationDetailPage';
import { OAuthCallbackPage } from './pages/OAuthCallback';

// Middleware / Guard imports
import { RequireAuth, RequireRole, RouteGuard } from './middleware';

// Broker imports
import {
  BrokerLayout,
  DashboardPage as BrokerDashboard,
  RegisterLeadPage,
  LeadsPage as BrokerLeads,
  VisitPassPage,
  CommissionPage as BrokerCommission,
  ProfilePage as BrokerProfile,
} from './broker';

// Receptionist imports
import {
  ReceptionistLayout,
  DashboardPage as ReceptionistDashboard,
  CheckInPage,
  AppointmentsPage,
  RegisterCustomerPage,
  RegisterBrokerPage,
  CustomerRevisitPage,
} from './receptionist';

// Sales imports
import {
  SalesLayout,
  DashboardPage as SalesDashboard,
  ActivityPage as SalesActivity,
  PendingActionsPage as SalesPendingActions,
  TasksPage as SalesTasks,
  LeadsPage as SalesLeads,
  BookingsPage,
  // InventoryPage,
  SiteVisitsPage,
  // ProjectBookingsDetail,
} from './sales';

// Channel Partner imports
import {
  ChannelPartnerLayout,
  DashboardPage as CPDashboard,
  LeadsPage as CPLeads,
  LeadDetailPage as CPLeadDetail,
  // CommissionsPage as CPCommissions,
  // ProjectsPage as CPProjects,
} from './channel_partner';

// Calling imports
import {
  CallingLayout,
  DashboardPage as CallingDashboard,
  LeadsPage as CallingLeads,
  ReportsPage as CallingReports,
} from './calling';

// Admin imports
import {
  AdminLayout,
  DashboardPage as AdminDashboard,
  BrokersPage,
  ProjectsPage,
  DisputesPage,
  UsersPage,
  SettingsPage,
  LeadsPage as AdminLeadsPage,
  TemplateSettings,
  CommissionPlansPage,
  ProjectDetailPage,
  NotFoundPage,
  UserDetailPage,
  BrokerDetailPage,
  ActionLeadsPage,
  ActionTasksPage,
  RolePermissionsPage,
  FacebookIntegrationPage,
} from './admin';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <BrokerConnectProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/v1/meta/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/meta/oauth/callback" element={<OAuthCallbackPage />} />

          {/* Authenticated Routes */}
          <Route element={<RequireAuth />}>
            {/* Automatic redirection according to user's role */}
            <Route path="/" element={<RouteGuard />} />
            <Route path="/dashboard" element={<RouteGuard />} />

            {/* Broker Sub-App */}
            <Route element={<RequireRole allowedRoles={['broker', 'admin']} />}>
              <Route element={<BrokerLayout />}>
                <Route path="/broker/dashboard" element={<BrokerDashboard />} />
                <Route path="/broker/register-lead" element={<RegisterLeadPage />} />
                <Route path="/broker/leads" element={<BrokerLeads />} />
                <Route path="/broker/visit-pass" element={<VisitPassPage />} />
                <Route path="/broker/commission" element={<BrokerCommission />} />
                <Route path="/broker/profile" element={<BrokerProfile />} />
                <Route path="/broker/notifications/:id" element={<NotificationDetailPage />} />
              </Route>
            </Route>

            {/* Receptionist Sub-App */}
            <Route element={<RequireRole allowedRoles={['receptionist', 'admin']} />}>
              <Route element={<RequireRole allowedRoles={['receptionist', 'admin']} />}>
                <Route element={<ReceptionistLayout />}>
                  <Route path="/receptionist/dashboard" element={<ReceptionistDashboard />} />
                  <Route path="/receptionist/register-customer" element={<RegisterCustomerPage />} />
                  <Route path="/receptionist/customer-revisit" element={<CustomerRevisitPage />} />
                  <Route path="/receptionist/register-broker" element={<RegisterBrokerPage />} />
                  <Route path="/receptionist/checkin/:id" element={<CheckInPage />} />
                  <Route path="/receptionist/checkin" element={<Navigate to="/receptionist/dashboard" replace />} />
                  <Route path="/receptionist/appointments" element={<AppointmentsPage />} />
                  <Route path="/receptionist/profile" element={<BrokerProfile />} />
                  <Route path="/receptionist/notifications/:id" element={<NotificationDetailPage />} />
                </Route>
              </Route>
            </Route>

            {/* Sales Sub-App */}
            {/* Sales Sub-App */}
            <Route element={<RequireRole allowedRoles={['sales', 'admin']} />}>
              <Route element={<SalesLayout />}>
                <Route path="/sales/dashboard" element={<SalesDashboard />} />
                <Route path="/sales/activity" element={<SalesActivity />} />
                <Route path="/sales/pending-actions" element={<SalesPendingActions />} />
                <Route path="/sales/tasks" element={<SalesTasks />} />
                <Route path="/sales/leads" element={<SalesLeads />} />
                <Route path="/sales/bookings" element={<BookingsPage />} />
                {/* <Route path="/sales/inventory" element={<InventoryPage />} /> */}
                {/* <Route path="/sales/inventory/:id" element={<ProjectBookingsDetail />} /> */}
                <Route path="/sales/site-visits" element={<SiteVisitsPage />} />
                <Route path="/sales/profile" element={<BrokerProfile />} />
                <Route path="/sales/notifications/:id" element={<NotificationDetailPage />} />
              </Route>
            </Route>

            {/* Channel Partner Sub-App */}
            <Route element={<RequireRole allowedRoles={['channel_partner', 'admin']} />}>
              <Route element={<ChannelPartnerLayout />}>
                <Route path="/channel-partner/dashboard" element={<CPDashboard />} />
                <Route path="/channel-partner/leads" element={<CPLeads />} />
                <Route path="/channel-partner/brokers/:brokerId/leads" element={<CPLeads />} />
                <Route path="/channel-partner/brokers/:brokerId/leads/:leadId" element={<CPLeadDetail />} />
                {/* <Route path="/channel-partner/commissions" element={<CPCommissions />} /> */}
                {/* <Route path="/channel-partner/projects" element={<CPProjects />} /> */}
                <Route path="/channel-partner/profile" element={<BrokerProfile />} />
                <Route path="/channel-partner/notifications/:id" element={<NotificationDetailPage />} />
              </Route>
            </Route>

            {/* Calling Sub-App */}
            <Route element={<RequireRole allowedRoles={['calling', 'admin']} />}>
              <Route element={<CallingLayout />}>
                <Route path="/calling/dashboard" element={<CallingDashboard />} />
                <Route path="/calling/leads" element={<CallingLeads />} />
                <Route path="/calling/reports" element={<CallingReports />} />
                <Route path="/calling/visit-pass" element={<VisitPassPage />} />
                <Route path="/calling/profile" element={<BrokerProfile />} />
                <Route path="/calling/notifications/:id" element={<NotificationDetailPage />} />
              </Route>
            </Route>

            {/* Admin Sub-App */}
            <Route element={<RequireRole allowedRoles={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/action-leads" element={<ActionLeadsPage />} />
                <Route path="/admin/tasks" element={<ActionTasksPage />} />
                <Route path="/admin/action-tasks" element={<ActionTasksPage />} />
                <Route path="/admin/brokers" element={<BrokersPage />} />
                <Route path="/admin/brokers/:id" element={<BrokerDetailPage />} />
                <Route path="/admin/projects" element={<ProjectsPage />} />
                <Route path="/admin/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/admin/projects/get/:id" element={<ProjectDetailPage />} />
                {/* <Route path="/admin/disputes" element={<DisputesPage />} /> */}
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/users/:id" element={<UserDetailPage />} />
                <Route path="/admin/leads" element={<AdminLeadsPage />} />
                <Route path="/admin/leads/:id" element={<AdminLeadsPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/facebook-integration" element={<FacebookIntegrationPage />} />
                <Route path="/admin/templates" element={<TemplateSettings />} />
                <Route path="/admin/commission-plans" element={<CommissionPlansPage />} />
                <Route path="/admin/permissions" element={<RolePermissionsPage />} />
                <Route path="/admin/profile" element={<BrokerProfile />} />
                <Route path="/admin/notifications/:id" element={<NotificationDetailPage />} />
                {/* 404 inside admin shell */}
                <Route path="/admin/*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Route>

          {/* 404 — catch all unmatched routes (outside admin layout) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrokerConnectProvider>
    </Router>
  );
}

export default App;
