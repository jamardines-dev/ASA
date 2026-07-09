package com.ashalert.repository;

import com.ashalert.model.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AreaRepository extends JpaRepository<Area, Long> {
    Optional<Area> findByNameIgnoreCase(String name);
}
