export interface DriveFile {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface DriveShare {
  id: string;
  organizationId: string;
  fileId: string;
  token: string;
  passwordHash: string | null;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloads: number;
  viewOnly: boolean;
  createdAt: string;
}

export type DocKind = 'document' | 'spreadsheet' | 'presentation';

export interface DocRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  kind: DocKind;
  template: string | null;
  version: number;
  sizeBytes: number;
  updatedAt: string;
}

export interface MeetingRoom {
  id: string;
  organizationId: string;
  hostUserId: string;
  title: string;
  passcode: string | null;
  createdAt: string;
}

export interface BookingPage {
  id: string;
  organizationId: string;
  ownerUserId: string;
  title: string;
  slug: string;
  durationMinutes: number;
  timezone: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  pageId: string;
  organizationId: string;
  start: string;
  name: string;
  email: string;
}

export interface TaskItem {
  id: string;
  organizationId: string;
  ownerUserId: string;
  title: string;
  dueDate: string | null;
  priority: 'low' | 'normal' | 'high';
  done: boolean;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  organizationId: string;
  ownerUserId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface CalEvent {
  id: string;
  organizationId: string;
  calendar: 'personal' | 'work' | 'holidays';
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  location: string;
}

export interface ContactItem {
  id: string;
  organizationId: string;
  book: 'personal';
  name: string;
  email: string;
  phone: string;
  role: string;
  notes: string;
}

export interface AiState {
  enabled: boolean;
  day: string;
  used: number;
}

export interface DiscoveryCase {
  id: string;
  query: string;
  status: 'stub';
  createdAt: string;
}

export interface LegalHold {
  id: string;
  matter: string;
  createdAt: string;
}

export interface JournalRule {
  id: string;
  destination: string;
  enabled: boolean;
  createdAt: string;
}

export interface ComplianceState {
  archiveEnabled: boolean;
  retentionDays: number;
  cases: DiscoveryCase[];
  holds: LegalHold[];
  journals: JournalRule[];
}

export interface SsoState {
  protocol: 'saml' | 'oidc';
  issuer: string;
  metadataEnc: string;
  metadataIv: string;
}

export interface ScimToken {
  id: string;
  organizationId: string;
  tokenHash: string;
  label: string;
  createdAt: string;
}

export interface ScimUser {
  id: string;
  organizationId: string;
  userName: string;
  displayName: string;
  active: boolean;
}

export type ChatKind = 'direct' | 'group' | 'channel';

export interface ChatConversation {
  id: string;
  organizationId: string;
  kind: ChatKind;
  title: string;
  createdBy: string;
  memberUserIds: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  organizationId: string;
  conversationId: string;
  threadRootId: string | null;
  authorUserId: string;
  body: string;
  driveFileId: string | null;
  createdAt: string;
}

export interface MaskedAlias {
  id: string;
  organizationId: string;
  ownerUserId: string;
  label: string;
  address: string;
  enabled: boolean;
  messageCount: number;
  createdAt: string;
}

export interface PrivacyKey {
  organizationId: string;
  userId: string;
  address: string;
  publicKeyArmored: string;
  wrappedPrivateKey: string;
  fingerprint: string;
  recoveryRegistered: boolean;
  createdAt: string;
}

export interface PrivacySettings {
  organizationId: string;
  addonEnabled: boolean;
}

export interface ByokKey {
  id: string;
  organizationId: string;
  version: number;
  kmsKeyRef: string;
  status: 'registered';
  createdAt: string;
}

export interface SiemDestination {
  id: string;
  organizationId: string;
  kind: 'webhook' | 'syslog';
  target: string;
  enabled: boolean;
  createdAt: string;
}

export interface AttackSimulation {
  id: string;
  organizationId: string;
  title: string;
  status: 'placeholder';
  createdAt: string;
}

export interface EnterpriseSettings {
  organizationId: string;
  dedicatedIp: boolean;
}

export interface PartnerBrand {
  organizationId: string;
  loginHost: string;
  productName: string;
  logoUrl: string | null;
  updatedAt: string;
}

export interface CampaignRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  subject: string;
  status: 'draft';
  unsubscribeToken: string;
  createdAt: string;
}

