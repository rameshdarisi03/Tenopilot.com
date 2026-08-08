"use client";

import React, { useEffect, useState } from "react";

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
 * AnimatedNumberCounter - World-class smooth rolling number counter
 * Performs high-precision 60fps requestAnimationFrame interpolation
 * Supports Indian Rupee formatting (e.g. ₹1,07,500), decimals, and percentages
 */
export const AnimatedNumberCounter: React.FC<AnimatedNumberCounterProps> = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  durationMs = 800,
  className = "",
  formatter,
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = value;

    if (startValue === endValue) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      
      // Smooth cubic ease-out curve (1 - (1 - t)^3)
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOutProgress;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value, durationMs]);

  const formatNumber = (num: number) => {
    if (formatter) return formatter(num);

    const rounded = Number(num.toFixed(decimals));
    
    // Indian Number Format (e.g., 1,07,500)
    let formattedStr = rounded.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${prefix}${formattedStr}${suffix}`;
  };

  return (
    <span className={`inline-block transition-transform duration-150 tabular-nums ${className}`}>
      {formatNumber(displayValue)}
    </span>
  );
};
