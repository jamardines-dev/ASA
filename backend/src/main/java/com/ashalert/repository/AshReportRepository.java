package com.ashalert.repository;

import com.ashalert.model.AshReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface AshReportRepository extends JpaRepository<AshReport, Long> {
    List<AshReport> findByReportedAtAfter(Instant since);
}
