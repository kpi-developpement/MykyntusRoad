package com.mykyntus.service;

import com.mykyntus.dto.pref.PreferenceResponse;
import com.mykyntus.entity.UserPreference;
import com.mykyntus.exception.ApiException;
import com.mykyntus.repository.UserPreferenceRepository;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

/** Settings of each account (order / visibility of the columns of every table...), kept on the server. */
@Service
@RequiredArgsConstructor
public class PreferenceService {

    private static final Pattern KEY = Pattern.compile("^[A-Za-z0-9._:-]{1,120}$");

    private final UserPreferenceRepository repository;

    @Transactional(readOnly = true)
    public PreferenceResponse get(String username, String key) {
        validate(key);
        return repository.findByUsernameAndKey(username, key)
                .map(p -> new PreferenceResponse(key, p.getValue(), p.getUpdatedAt()))
                .orElse(new PreferenceResponse(key, null, null));
    }

    @Transactional
    public PreferenceResponse save(String username, String key, String value) {
        validate(key);
        String v = TextUtils.trimToNull(value);
        if (v == null) {
            repository.findByUsernameAndKey(username, key).ifPresent(repository::delete);
            return new PreferenceResponse(key, null, null);
        }
        UserPreference pref = repository.findByUsernameAndKey(username, key)
                .orElseGet(() -> UserPreference.builder().username(username).key(key).build());
        pref.setValue(v);
        pref.setUpdatedAt(LocalDateTime.now());
        repository.save(pref);
        return new PreferenceResponse(key, v, pref.getUpdatedAt());
    }

    private static void validate(String key) {
        if (key == null || !KEY.matcher(key).matches()) {
            throw ApiException.badRequest("Clé de préférence invalide");
        }
    }
}
