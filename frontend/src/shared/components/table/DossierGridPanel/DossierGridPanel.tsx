"use client";

import { useState } from "react";
import { FilterX } from "lucide-react";
import { dossierService } from "../../../services/dossierService";
import { useToast } from "../../toast/ToastProvider/ToastProvider";
import type { DossierGrid } from "../../../hooks/useDossierGrid";
import { useGridPreferences } from "../../../hooks/useGridPreferences";
import type { DossierRow, FieldSection } from "../../../types";
import { Alert1 } from "../../alert/Alert1/Alert1";
import { Button1 } from "../../button/Button1/Button1";
import { EmptyState } from "../../feedback/EmptyState/EmptyState";
import { Pagination1 } from "../../pagination/Pagination1/Pagination1";
import { Surface } from "../../surface/Surface/Surface";
import { DataGrid } from "../DataGrid/DataGrid";
import type { GridColumn, GridGroup } from "../DataGrid/types";
import { FilterChips } from "../FilterChips/FilterChips";
import { FilterDock } from "../FilterDock/FilterDock";
import { GridToolbar } from "../GridToolbar/GridToolbar";
import { ProgressFilter } from "../ProgressFilter/ProgressFilter";

/** Default "Avancement" sections (the planification section has no column of its own). */
const PROGRESS_SECTIONS: FieldSection[] = ["J", "J_PLUS_1"];

interface DossierGridPanelProps {
  /** Key used to remember density / visible columns. */
  gridId: string;
  grid: DossierGrid;
  /** Every column (the user chooses the visible ones). */
  columns: GridColumn<DossierRow>[];
  groups?: GridGroup[];
  emptyAction?: React.ReactNode;
  maxHeight?: string;
  /** Sections offered in the "Avancement" quick filter (non touchés / en cours / traités). */
  progressSections?: FieldSection[];
  /** Rows shown greyed out (read only). */
  rowMuted?: (row: DossierRow) => boolean;
}

/** Card with toolbar, active filter chips, data grid and pagination. */
export function DossierGridPanel({ gridId, grid, columns, groups, emptyAction, maxHeight, progressSections = PROGRESS_SECTIONS, rowMuted }: DossierGridPanelProps) {
  const prefs = useGridPreferences(gridId);
  const visible = columns.filter((c) => prefs.isVisible(c));
  const rows = grid.data?.rows;
  const filtered = grid.criteria.filters.length > 0 || !!grid.criteria.search;
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  async function exportExcel() {
    const titles = new Map((groups ?? []).map((g) => [g.id, g.title]));
    const cols = visible.map((c) => {
      const group = c.groupId ? titles.get(c.groupId) : undefined;
      return { key: c.key, label: group && !c.key.startsWith("raw:") ? `${group} · ${c.label}` : c.label };
    });
    setExporting(true);
    try {
      await dossierService.exportExcel(grid.criteria, cols);
      toast.success("Export Excel prêt", `${rows?.totalElements ?? 0} dossier(s) · ${cols.length} colonnes`);
    } catch (e) {
      toast.error("Export impossible", e instanceof Error ? e.message : undefined);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Surface as="section" className="overflow-hidden rounded-3xl">
      <GridToolbar grid={grid} columns={columns} groups={groups} prefs={prefs} onExport={exportExcel} exporting={exporting} />
      {progressSections.length > 0 && <ProgressFilter grid={grid} sections={progressSections} />}
      <FilterChips
        filters={grid.criteria.filters}
        columns={columns}
        search={grid.criteria.search}
        onRemove={(key) => grid.setFilter(key, null)}
        onClearSearch={() => grid.setSearchInput("")}
        onClearAll={grid.clearFilters}
      />
      <FilterDock
        filters={grid.criteria.filters}
        columns={columns}
        search={grid.criteria.search}
        onRemove={(key) => grid.setFilter(key, null)}
        onClearSearch={() => grid.setSearchInput("")}
        onClearAll={grid.clearFilters}
      />
      {grid.error && (
        <div className="px-4 pb-3">
          <Alert1 tone="error" title="Chargement impossible">
            {grid.error}
          </Alert1>
        </div>
      )}
      <div className="border-t border-slate-100">
        <DataGrid
          columns={visible}
          groups={groups}
          rows={rows?.content ?? []}
          rowKey={(r) => r.id}
          loading={grid.loading}
          initialLoading={grid.initialLoading}
          version={grid.version}
          density={prefs.density}
          sort={grid.criteria.sort}
          onSortChange={grid.setSort}
          filters={grid.criteria.filters}
          onFilterChange={grid.setFilter}
          loadFacets={grid.loadFacets}
          maxHeight={maxHeight}
          rowMuted={rowMuted}
          empty={
            filtered ? (
              <EmptyState
                title="Aucun dossier ne correspond"
                description="Modifiez ou retirez des filtres pour élargir la recherche."
                action={
                  <Button1 variant="secondary" leftIcon={<FilterX />} onClick={grid.clearFilters}>
                    Effacer les filtres
                  </Button1>
                }
              />
            ) : (
              <EmptyState
                title="Aucun dossier pour cette date"
                description="Choisissez une autre date ou affichez toutes les dates."
                action={emptyAction}
              />
            )
          }
        />
      </div>
      {rows && rows.totalElements > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/40">
          <Pagination1
            page={rows.page}
            size={grid.criteria.size}
            totalPages={rows.totalPages}
            totalElements={rows.totalElements}
            onPageChange={grid.setPage}
            onSizeChange={grid.setSize}
          />
        </div>
      )}
    </Surface>
  );
}
