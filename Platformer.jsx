import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Heart, Star, Lock, Sparkles, Volume2, VolumeX } from 'lucide-react';

const QuizAdventure = () => {
  const [playerPos, setPlayerPos] = useState({ x: 100, y: 200 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isGrounded, setIsGrounded] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [gameState, setGameState] = useState('playing');
  const [coins, setCoins] = useState([]);
  const [collectedCoins, setCollectedCoins] = useState(new Set());
  const [unlockedGates, setUnlockedGates] = useState(new Set());
  const [keys, setKeys] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState([]);
  const gameAreaRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particleIdCounter = useRef(0); // Add counter for unique particle IDs

  // Level configurations with platforms and obstacles
  const levels = {
    1: {
      platforms: [
        { x: 0, y: 400, width: 300, height: 20 },
        { x: 350, y: 350, width: 150, height: 20 },
        { x: 550, y: 300, width: 150, height: 20 },
        { x: 750, y: 250, width: 200, height: 20 },
      ],
      gates: [
        { x: 480, y: 250, width: 20, height: 100, id: 'gate1', question: { q: "What is 12 × 8?", a: "96", options: ["88", "96", "104", "92"] } },
      ],
      coins: [
        { x: 150, y: 350, id: 'coin1' },
        { x: 425, y: 300, id: 'coin2' },
        { x: 625, y: 250, id: 'coin3' },
        { x: 850, y: 200, id: 'coin4' },
      ],
      goal: { x: 900, y: 200 }
    },
    2: {
      platforms: [
        { x: 0, y: 400, width: 200, height: 20 },
        { x: 250, y: 350, width: 100, height: 20 },
        { x: 400, y: 320, width: 150, height: 20 },
        { x: 600, y: 280, width: 100, height: 20 },
        { x: 750, y: 250, width: 250, height: 20 },
      ],
      gates: [
        { x: 350, y: 270, width: 20, height: 80, id: 'gate2', question: { q: "Capital of France?", a: "Paris", options: ["London", "Paris", "Berlin", "Rome"] } },
        { x: 700, y: 200, width: 20, height: 80, id: 'gate3', question: { q: "√144 = ?", a: "12", options: ["10", "11", "12", "14"] } },
      ],
      coins: [
        { x: 100, y: 350, id: 'coin5' },
        { x: 300, y: 300, id: 'coin6' },
        { x: 475, y: 270, id: 'coin7' },
        { x: 650, y: 230, id: 'coin8' },
        { x: 875, y: 200, id: 'coin9' },
      ],
      goal: { x: 950, y: 200 }
    }
  };

  const questions = [
    { q: "What is 15 + 27?", a: "42", options: ["40", "42", "44", "45"] },
    { q: "Which planet is closest to the Sun?", a: "Mercury", options: ["Venus", "Mercury", "Earth", "Mars"] },
    { q: "What is the chemical symbol for water?", a: "H2O", options: ["H2O", "CO2", "O2", "N2"] },
  ];

  // Physics constants
  const GRAVITY = 0.5;
  const JUMP_FORCE = -12;
  const MOVE_SPEED = 5;
  const MAX_FALL_SPEED = 15;

  // Get current level safely
  const getCurrentLevel = () => levels[currentLevel] || levels[1];

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showQuestion || gameState !== 'playing') return;
      
      if (!keys[e.key]) {
        setKeys(prev => ({ ...prev, [e.key]: true }));
        
        // Jump
        if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && isGrounded) {
          setVelocity(prev => ({ ...prev, y: JUMP_FORCE }));
          createParticles(playerPos.x + 20, playerPos.y + 40, 'jump');
        }
      }
    };

    const handleKeyUp = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGrounded, showQuestion, gameState, keys, playerPos]);

  // Create particle effects with unique IDs
  const createParticles = (x, y, type) => {
    const newParticles = [];
    const count = type === 'coin' ? 8 : 5;
    
    for (let i = 0; i < count; i++) {
      particleIdCounter.current += 1; // Increment counter for unique ID
      newParticles.push({
        id: `particle-${particleIdCounter.current}`, // Use counter-based unique ID
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        life: 1,
        type
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Update particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.2,
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing' || showQuestion) return;

    const level = getCurrentLevel(); // Use safe level getter
    
    setPlayerPos(prev => {
      let newX = prev.x;
      let newY = prev.y;
      
      // Horizontal movement
      if (keys['ArrowLeft'] || keys['a']) {
        newX = Math.max(0, prev.x - MOVE_SPEED);
      }
      if (keys['ArrowRight'] || keys['d']) {
        newX = Math.min(950, prev.x + MOVE_SPEED);
      }
      
      // Apply gravity
      setVelocity(v => ({
        x: 0,
        y: Math.min(v.y + GRAVITY, MAX_FALL_SPEED)
      }));
      
      newY = prev.y + velocity.y;
      
      // Collision detection with platforms
      let grounded = false;
      if (level.platforms) {
        level.platforms.forEach(platform => {
          // Player dimensions: 40x40
          const playerBottom = newY + 40;
          const playerTop = newY;
          const playerLeft = newX;
          const playerRight = newX + 40;
          
          const platformTop = platform.y;
          const platformBottom = platform.y + platform.height;
          const platformLeft = platform.x;
          const platformRight = platform.x + platform.width;
          
          // Check if player is on platform
          if (
            playerRight > platformLeft &&
            playerLeft < platformRight &&
            playerBottom > platformTop &&
            playerTop < platformTop &&
            velocity.y >= 0
          ) {
            newY = platformTop - 40;
            setVelocity(v => ({ ...v, y: 0 }));
            grounded = true;
          }
        });
      }
      
      // Check ground collision
      if (newY >= 360) {
        newY = 360;
        setVelocity(v => ({ ...v, y: 0 }));
        grounded = true;
      }
      
      setIsGrounded(grounded);
      
      // Check coin collection
      if (level.coins) {
        level.coins.forEach(coin => {
          if (!collectedCoins.has(coin.id)) {
            const dist = Math.sqrt(Math.pow(newX + 20 - coin.x, 2) + Math.pow(newY + 20 - coin.y, 2));
            if (dist < 30) {
              setCollectedCoins(prev => new Set([...prev, coin.id]));
              setScore(prev => prev + 10);
              createParticles(coin.x, coin.y, 'coin');
            }
          }
        });
      }
      
      // Check gate collision
      if (level.gates) {
        level.gates.forEach(gate => {
          if (!unlockedGates.has(gate.id)) {
            const playerRight = newX + 40;
            const gateLeft = gate.x;
            
            if (playerRight > gateLeft && newX < gate.x + gate.width && newY < gate.y + gate.height && newY + 40 > gate.y) {
              setCurrentQuestion(gate);
              setShowQuestion(true);
              newX = prev.x; // Stop player movement
            }
          }
        });
      }
      
      // Check goal reached
      if (level.goal && Math.abs(newX - level.goal.x) < 30 && Math.abs(newY - level.goal.y) < 30) {
        if (currentLevel < Object.keys(levels).length) {
          setCurrentLevel(prev => prev + 1);
          setPlayerPos({ x: 100, y: 200 });
          setVelocity({ x: 0, y: 0 });
          setCollectedCoins(new Set());
          setUnlockedGates(new Set());
          createParticles(level.goal.x, level.goal.y, 'win');
        } else {
          setGameState('win');
        }
      }
      
      return { x: newX, y: newY };
    });
  }, [keys, velocity, currentLevel, collectedCoins, unlockedGates, gameState, showQuestion]);

  // Animation frame loop
  useEffect(() => {
    const animate = () => {
      gameLoop();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop]);

  const handleAnswer = (answer) => {
    if (answer === currentQuestion.question.a) {
      setScore(prev => prev + 50);
      setUnlockedGates(prev => new Set([...prev, currentQuestion.id]));
      createParticles(playerPos.x + 20, playerPos.y + 20, 'win');
    } else {
      setLives(prev => prev - 1);
      if (lives <= 1) {
        setGameState('gameOver');
      }
    }
    setShowQuestion(false);
    setCurrentQuestion(null);
  };

  const restartGame = () => {
    setPlayerPos({ x: 100, y: 200 });
    setVelocity({ x: 0, y: 0 });
    setScore(0);
    setLives(3);
    setCurrentLevel(1);
    setGameState('playing');
    setCollectedCoins(new Set());
    setUnlockedGates(new Set());
    setParticles([]); // Clear particles on restart
    particleIdCounter.current = 0; // Reset particle counter
  };

  const level = getCurrentLevel(); // Use safe level getter

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full opacity-20 animate-pulse" />
        <div className="absolute top-20 right-20 w-24 h-24 bg-yellow-200 rounded-full opacity-20 animate-pulse" />
        <div className="absolute bottom-40 left-1/3 w-40 h-40 bg-white rounded-full opacity-10 animate-pulse" />
      </div>

      {/* UI Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30">
        <div className="flex gap-4">
          <div className="bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
            <Trophy className="text-yellow-500 w-5 h-5" />
            <span className="font-bold text-gray-800">{score}</span>
          </div>
          <div className="bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
            <span className="font-bold text-gray-800">Level {currentLevel}</span>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-6 h-6 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/90 backdrop-blur rounded-lg p-2 shadow-lg"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div ref={gameAreaRef} className="relative w-full h-full">
        {/* Platforms */}
        {level.platforms && level.platforms.map((platform, i) => (
          <motion.div
            key={i}
            className="absolute bg-gradient-to-b from-green-600 to-green-700 rounded-t-lg shadow-lg"
            style={{
              left: platform.x,
              top: platform.y,
              width: platform.width,
              height: platform.height,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="absolute inset-x-0 top-0 h-2 bg-green-500 rounded-t-lg" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
          </motion.div>
        ))}

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-green-600 to-green-800">
          <div className="absolute inset-x-0 top-0 h-4 bg-green-500" />
        </div>

        {/* Gates */}
        {level.gates && level.gates.map(gate => (
          <motion.div
            key={gate.id}
            className={`absolute ${unlockedGates.has(gate.id) ? 'opacity-0 pointer-events-none' : ''}`}
            style={{
              left: gate.x,
              top: gate.y,
              width: gate.width,
              height: gate.height,
            }}
            animate={unlockedGates.has(gate.id) ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
          >
            <div className="w-full h-full bg-gradient-to-b from-red-600 to-red-800 rounded shadow-lg flex items-center justify-center">
              <Lock className="text-white w-4 h-4" />
            </div>
          </motion.div>
        ))}

        {/* Coins */}
        {level.coins && level.coins.map(coin => (
          <motion.div
            key={coin.id}
            className={`absolute ${collectedCoins.has(coin.id) ? 'hidden' : ''}`}
            style={{
              left: coin.x - 15,
              top: coin.y - 15,
            }}
            animate={{
              y: [0, -5, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          </motion.div>
        ))}

        {/* Goal */}
        {level.goal && (
          <motion.div
            className="absolute"
            style={{
              left: level.goal.x - 20,
              top: level.goal.y - 20,
            }}
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        )}

        {/* Player */}
        <motion.div
          className="absolute"
          style={{
            left: playerPos.x,
            top: playerPos.y,
          }}
          animate={{
            scaleX: (keys['ArrowLeft'] || keys['a']) ? -1 : 1,
          }}
        >
          <div className="w-10 h-10 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg" />
            <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
            <motion.div
              className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-white rounded"
              animate={velocity.y < 0 ? { scaleY: 1.5 } : { scaleY: 1 }}
            />
          </div>
        </motion.div>

        {/* Particles */}
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute pointer-events-none"
            style={{
              left: particle.x,
              top: particle.y,
              opacity: particle.life,
            }}
          >
            {particle.type === 'coin' ? (
              <Sparkles className="w-4 h-4 text-yellow-400" />
            ) : particle.type === 'win' ? (
              <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
            ) : (
              <div className="w-2 h-2 bg-white/60 rounded-full" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">←→</kbd>
            <span>or</span>
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">A/D</kbd>
            <span>Move</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Space</kbd>
            <span>or</span>
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">↑/W</kbd>
            <span>Jump</span>
          </div>
        </div>
      </div>

      {/* Question Modal */}
      <AnimatePresence>
        {showQuestion && currentQuestion && (
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Gate Locked!</h2>
                <p className="text-gray-600">Answer correctly to unlock</p>
              </div>
              
              <div className="mb-6">
                <p className="text-lg font-semibold text-gray-800 text-center mb-4">
                  {currentQuestion.question.q}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.question.options.map((option, i) => (
                    <motion.button
                      key={i}
                      onClick={() => handleAnswer(option)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over / Win Screen */}
      <AnimatePresence>
        {(gameState === 'gameOver' || gameState === 'win') && (
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {gameState === 'win' ? (
                <>
                  <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Victory!</h2>
                  <p className="text-xl text-gray-600 mb-4">Final Score: {score}</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">😢</div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Over</h2>
                  <p className="text-xl text-gray-600 mb-4">Score: {score}</p>
                </>
              )}
              
              <motion.button
                onClick={restartGame}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-8 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Play Again
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizAdventure;