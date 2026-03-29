import React, { useState, useCallback, useEffect, useRef } from "react";
import { Puzzle } from "./types";
import { generatePuzzle } from "./generator";
import ShapeCell from "./ShapeCell";
import config, { GameModeId } from "./config";

type FeedbackState = "idle" | "correct" | "wrong" | "timeout";

interface PuzzleWithMissing extends Puzzle {
  missingIndex: number;
}

const RavenApp: React.FC = () => {
  const [puzzle, setPuzzle] = useState<PuzzleWithMissing>(() =>
    generatePuzzle(),
  );
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  // Game mode
  const [modeId, setModeId] = useState<GameModeId>(
    config.gameMode.default as GameModeId,
  );
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Timer
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number>(0);

  const { timing, scoring, rendering, grid, gameMode } = config;
  const currentMode = gameMode.modes[modeId];
  const timeLimit = currentMode.timeLimitMs;
  const isTimed = timeLimit > 0;

  // ---- Timer logic ----

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (!isTimed) return;

    deadlineRef.current = Date.now() + timeLimit;
    setTimeLeftMs(timeLimit);

    timerRef.current = setInterval(() => {
      const remaining = deadlineRef.current - Date.now();
      if (remaining <= 0) {
        setTimeLeftMs(0);
        clearTimer();
      } else {
        setTimeLeftMs(remaining);
      }
    }, 50); // update ~20fps for smooth bar
  }, [isTimed, timeLimit, clearTimer]);

  // Handle timeout
  useEffect(() => {
    if (!isTimed) return;
    if (feedback !== "idle") return;
    if (timeLeftMs > 0) return;
    if (deadlineRef.current === 0) return; // not started yet

    // Time ran out
    setFeedback("timeout");
    if (scoring.timeoutResetsStreak) {
      setStreak(0);
    }
    if (scoring.countTimeoutAsAttempt) {
      setTotal((t) => t + 1);
    }
  }, [timeLeftMs, feedback, isTimed, scoring]);

  // Auto-advance after timeout feedback
  useEffect(() => {
    if (feedback !== "timeout") return;

    const id = setTimeout(() => {
      advancePuzzle();
    }, timing.timeoutDelayMs);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, timing.timeoutDelayMs]);

  // ---- Puzzle lifecycle ----

  const advancePuzzle = useCallback(() => {
    setPuzzle(generatePuzzle());
    setFeedback("idle");
    setSelectedId(null);
  }, []);

  // Start timer whenever puzzle changes or mode changes
  useEffect(() => {
    if (isTimed && feedback === "idle") {
      startTimer();
    } else if (!isTimed) {
      clearTimer();
      setTimeLeftMs(0);
    }
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, modeId]);

  // ---- Handlers ----

  const handleAnswer = useCallback(
    (optionId: number) => {
      if (feedback !== "idle") return;

      const option = puzzle.options.find((o) => o.id === optionId);
      if (!option) return;

      clearTimer();
      setSelectedId(optionId);

      if (scoring.countWrongAsAttempt || option.isCorrect) {
        setTotal((t) => t + 1);
      }

      if (option.isCorrect) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        setFeedback("correct");
        setTimeout(() => {
          advancePuzzle();
        }, timing.correctDelayMs);
      } else {
        if (scoring.wrongResetsStreak) {
          setStreak(0);
        }
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback("idle");
          setSelectedId(null);
          // Restart timer for retry
          if (isTimed) {
            startTimer();
          }
        }, timing.wrongDelayMs);
      }
    },
    [
      feedback,
      puzzle,
      advancePuzzle,
      timing,
      scoring,
      clearTimer,
      isTimed,
      startTimer,
    ],
  );

  const handleSkip = useCallback(() => {
    clearTimer();
    if (scoring.skipResetsStreak) {
      setStreak(0);
    }
    advancePuzzle();
  }, [advancePuzzle, scoring, clearTimer]);

  const handleModeChange = useCallback((newMode: GameModeId) => {
    setModeId(newMode);
    setShowModeSelector(false);
    // Reset stats on mode change
    setScore(0);
    setTotal(0);
    setStreak(0);
    setFeedback("idle");
    setSelectedId(null);
    setPuzzle(generatePuzzle());
  }, []);

  // ---- Layout calculations ----

  const totalCells = grid.rows * grid.cols;
  const gridColsStyle = `repeat(${grid.cols}, 1fr)`;
  const optionCols = Math.min(puzzle.options.length, 3);
  const optionColsStyle = `repeat(${optionCols}, 1fr)`;

  // Timer bar fraction (1 = full, 0 = empty)
  const timerFraction = isTimed && timeLimit > 0 ? timeLeftMs / timeLimit : 1;

  // Timer bar color: teal > amber > red based on remaining time
  let timerBarColor = "#5a9b80"; // MutedTeal
  if (isTimed) {
    if (timerFraction <= 0.25) {
      timerBarColor = "#b35f5f"; // MutedRed
    } else if (timerFraction <= 0.5) {
      timerBarColor = "#c08a3e"; // QuietAmber
    }
  }

  // Format time display
  const timeDisplaySec = Math.ceil(timeLeftMs / 1000);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Raven's Progressive Matrices</h1>
        <p className="subtitle">Distribution of Three</p>
      </header>

      {/* Mode Selector */}
      <div className="mode-selector-area">
        <button
          className="mode-toggle"
          onClick={() => setShowModeSelector(!showModeSelector)}
        >
          {currentMode.label}
          <span className="mode-toggle-arrow">
            {showModeSelector ? "▲" : "▼"}
          </span>
        </button>

        {showModeSelector && (
          <div className="mode-dropdown">
            {(Object.keys(gameMode.modes) as GameModeId[]).map((id) => {
              const mode = gameMode.modes[id];
              const isActive = id === modeId;
              return (
                <button
                  key={id}
                  className={`mode-option ${isActive ? "active" : ""}`}
                  onClick={() => handleModeChange(id)}
                >
                  <span className="mode-option-label">{mode.label}</span>
                  <span className="mode-option-desc">{mode.description}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">Score</span>
          <span className="stat-value">
            {score}/{total}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Streak</span>
          <span className="stat-value">🔥 {streak}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">
            {total === 0 ? "—" : `${Math.round((score / total) * 100)}%`}
          </span>
        </div>
        {isTimed && (
          <div className="stat">
            <span className="stat-label">Time</span>
            <span className="stat-value" style={{ color: timerBarColor }}>
              {timeDisplaySec}s
            </span>
          </div>
        )}
      </div>

      {/* Timer Bar */}
      {isTimed && (
        <div className="timer-bar-track">
          <div
            className="timer-bar-fill"
            style={{
              width: `${timerFraction * 100}%`,
              backgroundColor: timerBarColor,
            }}
          />
        </div>
      )}

      <div className="puzzle-area">
        {/* Feedback banner */}
        {feedback !== "idle" && (
          <div className={`feedback-banner ${feedback}`}>
            {feedback === "correct" && "✓ Correct!"}
            {feedback === "wrong" && "✗ Try again"}
            {feedback === "timeout" && "⏱ Time's up!"}
          </div>
        )}

        {/* Matrix Grid */}
        <div
          className="matrix-grid"
          style={{ gridTemplateColumns: gridColsStyle }}
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const isMissing = index === puzzle.missingIndex;
            return (
              <div
                key={index}
                className={`cell-container ${isMissing ? "missing-cell" : ""}`}
              >
                {isMissing ? (
                  feedback === "timeout" ? (
                    // Reveal the correct answer on timeout
                    <div className="reveal-answer">
                      <ShapeCell
                        data={puzzle.matrix[index]}
                        cellSize={rendering.matrixCellSize}
                      />
                    </div>
                  ) : (
                    <div className="question-mark">
                      <span>?</span>
                    </div>
                  )
                ) : (
                  <ShapeCell
                    data={puzzle.matrix[index]}
                    cellSize={rendering.matrixCellSize}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <p className="instructions">
          Each shape, color, and size appears <strong>exactly once</strong> in
          every row and column. Select the missing piece:
        </p>

        {/* Answer Options */}
        <div
          className="answer-bank"
          style={{ gridTemplateColumns: optionColsStyle }}
        >
          {puzzle.options.map((option) => {
            let btnClass = "option-button";
            if (selectedId === option.id) {
              btnClass += feedback === "correct" ? " correct" : " wrong";
            }
            if (feedback === "wrong" && option.isCorrect) {
              btnClass += " reveal-correct";
            }
            if (feedback === "timeout" && option.isCorrect) {
              btnClass += " reveal-correct";
            }

            return (
              <button
                key={option.id}
                className={btnClass}
                onClick={() => handleAnswer(option.id)}
                disabled={feedback !== "idle"}
                title={`${option.cell.size} ${option.cell.color} ${option.cell.shape}`}
              >
                <ShapeCell
                  data={option.cell}
                  cellSize={rendering.optionCellSize}
                />
              </button>
            );
          })}
        </div>

        <button
          className="skip-button"
          onClick={handleSkip}
          disabled={feedback !== "idle"}
        >
          Skip →
        </button>
      </div>

      <footer className="app-footer">
        <p>
          Inspired by{" "}
          <a
            href="https://en.wikipedia.org/wiki/Raven%27s_Progressive_Matrices"
            target="_blank"
            rel="noopener noreferrer"
          >
            Raven's Progressive Matrices
          </a>
          . Each row &amp; column is a Latin square for shape, color, and size.
        </p>
      </footer>
    </div>
  );
};

export default RavenApp;
