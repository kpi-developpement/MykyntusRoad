package com.mykyntus.service;

import com.mykyntus.dto.auth.LoginRequest;
import com.mykyntus.dto.auth.LoginResponse;
import com.mykyntus.entity.AppUser;
import com.mykyntus.exception.ApiException;
import com.mykyntus.mapper.DtoMapper;
import com.mykyntus.repository.AppUserRepository;
import com.mykyntus.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AppUserRepository userRepository;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username().trim(), request.password()));
        AppUser user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
        return new LoginResponse(jwtService.generateToken(user), DtoMapper.toUser(user));
    }
}