export interface CampaignSuppression {
  id: string;
  organizationId: string;
  campaignId: string;
  email: string;
  createdAt: string;
}

export type ExtendedFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash' | 'snoozed';

export interface MailMessageState {
  id: string;
  organizationId: string;
  messageId: string;
  folder: ExtendedFolder;
  unread: boolean;
  starred: boolean;
  pinned: boolean;
  muted: boolean;
  snoozeUntil: string | null;
  labels: string[];
  internalNote: string | null;
  updatedAt: string;
}

export interface MailDraft {
  id: string;
  organizationId: string;
  userId: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  inReplyTo: string | null;
  updatedAt: string;
}

export interface MailTemplate {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  category: string;
  subject: string;
  bodyText: string;
  createdAt: string;
}

export interface MailRule {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  enabled: boolean;
  field: 'from' | 'to' | 'subject' | 'body';
  operator: 'contains' | 'equals' | 'ends_with';
  value: string;
  action: 'move_folder' | 'add_label' | 'star' | 'mark_read';
  actionTarget: string;
  compiledSieve: string;
  createdAt: string;
}

export interface MailUserPrefs {
  organizationId: string;
  userId: string;
  signatureHtml: string;
  vacationEnabled: boolean;
  vacationSubject: string;
  vacationInternal: string;
  vacationExternal: string;
  undoSendSec: number;
  shortcutPreset: 'gmail' | 'outlook';
  readingPane: 'right' | 'bottom' | 'off';
  focusedInbox: boolean;
}

export interface PartnerProfile {
  organizationId: string;
  tier: 'authorized' | 'silver' | 'gold';
  marginPercent: number;
  companyLegalName: string;
  gstin: string | null;
  updatedAt: string;
}

export interface PartnerTenant {
  id: string;
  organizationId: string;
  customerName: string;
  primaryDomain: string;
  planTier: 'starter' | 'business' | 'business_plus' | 'enterprise';
  seats: number;
  status: 'active' | 'trialing' | 'suspended';
  loginHost: string | null;
  createdAt: string;
}

export interface PartnerWebhook {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  secretHint: string;
  enabled: boolean;
  createdAt: string;
}

export interface OperatorQueueItem {
  id: string;
  organizationId: string;
  orgName: string;
  category: 'abuse_spike' | 'spam_complaint' | 'bounce_rate' | 'trial_review';
  summary: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'resolved';
  ipPool: 'trial' | 'shared' | 'dedicated';
  createdAt: string;
}

export interface ModuleSnapshot {
  files: DriveFile[];
  shares: DriveShare[];
  tasks: TaskItem[];
  notes: NoteItem[];
  pages: BookingPage[];
  appointments: Appointment[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
  aliases: MaskedAlias[];
  keys: PrivacyKey[];
  privacy: PrivacySettings | null;
  byok: ByokKey[];
  siem: SiemDestination[];
  simulations: AttackSimulation[];
  enterprise: EnterpriseSettings | null;
  brand: PartnerBrand | null;
  campaigns: CampaignRecord[];
  suppressions: CampaignSuppression[];
  docs: DocRecord[];
  meetings: MeetingRoom[];
  events: CalEvent[];
  contacts: ContactItem[];
  ai: AiState | null;
  compliance: ComplianceState | null;
  sso: SsoState | null;
  scimTokens: ScimToken[];
  scimUsers: ScimUser[];
  mailStates?: MailMessageState[];
  mailDrafts?: MailDraft[];
  mailTemplates?: MailTemplate[];
  mailRules?: MailRule[];
  mailPrefs?: MailUserPrefs[];
  partnerProfile?: PartnerProfile | null;
  partnerTenants?: PartnerTenant[];
  partnerWebhooks?: PartnerWebhook[];
  operatorQueue?: OperatorQueueItem[];
}

function blankCompliance(): ComplianceState {
  return { archiveEnabled: false, retentionDays: 365, cases: [], holds: [], journals: [] };
}

/**
 * In-memory module adapter. PostgresWorkspace hydrates and flushes the same rows.
 */
export class WorkspaceStore {
  readonly persistence: 'memory' | 'postgres' = 'memory';

