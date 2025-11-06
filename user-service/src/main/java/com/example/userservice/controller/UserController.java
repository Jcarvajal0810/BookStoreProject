package com.example.userservice.controller;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
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
    
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    private final UserService userService;
    
    public UserController(UserService userService){ 
        this.userService = userService; 
    }

    // GET /api/users/me - Ver mi propio perfil
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(){
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = auth.getName();
            
            logger.info("Usuario autenticado solicitando su perfil: {}", username);
            
            Optional<User> user = userService.findByUsername(username);
            if(user.isEmpty()){
                logger.warn("Usuario autenticado no encontrado en BD: {}", username);
                return ResponseEntity.notFound().build();
            }
            
            User u = user.get();
            u.setPassword(null); // No devolver el password
            
            logger.info("Perfil devuelto exitosamente para: {}", username);
            return ResponseEntity.ok(u);
            
        } catch (Exception e) {
            logger.error("Error en getMyProfile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor", "details", e.getMessage()));
        }
    }

    // PUT /api/users/me - Actualizar mi propio perfil
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@RequestBody User updates){
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = auth.getName();
            
            logger.info("Usuario {} solicitando actualizar su perfil", username);
            
            Optional<User> user = userService.findByUsername(username);
            if(user.isEmpty()){
                logger.warn("Usuario no encontrado al actualizar: {}", username);
                return ResponseEntity.notFound().build();
            }
            
            User updated = userService.updateUser(user.get().getId(), updates);
            if(updated == null){
                logger.error("Fallo al actualizar usuario: {}", username);
                return ResponseEntity.badRequest().body(Map.of("error", "No se pudo actualizar el perfil"));
            }
            
            updated.setPassword(null); // No devolver el password
            logger.info("Perfil actualizado exitosamente para: {}", username);
            return ResponseEntity.ok(updated);
            
        } catch (Exception e) {
            logger.error("Error en updateMyProfile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor", "details", e.getMessage()));
        }
    }

    // GET /api/users/{id} - Ver perfil de otro usuario (solo ADMIN)
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserById(@PathVariable String id){
        try {
            logger.info("Solicitando usuario por ID: {}", id);
            
            Optional<User> user = userService.findById(id);
            if(user.isEmpty()){
                logger.warn("Usuario no encontrado con ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Usuario no encontrado"));
            }
            
            User u = user.get();
            u.setPassword(null); // No devolver el password
            
            logger.info("Usuario encontrado con ID: {}", id);
            return ResponseEntity.ok(u);
            
        } catch (Exception e) {
            logger.error("Error en getUserById para ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor", "details", e.getMessage()));
        }
    }

    // GET /api/users/profile/{username} - Ver perfil por username (legacy/público)
    // GET /api/users/profile/{username} - Ver perfil por username (público)
@GetMapping("/profile/{username}")
public ResponseEntity<?> getProfile(@PathVariable String username){
    try {
        logger.info(" Buscando perfil público de usuario: [{}]", username);
        
        // Validación básica
        if (username == null || username.trim().isEmpty()) {
            logger.warn(" Username vacío recibido");
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Username es requerido"));
        }
        
        // Decodificar espacios y caracteres especiales (por si vienen codificados en URL)
        String decodedUsername = java.net.URLDecoder.decode(username, "UTF-8");
        logger.info(" Username decodificado: [{}]", decodedUsername);
        
        Optional<User> user = userService.findByUsername(decodedUsername);
        if(user.isEmpty()){
            logger.warn(" Usuario no encontrado: [{}]", decodedUsername);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                    "error", "Usuario no encontrado", 
                    "username", decodedUsername
                ));
        }
        
        User u = user.get();
        u.setPassword(null); // No devolver el password
        
        logger.info(" Perfil público encontrado para: [{}]", decodedUsername);
        return ResponseEntity.ok(u);
        
    } catch (Exception e) {
        logger.error(" Error obteniendo perfil de [{}]: {}", username, e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of(
                "error", "Error interno del servidor", 
                "details", e.getMessage(),
                "username", username
            ));
    }
}

    // POST /api/users/tasks/deactivate-inactive - Endpoint para scheduler
    @PostMapping("/tasks/deactivate-inactive")
    public ResponseEntity<?> deactivateInactive(@RequestBody Map<String,Object> payload){
        try {
            logger.info("Tarea de desactivación ejecutada con payload: {}", payload);
            return ResponseEntity.ok(Map.of("result","ok","received",payload));
        } catch (Exception e) {
            logger.error("Error en tarea de desactivación: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error en tarea", "details", e.getMessage()));
        }
    }
}

