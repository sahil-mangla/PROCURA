package com.procura;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procura.common.enums.Role;
import com.procura.department.Department;
import com.procura.department.DepartmentRepository;
import com.procura.security.JwtService;
import com.procura.user.AppUser;
import com.procura.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected DepartmentRepository departmentRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected JwtService jwtService;

    @Autowired
    protected com.procura.procurement.PurchaseRequestRepository purchaseRequestRepository;

    protected void waitForAiAnalysis(String prId) throws InterruptedException {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < 3000) {
            var pr = purchaseRequestRepository.findById(prId).orElse(null);
            if (pr != null && pr.getAiStatus() != com.procura.common.enums.AiStatus.PENDING) {
                return;
            }
            Thread.sleep(50);
        }
    }

    protected AppUser requesterUser;
    protected AppUser deptHeadUser;
    protected AppUser financeUser;
    protected AppUser adminUser;
    protected Department engineeringDept;

    protected String requesterToken;
    protected String deptHeadToken;
    protected String financeToken;
    protected String adminToken;

    @BeforeEach
    void setupBaseUsers() {
        if (engineeringDept == null) {
            engineeringDept = departmentRepository.findByName("Engineering")
                    .orElseGet(() -> departmentRepository.save(new Department(null, "Engineering")));
        }

        if (requesterUser == null) {
            requesterUser = userRepository.findByEmail("test.requester@procura.local").orElseGet(() -> {
                AppUser u = new AppUser();
                u.setName("Test Requester");
                u.setEmail("test.requester@procura.local");
                u.setPasswordHash(passwordEncoder.encode("password123"));
                u.setRole(Role.REQUESTER);
                u.setDepartment(engineeringDept);
                u.setActive(true);
                return userRepository.save(u);
            });
        }

        if (deptHeadUser == null) {
            deptHeadUser = userRepository.findByEmail("test.depthead@procura.local").orElseGet(() -> {
                AppUser u = new AppUser();
                u.setName("Test Dept Head");
                u.setEmail("test.depthead@procura.local");
                u.setPasswordHash(passwordEncoder.encode("password123"));
                u.setRole(Role.DEPARTMENT_HEAD);
                u.setDepartment(engineeringDept);
                u.setActive(true);
                return userRepository.save(u);
            });
            engineeringDept.setHeadUser(deptHeadUser);
            departmentRepository.save(engineeringDept);
        }

        if (financeUser == null) {
            financeUser = userRepository.findByEmail("test.finance@procura.local").orElseGet(() -> {
                AppUser u = new AppUser();
                u.setName("Test Finance");
                u.setEmail("test.finance@procura.local");
                u.setPasswordHash(passwordEncoder.encode("password123"));
                u.setRole(Role.FINANCE_MANAGER);
                u.setActive(true);
                return userRepository.save(u);
            });
        }

        if (adminUser == null) {
            adminUser = userRepository.findByEmail("test.admin@procura.local").orElseGet(() -> {
                AppUser u = new AppUser();
                u.setName("Test Admin");
                u.setEmail("test.admin@procura.local");
                u.setPasswordHash(passwordEncoder.encode("password123"));
                u.setRole(Role.ADMIN);
                u.setActive(true);
                return userRepository.save(u);
            });
        }

        requesterToken = jwtService.generateToken(requesterUser);
        deptHeadToken = jwtService.generateToken(deptHeadUser);
        financeToken = jwtService.generateToken(financeUser);
        adminToken = jwtService.generateToken(adminUser);
    }
}
