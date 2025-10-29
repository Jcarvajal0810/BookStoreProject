package com.example.userservice.service;

import com.example.userservice.model.User;
import com.example.userservice.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public boolean checkPassword(String raw, String encoded) {
        return passwordEncoder.matches(raw, encoded);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(String id) {
        return userRepository.findById(id);
    }

    public User updateUser(String id, User updates) {
        return userRepository.findById(id).map(existing -> {
            if (updates.getUsername() != null) existing.setUsername(updates.getUsername());
            if (updates.getEmail() != null) existing.setEmail(updates.getEmail());
            if (updates.getRole() != null) existing.setRole(updates.getRole());
            if (updates.getPassword() != null && !updates.getPassword().isEmpty())
                existing.setPassword(passwordEncoder.encode(updates.getPassword()));
            return userRepository.save(existing);
        }).orElse(null);
    }

    //  Métodos agregados para compatibilidad con ExtraUserController
    public void deleteUser(String id) {
        userRepository.deleteById(id);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }
}