  private readonly files: DriveFile[] = [];
  private readonly shares: DriveShare[] = [];
  private readonly docs: DocRecord[] = [];
  private readonly meetings: MeetingRoom[] = [];
  private readonly pages: BookingPage[] = [];
  private readonly appointments: Appointment[] = [];
  private readonly tasks: TaskItem[] = [];
  private readonly notes: NoteItem[] = [];
  private readonly events: CalEvent[] = [];
  private readonly contacts: ContactItem[] = [];
  private readonly ai = new Map<string, AiState>();
  private readonly compliance = new Map<string, ComplianceState>();
  private readonly sso = new Map<string, SsoState>();
  private readonly scimTokens: ScimToken[] = [];
  private readonly scimUsers: ScimUser[] = [];
  private readonly conversations: ChatConversation[] = [];
  private readonly chatMessages: ChatMessage[] = [];
  private readonly aliases: MaskedAlias[] = [];
  private readonly privacyKeys: PrivacyKey[] = [];
  private readonly privacySettings = new Map<string, PrivacySettings>();
  private readonly byokKeys: ByokKey[] = [];
  private readonly siemDestinations: SiemDestination[] = [];
  private readonly simulations: AttackSimulation[] = [];
  private readonly enterpriseSettings = new Map<string, EnterpriseSettings>();
  private readonly brands = new Map<string, PartnerBrand>();
  private readonly campaigns: CampaignRecord[] = [];
  private readonly suppressions: CampaignSuppression[] = [];
  private readonly mailStates: MailMessageState[] = [];
  private readonly mailDrafts: MailDraft[] = [];
  private readonly mailTemplates: MailTemplate[] = [];
  private readonly mailRules: MailRule[] = [];
  private readonly mailPrefs: MailUserPrefs[] = [];
  private readonly partnerProfiles = new Map<string, PartnerProfile>();
  private readonly partnerTenants: PartnerTenant[] = [];
  private readonly partnerWebhooks: PartnerWebhook[] = [];
  private readonly operatorQueue: OperatorQueueItem[] = [];

  listFiles(organizationId: string): DriveFile[] {
    return this.files.filter((file) => file.organizationId === organizationId);
  }

  findFile(organizationId: string, id: string): DriveFile | null {
    return (
      this.files.find((file) => file.organizationId === organizationId && file.id === id) ?? null
    );
  }

  addFile(file: DriveFile): void {
    this.files.push(file);
  }

  addShare(share: DriveShare): void {
    this.shares.push(share);
  }

  findShareByToken(token: string): DriveShare | null {
    return this.shares.find((share) => share.token === token) ?? null;
  }

  listDocs(organizationId: string): DocRecord[] {
    return this.docs.filter((doc) => doc.organizationId === organizationId);
  }

  findDoc(organizationId: string, id: string): DocRecord | null {
    return this.docs.find((doc) => doc.organizationId === organizationId && doc.id === id) ?? null;
  }

  addDoc(doc: DocRecord): void {
    this.docs.push(doc);
  }

  listMeetings(organizationId: string): MeetingRoom[] {
    return this.meetings.filter((room) => room.organizationId === organizationId);
  }

  addMeeting(room: MeetingRoom): void {
    this.meetings.push(room);
  }

  findMeeting(organizationId: string, id: string): MeetingRoom | null {
    return (
      this.meetings.find((room) => room.organizationId === organizationId && room.id === id) ?? null
    );
  }

  listPages(organizationId: string): BookingPage[] {
    return this.pages.filter((page) => page.organizationId === organizationId);
  }

  findPageBySlug(slug: string): BookingPage | null {
    return this.pages.find((page) => page.slug === slug) ?? null;
  }

  addPage(page: BookingPage): void {
    this.pages.push(page);
  }

  listAppointments(pageId: string): Appointment[] {
    return this.appointments.filter((row) => row.pageId === pageId);
  }

  addAppointment(row: Appointment): void {
    this.appointments.push(row);
  }

