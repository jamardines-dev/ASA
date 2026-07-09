package com.ashalert.service;

import com.ashalert.dto.AreaStatusDto;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** Holds connected SSE clients and pushes the full area list to all of them on change. */
@Component
public class AreaUpdateBroadcaster {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        return emitter;
    }

    public void broadcast(List<AreaStatusDto> areas) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("areas").data(areas));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }
}
