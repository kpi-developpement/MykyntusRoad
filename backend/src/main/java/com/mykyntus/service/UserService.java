package com.mykyntus.service;

import com.mykyntus.dto.user.UserCreateRequest;
import com.mykyntus.dto.user.UserResponse;
import com.mykyntus.dto.user.UserUpdateRequest;
import com.mykyntus.entity.AppUser;
import com.mykyntus.exception.ApiException;
import com.mykyntus.mapper.DtoMapper;
import com.mykyntus.repository.AppUserRepository;
import com.mykyntus.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll(Sort.by("username")).stream().map(DtoMapper::toUser).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(DtoMapper::toUser)
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        String username = request.username().trim();
        if (userRepository.existsByUsername(username)) {
            throw ApiException.conflict("Cet identifiant existe déjà");
        }
        AppUser user = AppUser.builder()
                .username(username)
                .password(passwordEncoder.encode(request.password()))
                .fullName(TextUtils.trimToNull(request.fullName()))
                .role(request.role())
                .build();
        return DtoMapper.toUser(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request, String currentUsername) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        boolean self = user.getUsername().equals(currentUsername);
        if (self && (!request.active() || request.role() != user.getRole())) {
            throw ApiException.badRequest("Vous ne pouvez pas modifier votre propre rôle ou vous désactiver");
        }
        user.setFullName(TextUtils.trimToNull(request.fullName()));
        user.setRole(request.role());
        user.setActive(request.active());
        String password = TextUtils.trimToNull(request.password());
        if (password != null) {
            if (password.length() < 6) {
                throw ApiException.badRequest("Le mot de passe doit contenir au moins 6 caractères");
            }
            user.setPassword(passwordEncoder.encode(password));
        }
        return DtoMapper.toUser(user);
    }

    @Transactional
    public void delete(Long id, String currentUsername) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        if (user.getUsername().equals(currentUsername)) {
            throw ApiException.badRequest("Vous ne pouvez pas supprimer votre propre compte");
        }
        userRepository.delete(user);
    }
}
