package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.*;
import com.ASD_Track_and_Care.backend.model.*;
import com.ASD_Track_and_Care.backend.repository.AacCardRepository;
import com.ASD_Track_and_Care.backend.repository.AacFavoritePhraseRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AacService {

    private final AacCardRepository aacCardRepository;
    private final AacFavoritePhraseRepository aacFavoritePhraseRepository;
    private final UserRepository userRepository;

    public AacService(
            AacCardRepository aacCardRepository,
            AacFavoritePhraseRepository aacFavoritePhraseRepository,
            UserRepository userRepository
    ) {
        this.aacCardRepository = aacCardRepository;
        this.aacFavoritePhraseRepository = aacFavoritePhraseRepository;
        this.userRepository = userRepository;
    }

    public List<AacCardResponse> listAllCardsForAdmin() {
        return aacCardRepository.findAllByOrderByCategoryAscSortOrderAscLabelAsc()
                .stream()
                .map(this::toCardDto)
                .toList();
    }

    public List<AacCardResponse> listActiveCards(AacCardCategory category) {
        List<AacCard> cards = (category == null)
                ? aacCardRepository.findAllByActiveTrueOrderByCategoryAscSortOrderAscLabelAsc()
                : aacCardRepository.findAllByActiveTrueAndCategoryOrderBySortOrderAscLabelAsc(category);

        return cards.stream().map(this::toCardDto).toList();
    }

    public AacCardResponse createCard(CreateAacCardRequest req) {
        AacCard card = new AacCard();
        card.setLabel(req.getLabel().trim());
        card.setImageUrl(blankToNull(req.getImageUrl()));
        card.setCategory(req.getCategory());
        card.setSortOrder(req.getSortOrder() == null ? 0 : req.getSortOrder());
        card.setActive(req.getActive() == null || req.getActive());

        aacCardRepository.save(card);
        return toCardDto(card);
    }

    public AacCardResponse updateCard(Long id, UpdateAacCardRequest req) {
        AacCard card = requireCard(id);
        card.setLabel(req.getLabel().trim());
        card.setImageUrl(blankToNull(req.getImageUrl()));
        card.setCategory(req.getCategory());
        card.setSortOrder(req.getSortOrder() == null ? 0 : req.getSortOrder());
        card.setActive(req.getActive() == null || req.getActive());

        aacCardRepository.save(card);
        return toCardDto(card);
    }

    public AacCardResponse toggleCard(Long id, boolean active) {
        AacCard card = requireCard(id);
        card.setActive(active);
        aacCardRepository.save(card);
        return toCardDto(card);
    }

    public List<AacFavoritePhraseResponse> listMyFavoritePhrases(Authentication authentication) {
        User user = requireUser(authentication);
        return aacFavoritePhraseRepository.findAllByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toPhraseDto)
                .toList();
    }

    public AacFavoritePhraseResponse saveFavoritePhrase(
            Authentication authentication,
            CreateAacFavoritePhraseRequest req
    ) {
        User user = requireUser(authentication);

        AacFavoritePhrase phrase = new AacFavoritePhrase();
        phrase.setUser(user);
        phrase.setPhraseText(req.getPhraseText().trim());

        aacFavoritePhraseRepository.save(phrase);
        return toPhraseDto(phrase);
    }

    private AacCard requireCard(Long id) {
        return aacCardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("AAC card not found"));
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

    private AacCardResponse toCardDto(AacCard card) {
        AacCardResponse dto = new AacCardResponse();
        dto.setId(card.getId());
        dto.setLabel(card.getLabel());
        dto.setImageUrl(card.getImageUrl());
        dto.setCategory(card.getCategory());
        dto.setActive(card.isActive());
        dto.setSortOrder(card.getSortOrder());
        return dto;
    }

    private AacFavoritePhraseResponse toPhraseDto(AacFavoritePhrase phrase) {
        AacFavoritePhraseResponse dto = new AacFavoritePhraseResponse();
        dto.setId(phrase.getId());
        dto.setPhraseText(phrase.getPhraseText());
        dto.setCreatedAt(phrase.getCreatedAt());
        return dto;
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return value.trim();
    }
}