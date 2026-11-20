import type { ReactNode } from "react";

export type Density = "compact" | "comfortable";

/** A coloured group of columns in the header (J-1, J, J+1, imported data...). */
export interface GridGroup {
  id: string;
  /** Plain text name (menus). */
  title: string;
  /** Header content (may contain badges). */
  label: ReactNode;
  headerClassName: string;
  subHeaderClassName: string;
}

export interface GridColumn<T> {
  /** Filter / sort key sent to the API ("date", "idExterne", "raw:...", "field:..."). */
  key: string;
  label: string;
  groupId?: string;
  width: number;
  /** Stays visible on the left while scrolling horizontally. */
  pinned?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  /** Hidden until the user shows it from the "Colonnes" menu. */
  defaultHidden?: boolean;
  /** Values always proposed in the filter, even with no dossier (dropdown options). */
  knownValues?: string[];
  /** Display of a value in the filter list. */
  renderValue?: (value: string) => ReactNode;
  /** Text of a value in the active filter chips. */
  formatValue?: (value: string) => string;
  render: (row: T, index: number) => ReactNode;
}
