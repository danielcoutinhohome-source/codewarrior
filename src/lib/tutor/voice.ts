"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Push-to-talk speech input (Web Speech API) and read-aloud (speechSynthesis).
// The microphone is only requested when the student presses the mic button.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const RecognitionCtor = () => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export function useSpeechInput(onText: (finalText: string, interim: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => setSupported(!!RecognitionCtor()), []);
  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = RecognitionCtor();
    if (!Ctor || listening) return;
    setError(null);
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = true;
    let committed = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) committed += res[0].transcript;
        else interim += res[0].transcript;
      }
      cb.current(committed, interim);
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone access was blocked. You can still type." : e.error === "no-speech" ? "Didn't hear anything. Try again." : "Voice input stopped. You can still type.");
    };
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Voice input couldn't start.");
    }
  }, [listening]);

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  return { supported, listening, error, start, stop };
}

// Strips code and markdown so read-aloud sounds natural.
export function speakable(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " (code example shown on screen) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/←/g, " gets ")
    .replace(/≠/g, " not equal to ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeechOutput() {
  const [supported, setSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  useEffect(() => setSupported(typeof window !== "undefined" && "speechSynthesis" in window), []);
  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);
  const speak = useCallback((id: string, text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.rate = 1;
    u.onend = () => setSpeakingId((s) => (s === id ? null : s));
    u.onerror = () => setSpeakingId((s) => (s === id ? null : s));
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  }, []);
  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);
  return { supported, speakingId, speak, stop };
}
