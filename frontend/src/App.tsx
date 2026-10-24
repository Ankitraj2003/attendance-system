import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { OverviewSection } from './components/OverviewSection';
import { AttendanceTableSection } from './components/AttendanceTableSection';
import { EmployeeManagementSection } from './components/EmployeeManagementSection';
import { IndividualEmployeeDashboard } from './components/IndividualEmployeeDashboard';
import { LeaveManagementSection } from './components/LeaveManagementSection';
import { AnalyticsSection } from './components/AnalyticsSection';
import { ReportsSection } from './components/ReportsSection';
import { WorkSchedulesSection } from './components/WorkSchedulesSection';
import { AuditLogsSection } from './components/AuditLogsSection';
import { AttendancePortal } from './components/AttendancePortal';
import { api, getAuthToken, removeAuthToken } from './api';
import { User } from './types';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Portal view state
  const [showPortalModal, setShowPortalModal] = useState<boolean>(false);
  const [portalToken, setPortalToken] = useState<string>('');
  const [isDirectPortalLink, setIsDirectPortalLink] = useState<boolean>(false);

  // Selected employee for individual dashboard
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('EXP-101');

  // Real-time toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check auth on load + handle ?token= deep-link for employees
  useEffect(() => {
    // Check for unique employee token in search (?token=...) or hash (#portal?token=...)
    let urlToken = new URLSearchParams(window.location.search).get('token');
    if (!urlToken && window.location.hash.includes('token=')) {
      const qIndex = window.location.hash.indexOf('?');
      if (qIndex !== -1) {
        urlToken = new URLSearchParams(window.location.hash.substring(qIndex)).get('token');
      } else {
        urlToken = new URLSearchParams(window.location.hash.substring(1)).get('token');
      }
    }

    if (urlToken) {
      setPortalToken(urlToken);
      setShowPortalModal(true);
      setIsDirectPortalLink(true);
      setLoadingAuth(false);
      return;
    }

    const authToken = getAuthToken();
    if (authToken) {
      api.getMe()
        .then((userData) => setUser(userData))
        .catch(() => removeAuthToken())
        .finally(() => setLoadingAuth(false));
    } else {
      setLoadingAuth(false);
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
      eventSource = new EventSource(`${apiBaseUrl}/events/stream`);
      eventSource.onopen = () => {
        setIsRealtimeConnected(true);
      };
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'CHECK_IN') {
            setToastMessage(`🟢 Check-In: ${payload.data.name} (${payload.data.department})`);
            setTimeout(() => setToastMessage(null), 4000);
          } else if (payload.event === 'CHECK_OUT') {
            setToastMessage(`🔵 Check-Out: ${payload.data.name} (${payload.data.duration || 0} hrs)`);
            setTimeout(() => setToastMessage(null), 4000);
          } else if (payload.event === 'LEAVE_REQUEST_SUBMITTED') {
            setToastMessage(`🟡 New Leave Request: ${payload.data.name} (${payload.data.leave_type})`);
            setTimeout(() => setToastMessage(null), 4000);
          }
        } catch {
          // ignore keepalives
        }
      };
      eventSource.onerror = () => {
        setIsRealtimeConnected(false);
      };
    } catch (e) {
      console.warn('SSE stream error', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };

  const handleOpenIndividualDashboard = (empId: string) => {
    setSelectedEmployeeId(empId);
    setActiveTab('individual-dashboards');
  };

  const handleOpenPortalWithToken = (token: string) => {
    setPortalToken(token);
    setShowPortalModal(true);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-3 border-[#00A3E0] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If not logged in and not viewing portal, show Login
  if (!user && !showPortalModal) {
    return (
      <LoginModal
        onSuccess={(userData) => setUser(userData)}
        onOpenPortal={() => setShowPortalModal(true)}
      />
    );
  }

  // Direct employee portal link (no admin UI needed)
  if (isDirectPortalLink && showPortalModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-6">
        <AttendancePortal initialToken={portalToken} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 p-3.5 rounded-2xl glass-dropdown border border-white text-xs font-bold text-[#16194F] shadow-xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRealtimeConnected={isRealtimeConnected}
        onOpenPortalModal={() => setShowPortalModal(true)}
        isMobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <OverviewSection
                onNavigateToTab={setActiveTab}
                onSelectEmployeeForDashboard={handleOpenIndividualDashboard}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceTableSection
                onSelectEmployeeForDashboard={handleOpenIndividualDashboard}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManagementSection
                onSelectEmployeeForDashboard={handleOpenIndividualDashboard}
                onOpenPortalWithToken={handleOpenPortalWithToken}
              />
            )}

            {(activeTab === 'individual-dashboards' || activeTab === 'calendar') && (
              <IndividualEmployeeDashboard
                selectedEmployeeId={selectedEmployeeId}
                onBackToDirectory={() => setActiveTab('employees')}
              />
            )}

            {activeTab === 'leaves' && <LeaveManagementSection />}

            {activeTab === 'analytics' && <AnalyticsSection />}

            {activeTab === 'reports' && <ReportsSection />}

            {activeTab === 'schedules' && <WorkSchedulesSection />}

            {activeTab === 'audit-logs' && <AuditLogsSection />}
          </div>
        </main>
      </div>

      {/* Employee Attendance Portal Modal */}
      {showPortalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <AttendancePortal
              initialToken={portalToken}
              onClose={() => setShowPortalModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
