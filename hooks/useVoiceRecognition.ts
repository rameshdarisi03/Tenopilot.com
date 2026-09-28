"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SpeechLanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  samplePlaceholder: string;
}

export const INDIAN_LANGUAGES: SpeechLanguageOption[] = [
  {
    code: "en-IN",
    label: "Auto / English",
    nativeLabel: "English / Hinglish",
    samplePlaceholder: "Ask: 'Who has not paid rent this month?'",
  },
  {
    code: "te-IN",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    samplePlaceholder: "అడగండి: 'ఈ రోజు ఎవరు జాయిన్ అయ్యారు?'",
  },
  {
    code: "hi-IN",
    label: "Hindi",
    nativeLabel: "हिंदी",
    samplePlaceholder: "पूछें: 'किस-किस का किराया बाकी है?'",
  },
  {
    code: "bn-IN",
    label: "Bengali",
    nativeLabel: "বাংলা",
    samplePlaceholder: "জিজ্ঞেস করুন: 'কার কার ভাড়া বাকি আছে?'",
  },
  {
    code: "kn-IN",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    samplePlaceholder: "ಕೇಳಿ: 'ಯಾರ ಬಾಡಿಗೆ ಬಾಕಿ ಇದೆ?'",
  },
  {
    code: "ta-IN",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    samplePlaceholder: "கேளுங்கள்: 'வாடகை தராதவர்கள் யார்?'",
  },
  {
    code: "ml-IN",
    label: "Malayalam",
    nativeLabel: "മലയാളം",
    samplePlaceholder: "ചോദിക്കൂ: 'ആർക്കൊക്കെ വാടക ബാക്കിയുണ്ട്?'",
  },
];

export function useVoiceRecognition(onFinalResult?: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-IN");

  const recognitionRef = useRef<any>(null);

  // Load sticky preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("tenopilot_copilot_lang");
      if (savedLang && INDIAN_LANGUAGES.some((l) => l.code === savedLang)) {
        setSelectedLanguage(savedLang);
      }
    }
  }, []);

  const changeLanguage = useCallback((langCode: string) => {
    setSelectedLanguage(langCode);
    if (typeof window !== "undefined") {
      localStorage.setItem("tenopilot_copilot_lang", langCode);
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  // Initialize SpeechRecognition instance
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        setInterimTranscript(currentInterim);

        if (finalChunk) {
          setTranscript((prev) => {
            const combined = prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim();
            if (onFinalResult) {
              onFinalResult(combined);
            }
            return combined;
          });
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "no-speech") {
          // Soft ignore silence timeout
          return;
        }
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setError("Microphone permission denied. Please allow microphone access in your browser settings.");
        } else {
          setError(`Voice input notice: ${event.error || "Please try again."}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      console.warn("SpeechRecognition init warning:", e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [selectedLanguage, onFinalResult]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");

    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser. Please type your question.");
      return;
    }

    try {
      recognitionRef.current.lang = selectedLanguage;
      recognitionRef.current.start();
    } catch (err: any) {
      // If already started, quietly ignore
      console.warn("startListening warning:", err);
    }
  }, [selectedLanguage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    selectedLanguage,
    changeLanguage,
    startListening,
    stopListening,
    resetTranscript,
  };
}
