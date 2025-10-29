package com.example.userservice.controller;

import com.example.userservice.model.User;
import com.example.userservice.service.UserService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class ExtraUserController {
    private final UserService userService;

    public ExtraUserController(UserService userService) {
        this.userService = userService;
    }

    @PutMapping("/{id}/role")
    public User updateRole(@PathVariable String id, @RequestBody User updates) {
        Optional<User> user = userService.findById(id);
        if(user.isEmpty()) return null;
        User u = user.get();
        u.setRole(updates.getRole());
        return userService.updateUser(u.getId(), u);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();
    }
}
