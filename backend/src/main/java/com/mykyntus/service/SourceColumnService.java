package com.mykyntus.service;

import com.mykyntus.dto.importing.SourceColumnResponse;
import com.mykyntus.entity.DataSource;
import com.mykyntus.entity.SourceColumn;
import com.mykyntus.exception.ApiException;
import com.mykyntus.mapper.DtoMapper;
import com.mykyntus.repository.SourceColumnRepository;
import com.mykyntus.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Imported columns: each admin chooses which columns of its files are displayed. */
@Service
@RequiredArgsConstructor
public class SourceColumnService {

    private final SourceColumnRepository repository;

    /** Columns of the files this user administrates (main file for ADMIN, the 3 sécurisation files for ADMIN_SECURISATION). */
    @Transactional(readOnly = true)
    public List<SourceColumnResponse> findAll(CurrentUser user) {
        return repository.findAllByOrderByPositionAsc().stream()
                .filter(c -> user.role().canConfigure(DataSource.orMain(c.getSource())))
                .map(DtoMapper::toSourceColumn)
                .toList();
    }

    @Transactional
    public SourceColumnResponse setVisible(Long id, boolean visible, CurrentUser user) {
        SourceColumn column = repository.findById(id).orElseThrow(() -> ApiException.notFound("Colonne introuvable"));
        if (!user.role().canConfigure(DataSource.orMain(column.getSource()))) {
            throw ApiException.forbidden("Vous ne gérez pas les colonnes de ce fichier");
        }
        column.setVisible(visible);
        return DtoMapper.toSourceColumn(column);
    }
}
