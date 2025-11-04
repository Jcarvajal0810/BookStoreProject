package com.example.userservice.grpc;

import com.example.userservice.model.User;
import com.example.userservice.repository.UserRepository;
import com.example.userservice.service.UserService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Optional;

@GrpcService
public class UserGrpcService extends UserServiceGrpc.UserServiceImplBase {
    
    private static final Logger logger = LoggerFactory.getLogger(UserGrpcService.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserService userService;
    
    /**
     * GetUserData - Obtener datos del usuario (llamado por OrderService)
     */
    @Override
    public void getUserData(UserRequest request, StreamObserver<UserResponse> responseObserver) {
        try {
            String userId = request.getUserId();
            logger.info("[gRPC User] GetUserData solicitado para user_id: {}", userId);
            
            Optional<User> userOpt = userRepository.findById(userId);
            
            if (userOpt.isEmpty()) {
                logger.warn("[gRPC User] Usuario no encontrado: {}", userId);
                responseObserver.onError(
                    Status.NOT_FOUND
                        .withDescription("Usuario no encontrado: " + userId)
                        .asRuntimeException()
                );
                return;
            }
            
            User user = userOpt.get();
            
            UserResponse response = UserResponse.newBuilder()
                .setUserId(user.getId())
                .setUsername(user.getUsername() != null ? user.getUsername() : "")
                .setEmail(user.getEmail() != null ? user.getEmail() : "")
                .setAddress(user.getAddress() != null ? user.getAddress() : "")
                .setPhone(user.getPhone() != null ? user.getPhone() : "")
                .setRole(user.getRole() != null ? user.getRole() : "USER")
                .build();
            
            logger.info("[gRPC User]  Usuario encontrado: {} ({})", user.getUsername(), user.getEmail());
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            logger.error("[gRPC User]  Error en GetUserData", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Error interno: " + e.getMessage())
                    .asRuntimeException()
            );
        }
    }
    
    /**
     * ValidateUser - Validar credenciales
     */
    @Override
    public void validateUser(ValidateUserRequest request, StreamObserver<ValidateUserResponse> responseObserver) {
        try {
            String username = request.getUsername();
            String password = request.getPassword();
            
            logger.info("[gRPC User] ValidateUser solicitado para username: {}", username);
            
            Optional<User> userOpt = userService.findByUsername(username);
            
            if (userOpt.isEmpty()) {
                logger.warn("[gRPC User] Usuario no encontrado: {}", username);
                ValidateUserResponse response = ValidateUserResponse.newBuilder()
                    .setValid(false)
                    .setMessage("Usuario no encontrado")
                    .build();
                responseObserver.onNext(response);
                responseObserver.onCompleted();
                return;
            }
            
            User user = userOpt.get();
            
            // Validar password usando el servicio existente
            boolean passwordMatch = userService.checkPassword(password, user.getPassword());
            
            if (!passwordMatch) {
                logger.warn("[gRPC User] Contraseña incorrecta para: {}", username);
                ValidateUserResponse response = ValidateUserResponse.newBuilder()
                    .setValid(false)
                    .setMessage("Contraseña incorrecta")
                    .build();
                responseObserver.onNext(response);
                responseObserver.onCompleted();
                return;
            }
            
            logger.info("[gRPC User]  Usuario validado: {}", username);
            ValidateUserResponse response = ValidateUserResponse.newBuilder()
                .setValid(true)
                .setUserId(user.getId())
                .setUsername(user.getUsername())
                .setMessage("Usuario validado exitosamente")
                .build();
            
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            logger.error("[gRPC User]  Error en ValidateUser", e);
            responseObserver.onError(
                Status.INTERNAL
                    .withDescription("Error interno: " + e.getMessage())
                    .asRuntimeException()
            );
        }
    }
}