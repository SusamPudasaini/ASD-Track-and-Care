package com.ASD_Track_and_Care.backend.repository;

import com.ASD_Track_and_Care.backend.model.AacFavoritePhrase;
import com.ASD_Track_and_Care.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AacFavoritePhraseRepository extends JpaRepository<AacFavoritePhrase, Long> {
    List<AacFavoritePhrase> findAllByUserOrderByCreatedAtDesc(User user);
}