export type Role = "ADMIN" | "ADMIN_SECURISATION" | "PILOTE_SECURISATION" | "PILOTE_J";
/**
 * SECURISATION: sécurisation team, up to "Etat final". J_MINUS_1: "Cellule plani" + the columns it opens
 * (admin and J pilots). PLANIFICATION only remains in the history of the former planification team.
 */
export type FieldSection = "SECURISATION" | "J_MINUS_1" | "PLANIFICATION" | "J" | "J_PLUS_1";
/** Teams working the dossiers: sécurisation (dispatched) and J-1 / J / J+1 pilots (they take their dossiers). */
export type Team = "SECURISATION" | "J";
/** DONE (closed), ON_TIME, SOON (J+1 morning, orange), LATE (after J+1 12:00, red), CANCELLED (its import was cancelled, grey). */
export type Delay = "DONE" | "ON_TIME" | "SOON" | "LATE" | "CANCELLED";
export type FieldType = "SELECT" | "TEXT" | "DATE" | "USER";
/** Main daily file, the global sécurisation file or one of the 3 sécurisation files. */
export type DataSource = "MAIN" | "SEC_GLOBAL" | "SEC_1" | "SEC_2" | "SEC_3";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  ADMIN_SECURISATION: "Admin sécurisation",
  PILOTE_SECURISATION: "Pilote sécurisation",
  PILOTE_J: "Pilote",
};

export const TEAM_LABELS: Record<Team, string> = {
  SECURISATION: "Pilote sécurisation",
  J: "Pilote",
};

/** Team of a pilot role (null for the admins). */
export function teamOf(role: Role | undefined): Team | null {
  if (role === "PILOTE_SECURISATION") return "SECURISATION";
  if (role === "PILOTE_J") return "J";
  return null;
}

/** Team whose "Pilote" column this role may join (the admin works with the J pilots). */
export function joinableTeam(role: Role | undefined): Team | null {
  return role === "ADMIN" ? "J" : teamOf(role);
}

/** Column key of a team's assignment. */
export function assigneeKey(team: Team): string {
  return team === "SECURISATION" ? "assignee" : `assignee:${team}`;
}

export const DELAY_LABELS: Record<Delay, string> = {
  LATE: "En retard",
  SOON: "Bientôt en retard",
  ON_TIME: "Dans les délais",
  DONE: "Clôturé",
  CANCELLED: "Annulé",
};

export const SECTION_LABELS: Record<FieldSection, string> = {
  SECURISATION: "Sécurisation",
  J_MINUS_1: "J-1",
  PLANIFICATION: "Planification",
  J: "J",
  J_PLUS_1: "J+1 à 12h00",
};

/** Every section holding columns, in display order. */
export const SECTIONS: FieldSection[] = ["SECURISATION", "J_MINUS_1", "J", "J_PLUS_1"];
/** Sections of the main follow-up (sécurisation only shows its published columns there, e.g. Etat final). */
export const MAIN_SECTIONS: FieldSection[] = ["J_MINUS_1", "J", "J_PLUS_1"];
/** Work of the sécurisation team: up to "Etat final", nothing of J-1. */
export const SECURISATION_SECTIONS: FieldSection[] = ["SECURISATION"];
/** Columns configured by the admin: J-1 (Cellule plani and the columns it opens), J, J+1. */
export const ADMIN_FIELD_SECTIONS: FieldSection[] = ["J_MINUS_1", "J", "J_PLUS_1"];
/** Columns configured by the sécurisation admin. */
export const SEC_FIELD_SECTIONS: FieldSection[] = ["SECURISATION"];

/** Is this column shown in this "Colonnes & valeurs" tab? */
export function fieldInTab(field: { section: FieldSection }, tab: FieldSection): boolean {
  return field.section === tab;
}

/** "Cellule plani": every injected dossier is "Planifié", "Ouvert" opens the conditional J-1 columns. */
export const CELLULE_PLANI = "j1_cellule_plani";

