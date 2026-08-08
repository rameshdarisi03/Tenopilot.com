"use client";

import React, { useEffect, useState } from "react";

interface SingleDigitReelProps {
  digit: string;
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * SingleDigitReel - Vertical 0-9 mechanical reel for a single digit column
 * Performs vertical sliding using cubic spring transition
 */
const SingleDigitReel: React.FC<SingleDigitReelProps> = ({ digit }) => {
  const isNumber = !isNaN(Number(digit));
  const numericVal = isNumber ? Number(digit) : 0;

  if (!isNumber) {
    return <span className="inline-block px-[1px] select-none">{digit}</span>;
  }

  return (
    <span className="inline-block overflow-hidden h-[1.15em] relative align-baseline select-none">
      <span
        className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform"
        style={{
          transform: `translateY(-${numericVal * 10}%)`,
        }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="h-[1.15em] flex items-center justify-center font-bold tabular-nums"
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
};

interface DigitRollingOdometerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * DigitRollingOdometer - Apple Watch / Stripe style slot-machine digit rolling engine
 * Splits numbers into individual character reels and slides each digit column vertically
 */
export const DigitRollingOdometer: React.FC<DigitRollingOdometerProps> = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) => {
  const [formattedChars, setFormattedChars] = useState<string[]>([]);

  useEffect(() => {
    const rounded = Number(value.toFixed(decimals));
    const formattedStr = rounded.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const fullStr = `${prefix}${formattedStr}${suffix}`;
    setFormattedChars(fullStr.split(""));
  }, [value, prefix, suffix, decimals]);

  return (
    <span className={`inline-flex items-baseline font-sans tabular-nums ${className}`}>
      {formattedChars.map((char, index) => (
        <SingleDigitReel key={`${index}-${char}`} digit={char} />
      ))}
    </span>
  );
};
