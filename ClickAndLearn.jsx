import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Click & Learn: Whack-a-Mole / Shooter style rapid-fire quiz
// Single-file React component using Tailwind CSS + Framer Motion
// Usage: render <ClickAndLearn /> inside your app. Make sure Tailwind and framer-motion are installed.

export default function ClickAndLearn({
  roundTime = 30, // seconds per round
  spawnInterval = 1000, // ms base spawn interval
  maxTargets = 1, // simultaneous targets
}) {
  // sample questions (you can replace with API or props)
  const sampleQs = useRef([
    { id: 1, q: "5 + 3", choices: [6, 8, 9], correct: 8 },
    { id: 2, q: "7 - 2", choices: [4, 5, 6], correct: 5 },
    { id: 3, q: "4 × 2", choices: [6, 8, 10], correct: 8 },
    { id: 4, q: "9 ÷ 3", choices: [2, 3, 4], correct: 3 },
    { id: 5, q: "12 - 7", choices: [4, 5, 6], correct: 5 },
    { id: 6, q: "6 + 4", choices: [9, 10, 11], correct: 10 },
  ]);

  const [targets, setTargets] = useState([]); // active targets on screen
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundTime);
  const [running, setRunning] = useState(false);
  const [combo, setCombo] = useState(0);
  const [difficulty, setDifficulty] = useState(1);

  const spawnTimerRef = useRef(null);
  const roundTimerRef = useRef(null);
  const nextIdRef = useRef(1000);

  // helper: random position grid
  const GRID = [
    { x: 8, y: 12 },
    { x: 50, y: 10 },
    { x: 85, y: 14 },
    { x: 20, y: 40 },
    { x: 65, y: 44 },
    { x: 45, y: 70 },
    { x: 80, y: 75 },
    { x: 12, y: 75 },
  ];

  // spawn a new target
  function spawnTarget() {
    setTargets((prev) => {
      if (prev.length >= maxTargets) return prev;
      const base =
        sampleQs.current[Math.floor(Math.random() * sampleQs.current.length)];
      console.log("Base ", { ...base });
      const rot = { ...base };

      const choices = [...rot.choices].sort(() => Math.random() - 0.5);
      const pos = GRID[Math.floor(Math.random() * GRID.length)];
      const id = nextIdRef.current++;
      const lifetime =
        24000 - difficulty * 100 - Math.floor(Math.random() * 300);
      const newT = {
        id,
        q: rot.q,
        choices,
        correct: rot.correct,
        x: pos.x,
        y: pos.y,
        lifetime,
        createdAt: Date.now(),
      };
      return [...prev, newT];
    });
  }

  // start round
  function start() {
    setScore(0);
    setTimeLeft(roundTime);
    setRunning(true);
    setCombo(0);
    setTargets([]);
    setDifficulty(1);
  }

  // stop round
  function stop() {
    setRunning(false);
    clearInterval(spawnTimerRef.current);
    clearInterval(roundTimerRef.current);
  }

  // handle clicking a choice on a target
  function handleChoiceClick(tid, choice) {
    setTargets((prev) => prev.filter((t) => t.id !== tid));
    const clickedCorrect = sampleQs.current.some((s) => s.q === "PLACEHOLDER"); // no-op to avoid lint errors
    // scoring
    const t = targets.find((x) => x.id === tid);
    if (!t) return; // already removed
    if (choice === t.correct) {
      const delta = 10 + combo * 2 + Math.floor(difficulty * 3);
      setScore((s) => s + delta);
      setCombo((c) => c + 1);
      // increase difficulty slowly
      setDifficulty((d) => Math.min(8, d + 0.06));
    } else {
      setScore((s) => Math.max(0, s - 6));
      setCombo(0);
      setDifficulty((d) => Math.max(1, d - 0.2));
    }
  }

  // lifecycle: manage spawn loop & round timer
  useEffect(() => {
    if (!running) return;

    // spawn loop with difficulty affecting interval
    spawnTimerRef.current = setInterval(() => {
      spawnTarget();
    }, Math.max(350, spawnInterval - difficulty * 80));

    // round countdown
    roundTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // round end
          clearInterval(spawnTimerRef.current);
          clearInterval(roundTimerRef.current);
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnTimerRef.current);
      clearInterval(roundTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // auto-remove targets when lifetime expires
  useEffect(() => {
    if (!targets.length) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTargets((prev) => prev.filter((t) => now - t.createdAt < t.lifetime));
    }, 150);
    return () => clearInterval(timer);
  }, [targets]);

  // keyboard support: number keys 1..3 select the first visible target's choices
  useEffect(() => {
    function onKey(e) {
      if (!running) return;
      if (e.key >= "1" && e.key <= "3") {
        // pick the top-most target (last in array is newest)
        const t = targets[targets.length - 1];
        if (!t) return;
        const idx = parseInt(e.key, 10) - 1;
        const choice = t.choices[idx];
        if (choice !== undefined) handleChoiceClick(t.id, choice);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, targets]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Click & Learn — Shooter</h2>
          <p className="text-sm text-gray-500">
            Click the correct choice on popping targets. Use keys 1–3 to pick
            quick.
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg">
            Score: <span className="font-bold">{score}</span>
          </div>
          <div className="text-sm text-gray-600">
            Combo: {combo} • Diff: {difficulty.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 relative rounded-lg shadow p-4 h-96 overflow-hidden">
        {/* HUD */}
        <div className="absolute left-2 top-2 bg-white/80 px-3 py-1 rounded-md text-sm">
          Time: {timeLeft}s
        </div>

        {/* Play area */}
        <AnimatePresence>
          {targets.map((t) => (
            <motion.div
              key={t.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
            >
              <div className="relative">
                <div className="rounded-full w-36 h-36 flex items-center justify-center p-2 shadow-lg bg-white ring-2 ring-slate-200">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">{t.q}</div>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {t.choices.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => handleChoiceClick(t.id, c)}
                          className="text-sm p-2 rounded-md border border-black hover:scale-105 active:scale-95 focus:outline-none"
                          aria-label={`choice-${i + 1}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* small muzzle flash / pop effect */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1, 0.8], opacity: [0.6, 1, 0] }}
                  transition={{ duration: 0.6 }}
                  className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-yellow-300/80"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="bg-white/90 p-6 rounded-lg shadow text-center pointer-events-auto">
              <h3 className="text-xl font-semibold">Ready?</h3>
              <p className="text-sm text-gray-600">
                Click Start to begin a {roundTime}-second rapid-fire round.
              </p>
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={start}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Start
                </button>
                <button
                  onClick={() => {
                    setTargets([]);
                    setScore(0);
                    setCombo(0);
                  }}
                  className="px-4 py-2 border rounded-md"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="space-x-2">
          <button
            onClick={() => {
              if (running) stop();
              else start();
            }}
            className={`px-4 py-2 rounded-md ${
              running ? "bg-red-500 text-white" : "bg-green-600 text-white"
            }`}
          >
            {running ? "Stop" : "Start"}
          </button>
          <button
            onClick={() => {
              setTargets([]);
              setScore(0);
              setCombo(0);
              setTimeLeft(roundTime);
            }}
            className="px-4 py-2 border rounded-md"
          >
            Quick Reset
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Tip: Press 1,2 or 3 to pick the left/mid/right choice of the newest
          target.
        </div>
      </div>
    </div>
  );
}
