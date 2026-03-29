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
  const [puzzleNum, setPuzzleNum] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

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
  const maxPuzzles = currentMode.maxPuzzles;
  const isTimed = timeLimit > 0;
  const hasLimit = maxPuzzles > 0;

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
    }, 50);
  }, [isTimed, timeLimit, clearTimer]);

  // Handle timeout
  useEffect(() => {
    if (!isTimed) return;
    if (feedback !== "idle") return;
    if (timeLeftMs > 0) return;
    if (deadlineRef.current === 0) return;

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
      advanceOrFinish();
    }, timing.timeoutDelayMs);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, timing.timeoutDelayMs]);

  // ---- Puzzle lifecycle ----

  const advanceOrFinish = useCallback(() => {
    if (hasLimit && puzzleNum >= maxPuzzles) {
      clearTimer();
      setFeedback("idle");
      setSessionComplete(true);
      return;
    }
    setPuzzle(generatePuzzle());
    setPuzzleNum((n) => n + 1);
    setFeedback("idle");
    setSelectedId(null);
  }, [hasLimit, puzzleNum, maxPuzzles, clearTimer]);

  // Start timer whenever puzzle changes or mode changes
  useEffect(() => {
    if (sessionComplete) return;
    if (isTimed && feedback === "idle") {
      startTimer();
    } else if (!isTimed) {
      clearTimer();
      setTimeLeftMs(0);
    }
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, modeId, sessionComplete]);

  // Track best streak
  useEffect(() => {
    if (streak > bestStreak) {
      setBestStreak(streak);
    }
  }, [streak, bestStreak]);

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
          advanceOrFinish();
        }, timing.correctDelayMs);
      } else {
        if (scoring.wrongResetsStreak) {
          setStreak(0);
        }
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback("idle");
          setSelectedId(null);
          if (isTimed) {
            startTimer();
          }
        }, timing.wrongDelayMs);
      }
    },
    [
      feedback,
      puzzle,
      advanceOrFinish,
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
    if (hasLimit && puzzleNum >= maxPuzzles) {
      setTotal((t) => t + 1);
      setSessionComplete(true);
      return;
    }
    setTotal((t) => t + 1);
    setPuzzle(generatePuzzle());
    setPuzzleNum((n) => n + 1);
    setFeedback("idle");
    setSelectedId(null);
  }, [scoring, clearTimer, hasLimit, puzzleNum, maxPuzzles]);

  const handleModeChange = useCallback((newMode: GameModeId) => {
    setModeId(newMode);
    setShowModeSelector(false);
    resetSession();
  }, []);

  const resetSession = useCallback(() => {
    setScore(0);
    setTotal(0);
    setPuzzleNum(1);
    setStreak(0);
    setBestStreak(0);
    setFeedback("idle");
    setSelectedId(null);
    setSessionComplete(false);
    setPuzzle(generatePuzzle());
  }, []);

  // ---- Layout calculations ----

  const totalCells = grid.rows * grid.cols;
  const gridColsStyle = `repeat(${grid.cols}, 1fr)`;
  const optionCols = Math.min(puzzle.options.length, 3);
  const optionColsStyle = `repeat(${optionCols}, 1fr)`;

  // Timer bar fraction (1 = full, 0 = empty)
  const timerFraction = isTimed && timeLimit > 0 ? timeLeftMs / timeLimit : 1;

  // Timer bar colour: teal > amber > red based on remaining time
  let timerBarColor = "#5a9b80";
  if (isTimed) {
    if (timerFraction <= 0.25) {
      timerBarColor = "#b35f5f";
    } else if (timerFraction <= 0.5) {
      timerBarColor = "#c08a3e";
    }
  }

  // Format time display
  const timeDisplaySec = Math.ceil(timeLeftMs / 1000);

  // Accuracy
  const accuracy = total === 0 ? 0 : Math.round((score / total) * 100);

  // ---- Session complete screen ----

  if (sessionComplete) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Raven's Progressive Matrices</h1>
          <p className="subtitle">Distribution of Three</p>
        </header>

        <div className="session-complete">
          <h2 className="session-title">Session Complete</h2>
          <p className="session-mode">{currentMode.label}</p>

          <div className="session-results">
            <div className="result-row">
              <span className="result-label">Score</span>
              <span className="result-value result-score">
                {score} / {maxPuzzles}
              </span>
            </div>
            <div className="result-row">
              <span className="result-label">Accuracy</span>
              <span className="result-value">
                {total === 0 ? "—" : `${accuracy}%`}
              </span>
            </div>
            <div className="result-row">
              <span className="result-label">Total attempts</span>
              <span className="result-value">{total}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Best streak</span>
              <span className="result-value">🔥 {bestStreak}</span>
            </div>
          </div>

          {/* Performance rating */}
          <div className="session-rating">
            {accuracy >= 90
              ? "🏆 Outstanding"
              : accuracy >= 75
                ? "🌟 Well done"
                : accuracy >= 50
                  ? "👍 Good effort"
                  : "💪 Keep practising"}
          </div>

          <div className="session-actions">
            <button className="play-again-button" onClick={resetSession}>
              Play Again
            </button>
            <button
              className="change-mode-button"
              onClick={() => {
                resetSession();
                setShowModeSelector(true);
              }}
            >
              Change Mode
            </button>
          </div>
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
            . Each row &amp; column is a Latin square for shape, colour, and
            size.
          </p>
        </footer>
      </div>
    );
  }

  // ---- Active puzzle screen ----

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

      {/* Progress + Stats Bar */}
      <div className="stats-bar">
        {hasLimit && (
          <div className="stat">
            <span className="stat-label">Puzzle</span>
            <span className="stat-value">
              {puzzleNum}/{maxPuzzles}
            </span>
          </div>
        )}
        <div className="stat">
          <span className="stat-label">Score</span>
          <span className="stat-value">
            {score}
            {hasLimit ? `/${maxPuzzles}` : `/${total}`}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Streak</span>
          <span className="stat-value">🔥 {streak}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">
            {total === 0 ? "—" : `${accuracy}%`}
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

      {/* Progress Bar (for capped sessions) */}
      {hasLimit && (
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${((puzzleNum - 1) / maxPuzzles) * 100}%`,
            }}
          />
        </div>
      )}

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
          Each shape, colour, and size appears <strong>exactly once</strong> in
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
          . Each row &amp; column is a Latin square for shape, colour, and size.
        </p>
      </footer>
    </div>
  );
};

export default RavenApp;
