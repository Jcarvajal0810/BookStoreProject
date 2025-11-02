package com.example.userservice.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;

    // ✅ Acepta jwt.secret o JWT_SECRET (ambos válidos)
    public JwtUtil(@Value("${jwt.secret:${JWT_SECRET:}}") String jwtSecret) {
        try {
            if (jwtSecret == null || jwtSecret.isBlank()) {
                System.out.println("⚠️ Advertencia: No se encontró JWT_SECRET. Se generará una clave temporal.");
                this.key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
            } else {
                byte[] decodedKey = Decoders.BASE64.decode(jwtSecret);
                this.key = Keys.hmacShaKeyFor(decodedKey);
            }
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("❌ Error: JWT_SECRET no es un valor Base64 válido.", e);
        }
    }

    public String generateToken(String subject) {
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 24 horas
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
