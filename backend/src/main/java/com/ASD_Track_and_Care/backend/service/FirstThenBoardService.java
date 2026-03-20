package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.dto.CreateFirstThenBoardRequest;
import com.ASD_Track_and_Care.backend.dto.FirstThenBoardResponse;
import com.ASD_Track_and_Care.backend.dto.UpdateFirstThenBoardRequest;
import com.ASD_Track_and_Care.backend.model.FirstThenBoard;
import com.ASD_Track_and_Care.backend.model.User;
import com.ASD_Track_and_Care.backend.repository.FirstThenBoardRepository;
import com.ASD_Track_and_Care.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FirstThenBoardService {

    private final FirstThenBoardRepository firstThenBoardRepository;
    private final UserRepository userRepository;

    public FirstThenBoardService(
            FirstThenBoardRepository firstThenBoardRepository,
            UserRepository userRepository
    ) {
        this.firstThenBoardRepository = firstThenBoardRepository;
        this.userRepository = userRepository;
    }

    public List<FirstThenBoardResponse> listMyBoards(Authentication authentication) {
        User user = requireUser(authentication);
        return firstThenBoardRepository.findAllByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public FirstThenBoardResponse createBoard(
            Authentication authentication,
            CreateFirstThenBoardRequest req
    ) {
        User user = requireUser(authentication);

        FirstThenBoard board = new FirstThenBoard();
        board.setUser(user);
        board.setFirstTitle(req.getFirstTitle().trim());
        board.setFirstImageUrl(blankToNull(req.getFirstImageUrl()));
        board.setThenTitle(req.getThenTitle().trim());
        board.setThenImageUrl(blankToNull(req.getThenImageUrl()));
        board.setActive(req.getActive() == null || req.getActive());
        board.setCompleted(false);

        firstThenBoardRepository.save(board);
        return toDto(board);
    }

    public FirstThenBoardResponse updateBoard(
            Long id,
            Authentication authentication,
            UpdateFirstThenBoardRequest req
    ) {
        User user = requireUser(authentication);
        FirstThenBoard board = requireOwnedBoard(id, user);

        board.setFirstTitle(req.getFirstTitle().trim());
        board.setFirstImageUrl(blankToNull(req.getFirstImageUrl()));
        board.setThenTitle(req.getThenTitle().trim());
        board.setThenImageUrl(blankToNull(req.getThenImageUrl()));
        board.setActive(req.getActive() == null || req.getActive());
        board.setCompleted(req.getCompleted() != null && req.getCompleted());

        firstThenBoardRepository.save(board);
        return toDto(board);
    }

    public FirstThenBoardResponse markCompleted(
            Long id,
            Authentication authentication,
            boolean completed
    ) {
        User user = requireUser(authentication);
        FirstThenBoard board = requireOwnedBoard(id, user);

        board.setCompleted(completed);
        firstThenBoardRepository.save(board);
        return toDto(board);
    }

    public FirstThenBoardResponse toggleActive(
            Long id,
            Authentication authentication,
            boolean active
    ) {
        User user = requireUser(authentication);
        FirstThenBoard board = requireOwnedBoard(id, user);

        board.setActive(active);
        firstThenBoardRepository.save(board);
        return toDto(board);
    }

    public void deleteBoard(Long id, Authentication authentication) {
        User user = requireUser(authentication);
        FirstThenBoard board = requireOwnedBoard(id, user);
        firstThenBoardRepository.delete(board);
    }

    private FirstThenBoard requireOwnedBoard(Long id, User user) {
        FirstThenBoard board = firstThenBoardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("First-Then board not found"));

        if (!board.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You are not allowed to access this board");
        }

        return board;
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

    private FirstThenBoardResponse toDto(FirstThenBoard board) {
        FirstThenBoardResponse dto = new FirstThenBoardResponse();
        dto.setId(board.getId());
        dto.setFirstTitle(board.getFirstTitle());
        dto.setFirstImageUrl(board.getFirstImageUrl());
        dto.setThenTitle(board.getThenTitle());
        dto.setThenImageUrl(board.getThenImageUrl());
        dto.setCompleted(board.isCompleted());
        dto.setActive(board.isActive());
        dto.setCreatedAt(board.getCreatedAt());
        dto.setUpdatedAt(board.getUpdatedAt());
        return dto;
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return value.trim();
    }
}