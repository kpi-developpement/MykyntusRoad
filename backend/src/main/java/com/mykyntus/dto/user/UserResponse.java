package com.mykyntus.dto.user;

import com.mykyntus.entity.FieldSection;
import com.mykyntus.entity.Role;

import java.util.Set;

public record UserResponse(Long id, String username, String fullName, Role role, boolean active,
                           Set<FieldSection> editableSections) {
}
