package com.ashalert.config;

import com.ashalert.model.Area;
import com.ashalert.model.SafetyStatus;
import com.ashalert.repository.AreaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

import static com.ashalert.model.SafetyStatus.CAUTION;
import static com.ashalert.model.SafetyStatus.SAFE;
import static com.ashalert.model.SafetyStatus.UNSAFE;

/**
 * Seeds every city and municipality in Cebu province. Statuses reflect the
 * July 9, 2026 Kanlaon ashfall advisories as a starting point — southwestern
 * coastal towns facing Negros (across the strait from Kanlaon) got the worst
 * of it, Metro Cebu is moderate, and the northern mainland + Bantayan/Camotes
 * island groups are largely clear. Update through the admin endpoint as new
 * advisories come in.
 */
@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedAreas(AreaRepository repo) {
        return args -> {
            if (repo.count() > 0) return;
            repo.saveAll(List.of(
                    // Metro Cebu
                    area("Cebu City", 10.3157, 123.8854, CAUTION, "LGU advisory — classes suspended"),
                    area("Mandaue City", 10.3236, 123.9223, CAUTION, "LGU advisory — classes suspended"),
                    area("Lapu-Lapu City", 10.3103, 123.9494, CAUTION, "Blue alert status"),
                    area("Talisay City", 10.2447, 123.8494, CAUTION, "LGU advisory — classes suspended"),
                    area("Minglanilla", 10.2453, 123.7964, CAUTION, "Reported ashfall"),
                    area("Consolacion", 10.3766, 123.9573, CAUTION, "LGU advisory"),
                    area("Cordova", 10.2532, 123.9494, CAUTION, "LGU advisory"),
                    area("Liloan", 10.4000, 123.9833, CAUTION, "LGU advisory"),
                    area("Compostela", 10.4500, 124.0000, CAUTION, "Adjacent to affected areas"),

                    // Southwestern coast — closest to Kanlaon, worst hit
                    area("Toledo City", 10.3773, 123.6386, UNSAFE, "LGU advisory — classes and work suspended"),
                    area("Pinamungajan", 10.2703, 123.5836, UNSAFE, "Provincial advisory — confirmed ashfall"),
                    area("Aloguinsan", 10.2225, 123.5486, UNSAFE, "Provincial advisory — confirmed ashfall"),
                    area("Barili", 10.1147, 123.5261, UNSAFE, "Provincial advisory — confirmed ashfall"),
                    area("Dumanjug", 10.1667, 123.4667, UNSAFE, "Provincial advisory — confirmed ashfall"),
                    area("Ronda", 9.9833, 123.4667, UNSAFE, "Provincial advisory — confirmed ashfall"),
                    area("Alcantara", 9.8657, 123.4230, UNSAFE, "Provincial advisory — confirmed ashfall"),
                    area("Moalboal", 9.9500, 123.3833, UNSAFE, "Provincial advisory — heavy ashfall"),
                    area("Badian", 9.8667, 123.3958, UNSAFE, "Provincial advisory — heavy ashfall"),
                    area("Alegria", 9.7333, 123.3833, UNSAFE, "Provincial advisory — heavy ashfall"),
                    area("Malabuyoc", 9.6167, 123.3167, UNSAFE, "Provincial advisory — heavy ashfall"),
                    area("Ginatilan", 9.5667, 123.2167, UNSAFE, "Provincial advisory — heavy ashfall"),
                    area("Samboan", 9.5000, 123.2000, UNSAFE, "Provincial advisory — heavy ashfall, ferry crossing to Negros closed"),
                    area("Santander", 9.4000, 123.3167, UNSAFE, "Provincial advisory — heavy ashfall, ferry crossing to Negros closed"),
                    area("Oslob", 9.4667, 123.3833, UNSAFE, "Provincial advisory — heavy ashfall"),

                    // Southeastern coast — moderate
                    area("Argao", 9.8797, 123.6083, CAUTION, "Reported ashfall"),
                    area("Dalaguete", 9.7667, 123.5333, CAUTION, "Reported ashfall"),
                    area("Boljoon", 9.6167, 123.4667, CAUTION, "Reported ashfall"),
                    area("Alcoy", 9.7167, 123.5167, CAUTION, "Reported ashfall"),
                    area("Sibonga", 10.0333, 123.5833, CAUTION, "Reported ashfall"),
                    area("Carcar City", 10.1064, 123.6403, CAUTION, "Reported ashfall"),
                    area("San Fernando", 10.2333, 123.7167, CAUTION, "Reported ashfall"),
                    area("Naga City", 10.2090, 123.7580, CAUTION, "Adjacent to affected areas"),

                    // Central/western mainland — light
                    area("Balamban", 10.5062, 123.7147, CAUTION, "Reported ashfall"),
                    area("Asturias", 10.5679, 123.7178, CAUTION, "LGU advisory"),
                    area("Tuburan", 10.7167, 123.8167, CAUTION, "Reported ashfall"),
                    area("Tabuelan", 10.8317, 123.8666, CAUTION, "Reported ashfall"),

                    // Northern mainland — clear
                    area("Danao City", 10.5289, 124.0272, SAFE, "No reports"),
                    area("Carmen", 10.5833, 124.0167, SAFE, "No reports"),
                    area("Catmon", 10.6939, 124.0083, SAFE, "No reports"),
                    area("Borbon", 10.8500, 124.0000, SAFE, "No reports"),
                    area("Sogod", 10.7500, 124.0167, SAFE, "No reports"),
                    area("Tabogon", 10.9333, 124.0167, SAFE, "No reports"),
                    area("San Remigio", 11.0833, 123.9333, SAFE, "No reports"),
                    area("Bogo City", 11.0517, 124.0058, SAFE, "No reports"),
                    area("Medellin", 11.1333, 123.9667, SAFE, "No reports"),
                    area("Daanbantayan", 11.2500, 124.0000, SAFE, "No reports"),

                    // Bantayan island group — clear
                    area("Bantayan", 11.1667, 123.7167, SAFE, "No reports"),
                    area("Madridejos", 11.2833, 123.7333, SAFE, "No reports"),
                    area("Santa Fe", 11.2667, 123.8167, SAFE, "No reports"),

                    // Camotes island group — clear
                    area("Poro", 10.6167, 124.4000, SAFE, "No reports"),
                    area("Pilar", 10.6667, 124.4167, SAFE, "No reports"),
                    area("San Francisco", 10.6167, 124.3333, SAFE, "No reports"),
                    area("Tudela", 10.7833, 124.4167, SAFE, "No reports")
            ));
        };
    }

    private Area area(String name, double lat, double lng, SafetyStatus status, String source) {
        return Area.builder()
                .name(name)
                .latitude(lat)
                .longitude(lng)
                .status(status)
                .source(source)
                .build();
    }
}
