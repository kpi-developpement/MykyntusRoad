export type Role = "ADMIN" | "ADMIN_SECURISATION" | "PILOTE_SECURISATION" | "PILOTE_PLANIFICATION" | "PILOTE_J";
/**
 * J_MINUS_1 only remains in the history written before J-1 was merged into Sécurisation.
 * PLANIFICATION holds the J-1 columns of the dossiers that are not "Planifié".
 */
export type FieldSection = "SECURISATION" | "J_MINUS_1" | "PLANIFICATION" | "J" | "J_PLUS_1";
/** Teams the dossiers are dispatched to. */
export type Team = "SECURISATION" | "PLANIFICATION" | "J";
/** DONE (closed), ON_TIME, SOON (J+1 morning, orange), LATE (after J+1 12:00, red), CANCELLED (its import was cancelled, grey). */
export type Delay = "DONE" | "ON_TIME" | "SOON" | "LATE" | "CANCELLED";
export type FieldType = "SELECT" | "TEXT" | "DATE" | "USER";
/** Main daily file, the global sécurisation file or one of the 3 sécurisation files. */
export type DataSource = "MAIN" | "SEC_GLOBAL" | "SEC_1" | "SEC_2" | "SEC_3";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  ADMIN_SECURISATION: "Admin sécurisation",
  PILOTE_SECURISATION: "Pilote sécurisation",
  PILOTE_PLANIFICATION: "Agent planification",
  PILOTE_J: "Agent J / J+1",
};

export const TEAM_LABELS: Record<Team, string> = {
  SECURISATION: "Pilote sécurisation",
  PLANIFICATION: "Agent planification",
  J: "Agent J / J+1",
};

/** Team of a pilot role (null for the admins). */
export function teamOf(role: Role | undefined): Team | null {
  if (role === "PILOTE_SECURISATION") return "SECURISATION";
  if (role === "PILOTE_PLANIFICATION") return "PLANIFICATION";
  if (role === "PILOTE_J") return "J";
  return null;
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

/** Every section, in display order. */
export const SECTIONS: FieldSection[] = ["SECURISATION", "PLANIFICATION", "J", "J_PLUS_1"];
/** Sections of the main follow-up (sécurisation only shows its published columns there). */
export const MAIN_SECTIONS: FieldSection[] = ["PLANIFICATION", "J", "J_PLUS_1"];
/** Work of the sécurisation team (with the J-1 columns of the "Planifié" dossiers). */
export const SECURISATION_SECTIONS: FieldSection[] = ["SECURISATION"];
/** Columns configured by the admin. */
export const ADMIN_FIELD_SECTIONS: FieldSection[] = ["J", "J_PLUS_1"];

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
  /** J-1 column: worked by the planification team when the dossier is not "Planifié". */
  planification: boolean;
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
  /** Sécurisation pilot the dossier is dispatched to (username). */
  assignedTo: string | null;
  /** Planification agent (username). */
  assignedPlanif: string | null;
  /** J / J+1 agent (username). */
  assignedJ: string | null;
  /** "Cellule plani" is not "Planifié": the J-1 columns are with the planification team. */
  planification: boolean;
  /** Absent from the sécurisation files: sécurisation columns N/A. */
  horsSecu: boolean;
  delay: Delay;
}

/** Username a dossier is dispatched to in a team. */
export function assigneeOf(row: DossierRow, team: Team): string | null {
  return team === "SECURISATION" ? row.assignedTo : team === "PLANIFICATION" ? row.assignedPlanif : row.assignedJ;
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
}

/** Condition of a column filter. */
export type FilterOp = "contains" | "notContains" | "equals" | "notEquals" | "startsWith" | "endsWith" | "empty" | "notEmpty" | "between";

/** Column keys: "date", "idExterne", "flags", "assignee", "status:<SECTION>", "raw:<column name>", "field:<id>". */
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
}

export interface FieldValue {
  dossierId: number;
  fieldId: number;
  value: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  /** Values filled automatically at the same time (field id -> value). */
  autoFilled: Record<string, string>;
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

export type EventType = "CREATED" | "IMPORT_UPDATED" | "DATA_RECEIVED" | "VALUE_SET" | "VALUE_CLEARED" | "FLAGS_CHANGED" | "ASSIGNED" | "IMPORT_CANCELLED";
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
  planification: boolean;
  horsSecu: boolean;
  assignees: { team: Team; label: string; name: string }[];
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
  planification: number;
  /** Not closed and without sécurisation pilot. */
  unassignedSecu: number;
  /** Not closed and without J agent. */
  unassignedJ: number;
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
