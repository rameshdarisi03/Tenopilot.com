"use client";

import confetti from "canvas-confetti";

/**
 * fireCelebrationConfetti - World-class celebration particle burst
 * Fires lightweight high-fps confetti particles across the canvas
 */
export function fireCelebrationConfetti() {
  try {
    // 1. Center burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"],
    });

    // 2. Side cannons burst
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
      });
    }, 150);
  } catch (e) {
    console.warn("Confetti animation error:", e);
  }
}
