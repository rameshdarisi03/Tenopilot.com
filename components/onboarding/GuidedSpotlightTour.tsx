"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Building2,
  Wallet,
  Send,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  placement?: "top" | "bottom" | "auto";
}

interface GuidedSpotlightTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function GuidedSpotlightTour({
  steps,
  isOpen,
  onClose,
  onComplete,
}: GuidedSpotlightTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];

  // Update target bounding rectangle
  const updateRect = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Scroll target element smoothly into view & update rect
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    setIsTransitioning(true);
    const el = document.querySelector(currentStep.targetSelector);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => {
        updateRect();
        setIsTransitioning(false);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setTargetRect(null);
      setIsTransitioning(false);
    }
  }, [isOpen, currentStepIndex, currentStep, updateRect]);

  // Handle window resize and scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => updateRect();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, { passive: true });

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate);
    };
  }, [isOpen, updateRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          onClose();
          onComplete?.();
        }
      } else if (e.key === "ArrowLeft" && currentStepIndex > 0) {
        setCurrentStepIndex((prev) => prev - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, onClose, onComplete]);

  if (!isOpen || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      onComplete?.();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Dynamically measured card dimensions to prevent any clipping on mobile
  const [tooltipDimensions, setTooltipDimensions] = useState<{ width: number; height: number }>({
    width: 360,
    height: 220,
  });

  // Measure tooltip size dynamically whenever step changes or window resizes
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTooltipDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, [currentStepIndex, isOpen, targetRect]);

  // Determine tooltip placement: smart viewport-aware positioning
  let tooltipTop = 0;
  let tooltipLeft = 0;
  const padding = 10;
  const margin = 16;
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardHeight = tooltipDimensions.height || 220;
  const cardWidth = Math.min(380, windowWidth - margin * 2);

  if (targetRect) {
    const spaceBelow = windowHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    // Prefer placement based on available space
    let placeTop = false;
    if (currentStep.placement === "top") {
      placeTop = spaceAbove >= cardHeight + margin || spaceAbove > spaceBelow;
    } else {
      placeTop = spaceBelow < cardHeight + margin && spaceAbove > spaceBelow;
    }

    if (placeTop) {
      // Place above target
      tooltipTop = Math.max(margin, targetRect.top - cardHeight - padding - 6);
    } else {
      // Place below target
      tooltipTop = Math.min(windowHeight - cardHeight - margin, targetRect.bottom + padding + 6);
    }

    // Safety clamp top inside screen bounds
    tooltipTop = Math.max(margin, Math.min(windowHeight - cardHeight - margin, tooltipTop));

    // Centered or clamped horizontally
    tooltipLeft = Math.max(
      margin,
      Math.min(
        windowWidth - cardWidth - margin,
        targetRect.left + targetRect.width / 2 - cardWidth / 2
      )
    );
  } else {
    // Fallback: center in viewport
    tooltipTop = Math.max(margin, (windowHeight - cardHeight) / 2);
    tooltipLeft = Math.max(margin, (windowWidth - cardWidth) / 2);
  }

  const StepIcon = currentStep.icon || Sparkles;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none font-sans animate-in fade-in duration-200">
      {/* SVG Backdrop Mask with Cut-Out Spotlight */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cut-out reveals spotlighted target element */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - padding)}
                y={Math.max(0, targetRect.top - padding)}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="18"
                ry="18"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Darkened backdrop overlay with cut-out hole */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(18, 13, 10, 0.72)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight Halo Pulse Ring over Target Element */}
      {targetRect && (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-300 border-2 border-[#c2652a] ring-4 ring-[#c2652a]/25 shadow-[0_0_35px_rgba(194,101,42,0.45)]"
          style={{
            top: `${Math.max(0, targetRect.top - padding)}px`,
            left: `${Math.max(0, targetRect.left - padding)}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
          }}
        />
      )}

      {/* Floating Interactive Tooltip Card */}
      <div
        ref={tooltipRef}
        className="fixed z-50 w-full max-w-[calc(100vw-32px)] sm:max-w-[380px] p-5 sm:p-6 bg-white border border-[#d7c2b9] rounded-3xl shadow-2xl transition-all duration-300 animate-in zoom-in-95"
        style={{
          width: `${cardWidth}px`,
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
        }}
      >
        {/* Header: Step Badge & Close */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff8f6] border border-[#d7c2b9] text-[#964407] font-black text-[10px] tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2652a] animate-ping" />
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#964407] flex items-center justify-center shrink-0">
              <StepIcon className="w-4 h-4 text-[#964407]" />
            </div>
            <h4 className="font-serif font-bold text-base sm:text-lg text-[#201a17] leading-snug">
              {currentStep.title}
            </h4>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-normal">
            {currentStep.description}
          </p>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? "w-6 bg-[#964407]"
                    : idx < currentStepIndex
                    ? "w-2 bg-[#d7c2b9]"
                    : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isTransitioning}
                className="py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isTransitioning}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] text-white font-bold text-xs shadow-md shadow-[#c2652a]/20 flex items-center gap-1.5 transition-all hover:opacity-95 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>{isLastStep ? "Get Started" : "Next"}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Subtle Skip Link */}
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-gray-400 hover:text-gray-600 hover:underline cursor-pointer"
          >
            Skip Product Tour
          </button>
        </div>
      </div>
    </div>
  );
}
