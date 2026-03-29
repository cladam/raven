import React, { useState, useCallback } from "react";
import { Puzzle } from "./types";
import { generatePuzzle } from "./generator";
import ShapeCell from "./ShapeCell";
import config from "./config";

type FeedbackState = "idle" | "correct" | "wrong";

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

  const { timing, scoring, rendering, grid } = config;

  const nextPuzzle = useCallback(() => {
    setPuzzle(generatePuzzle());
    setFeedback("idle");
    setSelectedId(null);
  }, []);

  const handleAnswer = useCallback(
    (optionId: number) => {
      if (feedback !== "idle") return;

      const option = puzzle.options.find((o) => o.id === optionId);
      if (!option) return;

      setSelectedId(optionId);

      if (scoring.countWrongAsAttempt || option.isCorrect) {
        setTotal((t) => t + 1);
      }

      if (option.isCorrect) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        setFeedback("correct");
        setTimeout(() => {
          nextPuzzle();
        }, timing.correctDelayMs);
      } else {
        if (scoring.wrongResetsStreak) {
          setStreak(0);
        }
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback("idle");
          setSelectedId(null);
        }, timing.wrongDelayMs);
      }
    },
    [feedback, puzzle, nextPuzzle, timing, scoring],
  );

  const handleSkip = useCallback(() => {
    if (scoring.skipResetsStreak) {
      setStreak(0);
    }
    nextPuzzle();
  }, [nextPuzzle, scoring]);

  const totalCells = grid.rows * grid.cols;
  const gridColsStyle = `repeat(${grid.cols}, 1fr)`;
  const optionCols = Math.min(puzzle.options.length, 3);
  const optionColsStyle = `repeat(${optionCols}, 1fr)`;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Raven's Progressive Matrices</h1>
        <p className="subtitle">Distribution of Three</p>
      </header>

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
      </div>

      <div className="puzzle-area">
        {feedback !== "idle" && (
          <div className={`feedback-banner ${feedback}`}>
            {feedback === "correct" ? "✓ Correct!" : "✗ Try again"}
          </div>
        )}

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
                  <div className="question-mark">
                    <span>?</span>
                  </div>
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

        <p className="instructions">
          Each shape, color, and size appears <strong>exactly once</strong> in
          every row and column. Select the missing piece:
        </p>

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

        <button className="skip-button" onClick={handleSkip}>
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
