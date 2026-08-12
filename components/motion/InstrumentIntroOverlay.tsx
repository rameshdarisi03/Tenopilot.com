"use client";

import React from "react";
import { BrandIntro } from "./BrandIntro";

interface InstrumentIntroOverlayProps {
  onComplete?: () => void;
}

export const InstrumentIntroOverlay: React.FC<InstrumentIntroOverlayProps> = ({
  onComplete,
}) => {
  return <BrandIntro onComplete={onComplete} />;
};
