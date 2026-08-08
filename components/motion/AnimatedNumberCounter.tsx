"use client";

import React from "react";
import { DigitRollingOdometer } from "./DigitRollingOdometer";

interface AnimatedNumberCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
  formatter?: (val: number) => string;
}

/**
 * AnimatedNumberCounter - World-class mechanical digit rolling counter
 * Uses slot-machine vertical digit reels (Apple / Stripe standard)
 */
export const AnimatedNumberCounter: React.FC<AnimatedNumberCounterProps> = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) => {
  return (
    <DigitRollingOdometer
      value={value}
      prefix={prefix}
      suffix={suffix}
      decimals={decimals}
      className={className}
    />
  );
};
