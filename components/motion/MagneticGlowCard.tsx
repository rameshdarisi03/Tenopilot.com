"use client";

import React, { useRef, useState } from "react";

interface MagneticGlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g. "rgba(99, 102, 241, 0.15)"
  onClick?: () => void;
}

/**
 * MagneticGlowCard - World-class interactive glass spotlight card
 * Dynamically tracks mouse position to cast subtle radial spotlight glow
 */
export const MagneticGlowCard: React.FC<MagneticGlowCardProps> = ({
  children,
  className = "",
  glowColor = "rgba(99, 102, 241, 0.12)",
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      } ${className}`}
    >
      {/* Radial Spotlight Glow Overlay */}
      <div
        className="pointer-events-none absolute -inset-px rounded-inherit opacity-0 transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${cursorPos.x}px ${cursorPos.y}px, ${glowColor}, transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
};
