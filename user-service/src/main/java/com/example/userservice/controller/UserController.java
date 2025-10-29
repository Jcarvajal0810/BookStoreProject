package com.example.userservice.controller;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.example.userservice.model.User;
import com.example.userservice.service.UserService;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    
    public UserController(UserService userService){ 
        this.userService = userService; 
    }

    // GET /api/users/me - Ver mi propio perfil
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(){
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        
        Optional<User> user = userService.findByUsername(username);
        if(user.isEmpty()){
            return ResponseEntity.notFound().build();
        }
        
        User u = user.get();
        // No devolver el password
        u.setPassword(null);
        return ResponseEntity.ok(u);
    }

    // PUT /api/users/me - Actualizar mi propio perfil
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@RequestBody User updates){
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        
        Optional<User> user = userService.findByUsername(username);
        if(user.isEmpty()){
            return ResponseEntity.notFound().build();
        }
        
        User updated = userService.updateUser(user.get().getId(), updates);
        if(updated == null){
            return ResponseEntity.badRequest().body(Map.of("error", "No se pudo actualizar el perfil"));
        }
        
        // No devolver el password
        updated.setPassword(null);
        return ResponseEntity.ok(updated);
    }

    // GET /api/users/{id} - Ver perfil de otro usuario (solo ADMIN)
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserById(@PathVariable String id){
        Optional<User> user = userService.findById(id);
        if(user.isEmpty()){
            return ResponseEntity.notFound().build();
        }
        
        User u = user.get();
        // No devolver el password
        u.setPassword(null);
        return ResponseEntity.ok(u);
    }

    // GET /api/users/profile/{username} - Ver perfil por username (legacy)
    @GetMapping("/profile/{username}")
    public ResponseEntity<?> getProfile(@PathVariable String username){
        Optional<User> user = userService.findByUsername(username);
        if(user.isEmpty()){
            return ResponseEntity.notFound().build();
        }
        
        User u = user.get();
        // No devolver el password
        u.setPassword(null);
        return ResponseEntity.ok(u);
    }

    // POST /api/users/tasks/deactivate-inactive - Endpoint para scheduler
    @PostMapping("/tasks/deactivate-inactive")
    public ResponseEntity<?> deactivateInactive(@RequestBody Map<String,Object> payload){
        return ResponseEntity.ok(Map.of("result","ok","received",payload));
    }
}