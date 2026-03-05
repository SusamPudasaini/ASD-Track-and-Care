package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.MChatQuestionResponseDto;
import com.ASD_Track_and_Care.backend.dto.MChatSubmissionHistoryDto;
import com.ASD_Track_and_Care.backend.dto.SubmitMChatQuestionAnswerRequest;
import com.ASD_Track_and_Care.backend.dto.SubmitMChatQuestionnaireRequest;
import com.ASD_Track_and_Care.backend.model.*;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireAnswerRepository;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireQuestionRepository;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireSubmissionRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MChatQuestionnaireService {

    private final MChatQuestionnaireQuestionRepository questionRepository;
    private final MChatQuestionnaireSubmissionRepository submissionRepository;
    private final MChatQuestionnaireAnswerRepository answerRepository;
    private final UserRepository userRepository;

    public MChatQuestionnaireService(
            MChatQuestionnaireQuestionRepository questionRepository,
            MChatQuestionnaireSubmissionRepository submissionRepository,
            MChatQuestionnaireAnswerRepository answerRepository,
            UserRepository userRepository
    ) {
        this.questionRepository = questionRepository;
        this.submissionRepository = submissionRepository;
        this.answerRepository = answerRepository;
        this.userRepository = userRepository;
    }

    public List<MChatQuestionResponseDto> getActiveQuestions() {
        return questionRepository.findAllByActiveTrueOrderByIdAsc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public MChatSubmissionHistoryDto submit(Authentication authentication, SubmitMChatQuestionnaireRequest req) {
        User user = requireUser(authentication);

        List<MChatQuestionnaireQuestion> activeQuestions = questionRepository.findAllByActiveTrueOrderByIdAsc();
        if (activeQuestions.isEmpty()) {
            throw new RuntimeException("No active M-CHAT questions available.");
        }

        Map<Long, MChatQuestionnaireQuestion> questionMap = new HashMap<>();
        for (MChatQuestionnaireQuestion q : activeQuestions) {
            questionMap.put(q.getId(), q);
        }

        if (req.getAnswers() == null || req.getAnswers().isEmpty()) {
            throw new RuntimeException("Answers are required.");
        }

        if (req.getAnswers().size() != activeQuestions.size()) {
            throw new RuntimeException("Please answer all active questions.");
        }

        Set<Long> seen = new HashSet<>();
        int totalDevelopment = 0;
        int totalConcern = 0;
        int maxPossible = 0;

        MChatQuestionnaireSubmission submission = new MChatQuestionnaireSubmission();
        submission.setUser(user);
        submission.setNotes(req.getNotes());
        submissionRepository.save(submission);

        for (SubmitMChatQuestionAnswerRequest a : req.getAnswers()) {
            if (a.getQuestionId() == null || !seen.add(a.getQuestionId())) {
                throw new RuntimeException("Duplicate or invalid question id in answers.");
            }

            MChatQuestionnaireQuestion question = questionMap.get(a.getQuestionId());
            if (question == null) {
                throw new RuntimeException("Question not found or inactive: " + a.getQuestionId());
            }

            int rawScore = mapAnswerToScore(question.getAnswerType(), a.getAnswerValue());
            int devBase = question.isReverseScored() ? reverseScore(question.getAnswerType(), rawScore) : rawScore;
            int concernBase = concernScore(question.getAnswerType(), devBase);

            int weightedDev = devBase * question.getWeight();
            int weightedConcern = concernBase * question.getWeight();

            MChatQuestionnaireAnswer answer = new MChatQuestionnaireAnswer();
            answer.setSubmission(submission);
            answer.setQuestion(question);
            answer.setAnswerValue(normalizeAnswerText(a.getAnswerValue()));
            answer.setRawScore(rawScore);
            answer.setWeightedDevelopmentScore(weightedDev);
            answer.setWeightedConcernScore(weightedConcern);
            answerRepository.save(answer);

            totalDevelopment += weightedDev;
            totalConcern += weightedConcern;
            maxPossible += maxScoreForType(question.getAnswerType()) * question.getWeight();
        }

        double normalizedDevelopment = maxPossible == 0 ? 0.0 : round2((totalDevelopment * 100.0) / maxPossible);
        double normalizedConcern = maxPossible == 0 ? 0.0 : round2((totalConcern * 100.0) / maxPossible);

        submission.setDevelopmentScore((double) totalDevelopment);
        submission.setConcernScore((double) totalConcern);
        submission.setNormalizedDevelopmentScore(normalizedDevelopment);
        submission.setNormalizedConcernScore(normalizedConcern);
        submission.setRiskLevel(resolveRiskLevel(normalizedConcern));
        submissionRepository.save(submission);

        return toHistoryDto(submission);
    }

    public List<MChatSubmissionHistoryDto> myHistory(Authentication authentication) {
        User user = requireUser(authentication);
        return submissionRepository.findAllByUserOrderBySubmittedAtDesc(user)
                .stream()
                .map(this::toHistoryDto)
                .toList();
    }

    private User requireUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }
        String name = auth.getName();

        return userRepository.findByUsername(name)
                .or(() -> userRepository.findByUserEmail(name))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private int mapAnswerToScore(MChatQuestionAnswerType type, String answer) {
        String v = normalizeAnswerText(answer);

        if (type == MChatQuestionAnswerType.YES_NO) {
            return switch (v) {
                case "YES" -> 1;
                case "NO" -> 0;
                default -> throw new RuntimeException("Invalid YES_NO answer: " + answer);
            };
        }

        if (type == MChatQuestionAnswerType.SCALE_5) {
            return switch (v) {
                case "NEVER" -> 0;
                case "RARELY" -> 1;
                case "SOMETIMES" -> 2;
                case "OFTEN" -> 3;
                case "ALWAYS" -> 4;
                default -> throw new RuntimeException("Invalid SCALE_5 answer: " + answer);
            };
        }

        throw new RuntimeException("Unsupported answer type");
    }

    private int reverseScore(MChatQuestionAnswerType type, int raw) {
        return maxScoreForType(type) - raw;
    }

    private int concernScore(MChatQuestionAnswerType type, int developmentScore) {
        return maxScoreForType(type) - developmentScore;
    }

    private int maxScoreForType(MChatQuestionAnswerType type) {
        return type == MChatQuestionAnswerType.YES_NO ? 1 : 4;
    }

    private String normalizeAnswerText(String v) {
        return v == null ? "" : v.trim().toUpperCase(Locale.ROOT);
    }

    private MChatRiskLevel resolveRiskLevel(double normalizedConcern) {
        if (normalizedConcern >= 67) return MChatRiskLevel.HIGH;
        if (normalizedConcern >= 34) return MChatRiskLevel.MODERATE;
        return MChatRiskLevel.LOW;
    }

    private double round2(double x) {
        return Math.round(x * 100.0) / 100.0;
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

    private MChatSubmissionHistoryDto toHistoryDto(MChatQuestionnaireSubmission s) {
        MChatSubmissionHistoryDto dto = new MChatSubmissionHistoryDto();
        dto.setId(s.getId());
        dto.setDevelopmentScore(s.getDevelopmentScore());
        dto.setConcernScore(s.getConcernScore());
        dto.setNormalizedDevelopmentScore(s.getNormalizedDevelopmentScore());
        dto.setNormalizedConcernScore(s.getNormalizedConcernScore());
        dto.setRiskLevel(s.getRiskLevel());
        dto.setNotes(s.getNotes());
        dto.setSubmittedAt(s.getSubmittedAt());
        return dto;
    }
}