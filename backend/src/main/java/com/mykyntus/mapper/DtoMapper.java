package com.mykyntus.mapper;

import com.mykyntus.dto.field.AppFieldResponse;
import com.mykyntus.dto.field.FieldOptionResponse;
import com.mykyntus.dto.importing.ImportBatchResponse;
import com.mykyntus.dto.importing.SourceColumnResponse;
import com.mykyntus.dto.user.UserResponse;
import com.mykyntus.entity.*;

import java.util.Comparator;

/** Entity -> DTO conversions, kept in one place. */
public final class DtoMapper {

    private DtoMapper() {
    }

    public static UserResponse toUser(AppUser u) {
        return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRole(), u.isActive(),
                u.getRole().getEditableSections());
    }

    public static FieldOptionResponse toOption(FieldOption o) {
        return new FieldOptionResponse(o.getId(), o.getValue(), o.getPosition(), o.isActive());
    }

    public static AppFieldResponse toField(AppField f, boolean onlyActiveOptions) {
        return new AppFieldResponse(
                f.getId(), f.getCode(), f.getLabel(), f.getSection(), f.getSection().getLabel(),
                f.getType(), f.getPosition(), f.isActive(), f.isPublished(),
                f.getOptions().stream()
                        .filter(o -> !onlyActiveOptions || o.isActive())
                        .sorted(Comparator.comparingInt(FieldOption::getPosition).thenComparing(FieldOption::getId))
                        .map(DtoMapper::toOption)
                        .toList());
    }

    public static SourceColumnResponse toSourceColumn(SourceColumn c) {
        return new SourceColumnResponse(c.getId(), c.getName(), c.getLabel() != null ? c.getLabel() : c.getName(),
                DataSource.orMain(c.getSource()), c.getPosition(), c.isVisible());
    }

    public static ImportBatchResponse toBatch(ImportBatch b) {
        return new ImportBatchResponse(b.getId(), b.getFileName(), DataSource.orMain(b.getSource()), b.getImportedBy(), b.getImportedAt(),
                b.getTotalRows(), b.getCreatedRows(), b.getUpdatedRows(), b.getSkippedRows());
    }

}
