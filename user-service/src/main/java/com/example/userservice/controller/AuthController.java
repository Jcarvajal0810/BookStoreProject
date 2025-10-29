package com.example.userservice.controller;

import com.example.userservice.model.User;
import com.example.userservice.service.UserService;
import com.example.userservice.security.JwtUtil;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public AuthController(UserService userService, JwtUtil jwtUtil){
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public Map<String,Object> register(@RequestBody User u){
        if(userService.findByUsername(u.getUsername()).isPresent()){
            return Map.of("error","username_exists");
        }
        User saved = userService.register(u);
        // Ajustado: generateToken acepta un solo String (username)
        String token = jwtUtil.generateToken(saved.getUsername());
        return Map.of("user", saved, "token", token);
    }

    @PostMapping("/login")
    public Map<String,Object> login(@RequestBody Map<String,String> body){
        String username = body.get("username");
        String password = body.get("password");
        Optional<User> ou = userService.findByUsername(username);
        if(ou.isEmpty()) return Map.of("error","invalid_credentials");
        User user = ou.get();
        if(!userService.checkPassword(password, user.getPassword())) return Map.of("error","invalid_credentials");
        // Ajustado: generateToken acepta un solo String (username)
        String token = jwtUtil.generateToken(user.getUsername());
        return Map.of("user", user, "token", token);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout() {
        return Map.of("message", "logout successful");
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("authenticated", true);
    }
}