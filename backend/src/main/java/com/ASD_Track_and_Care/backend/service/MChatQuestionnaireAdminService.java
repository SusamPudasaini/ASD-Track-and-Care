package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.CreateMChatQuestionRequest;
import com.ASD_Track_and_Care.backend.dto.MChatQuestionResponseDto;
import com.ASD_Track_and_Care.backend.dto.UpdateMChatQuestionRequest;
import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireQuestion;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireQuestionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MChatQuestionnaireAdminService {

    private final MChatQuestionnaireQuestionRepository questionRepository;

    public MChatQuestionnaireAdminService(MChatQuestionnaireQuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    public MChatQuestionResponseDto create(CreateMChatQuestionRequest req) {
        MChatQuestionnaireQuestion q = new MChatQuestionnaireQuestion();
        q.setQuestionText(req.getQuestionText().trim());
        q.setCategory(req.getCategory());
        q.setAnswerType(req.getAnswerType());
        q.setWeight(req.getWeight());
        q.setReverseScored(Boolean.TRUE.equals(req.getReverseScored()));
        q.setActive(Boolean.TRUE.equals(req.getActive()));

        questionRepository.save(q);
        return toDto(q);
    }

    public List<MChatQuestionResponseDto> getAll() {
        return questionRepository.findAllByOrderByIdAsc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public MChatQuestionResponseDto update(Long id, UpdateMChatQuestionRequest req) {
        MChatQuestionnaireQuestion q = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        q.setQuestionText(req.getQuestionText().trim());
        q.setCategory(req.getCategory());
        q.setAnswerType(req.getAnswerType());
        q.setWeight(req.getWeight());
        q.setReverseScored(Boolean.TRUE.equals(req.getReverseScored()));
        q.setActive(Boolean.TRUE.equals(req.getActive()));

        questionRepository.save(q);
        return toDto(q);
    }

    public MChatQuestionResponseDto toggleActive(Long id, boolean active) {
        MChatQuestionnaireQuestion q = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        q.setActive(active);
        questionRepository.save(q);
        return toDto(q);
    }

    private MChatQuestionResponseDto toDto(MChatQuestionnaireQuestion q) {
        MChatQuestionResponseDto dto = new MChatQuestionResponseDto();
        dto.setId(q.getId());
        dto.setQuestionText(q.getQuestionText());
        dto.setCategory(q.getCategory());
        dto.setAnswerType(q.getAnswerType());
        dto.setWeight(q.getWeight());
        dto.setActive(q.isActive());
        dto.setReverseScored(q.isReverseScored());
        return dto;
    }
}