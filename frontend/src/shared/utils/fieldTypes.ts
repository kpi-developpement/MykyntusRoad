import { CalendarDays, ListChecks, Type, UserRound, type LucideIcon } from "lucide-react";
import type { FieldType } from "../types";

export interface FieldTypeInfo {
  value: FieldType;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Kinds of application columns. DATE and USER are filled automatically when the dossier is treated. */
export const FIELD_TYPES: FieldTypeInfo[] = [
  { value: "SELECT", label: "Liste", description: "Liste déroulante de valeurs définies par l'admin.", icon: ListChecks },
  { value: "TEXT", label: "Texte", description: "Texte libre saisi par les utilisateurs.", icon: Type },
  { value: "DATE", label: "Date", description: "Date du jour remplie automatiquement, modifiable.", icon: CalendarDays },
  { value: "USER", label: "Pilote", description: "Nom de la personne qui traite le dossier, rempli automatiquement.", icon: UserRound },
];

export const fieldTypeInfo = (type: FieldType) => FIELD_TYPES.find((t) => t.value === type) ?? FIELD_TYPES[0];
