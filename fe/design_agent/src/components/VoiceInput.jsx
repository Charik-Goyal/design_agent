import React, { useState, useEffect, useRef, memo } from "react";
import { Mic, MicOff } from "lucide-react";

/**
 * Props:
 *   onTranscript(text: string, isFinal: boolean): void
 *   disabled?: boolean
 */
const VoiceInput = memo(function ({
  onTranscript,
  disabled = false,
}) {
  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const [listening, setListening] = useState(false);
  const recognizerRef = useRef(null);
  const lastFinalRef = useRef("");  // <-- track last final to avoid duplicates

  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang           = "en-US";
    rec.interimResults = true;   // live partials
    rec.continuous     = true;   // stays on until we stop it

    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      // get the single most recent result
      const result = e.results[e.resultIndex];
      const text   = result[0].transcript.trim();
      const isFinal= result.isFinal;

      console.log(`🎤 onresult (final=${isFinal}):`, text);

      if (isFinal) {
        // only fire if different from last final
        if (text !== lastFinalRef.current) {
          lastFinalRef.current = text;
          onTranscript(text, true);
        }
      } else {
        onTranscript(text, false);
      }
    };

    rec.onerror = (err) => {
      console.error("❌ onerror:", err);
      setListening(false);
    };
    rec.onend = () => {
      console.log("🔴 onend");
      setListening(false);
    };

    recognizerRef.current = rec;
  }, [SpeechRecognition, onTranscript]);

  const toggle = () => {
    if (!recognizerRef.current) {
      alert("SpeechRecognition API not supported");
      return;
    }
    if (listening) {
      setListening(false);
      console.log("🛑 stop");
      recognizerRef.current.stop();
    } else {
      console.log("▶️ start");
      setListening(true);
      lastFinalRef.current = "";  // reset duplicate guard
      try {
        recognizerRef.current.start();
      } catch (err) {
        setListening(false);
        console.warn("start() failed:", err);
      }
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={disabled || !SpeechRecognition}
      className={`p-2 rounded-lg transition-colors ${
        listening ? "bg-red-500" : "bg-green-500 hover:bg-green-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={
        !SpeechRecognition
          ? "Not supported"
          : listening
          ? "Click to stop listening"
          : "Click to start listening"
      }
    >
      {listening ? (
        <MicOff className="w-5 h-5 text-white" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
});

export default VoiceInput;
