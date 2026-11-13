package com.procura;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordHashTest {

    @Test
    void testPasswordHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("password123");
        System.out.println("BCRYPT_HASH_FOR_PASSWORD123: " + hash);
        assertTrue(encoder.matches("password123", hash));
    }
}

