"use client";

import React, { useEffect } from "react";

interface BrandIntroProps {
  onComplete?: () => void;
}

export const BrandIntro: React.FC<BrandIntroProps> = ({ onComplete }) => {
  useEffect(() => {
    if (onComplete) onComplete();
  }, [onComplete]);

  return null;
};
