"use client";

import { useEffect, useState, ReactNode } from "react";
import { ChevronDown, CheckCircle2, ShieldCheck, Zap, Layers, Users, Sparkles, Building2, Wallet, ArrowRight } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export function LandingPageClient({
  faqItems,
}: {
  faqItems: FAQItem[];
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-8");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-4">
      {faqItems.map((item, index) => {
        const isOpen = openFaq === index;
        return (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-sm border border-[#d7c2b9]/60 overflow-hidden transition-all hover:border-[#964407]/30"
          >
            <button
              onClick={() => setOpenFaq(isOpen ? null : index)}
              className="w-full flex justify-between items-center p-6 text-left hover:bg-[#f8ede3]/50 transition-colors font-bold text-lg text-[#201a17]"
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-[#964407] transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-6 pb-6 text-[#554339] text-base leading-relaxed border-t border-[#f8ede3] pt-4">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
