package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.ChildRecommendationResponse;
import com.ASD_Track_and_Care.backend.model.DayCareCenter;
import com.ASD_Track_and_Care.backend.model.DayCareCategory;
import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireSubmission;
import com.ASD_Track_and_Care.backend.model.MChatQuestionCategory;
import com.ASD_Track_and_Care.backend.model.MChatQuestionnaireAnswer;
import com.ASD_Track_and_Care.backend.model.QuestionnaireRecord;
import com.ASD_Track_and_Care.backend.model.ResourceCategory;
import com.ASD_Track_and_Care.backend.model.ResourceHubItem;
import com.ASD_Track_and_Care.backend.model.Role;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.DayCareCenterRepository;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireSubmissionRepository;
import com.ASD_Track_and_Care.backend.repository.MChatQuestionnaireAnswerRepository;
import com.ASD_Track_and_Care.backend.repository.QuestionnaireRecordRepository;
import com.ASD_Track_and_Care.backend.repository.ResourceHubItemRepository;
import com.ASD_Track_and_Care.backend.repository.TherapistTimeSlotRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ChildRecommendationService {

    private final UserRepository userRepository;
    private final QuestionnaireRecordRepository questionnaireRecordRepository;
    private final MChatQuestionnaireSubmissionRepository mchatSubmissionRepository;
    private final MChatQuestionnaireAnswerRepository mchatAnswerRepository;
    private final TherapistTimeSlotRepository therapistTimeSlotRepository;
    private final DayCareCenterRepository dayCareCenterRepository;
    private final ResourceHubItemRepository resourceHubItemRepository;
    private final AddressGeocodingService addressGeocodingService;

    public ChildRecommendationService(
            UserRepository userRepository,
            QuestionnaireRecordRepository questionnaireRecordRepository,
            MChatQuestionnaireSubmissionRepository mchatSubmissionRepository,
            MChatQuestionnaireAnswerRepository mchatAnswerRepository,
            TherapistTimeSlotRepository therapistTimeSlotRepository,
            DayCareCenterRepository dayCareCenterRepository,
            ResourceHubItemRepository resourceHubItemRepository,
            AddressGeocodingService addressGeocodingService
    ) {
        this.userRepository = userRepository;
        this.questionnaireRecordRepository = questionnaireRecordRepository;
        this.mchatSubmissionRepository = mchatSubmissionRepository;
        this.mchatAnswerRepository = mchatAnswerRepository;
        this.therapistTimeSlotRepository = therapistTimeSlotRepository;
        this.dayCareCenterRepository = dayCareCenterRepository;
        this.resourceHubItemRepository = resourceHubItemRepository;
        this.addressGeocodingService = addressGeocodingService;
    }

    public ChildRecommendationResponse getMyRecommendations(Authentication authentication) {
        User user = requireUser(authentication);

        Optional<QuestionnaireRecord> aiLast = questionnaireRecordRepository
                .findTopByUser_IdOrderByIdDesc(user.getId());
        Optional<MChatQuestionnaireSubmission> mchatLast = mchatSubmissionRepository
                .findTopByUserOrderBySubmittedAtDesc(user);

        double aiScore = aiLast.map(x -> (x.getProbability() == null ? 0.0 : x.getProbability()) * 100.0).orElse(0.0);
        double mchatScore = mchatLast.map(x -> x.getNormalizedConcernScore() == null ? 0.0 : x.getNormalizedConcernScore()).orElse(0.0);

        double combined;
        if (aiLast.isPresent() && mchatLast.isPresent()) {
            combined = round2((aiScore * 0.6) + (mchatScore * 0.4));
        } else if (aiLast.isPresent()) {
            combined = round2(aiScore);
        } else {
            combined = round2(mchatScore);
        }

        String combinedRisk = resolveRisk(combined);
        List<MChatQuestionCategory> weakCategories = mchatLast
            .map(this::resolveWeakCategories)
            .orElse(List.of());

        Map<String, Object> riskSummary = new LinkedHashMap<>();
        riskSummary.put("aiRiskLevel", aiLast.map(QuestionnaireRecord::getRiskLevel).orElse(null));
        riskSummary.put("aiProbabilityPercent", round2(aiScore));
        riskSummary.put("mchatRiskLevel", mchatLast.map(x -> x.getRiskLevel() == null ? null : x.getRiskLevel().name()).orElse(null));
        riskSummary.put("mchatConcernPercent", round2(mchatScore));
        riskSummary.put("combinedRiskLevel", combinedRisk);
        riskSummary.put("combinedScore", combined);
        riskSummary.put("urgency", urgencyFor(combinedRisk));
        riskSummary.put("guidance", guidanceFor(combinedRisk));
        riskSummary.put(
                "weakAreas",
                weakCategories.stream().map(this::humanizeCategory).collect(Collectors.toList())
        );

        ChildRecommendationResponse response = new ChildRecommendationResponse();
        response.setRiskSummary(riskSummary);
        response.setRecommendedActivities(buildActivityRecommendations(combinedRisk, weakCategories));
        response.setRecommendedTherapists(buildTherapistRecommendations(user, combinedRisk, weakCategories));
        response.setRecommendedDayCareCenters(buildDayCareRecommendations(user, combinedRisk, weakCategories));
        response.setRecommendedResources(buildResourceRecommendations(combinedRisk, weakCategories));
        return response;
    }

    private List<Map<String, Object>> buildActivityRecommendations(String risk, List<MChatQuestionCategory> weakCategories) {
        List<Map<String, Object>> items = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (MChatQuestionCategory c : weakCategories) {
            switch (c) {
                case SENSORY -> {
                    addActivity(items, seen, "Sound Therapy", "/activities/sound-therapy", "Daily sensory regulation and calming practice.");
                    addActivity(items, seen, "Visual Memory", "/activities/visual-memory", "Visual attention and sensory integration support.");
                }
                case COMMUNICATION -> {
                    addActivity(items, seen, "AAC Board", "/aac-board", "Build expressive communication using visual prompts.");
                    addActivity(items, seen, "First-Then Board", "/first-then", "Support structured communication and transitions.");
                }
                case PLAY -> {
                    addActivity(items, seen, "Matching & Sorting", "/activities/matching-sorting", "Improve play-based cognition and exploration.");
                    addActivity(items, seen, "Sequence Memory", "/activities/sequence-memory", "Enhance play sequencing and routine tolerance.");
                }
                case ATTENTION -> {
                    addActivity(items, seen, "Reaction Time", "/activities/reaction-time", "Train sustained focus and response control.");
                    addActivity(items, seen, "Number Memory", "/activities/number-memory", "Develop concentration and working memory.");
                }
                case SOCIAL_INTERACTION -> {
                    addActivity(items, seen, "First-Then Board", "/first-then", "Encourage social turn-taking through visual routines.");
                    addActivity(items, seen, "Visual Memory", "/activities/visual-memory", "Support social cue recognition.");
                }
                case BEHAVIOR -> {
                    addActivity(items, seen, "Matching & Sorting", "/activities/matching-sorting", "Promote self-regulation through structured tasks.");
                    addActivity(items, seen, "Reaction Time", "/activities/reaction-time", "Improve impulse control and task readiness.");
                }
            }
        }

        if ("HIGH".equals(risk)) {
            addActivity(items, seen, "Sound Therapy", "/activities/sound-therapy", "Daily 15-20 min parent-assisted sensory calming session");
            addActivity(items, seen, "Visual Memory", "/activities/visual-memory", "Strengthen attention and visual tracking");
            addActivity(items, seen, "Sequence Memory", "/activities/sequence-memory", "Improve processing and routine tolerance");
        } else if ("MODERATE".equals(risk)) {
            addActivity(items, seen, "Sound Therapy", "/activities/sound-therapy", "Build sensory regulation with short guided sessions");
            addActivity(items, seen, "Reaction Time", "/activities/reaction-time", "Improve attention and response control");
            addActivity(items, seen, "Visual Memory", "/activities/visual-memory", "Encourage pattern recognition and memory");
        } else {
            addActivity(items, seen, "Reaction Time", "/activities/reaction-time", "Maintain focus and response speed");
            addActivity(items, seen, "Sequence Memory", "/activities/sequence-memory", "Maintain cognitive flexibility");
            addActivity(items, seen, "Number Memory", "/activities/number-memory", "Improve working memory through gradual levels");
        }

        return items.stream().limit(8).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildTherapistRecommendations(User user, String risk, List<MChatQuestionCategory> weakCategories) {
        String userAddress = safe(user.getAddress());
        LocationPoint userPoint = resolveUserPoint(user);
        Double userLat = userPoint.latitude();
        Double userLon = userPoint.longitude();
        List<User> therapists = userRepository.findAllByRole(Role.THERAPIST);

        return therapists.stream()
                .map(t -> {
                    long slotCount = therapistTimeSlotRepository.countByTherapistId(t.getId());
                    double score = 0.0;
                    double review = t.getAverageReview() == null ? 0.0 : Math.max(0.0, Math.min(5.0, t.getAverageReview()));
                    int reviewCount = t.getReviewCount() == null ? 0 : Math.max(0, t.getReviewCount());
                    int exp = t.getExperienceYears() == null ? 0 : Math.max(0, t.getExperienceYears());
                    String therapistAddress = therapistDisplayAddress(t);
                    LocationPoint therapistPoint = resolveTherapistPoint(t, therapistAddress);
                    Double therapistLat = therapistPoint.latitude();
                    Double therapistLon = therapistPoint.longitude();
                    Double distanceKm = haversineKm(userLat, userLon, therapistLat, therapistLon);

                    score += proximityScore(distanceKm, 8.0, 40.0);
                    score += addressSimilarityScore(userAddress, safe(therapistAddress)) * 0.7;
                    score += qualificationScore(risk, safe(t.getQualification()));
                    score += weaknessFitScore(weakCategories, safe(t.getQualification()));
                    score += experienceScoreForRisk(risk, exp);
                    score += reviewScoreForRisk(risk, review, reviewCount);
                    score += Math.min(slotCount, 10) * 0.3;

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", t.getId());
                    row.put("name", (safe(t.getFirstName()) + " " + safe(t.getLastName())).trim());
                    row.put("qualification", t.getQualification());
                    row.put("experienceYears", exp);
                    row.put("averageReview", review);
                    row.put("reviewCount", reviewCount);
                    row.put("address", therapistAddress);
                    row.put("workplaceAddress", safe(t.getWorkplaceAddress()));
                    row.put("distanceKm", distanceKm == null ? null : round2(distanceKm));
                    row.put("profilePictureUrl", t.getProfilePictureUrl());
                    row.put("availableSlots", slotCount);
                    row.put("recommendationScore", round2(score));
                    row.put("priority", priorityFromScore(score));
                    return row;
                })
                .sorted(Comparator.comparingDouble((Map<String, Object> x) -> (double) x.get("recommendationScore")).reversed())
                .limit(6)
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildDayCareRecommendations(User user, String risk, List<MChatQuestionCategory> weakCategories) {
        String userAddress = safe(user.getAddress());
        LocationPoint userPoint = resolveUserPoint(user);
        Double userLat = userPoint.latitude();
        Double userLon = userPoint.longitude();

        return dayCareCenterRepository.findAllByPublishedTrueOrderByCreatedAtDesc().stream()
                .map(c -> {
                    double score = 0.0;
                    LocationPoint centerPoint = resolveCenterPoint(c);
                    Double distanceKm = haversineKm(userLat, userLon, centerPoint.latitude(), centerPoint.longitude());
                    score += proximityScore(distanceKm, 10.0, 50.0);
                    score += addressSimilarityScore(userAddress, safe(c.getAddress())) * 0.8;
                    score += categoryScoreForNeed(risk, c.getCategory(), weakCategories);
                    score += Math.max(c.getAverageRating() == null ? 0.0 : c.getAverageRating(), c.getGoogleRating() == null ? 0.0 : c.getGoogleRating());

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", c.getId());
                    row.put("name", c.getName());
                    row.put("address", c.getAddress());
                    row.put("category", c.getCategory() == null ? null : c.getCategory().name());
                    row.put("rating", c.getAverageRating());
                    row.put("distanceKm", distanceKm == null ? null : round2(distanceKm));
                    row.put("imageUrl", c.getImageUrl());
                    row.put("googleMapsUrl", c.getGoogleMapsUrl());
                    row.put("phone", c.getPhone());
                    row.put("recommendationScore", round2(score));
                    return row;
                })
                .sorted(Comparator.comparingDouble((Map<String, Object> x) -> (double) x.get("recommendationScore")).reversed())
                .limit(6)
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildResourceRecommendations(String risk, List<MChatQuestionCategory> weakCategories) {
        List<ResourceCategory> preferredCategories = new ArrayList<>();

        for (MChatQuestionCategory c : weakCategories) {
            switch (c) {
                case SENSORY -> {
                    preferredCategories.add(ResourceCategory.SENSORY);
                    preferredCategories.add(ResourceCategory.SENSORY_SUPPORT);
                }
                case COMMUNICATION -> preferredCategories.add(ResourceCategory.COMMUNICATION);
                case SOCIAL_INTERACTION -> {
                    preferredCategories.add(ResourceCategory.SOCIAL_INTERACTION);
                    preferredCategories.add(ResourceCategory.SOCIAL_SKILLS);
                }
                case BEHAVIOR -> {
                    preferredCategories.add(ResourceCategory.BEHAVIOR);
                    preferredCategories.add(ResourceCategory.BEHAVIOR_SUPPORT);
                }
                case ATTENTION -> {
                    preferredCategories.add(ResourceCategory.ATTENTION);
                    preferredCategories.add(ResourceCategory.HOME_ACTIVITIES);
                }
                case PLAY -> {
                    preferredCategories.add(ResourceCategory.PLAY);
                    preferredCategories.add(ResourceCategory.HOME_ACTIVITIES);
                }
            }
        }

        preferredCategories.addAll(switch (risk) {
            case "HIGH" -> List.of(
                    ResourceCategory.BEHAVIOR,
                    ResourceCategory.BEHAVIOR_SUPPORT,
                    ResourceCategory.SENSORY,
                    ResourceCategory.SENSORY_SUPPORT,
                    ResourceCategory.SOCIAL_INTERACTION,
                    ResourceCategory.SOCIAL_SKILLS
            );
            case "MODERATE" -> List.of(
                    ResourceCategory.PLAY,
                    ResourceCategory.ATTENTION,
                    ResourceCategory.HOME_ACTIVITIES,
                    ResourceCategory.COMMUNICATION,
                    ResourceCategory.SOCIAL_INTERACTION,
                    ResourceCategory.SOCIAL_SKILLS,
                    ResourceCategory.PARENT_GUIDANCE
            );
            default -> List.of(
                    ResourceCategory.PLAY,
                    ResourceCategory.ATTENTION,
                    ResourceCategory.HOME_ACTIVITIES,
                    ResourceCategory.COMMUNICATION,
                    ResourceCategory.SOCIAL_INTERACTION,
                    ResourceCategory.SOCIAL_SKILLS
            );
                });

        Set<ResourceCategory> pick = Set.copyOf(preferredCategories);

        return resourceHubItemRepository.findAllByPublishedTrueOrderByCreatedAtDesc().stream()
                .filter(x -> pick.contains(x.getCategory()))
                .map(this::resourceRow)
                .limit(8)
                .collect(Collectors.toList());
    }

    private Map<String, Object> resourceRow(ResourceHubItem x) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", x.getId());
        row.put("title", x.getTitle());
        row.put("description", x.getDescription());
        row.put("category", x.getCategory() == null ? null : x.getCategory().name());
        row.put("contentType", x.getContentType() == null ? null : x.getContentType().name());
        row.put("thumbnailUrl", x.getThumbnailUrl());
        return row;
    }

    private Map<String, Object> activity(String name, String route, String plan) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", name);
        row.put("route", route);
        row.put("plan", plan);
        return row;
    }

    private String resolveRisk(double score) {
        if (score >= 67.0) return "HIGH";
        if (score >= 34.0) return "MODERATE";
        return "LOW";
    }

    private String urgencyFor(String risk) {
        return switch (risk) {
            case "HIGH" -> "HIGH_URGENCY";
            case "MODERATE" -> "MEDIUM_URGENCY";
            default -> "LOW_URGENCY";
        };
    }

    private String guidanceFor(String risk) {
        return switch (risk) {
            case "HIGH" -> "Please seek a therapist or therapy center as soon as possible and follow a daily guided routine.";
            case "MODERATE" -> "A moderately experienced therapist and structured weekly plan is recommended.";
            default -> "Continue consistent activities at home and monitor progress regularly.";
        };
    }

    private String priorityFromScore(double score) {
        if (score >= 10.0) return "HIGH_MATCH";
        if (score >= 6.0) return "GOOD_MATCH";
        return "MATCH";
    }

    private double categoryScoreForNeed(String risk, DayCareCategory category, List<MChatQuestionCategory> weakCategories) {
        if (category == null) return 0.0;

        if (!weakCategories.isEmpty()) {
            double weaknessScore = 0.0;
            for (MChatQuestionCategory wc : weakCategories) {
                if (matchesNeedCategory(category, wc)) {
                    weaknessScore = Math.max(weaknessScore, 4.5);
                }
            }
            if (weaknessScore > 0) return weaknessScore;
        }

        if ("HIGH".equals(risk)) {
            if (category == DayCareCategory.THERAPY_CENTER) return 4.0;
            if (category == DayCareCategory.ASD_FRIENDLY || category == DayCareCategory.SPECIAL_NEEDS) return 3.0;
            if (category == DayCareCategory.EARLY_INTERVENTION) return 2.5;
            return 1.0;
        }

        if ("MODERATE".equals(risk)) {
            if (category == DayCareCategory.EARLY_INTERVENTION) return 3.5;
            if (category == DayCareCategory.ASD_FRIENDLY || category == DayCareCategory.THERAPY_CENTER) return 3.0;
            if (category == DayCareCategory.SPECIAL_NEEDS) return 2.5;
            return 1.0;
        }

        if (category == DayCareCategory.GENERAL) return 2.0;
        if (category == DayCareCategory.EARLY_INTERVENTION) return 2.5;
        return 1.5;
    }

    private boolean matchesNeedCategory(DayCareCategory category, MChatQuestionCategory need) {
        return switch (need) {
            case SENSORY -> category == DayCareCategory.SENSORY;
            case COMMUNICATION -> category == DayCareCategory.COMMUNICATION;
            case PLAY -> category == DayCareCategory.PLAY;
            case ATTENTION -> category == DayCareCategory.ATTENTION;
            case BEHAVIOR -> category == DayCareCategory.BEHAVIOR;
            case SOCIAL_INTERACTION -> category == DayCareCategory.SOCIAL_INTERACTION;
        };
    }

    private double weaknessFitScore(List<MChatQuestionCategory> weakCategories, String therapistProfileText) {
        if (weakCategories.isEmpty() || therapistProfileText.isBlank()) return 0.0;

        String text = therapistProfileText.toLowerCase(Locale.ROOT);
        double score = 0.0;

        for (MChatQuestionCategory c : weakCategories) {
            switch (c) {
                case SENSORY -> {
                    if (text.contains("sensory") || text.contains("occupational")) score += 1.8;
                }
                case COMMUNICATION -> {
                    if (text.contains("speech") || text.contains("communication") || text.contains("language")) score += 1.8;
                }
                case SOCIAL_INTERACTION -> {
                    if (text.contains("social") || text.contains("interaction") || text.contains("behavior")) score += 1.6;
                }
                case PLAY -> {
                    if (text.contains("play") || text.contains("child development")) score += 1.5;
                }
                case ATTENTION -> {
                    if (text.contains("attention") || text.contains("adhd") || text.contains("focus")) score += 1.5;
                }
                case BEHAVIOR -> {
                    if (text.contains("behavior") || text.contains("aba")) score += 1.8;
                }
            }
        }

        return score;
    }

    private List<MChatQuestionCategory> resolveWeakCategories(MChatQuestionnaireSubmission submission) {
        List<MChatQuestionnaireAnswer> answers = mchatAnswerRepository.findAllBySubmission(submission);
        if (answers.isEmpty()) {
            return List.of();
        }

        Map<MChatQuestionCategory, double[]> agg = new LinkedHashMap<>();
        for (MChatQuestionnaireAnswer a : answers) {
            MChatQuestionCategory c = a.getQuestion().getCategory();
            if (c == null) continue;
            double[] bucket = agg.computeIfAbsent(c, k -> new double[]{0.0, 0.0});
            bucket[0] += a.getWeightedConcernScore() == null ? 0.0 : a.getWeightedConcernScore();
            int max = a.getQuestion().getAnswerType() == null || a.getQuestion().getAnswerType().name().equals("YES_NO") ? 1 : 4;
            int weight = a.getQuestion().getWeight() == null ? 1 : a.getQuestion().getWeight();
            bucket[1] += max * weight;
        }

        List<Map.Entry<MChatQuestionCategory, Double>> scored = new ArrayList<>();
        for (Map.Entry<MChatQuestionCategory, double[]> e : agg.entrySet()) {
            double max = e.getValue()[1];
            double concernPercent = max == 0 ? 0.0 : (e.getValue()[0] * 100.0 / max);
            scored.add(Map.entry(e.getKey(), concernPercent));
        }

        scored.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<MChatQuestionCategory> out = new ArrayList<>();
        for (Map.Entry<MChatQuestionCategory, Double> e : scored) {
            if (e.getValue() >= 35.0 || out.size() < 2) {
                out.add(e.getKey());
            }
            if (out.size() >= 3) break;
        }

        return out;
    }

    private void addActivity(List<Map<String, Object>> items, Set<String> seen, String name, String route, String plan) {
        if (seen.add(name)) {
            items.add(activity(name, route, plan));
        }
    }

    private String humanizeCategory(MChatQuestionCategory c) {
        if (c == null) return "";
        String s = c.name().toLowerCase(Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private double qualificationScore(String risk, String qualification) {
        String q = qualification.toLowerCase(Locale.ROOT);

        double score = 0.0;
        if (q.contains("asd") || q.contains("autism")) score += 2.5;
        if (q.contains("aba") || q.contains("occupational") || q.contains("speech")) score += 2.0;
        if (q.contains("child") || q.contains("development")) score += 1.5;

        if ("HIGH".equals(risk) && (q.contains("specialist") || q.contains("senior") || q.contains("clinical"))) {
            score += 2.0;
        }

        if ("MODERATE".equals(risk) && q.contains("therap")) {
            score += 1.0;
        }

        return score;
    }

    private double experienceScoreForRisk(String risk, int experienceYears) {
        if ("HIGH".equals(risk)) {
            if (experienceYears >= 12) return 6.0;
            if (experienceYears >= 8) return 4.8;
            if (experienceYears >= 5) return 3.2;
            return 1.0;
        }

        if ("MODERATE".equals(risk)) {
            if (experienceYears >= 6 && experienceYears <= 12) return 4.8;
            if (experienceYears >= 3) return 3.4;
            return 2.2;
        }

        if (experienceYears <= 5) return 3.0;
        if (experienceYears <= 10) return 2.5;
        return 1.8;
    }

    private double reviewScoreForRisk(String risk, double averageReview, int reviewCount) {
        if (averageReview <= 0.0 || reviewCount <= 0) return 0.0;

        double confidence = Math.min(reviewCount, 50) / 50.0;
        double base = averageReview * (1.5 + confidence);

        if ("HIGH".equals(risk)) {
            return base * 1.2;
        }

        if ("MODERATE".equals(risk)) {
            return base;
        }

        return base * 0.8;
    }

    private double addressSimilarityScore(String a, String b) {
        if (a.isBlank() || b.isBlank()) return 0.0;

        Set<String> ta = tokens(a);
        Set<String> tb = tokens(b);
        if (ta.isEmpty() || tb.isEmpty()) return 0.0;

        long overlap = ta.stream().filter(tb::contains).count();
        return (overlap * 10.0) / Math.max(ta.size(), tb.size());
    }

    private Double haversineKm(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return null;
        }

        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }

    private double proximityScore(Double distanceKm, double maxPoints, double maxDistanceKm) {
        if (distanceKm == null) return 0.0;
        if (distanceKm <= 0) return maxPoints;

        double clamped = Math.min(distanceKm, maxDistanceKm);
        double ratio = 1.0 - (clamped / maxDistanceKm);
        return maxPoints * ratio;
    }

    private Set<String> tokens(String x) {
        return java.util.Arrays.stream(x.toLowerCase(Locale.ROOT).split("[^a-z0-9]+"))
                .map(String::trim)
                .filter(s -> s.length() > 2)
                .collect(Collectors.toSet());
    }

    private String therapistDisplayAddress(User therapist) {
        String workplace = safe(therapist.getWorkplaceAddress());
        if (!workplace.isBlank()) {
            return workplace;
        }
        return safe(therapist.getAddress());
    }

    private LocationPoint resolveUserPoint(User user) {
        Double lat = user.getLatitude();
        Double lon = user.getLongitude();
        if (lat != null && lon != null) {
            return new LocationPoint(lat, lon);
        }

        String address = safe(user.getAddress());
        if (address.isBlank()) {
            return new LocationPoint(lat, lon);
        }

        Optional<AddressGeocodingService.Coordinates> coords = addressGeocodingService.geocode(address);
        if (coords.isPresent()) {
            AddressGeocodingService.Coordinates c = coords.get();
            user.setLatitude(c.latitude());
            user.setLongitude(c.longitude());
            userRepository.save(user);
            return new LocationPoint(c.latitude(), c.longitude());
        }

        return new LocationPoint(lat, lon);
    }

    private LocationPoint resolveTherapistPoint(User therapist, String therapistAddress) {
        Double workplaceLat = therapist.getWorkplaceLatitude();
        Double workplaceLon = therapist.getWorkplaceLongitude();
        if (workplaceLat != null && workplaceLon != null) {
            return new LocationPoint(workplaceLat, workplaceLon);
        }

        String workplaceAddress = safe(therapist.getWorkplaceAddress());
        if (!workplaceAddress.isBlank()) {
            Optional<AddressGeocodingService.Coordinates> coords = addressGeocodingService.geocode(workplaceAddress);
            if (coords.isPresent()) {
                AddressGeocodingService.Coordinates c = coords.get();
                therapist.setWorkplaceLatitude(c.latitude());
                therapist.setWorkplaceLongitude(c.longitude());
                userRepository.save(therapist);
                return new LocationPoint(c.latitude(), c.longitude());
            }
        }

        Double lat = therapist.getLatitude();
        Double lon = therapist.getLongitude();
        if (lat != null && lon != null) {
            return new LocationPoint(lat, lon);
        }

        if (!safe(therapistAddress).isBlank()) {
            Optional<AddressGeocodingService.Coordinates> coords = addressGeocodingService.geocode(therapistAddress);
            if (coords.isPresent()) {
                AddressGeocodingService.Coordinates c = coords.get();
                therapist.setLatitude(c.latitude());
                therapist.setLongitude(c.longitude());
                userRepository.save(therapist);
                return new LocationPoint(c.latitude(), c.longitude());
            }
        }

        return new LocationPoint(lat, lon);
    }

    private LocationPoint resolveCenterPoint(DayCareCenter center) {
        Double lat = center.getLatitude();
        Double lon = center.getLongitude();
        if (lat != null && lon != null) {
            return new LocationPoint(lat, lon);
        }

        String address = safe(center.getAddress());
        if (address.isBlank()) {
            return new LocationPoint(lat, lon);
        }

        Optional<AddressGeocodingService.Coordinates> coords = addressGeocodingService.geocode(address);
        if (coords.isPresent()) {
            AddressGeocodingService.Coordinates c = coords.get();
            center.setLatitude(c.latitude());
            center.setLongitude(c.longitude());
            dayCareCenterRepository.save(center);
            return new LocationPoint(c.latitude(), c.longitude());
        }

        return new LocationPoint(lat, lon);
    }

    private record LocationPoint(Double latitude, Double longitude) {}

    private User requireUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        String name = auth.getName();
        return userRepository.findByUsername(name)
                .or(() -> userRepository.findByUserEmail(name))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String safe(String x) {
        return x == null ? "" : x.trim();
    }

    private double round2(double x) {
        return Math.round(x * 100.0) / 100.0;
    }
}
