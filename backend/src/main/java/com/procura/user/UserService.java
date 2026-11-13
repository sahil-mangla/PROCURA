package com.procura.user;

import com.procura.common.dto.PagedResponse;
import com.procura.common.error.Exceptions;
import com.procura.department.Department;
import com.procura.department.DepartmentRepository;
import com.procura.user.dto.UserDto;
import com.procura.user.dto.UserInputDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserDto> listUsers(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AppUser> userPage = userRepository.findAll(pageable);
        List<UserDto> items = userPage.getContent().stream()
                .map(UserDto::fromEntity)
                .toList();
        return PagedResponse.of(page, size, userPage.getTotalElements(), items);
    }

    @Transactional
    public UserDto createUser(UserInputDto input) {
        if (userRepository.existsByEmail(input.email())) {
            throw new Exceptions.ValidationException("A user with email " + input.email() + " already exists.");
        }

        AppUser user = new AppUser();
        user.setName(input.name());
        user.setEmail(input.email());
        user.setRole(input.role());
        user.setPasswordHash(passwordEncoder.encode(input.password()));
        user.setActive(true);

        if (input.departmentId() != null) {
            Department department = departmentRepository.findById(input.departmentId())
                    .orElseThrow(() -> new Exceptions.NotFoundException("Department not found with id: " + input.departmentId()));
            user.setDepartment(department);
        }

        AppUser saved = userRepository.save(user);
        return UserDto.fromEntity(saved);
    }
}