  listTasks(organizationId: string): TaskItem[] {
    return this.tasks.filter((task) => task.organizationId === organizationId);
  }

  findTask(organizationId: string, id: string): TaskItem | null {
    return (
      this.tasks.find((task) => task.organizationId === organizationId && task.id === id) ?? null
    );
  }

  addTask(task: TaskItem): void {
    this.tasks.push(task);
  }

  listNotes(organizationId: string): NoteItem[] {
    return this.notes.filter((note) => note.organizationId === organizationId);
  }

  findNote(organizationId: string, id: string): NoteItem | null {
    return (
      this.notes.find((note) => note.organizationId === organizationId && note.id === id) ?? null
    );
  }

  addNote(note: NoteItem): void {
    this.notes.push(note);
  }

  listEvents(organizationId: string): CalEvent[] {
    return this.events.filter((event) => event.organizationId === organizationId);
  }

  addEvent(event: CalEvent): void {
    this.events.push(event);
  }

  listContacts(organizationId: string): ContactItem[] {
    return this.contacts.filter((contact) => contact.organizationId === organizationId);
  }

  addContact(contact: ContactItem): void {
    this.contacts.push(contact);
  }

  aiState(organizationId: string, day: string): AiState {
    const current = this.ai.get(organizationId);
    if (!current) {
      const fresh = { enabled: true, day, used: 0 };
      this.ai.set(organizationId, fresh);
      return fresh;
    }
    if (current.day !== day) {
      current.day = day;
      current.used = 0;
    }
    return current;
  }

  complianceOf(organizationId: string): ComplianceState {
    const current = this.compliance.get(organizationId);
    if (current) return current;
    const fresh = blankCompliance();
    this.compliance.set(organizationId, fresh);
    return fresh;
  }

  ssoOf(organizationId: string): SsoState | null {
    return this.sso.get(organizationId) ?? null;
  }

  saveSso(organizationId: string, state: SsoState): void {
    this.sso.set(organizationId, state);
  }

  addScimToken(token: ScimToken): void {
    this.scimTokens.push(token);
  }

  listScimTokens(organizationId: string): ScimToken[] {
    return this.scimTokens.filter((token) => token.organizationId === organizationId);
  }

