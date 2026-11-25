import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthShell } from '../components/shell/auth-shell';
import { MarketingShell } from '../components/shell/marketing-shell';
import { RequireSession } from '../components/shell/require-session';
import { WorkspaceShell } from '../components/shell/workspace-shell';
import { BrandPage } from '../features/admin/brand-page';
import { CompliancePage } from '../features/admin/compliance-page';
import { EnterprisePage } from '../features/admin/enterprise-page';
import { DnsWizardPage } from '../features/admin/dns-wizard-page';
import { DomainsPage } from '../features/admin/domains-page';
import { SsoPage } from '../features/admin/sso-page';
import { UsersPage } from '../features/admin/users-page';
import { AiPage } from '../features/ai/ai-page';
import { CampaignsPage } from '../features/campaigns/campaigns-page';
import { ChatPage } from '../features/chat/chat-page';
import { BookingPage } from '../features/booking/booking-page';
import { PublicBookingPage } from '../features/booking/public-booking-page';
import { DocumentsPage } from '../features/docs/documents-page';
import { DrivePage } from '../features/drive/drive-page';
import { MeetPage } from '../features/meet/meet-page';
import { PrivacyPage } from '../features/privacy/privacy-page';
import { NotesPage, TasksPage } from '../features/tasks/tasks-page';
import { ForgotPage } from '../features/auth/forgot-page';
import { LoginPage } from '../features/auth/login-page';
import { SignupPage } from '../features/auth/signup-page';
import { CalendarPage } from '../features/calendar/calendar-page';
import { ContactsPage } from '../features/contacts/contacts-page';
import { MailPage } from '../features/mail/mail-page';
import { HomePage } from '../features/marketing/home-page';
import { PricingPage } from '../features/marketing/pricing-page';
import { SecurityPage } from '../features/marketing/security-page';
import { DocsPage } from '../pages/docs/docs-page';
import { NotFoundPage } from './not-found-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MarketingShell />}>
        <Route index element={<HomePage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route path="docs/*" element={<DocsPage />} />
        <Route path="book/:slug" element={<PublicBookingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AuthShell />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPage />} />
      </Route>
      <Route element={<RequireSession />}>
        <Route element={<WorkspaceShell />}>
          <Route path="mail" element={<MailPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="drive" element={<DrivePage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="meet" element={<MeetPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="ai" element={<AiPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="admin" element={<Navigate to="/admin/domains" replace />} />
          <Route path="admin/domains" element={<DomainsPage />} />
          <Route path="admin/domains/:domainId" element={<DnsWizardPage />} />
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="admin/compliance" element={<CompliancePage />} />
          <Route path="admin/sso" element={<SsoPage />} />
          <Route path="admin/enterprise" element={<EnterprisePage />} />
          <Route path="admin/brand" element={<BrandPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
