"use client";

import { AlignJustify, FileDown, FilterX, RefreshCw, StretchHorizontal } from "lucide-react";
import type { DossierGrid } from "../../../hooks/useDossierGrid";
import type { GridPreferencesApi } from "../../../hooks/useGridPreferences";
import type { DossierRow } from "../../../types";
import { cn } from "../../../utils/cn";
import { Button1 } from "../../button/Button1/Button1";
import { IconButton } from "../../button/IconButton/IconButton";
import { DateFilter } from "../../filters/DateFilter/DateFilter";
import { SearchInput } from "../../input/SearchInput/SearchInput";
import { ColumnsMenu } from "../ColumnsMenu/ColumnsMenu";
import type { GridColumn, GridGroup } from "../DataGrid/types";

interface GridToolbarProps {
  grid: DossierGrid;
  columns: GridColumn<DossierRow>[];
  groups?: GridGroup[];
  prefs: GridPreferencesApi;
  onExport?: () => void;
  exporting?: boolean;
}

export function GridToolbar({ grid, columns, groups, prefs, onExport, exporting }: GridToolbarProps) {
  const filterCount = grid.criteria.filters.length + (grid.criteria.search ? 1 : 0);
  const compact = prefs.density === "compact";

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
      <SearchInput
        value={grid.searchInput}
        onChange={grid.setSearchInput}
        placeholder="Rechercher un ID Externe…"
        shortcut
        className="w-full sm:w-72"
      />
      <DateFilter value={grid.criteria.date} onChange={grid.setDate} />
      <div className="ml-auto flex items-center gap-2">
        {filterCount > 0 && (
          <Button1 variant="ghost" size="sm" leftIcon={<FilterX />} onClick={grid.clearFilters} className="h-10 animate-fade-in rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700">
            Réinitialiser
            <span className="rounded-full bg-rose-100 px-1.5 text-[10px] font-bold tabular-nums">{filterCount}</span>
          </Button1>
        )}
        <ColumnsMenu columns={columns} groups={groups} isVisible={prefs.isVisible} onToggle={prefs.setVisible} onReset={prefs.resetColumns} />
        <IconButton
          variant="secondary"
          label={compact ? "Affichage confortable" : "Affichage compact"}
          onClick={() => prefs.setDensity(compact ? "comfortable" : "compact")}
        >
          {compact ? <StretchHorizontal /> : <AlignJustify />}
        </IconButton>
        {onExport && (
          <IconButton variant="secondary" label="Exporter en Excel (colonnes affichées, drapeaux inclus)" onClick={onExport} disabled={exporting}>
            <FileDown className={cn(exporting && "animate-bounce")} />
          </IconButton>
        )}
        <IconButton variant="secondary" label="Actualiser" onClick={grid.reload}>
          <RefreshCw className={cn(grid.loading && "animate-spin")} />
        </IconButton>
      </div>
    </div>
  );
}