  findScimToken(tokenHash: string): ScimToken | null {
    return this.scimTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  listScimUsers(organizationId: string): ScimUser[] {
    return this.scimUsers.filter((user) => user.organizationId === organizationId);
  }

  addScimUser(user: ScimUser): void {
    this.scimUsers.push(user);
  }

  async hydrate(_organizationId: string): Promise<void> {}

  async flush(): Promise<void> {}

  async prepareShareToken(_token: string): Promise<void> {}

  async prepareBookingSlug(_slug: string): Promise<void> {}

  async prepareBrandHost(_host: string): Promise<void> {}

  async prepareAliasAddress(_address: string): Promise<void> {}

  async prepareUnsubscribeToken(_token: string): Promise<void> {}

  listConversations(organizationId: string): ChatConversation[] {
    return this.conversations.filter((row) => row.organizationId === organizationId);
  }

  findConversation(organizationId: string, id: string): ChatConversation | null {
    return (
      this.conversations.find((row) => row.organizationId === organizationId && row.id === id) ??
      null
    );
  }

  addConversation(row: ChatConversation): void {
    this.conversations.push(row);
  }

  listMessages(organizationId: string, conversationId: string): ChatMessage[] {
    return this.chatMessages.filter(
      (row) => row.organizationId === organizationId && row.conversationId === conversationId,
    );
  }

  findMessage(organizationId: string, id: string): ChatMessage | null {
    return (
      this.chatMessages.find((row) => row.organizationId === organizationId && row.id === id) ??
      null
    );
  }

  addMessage(row: ChatMessage): void {
    this.chatMessages.push(row);
  }

  listAliases(organizationId: string, userId: string): MaskedAlias[] {
    return this.aliases.filter(
      (row) => row.organizationId === organizationId && row.ownerUserId === userId,
    );
  }

  findAlias(organizationId: string, id: string): MaskedAlias | null {
    return (
      this.aliases.find((row) => row.organizationId === organizationId && row.id === id) ?? null
    );
  }

  aliasTaken(address: string): boolean {
    const needle = address.toLowerCase();
    return this.aliases.some((row) => row.address.toLowerCase() === needle);
  }

  addAlias(row: MaskedAlias): void {
    this.aliases.push(row);
  }

  listKeys(organizationId: string, userId: string): PrivacyKey[] {
    return this.privacyKeys.filter(
      (row) => row.organizationId === organizationId && row.userId === userId,
    );
  }

  findKey(organizationId: string, userId: string, address: string): PrivacyKey | null {
    return (
      this.privacyKeys.find(
        (row) =>
          row.organizationId === organizationId &&
          row.userId === userId &&
          row.address.toLowerCase() === address.toLowerCase(),
      ) ?? null
    );
  }

  upsertKey(row: PrivacyKey): void {
    const index = this.privacyKeys.findIndex(
      (item) =>
        item.organizationId === row.organizationId &&
        item.userId === row.userId &&
        item.address.toLowerCase() === row.address.toLowerCase(),
    );
    if (index >= 0) this.privacyKeys[index] = row;
    else this.privacyKeys.push(row);
  }

  privacyOf(organizationId: string): PrivacySettings {
    const current = this.privacySettings.get(organizationId);
    if (current) return current;
    const fresh = { organizationId, addonEnabled: false };
    this.privacySettings.set(organizationId, fresh);
    return fresh;
  }

  listByok(organizationId: string): ByokKey[] {
    return this.byokKeys.filter((row) => row.organizationId === organizationId);
  }

  addByok(row: ByokKey): void {
    this.byokKeys.push(row);
  }

  listSiem(organizationId: string): SiemDestination[] {
    return this.siemDestinations.filter((row) => row.organizationId === organizationId);
  }

  findSiem(organizationId: string, id: string): SiemDestination | null {
    return (
      this.siemDestinations.find((row) => row.organizationId === organizationId && row.id === id) ??
      null
    );
  }

  addSiem(row: SiemDestination): void {
    this.siemDestinations.push(row);
  }

  listSimulations(organizationId: string): AttackSimulation[] {
    return this.simulations.filter((row) => row.organizationId === organizationId);
  }

  addSimulation(row: AttackSimulation): void {
    this.simulations.push(row);
  }

  enterpriseOf(organizationId: string): EnterpriseSettings {
    const current = this.enterpriseSettings.get(organizationId);
    if (current) return current;
    const fresh = { organizationId, dedicatedIp: false };
    this.enterpriseSettings.set(organizationId, fresh);
    return fresh;
  }

  brandOf(organizationId: string): PartnerBrand | null {
    return this.brands.get(organizationId) ?? null;
  }

  saveBrand(row: PartnerBrand): void {
    this.brands.set(row.organizationId, row);
  }

  findBrandByHost(host: string): PartnerBrand | null {
    const needle = host.toLowerCase();
    for (const brand of this.brands.values()) {
      if (brand.loginHost.toLowerCase() === needle) return brand;
    }
    return null;
  }

  listCampaigns(organizationId: string): CampaignRecord[] {
    return this.campaigns.filter((row) => row.organizationId === organizationId);
  }

  addCampaign(row: CampaignRecord): void {
    this.campaigns.push(row);
  }

  findCampaignByToken(token: string): CampaignRecord | null {
    return this.campaigns.find((row) => row.unsubscribeToken === token) ?? null;
  }

  listSuppressions(organizationId: string): CampaignSuppression[] {
    return this.suppressions.filter((row) => row.organizationId === organizationId);
  }

  findSuppression(organizationId: string, email: string): CampaignSuppression | null {
    const needle = email.toLowerCase();
    return (
      this.suppressions.find(
        (row) => row.organizationId === organizationId && row.email.toLowerCase() === needle,
      ) ?? null
    );
  }

  addSuppression(row: CampaignSuppression): void {
    this.suppressions.push(row);
  }

  listMailStates(organizationId: string): MailMessageState[] {
    return this.mailStates.filter((row) => row.organizationId === organizationId);
  }

  findMailState(organizationId: string, messageId: string): MailMessageState | null {
    return (
      this.mailStates.find(
        (row) => row.organizationId === organizationId && row.messageId === messageId,
      ) ?? null
    );
  }

  upsertMailState(state: MailMessageState): MailMessageState {
    const idx = this.mailStates.findIndex(
      (row) => row.organizationId === state.organizationId && row.messageId === state.messageId,
    );
    if (idx >= 0) this.mailStates[idx] = state;
    else this.mailStates.push(state);
    return state;
  }

  listMailDrafts(organizationId: string, userId: string): MailDraft[] {
    return this.mailDrafts.filter(
      (row) => row.organizationId === organizationId && row.userId === userId,
    );
  }

  findMailDraft(organizationId: string, userId: string, id: string): MailDraft | null {
    return (
      this.mailDrafts.find(
        (row) => row.organizationId === organizationId && row.userId === userId && row.id === id,
      ) ?? null
    );
  }

  upsertMailDraft(draft: MailDraft): MailDraft {
    const idx = this.mailDrafts.findIndex(
      (row) => row.organizationId === draft.organizationId && row.id === draft.id,
    );
    if (idx >= 0) this.mailDrafts[idx] = draft;
    else this.mailDrafts.push(draft);
    return draft;
  }

  deleteMailDraft(organizationId: string, userId: string, id: string): boolean {
    const idx = this.mailDrafts.findIndex(
      (row) => row.organizationId === organizationId && row.userId === userId && row.id === id,
    );
    if (idx < 0) return false;
    this.mailDrafts.splice(idx, 1);
    return true;
  }

  listMailTemplates(organizationId: string, userId: string): MailTemplate[] {
    return this.mailTemplates.filter(
      (row) => row.organizationId === organizationId && row.userId === userId,
    );
  }

  addMailTemplate(tpl: MailTemplate): void {
    this.mailTemplates.push(tpl);
  }

  deleteMailTemplate(organizationId: string, userId: string, id: string): boolean {
    const idx = this.mailTemplates.findIndex(
      (row) => row.organizationId === organizationId && row.userId === userId && row.id === id,
    );
    if (idx < 0) return false;
    this.mailTemplates.splice(idx, 1);
    return true;
  }

  listMailRules(organizationId: string, userId: string): MailRule[] {
    return this.mailRules.filter(
      (row) => row.organizationId === organizationId && row.userId === userId,
    );
  }

  addMailRule(rule: MailRule): void {
    this.mailRules.push(rule);
  }

  findMailRule(organizationId: string, userId: string, id: string): MailRule | null {
    return (
      this.mailRules.find(
        (row) => row.organizationId === organizationId && row.userId === userId && row.id === id,
      ) ?? null
    );
  }

  deleteMailRule(organizationId: string, userId: string, id: string): boolean {
    const idx = this.mailRules.findIndex(
      (row) => row.organizationId === organizationId && row.userId === userId && row.id === id,
    );
    if (idx < 0) return false;
    this.mailRules.splice(idx, 1);
    return true;
  }

  mailPrefsOf(organizationId: string, userId: string): MailUserPrefs {
    const found = this.mailPrefs.find(
      (row) => row.organizationId === organizationId && row.userId === userId,
    );
    if (found) return found;
    const fresh: MailUserPrefs = {
      organizationId,
      userId,
      signatureHtml: '',
      vacationEnabled: false,
      vacationSubject: 'Out of office',
      vacationInternal: 'I am currently out of office and will reply upon return.',
      vacationExternal: 'Thank you for your email. I am currently away and will respond soon.',
      undoSendSec: 10,
      shortcutPreset: 'gmail',
      readingPane: 'right',
      focusedInbox: true,
    };
    this.mailPrefs.push(fresh);
    return fresh;
  }

  saveMailPrefs(prefs: MailUserPrefs): MailUserPrefs {
    const idx = this.mailPrefs.findIndex(
      (row) => row.organizationId === prefs.organizationId && row.userId === prefs.userId,
    );
    if (idx >= 0) this.mailPrefs[idx] = prefs;
    else this.mailPrefs.push(prefs);
    return prefs;
  }

  partnerProfileOf(organizationId: string, orgName: string): PartnerProfile {
    const existing = this.partnerProfiles.get(organizationId);
    if (existing) return existing;
    const fresh: PartnerProfile = {
      organizationId,
      tier: 'authorized',
      marginPercent: 20,
      companyLegalName: orgName,
      gstin: null,
      updatedAt: new Date().toISOString(),
    };
    this.partnerProfiles.set(organizationId, fresh);
    return fresh;
  }

  savePartnerProfile(profile: PartnerProfile): PartnerProfile {
    this.partnerProfiles.set(profile.organizationId, profile);
    return profile;
  }

  listPartnerTenants(organizationId: string): PartnerTenant[] {
    return this.partnerTenants.filter((row) => row.organizationId === organizationId);
  }

  savePartnerTenant(row: PartnerTenant): PartnerTenant {
    const idx = this.partnerTenants.findIndex(
      (item) => item.organizationId === row.organizationId && item.id === row.id,
    );
    if (idx >= 0) this.partnerTenants[idx] = row;
    else this.partnerTenants.unshift(row);
    return row;
  }

  listPartnerWebhooks(organizationId: string): PartnerWebhook[] {
    return this.partnerWebhooks.filter((row) => row.organizationId === organizationId);
  }

  addPartnerWebhook(row: PartnerWebhook): PartnerWebhook {
    this.partnerWebhooks.unshift(row);
    return row;
  }

  deletePartnerWebhook(organizationId: string, id: string): boolean {
    const idx = this.partnerWebhooks.findIndex(
      (row) => row.organizationId === organizationId && row.id === id,
    );
    if (idx < 0) return false;
    this.partnerWebhooks.splice(idx, 1);
    return true;
  }

  listOperatorQueue(): OperatorQueueItem[] {
    return this.operatorQueue;
  }

  saveOperatorQueueItem(row: OperatorQueueItem): OperatorQueueItem {
    const idx = this.operatorQueue.findIndex((item) => item.id === row.id);
    if (idx >= 0) this.operatorQueue[idx] = row;
    else this.operatorQueue.unshift(row);
    return row;
  }

  protected exportOrg(organizationId: string): ModuleSnapshot {
    return {
      files: this.files.filter((row) => row.organizationId === organizationId),
      shares: this.shares.filter((row) => row.organizationId === organizationId),
      tasks: this.tasks.filter((row) => row.organizationId === organizationId),
      notes: this.notes.filter((row) => row.organizationId === organizationId),
      pages: this.pages.filter((row) => row.organizationId === organizationId),
      appointments: this.appointments.filter((row) => row.organizationId === organizationId),
      conversations: this.conversations.filter((row) => row.organizationId === organizationId),
      messages: this.chatMessages.filter((row) => row.organizationId === organizationId),
      aliases: this.aliases.filter((row) => row.organizationId === organizationId),
      keys: this.privacyKeys.filter((row) => row.organizationId === organizationId),
      privacy: this.privacySettings.get(organizationId) ?? null,
      byok: this.byokKeys.filter((row) => row.organizationId === organizationId),
      siem: this.siemDestinations.filter((row) => row.organizationId === organizationId),
      simulations: this.simulations.filter((row) => row.organizationId === organizationId),
      enterprise: this.enterpriseSettings.get(organizationId) ?? null,
      brand: this.brands.get(organizationId) ?? null,
      campaigns: this.campaigns.filter((row) => row.organizationId === organizationId),
      suppressions: this.suppressions.filter((row) => row.organizationId === organizationId),
      docs: this.docs.filter((row) => row.organizationId === organizationId),
      meetings: this.meetings.filter((row) => row.organizationId === organizationId),
      events: this.events.filter((row) => row.organizationId === organizationId),
      contacts: this.contacts.filter((row) => row.organizationId === organizationId),
      ai: this.ai.get(organizationId) ?? null,
      compliance: this.compliance.get(organizationId) ?? null,
      sso: this.sso.get(organizationId) ?? null,
      scimTokens: this.scimTokens.filter((row) => row.organizationId === organizationId),
      scimUsers: this.scimUsers.filter((row) => row.organizationId === organizationId),
      mailStates: this.mailStates.filter((row) => row.organizationId === organizationId),
      mailDrafts: this.mailDrafts.filter((row) => row.organizationId === organizationId),
      mailTemplates: this.mailTemplates.filter((row) => row.organizationId === organizationId),
      mailRules: this.mailRules.filter((row) => row.organizationId === organizationId),
      mailPrefs: this.mailPrefs.filter((row) => row.organizationId === organizationId),
      partnerProfile: this.partnerProfiles.get(organizationId) ?? null,
      partnerTenants: this.partnerTenants.filter((row) => row.organizationId === organizationId),
      partnerWebhooks: this.partnerWebhooks.filter((row) => row.organizationId === organizationId),
      operatorQueue: this.operatorQueue.filter((row) => row.organizationId === organizationId),
    };
  }

  protected replaceOrg(organizationId: string, snap: ModuleSnapshot): void {
    swap(this.files, organizationId, snap.files);
    swap(this.shares, organizationId, snap.shares);
    swap(this.tasks, organizationId, snap.tasks);
    swap(this.notes, organizationId, snap.notes);
    swap(this.pages, organizationId, snap.pages);
    swap(this.appointments, organizationId, snap.appointments);
    swap(this.conversations, organizationId, snap.conversations);
    swap(this.chatMessages, organizationId, snap.messages);
    swap(this.aliases, organizationId, snap.aliases);
    swap(this.privacyKeys, organizationId, snap.keys);
    swap(this.byokKeys, organizationId, snap.byok);
    swap(this.siemDestinations, organizationId, snap.siem);
    swap(this.simulations, organizationId, snap.simulations);
    swap(this.campaigns, organizationId, snap.campaigns);
    swap(this.suppressions, organizationId, snap.suppressions);
    swap(this.docs, organizationId, snap.docs);
    swap(this.meetings, organizationId, snap.meetings);
    swap(this.events, organizationId, snap.events);
    swap(this.contacts, organizationId, snap.contacts);
    swap(this.scimTokens, organizationId, snap.scimTokens);
    swap(this.scimUsers, organizationId, snap.scimUsers);
    swap(this.mailStates, organizationId, snap.mailStates ?? []);
    swap(this.mailDrafts, organizationId, snap.mailDrafts ?? []);
    swap(this.mailTemplates, organizationId, snap.mailTemplates ?? []);
    swap(this.mailRules, organizationId, snap.mailRules ?? []);
    swap(this.mailPrefs, organizationId, snap.mailPrefs ?? []);
    swap(this.partnerTenants, organizationId, snap.partnerTenants ?? []);
    swap(this.partnerWebhooks, organizationId, snap.partnerWebhooks ?? []);
    swap(this.operatorQueue, organizationId, snap.operatorQueue ?? []);
    if (snap.partnerProfile) this.partnerProfiles.set(organizationId, snap.partnerProfile);
    else this.partnerProfiles.delete(organizationId);
    if (snap.ai) this.ai.set(organizationId, snap.ai);
    else this.ai.delete(organizationId);
    if (snap.compliance) this.compliance.set(organizationId, snap.compliance);
    else this.compliance.delete(organizationId);
    if (snap.sso) this.sso.set(organizationId, snap.sso);
    else this.sso.delete(organizationId);
    if (snap.privacy) this.privacySettings.set(organizationId, snap.privacy);
    else this.privacySettings.delete(organizationId);
    if (snap.enterprise) this.enterpriseSettings.set(organizationId, snap.enterprise);
    else this.enterpriseSettings.delete(organizationId);
    if (snap.brand) this.brands.set(organizationId, snap.brand);
    else this.brands.delete(organizationId);
  }
}

function swap<T extends { organizationId: string }>(
  rows: T[],
  organizationId: string,
  next: T[],
): void {
  const kept = rows.filter((row) => row.organizationId !== organizationId);
  rows.length = 0;
  rows.push(...kept, ...next);
}