export const SEC_SOURCES: DataSource[] = ["SEC_GLOBAL", "SEC_1", "SEC_2", "SEC_3"];
export const SOURCE_LABELS: Record<DataSource, string> = {
  MAIN: "Fichier principal",
  SEC_GLOBAL: "Fichier global",
  SEC_1: "Fichier sécurisation 1",
  SEC_2: "Fichier sécurisation 2",
  SEC_3: "Fichier sécurisation 3",
};

export interface User {
  id: number;
  username: string;
  fullName: string | null;
  role: Role;
  active: boolean;
  editableSections: FieldSection[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface FieldOption {
  id: number;
  value: string;
  position: number;
  active: boolean;
}

export interface AppField {
  id: number;
  code: string;
  label: string;
  section: FieldSection;
  sectionLabel: string;
  type: FieldType;
  position: number;
  active: boolean;
  /** Also shown read only in the main table (ex: Etat final). */
  published: boolean;
  /** Conditional J-1 column: only for the dossiers whose Cellule plani is open ("Ouvert"). */
  planification: boolean;
  /** Filled by the application (pilot, date de traitement = import date), never by hand. */
  auto: boolean;
  options: FieldOption[];
}

export interface SourceColumn {
  id: number;
  /** Key in the dossier data ("S1::Statut" for sécurisation file 1). */
  name: string;
  /** Header as written in the file. */
  label: string;
  source: DataSource;
  position: number;
  visible: boolean;
}

export interface DossierRow {
  id: number;
  idExterne: string;
  date: string;
  raw: Record<string, string>;
  values: Record<string, string>;
  /** Flag codes (P1, SECU...), in display order. */
  flags: string[];
  /** Flags changed by hand (no longer detected automatically). */
  flagsManual: boolean;
  /** Lead sécurisation pilot (dispatch, username). */
  assignedTo: string | null;
  /** Lead J-1 / J / J+1 pilot: the first who took the dossier (username). */
  assignedJ: string | null;
  /** team -> the other pilots who joined the lead (usernames, joining order). */
  workers: Partial<Record<Team, string[]>>;
  /** Cellule plani open ("Ouvert"): the conditional J-1 columns are shown. */
  planification: boolean;
  /** Absent from the sécurisation files: sécurisation columns N/A. */
  horsSecu: boolean;
  delay: Delay;
  /** Sécurisation still missing: J_MINUS_1 (appointment tomorrow), J (today). */
  secuAlert: SecuAlert | null;
}

export type SecuAlert = "J_MINUS_1" | "J";
export const SECU_ALERT_LABELS: Record<SecuAlert, string> = {
  J_MINUS_1: "À sécuriser · RDV demain",
  J: "Non sécurisé · RDV aujourd'hui",
};

/** Lead of a dossier in a team (username). */
export function assigneeOf(row: DossierRow, team: Team): string | null {
  return team === "SECURISATION" ? row.assignedTo : row.assignedJ;
}

/** Every pilot of a team on the dossier: the lead first, then the ones who joined. */
export function workersOf(row: DossierRow, team: Team): string[] {
  const lead = assigneeOf(row, team);
  const others = (row.workers?.[team] ?? []).filter((u) => u !== lead);
  return lead ? [lead, ...others] : others;
}

/** Pilots of one team on a dossier (answer of take / join / leave). */
export interface DossierWorkers {
  dossierId: number;
  team: Team;
  lead: string | null;
  workers: { team: Team; username: string; name: string; lead: boolean; joinedAt: string | null }[];
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DossierTable {
  sourceColumns: SourceColumn[];
  fields: AppField[];
  rows: Page<DossierRow>;
  /** Matching dossiers whose Cellule plani is open: the conditional J-1 columns show when > 0. */
  openCount: number;
  /** username -> display name of the pilots shown in the page. */
  names: Record<string, string>;
}

/** Condition of a column filter. */
export type FilterOp = "contains" | "notContains" | "equals" | "notEquals" | "startsWith" | "endsWith" | "empty" | "notEmpty" | "between";

/** Column keys: "date", "idExterne", "flags", "assignee", "secu", "status:<SECTION>", "raw:<column name>", "field:<id>". */
export interface ColumnFilter {
  key: string;
  /** Accepted values ("" = empty). */
  values?: string[] | null;
  /** Text of the condition. */
  text?: string | null;
  /** Condition (default "contains" when a text is given). */
  op?: FilterOp | null;
  /** Date range (yyyy-MM-dd) of a "between" condition. */
  from?: string | null;
  to?: string | null;
}

/** Progress of a dossier in a section. */
export type ProgressStatus = "UNTOUCHED" | "IN_PROGRESS" | "DONE";
export const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  UNTOUCHED: "Non touchés",
  IN_PROGRESS: "En cours",
  DONE: "Traités",
};

export interface SortSpec {
  key: string;
  direction: "asc" | "desc";
}

export interface DossierCriteria {
  /** The dossiers of this pilot come first ("mes dossiers"). */
  pin?: { team: Team; username: string } | null;
  date: string;
  search: string;
  filters: ColumnFilter[];
  sort: SortSpec | null;
  page: number;
  size: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetResponse {
  key: string;
  values: FacetValue[];
  emptyCount: number;
  truncated: boolean;
}

export interface SectionStat {
  section: FieldSection;
  label: string;
  treated: number;
  fields: number;
  /** Every required field filled. */
  done: number;
}

export interface DossierStats {
  total: number;
  sections: SectionStat[];
  /** Dossiers whose sécurisation is still missing (appointment tomorrow or today). */
  secuPending: number;
}

export interface FieldValue {
  dossierId: number;
  fieldId: number;
  value: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  /** Values filled automatically at the same time (field id -> value). */
  autoFilled: Record<string, string>;
  /** Cellule plani open after this change: the conditional J-1 columns of the dossier are shown. */
  open: boolean;
}

export interface ImportResult {
  batchId: number;
  fileName: string;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  columns: string[];
  newColumns: string[];
  warnings: string[];
}

export interface ImportBatch {
  id: number;
  fileName: string;
  source: DataSource;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
}

export interface SecSource {
  slot: number;
  source: DataSource;
  lastImport: ImportBatch | null;
  columns: number;
  visible: number;
}

export type EventType =
  | "CREATED"
  | "IMPORT_UPDATED"
  | "DATA_RECEIVED"
  | "VALUE_SET"
  | "VALUE_CLEARED"
  | "FLAGS_CHANGED"
  | "ASSIGNED"
  | "IMPORT_CANCELLED"
  | "JOINED"
  | "LEFT";
export type StageStatus = "DONE" | "CURRENT" | "PENDING";

export interface StageField {
  id: number;
  label: string;
  type: FieldType;
  value: string | null;
  /** Must be filled for the dossier to be closed. */
  required: boolean;
  by: string | null;
  at: string | null;
}

export interface TimelineStage {
  key: string;
  label: string;
  status: StageStatus;
  at: string | null;
  detail: string | null;
  fields: StageField[];
}

export interface TimelineMail {
  fieldId: number;
  label: string;
  section: FieldSection;
  sectionLabel: string;
  value: string | null;
  objet: string | null;
  by: string | null;
  at: string | null;
}

export interface TimelineEvent {
  id: number;
  type: EventType;
  section: FieldSection | null;
  sectionLabel: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  detail: string | null;
  actor: string | null;
  at: string;
}

/** Life cycle ("road map") of a dossier. */
export interface DossierTimeline {
  id: number;
  idExterne: string;
  date: string;
  createdAt: string;
  updatedAt: string | null;
  stages: TimelineStage[];
  edits: number;
  events: TimelineEvent[];
  mails: TimelineMail[];
  delay: Delay;
  /** Cellule plani open: the conditional J-1 columns apply. */
  planification: boolean;
  horsSecu: boolean;
  assignees: { team: Team; label: string; name: string }[];
  /** Pilots on the dossier and anyone who changed something. */
  contributors: Contributor[];
  secuAlert: SecuAlert | null;
}

/** Someone who works / worked on a dossier. */
export interface Contributor {
  username: string;
  name: string;
  /** Team he works the dossier for (null = only changed something). */
  team: Team | null;
  teamLabel: string | null;
  lead: boolean;
  /** Still on the dossier. */
  active: boolean;
  joinedAt: string | null;
  actions: number;
  lastAt: string | null;
  lastAction: string | null;
}

// ------------------------------------------------------------------ flags

/** Colour keys: predefined flags + the 5 colours offered for custom flags. */
export type FlagColor =
  | "RED" | "ORANGE" | "VIOLET" | "AMBER" | "BLUE" | "TURQUOISE" | "EMERALD" | "CYAN" | "PINK" | "INDIGO" | "LIME"
  | "VIOLET_VIF" | "FUCHSIA" | "BLEU_CIEL" | "ARDOISE" | "PIERRE";

export const CUSTOM_FLAG_COLORS: { value: FlagColor; label: string }[] = [
  { value: "VIOLET_VIF", label: "Violet vif" },
  { value: "FUCHSIA", label: "Fuchsia" },
  { value: "BLEU_CIEL", label: "Bleu ciel" },
  { value: "ARDOISE", label: "Ardoise" },
  { value: "PIERRE", label: "Pierre" },
];

export interface Flag {
  id: number;
  code: string;
  label: string;
  color: FlagColor;
  builtin: boolean;
  position: number;
}

export interface DossierFlags {
  dossierId: number;
  flags: string[];
  manual: boolean;
}

// ------------------------------------------------------------------ sécurisation team

export interface Pilote {
  id: number;
  username: string;
  fullName: string | null;
  active: boolean;
  createdAt: string;
  /** Dossiers dispatched to him (every date). */
  assigned: number;
  /** Of which "Etat final" is filled. */
  treated: number;
}

export interface PiloteLoad {
  username: string;
  fullName: string | null;
  active: boolean;
  assigned: number;
  treated: number;
  flags: Record<string, number>;
}

export interface DispatchSummary {
  total: number;
  treated: number;
  unassigned: number;
  unassignedFlags: Record<string, number>;
  pilotes: PiloteLoad[];
}

export interface DispatchResult {
  moved: number;
  summary: DispatchSummary | null;
}

// ------------------------------------------------------------------ dashboard / files

/** Dominant state of a day: red, orange, blue (on time), green (everything closed). */
export type DayStatus = "LATE" | "SOON" | "ON_TIME" | "DONE" | "CANCELLED" | "EMPTY";

export interface DayStat {
  date: string;
  total: number;
  done: number;
  late: number;
  soon: number;
  onTime: number;
  horsSecu: number;
  /** Cellule plani open ("Ouvert"): conditional J-1 columns to fill. */
  planification: number;
  /** Not closed and without sécurisation pilot. */
  unassignedSecu: number;
  /** Not closed and nobody working on it in the J team. */
  unassignedJ: number;
  /** "Etat final" still empty (not cancelled, in the sécurisation files). */
  unsecured: number;
  /** Dossiers of cancelled imports (grey, out of every count). */
  cancelled: number;
  status: DayStatus;
}

/** An imported file with the state of its dossiers today. */
export interface BatchSummary {
  id: number;
  fileName: string;
  source: DataSource;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  rolledBack: boolean;
  rolledBackAt: string | null;
  rolledBackBy: string | null;
  /** The connected admin can cancel it. */
  canRollback: boolean;
  dossiers: number;
  done: number;
  late: number;
  soon: number;
  onTime: number;
  /** Not closed and without pilot in the team of the file. */
  unassigned: number;
  /** Set to "Annulé" because the file was cancelled. */
  cancelled: number;
  firstDate: string | null;
  lastDate: string | null;
}

export interface RollbackPreview {
  id: number;
  fileName: string;
  /** Dossiers created by the file, kept but set to "Annulé". */
  cancelled: number;
  /** Dossiers whose previous values come back. */
  restored: number;
  /** Left as is (a later file of the same kind wins). */
  kept: number;
  /** Removed dossiers on which someone already worked. */
  worked: number;
}

/** New work of the connected pilot. */
export interface PilotWork {
  team: Team | null;
  open: number;
  fresh: number;
  latest: string | null;
}
