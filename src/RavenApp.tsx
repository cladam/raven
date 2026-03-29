import React, { useState, useCallback } from "react";
import { Puzzle } from "./types";
import { generatePuzzle } from "./generator";
import ShapeCell from "./ShapeCell";

type FeedbackState = "idle" | "correct" | "wrong";

const RavenApp: React.FC = () => {
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle());
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  const nextPuzzle = useCallback(() => {
    setPuzzle(generatePuzzle());
    setFeedback("idle");
    setSelectedId(null);
  }, []);

  const handleAnswer = useCallback(
    (optionId: number) => {
      if (feedback !== "idle") return; // Prevent double-clicking

      const option = puzzle.options.find((o) => o.id === optionId);
      if (!option) return;

      setSelectedId(optionId);
      setTotal((t) => t + 1);

      if (option.isCorrect) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        setFeedback("correct");
        // Auto-advance after a brief delay
        setTimeout(() => {
          nextPuzzle();
        }, 800);
      } else {
        setStreak(0);
        setFeedback("wrong");
        // Allow retry after a brief delay
        setTimeout(() => {
          setFeedback("idle");
          setSelectedId(null);
        }, 1000);
      }
    },
    [feedback, puzzle, nextPuzzle],
  );

  const handleSkip = useCallback(() => {
    setStreak(0);
    nextPuzzle();
  }, [nextPuzzle]);

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
        {/* Feedback overlay */}
        {feedback !== "idle" && (
          <div className={`feedback-banner ${feedback}`}>
            {feedback === "correct" ? "✓ Correct!" : "✗ Try again"}
          </div>
        )}

        {/* 3×3 Matrix Grid */}
        <div className="matrix-grid">
          {puzzle.matrix.map((cell, index) => (
            <div
              key={index}
              className={`cell-container ${index === 8 ? "missing-cell" : ""}`}
            >
              {index === 8 ? (
                <div className="question-mark">
                  <span>?</span>
                </div>
              ) : (
                <ShapeCell data={cell} cellSize={80} />
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <p className="instructions">
          Each shape, color, and size appears <strong>exactly once</strong> in
          every row and column. Select the missing piece:
        </p>

        {/* Answer Options */}
        <div className="answer-bank">
          {puzzle.options.map((option) => {
            let btnClass = "option-button";
            if (selectedId === option.id) {
              btnClass += feedback === "correct" ? " correct" : " wrong";
            }
            // After a correct answer, also highlight the correct one if user picked wrong
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
                <ShapeCell data={option.cell} cellSize={64} />
              </button>
            );
          })}
        </div>

        <button className="skip-button" onClick={handleSkip}>
          Skip →
        </button>

        {/* Debug helper (hidden by default, uncomment to debug) */}
        {/* <div className="debug">
          <p>Answer: {correctAnswer.size} {correctAnswer.color} {correctAnswer.shape}</p>
        </div> */}
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
