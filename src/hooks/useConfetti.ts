import confetti from 'canvas-confetti';

export const useConfetti = () => {
  const fireConfetti = (options?: {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
  }) => {
    confetti({
      particleCount: options?.particleCount || 100,
      spread: options?.spread || 70,
      origin: { 
        x: options?.origin?.x || 0.5, 
        y: options?.origin?.y || 0.6 
      },
      colors: ['#00D4AA', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      zIndex: 9999,
    });
  };

  const fireStreakConfetti = () => {
    // Fire from both sides
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#FF6B00', '#FFD700', '#FF4500'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#FF6B00', '#FFD700', '#FF4500'],
      zIndex: 9999,
    });
  };

  const fireMilestoneConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  const fireTierUpgradeConfetti = () => {
    // Big celebration for tier upgrade
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      zIndex: 9999,
      colors: ['#B9F2FF', '#FFD700', '#C0C0C0', '#CD7F32'],
    };

    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ['star'],
    });

    confetti({
      ...defaults,
      particleCount: 25,
      scalar: 0.75,
      shapes: ['circle'],
    });
  };

  return {
    fireConfetti,
    fireStreakConfetti,
    fireMilestoneConfetti,
    fireTierUpgradeConfetti,
  };
};
