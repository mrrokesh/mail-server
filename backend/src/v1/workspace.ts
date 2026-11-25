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

function blankCompliance(): ComplianceState {
  return { archiveEnabled: false, retentionDays: 365, cases: [], holds: [], journals: [] };
}

/** Process-local v1 records. Postgres tables for these land in a later migration. */
export class WorkspaceStore {
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
}
