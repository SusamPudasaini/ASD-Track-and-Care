package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.MChatAnalyticsResponse;
import com.ASD_Track_and_Care.backend.dto.MChatCategoryScoreDto;
import com.ASD_Track_and_Care.backend.dto.MChatTrendPointDto;
import com.ASD_Track_and_Care.backend.model.MChatQuestionAnswerType;
import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireAnswer;
import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireSubmission;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireAnswerRepository;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireSubmissionRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MChatQuestionnaireAnalyticsService {

    private final MChatQuestionnaireSubmissionRepository submissionRepository;
    private final MChatQuestionnaireAnswerRepository answerRepository;
    private final UserRepository userRepository;

    public MChatQuestionnaireAnalyticsService(
            MChatQuestionnaireSubmissionRepository submissionRepository,
            MChatQuestionnaireAnswerRepository answerRepository,
            UserRepository userRepository
    ) {
        this.submissionRepository = submissionRepository;
        this.answerRepository = answerRepository;
        this.userRepository = userRepository;
    }

    public MChatAnalyticsResponse getMyAnalytics(Authentication authentication) {
        User user = requireUser(authentication);
        List<MChatQuestionnaireSubmission> submissions = submissionRepository.findAllByUserOrderBySubmittedAtDesc(user);

        MChatAnalyticsResponse res = new MChatAnalyticsResponse();
        res.setTotalSubmissions(submissions.size());

        if (submissions.isEmpty()) {
            res.setLatestDevelopmentScore(0.0);
            res.setLatestConcernScore(0.0);
            res.setPreviousDevelopmentScore(null);
            res.setPreviousConcernScore(null);
            res.setImprovementDelta(null);
            res.setLatestRiskLevel(null);
            res.setTrends(List.of());
            res.setCategories(List.of());
            return res;
        }

        MChatQuestionnaireSubmission latest = submissions.get(0);
        MChatQuestionnaireSubmission previous = submissions.size() > 1 ? submissions.get(1) : null;

        res.setLatestDevelopmentScore(latest.getNormalizedDevelopmentScore());
        res.setLatestConcernScore(latest.getNormalizedConcernScore());
        res.setLatestRiskLevel(latest.getRiskLevel());

        if (previous != null) {
            res.setPreviousDevelopmentScore(previous.getNormalizedDevelopmentScore());
            res.setPreviousConcernScore(previous.getNormalizedConcernScore());
            res.setImprovementDelta(round2(
                    latest.getNormalizedDevelopmentScore() - previous.getNormalizedDevelopmentScore()
            ));
        }

        List<MChatTrendPointDto> trends = new ArrayList<>();
        List<MChatQuestionnaireSubmission> asc = new ArrayList<>(submissions);
        Collections.reverse(asc);

        for (MChatQuestionnaireSubmission s : asc) {
            trends.add(new MChatTrendPointDto(
                    s.getSubmittedAt().toString(),
                    s.getNormalizedDevelopmentScore(),
                    s.getNormalizedConcernScore()
            ));
        }
        res.setTrends(trends);

        List<MChatQuestionnaireAnswer> latestAnswers = answerRepository.findAllBySubmission(latest);
        Map<String, int[]> categoryMap = new LinkedHashMap<>();

        for (MChatQuestionnaireAnswer a : latestAnswers) {
            String category = a.getQuestion().getCategory().name();
            int[] arr = categoryMap.computeIfAbsent(category, k -> new int[]{0, 0, 0});

            arr[0] += a.getWeightedDevelopmentScore();
            arr[1] += a.getWeightedConcernScore();

            int max = a.getQuestion().getAnswerType() == MChatQuestionAnswerType.YES_NO ? 1 : 4;
            arr[2] += a.getQuestion().getWeight() * max;
        }

        List<MChatCategoryScoreDto> categories = new ArrayList<>();
        for (Map.Entry<String, int[]> e : categoryMap.entrySet()) {
            int[] arr = e.getValue();

            double dev = arr[2] == 0 ? 0.0 : round2(arr[0] * 100.0 / arr[2]);
            double concern = arr[2] == 0 ? 0.0 : round2(arr[1] * 100.0 / arr[2]);

            categories.add(new MChatCategoryScoreDto(e.getKey(), dev, concern));
        }

        res.setCategories(categories);
        return res;
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

    private double round2(double x) {
        return Math.round(x * 100.0) / 100.0;
    }
}