export type Role = "ADMIN" | "ADMIN_SECURISATION" | "PILOTE_SECURISATION" | "PILOTE_J";
export type FieldSection = "SECURISATION" | "J_MINUS_1" | "J" | "J_PLUS_1";
export type FieldType = "SELECT" | "TEXT" | "DATE" | "USER";
/** Main daily file, the global sécurisation file or one of the 3 sécurisation files. */
export type DataSource = "MAIN" | "SEC_GLOBAL" | "SEC_1" | "SEC_2" | "SEC_3";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  ADMIN_SECURISATION: "Admin sécurisation",
  PILOTE_SECURISATION: "Pilote sécurisation (J-1)",
  PILOTE_J: "Pilote J / J+1",
};

export const SECTION_LABELS: Record<FieldSection, string> = {
  SECURISATION: "Sécurisation",
  J_MINUS_1: "J-1",
  J: "J",
  J_PLUS_1: "J+1 à 12h00",
};

/** Every section, in display order. */
export const SECTIONS: FieldSection[] = ["SECURISATION", "J_MINUS_1", "J", "J_PLUS_1"];
/** Sections of the main follow-up (sécurisation only shows its published columns there). */
export const MAIN_SECTIONS: FieldSection[] = ["J_MINUS_1", "J", "J_PLUS_1"];
/** Work of the sécurisation team. */
export const SECURISATION_SECTIONS: FieldSection[] = ["SECURISATION", "J_MINUS_1"];

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

export type EventType = "CREATED" | "IMPORT_UPDATED" | "DATA_RECEIVED" | "VALUE_SET" | "VALUE_CLEARED" | "FLAGS_CHANGED" | "ASSIGNED";
export type StageStatus = "DONE" | "CURRENT" | "PENDING";

export interface TimelineStage {
  key: string;
  label: string;
  status: StageStatus;
  at: string | null;
  detail: string | null;
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
