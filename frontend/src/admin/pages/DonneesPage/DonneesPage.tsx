"use client";

import { useMemo, useState } from "react";
import { CloudUpload, Database } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { DossierDrawer } from "@/shared/components/drawer/DossierDrawer/DossierDrawer";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { DossierGridPanel } from "@/shared/components/table/DossierGridPanel/DossierGridPanel";
import { useDossierGrid } from "@/shared/hooks/useDossierGrid";
import type { DossierRow } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";
import { buildRawColumns } from "../../components/table/RawDataTable/rawColumns";

/** Every column of the imported files, whatever they are, with a filter on each one. */
export function DonneesPage() {
  const grid = useDossierGrid({ initialDate: tomorrow() });
  const [details, setDetails] = useState<DossierRow | null>(null);
  const sourceColumns = grid.data?.sourceColumns;
  const columns = useMemo(() => buildRawColumns(sourceColumns ?? [], setDetails), [sourceColumns]);

  return (
    <>
      <PageHeader
        eyebrow="Données"
        title="Données importées"
        description="Toutes les colonnes des fichiers importés, une ligne par dossier. Les nouvelles colonnes apparaissent automatiquement."
        icon={<Database />}
        actions={
          <LinkButton href="/admin/import" variant="secondary" leftIcon={<CloudUpload />}>
            Nouvel import
          </LinkButton>
        }
      />
      <DossierGridPanel gridId="admin-donnees" grid={grid} columns={columns} maxHeight="calc(100dvh - 17rem)" />
      <DossierDrawer row={details} columns={sourceColumns ?? []} fields={grid.data?.fields ?? []} onClose={() => setDetails(null)} />
    </>
  );
}
