import { dateColumn, idColumn, isIdExterneColumn, rawColumn } from "@/shared/components/table/DossierTable/commonColumns";
import type { GridColumn } from "@/shared/components/table/DataGrid/types";
import type { DossierRow, SourceColumn } from "@/shared/types";

/** Imported data of the main file: ID Externe first, then the dossier date, then every column of the file. */
export function buildRawColumns(sourceColumns: SourceColumn[], onOpen?: (row: DossierRow) => void): GridColumn<DossierRow>[] {
  return [
    idColumn(onOpen),
    dateColumn(false),
    ...sourceColumns.filter((c) => c.source === "MAIN" && !isIdExterneColumn(c.label)).map((c) => rawColumn(c)),
  ];
}
