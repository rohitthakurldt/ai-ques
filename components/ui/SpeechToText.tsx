'use client';

import React, { useEffect, useState } from "react";
import { useRealtimeTranscription } from "@/components/hooks/useRealtimeTranscription";

interface SpeechToTextProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const SpeechToText: React.FC<SpeechToTextProps> = ({
  onTranscript,
  disabled,
}) => {
  const [liveText, setLiveText] = useState("");
  const {
    transcript,
    isFinal,
    recording,
    connecting,
    error,
    start,
    stop,
  } = useRealtimeTranscription({
    // Prefer env-provided secure websocket base; fallback to direct URL.
    url:
      (process.env.NEXT_WEB_SOCKET_SECURE_URL &&
        `${process.env.NEXT_WEB_SOCKET_SECURE_URL}/api/speech/realtime`) ||
      "wss://interview-ai-mkfq.onrender.com/api/speech/realtime",
    chunkMillis: 250,
  });

  const toggleRecording = async () => {
    if (disabled || connecting) return;

    try {
      if (recording) {
        await stop();
      } else {
        setLiveText("");
        await start();
      }
    } catch (err) {
      console.error("Speech-to-text error:", err);
    }
  };

  useEffect(() => {
    if (transcript) {
      setLiveText(transcript);
      onTranscript(transcript);
    }
  }, [onTranscript, transcript]);

  const isBusy = connecting;

  const label = recording
    ? "Listening..."
    : isBusy
    ? "Connecting..."
    : "Start Recording";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={toggleRecording}
        disabled={disabled || isBusy}
        className={`p-3 rounded-full transition-all ${
          recording
            ? "bg-red-500 text-white animate-pulse"
            : "bg-blue-500 text-white hover:bg-blue-600"
        } ${(disabled || isBusy) && "opacity-50 cursor-not-allowed"}`}
        aria-label={label}
      >
        {recording ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V7a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : isBusy ? (
          <svg
            className="w-6 h-6 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      <div className="text-xs text-gray-600">{label}</div>
      {liveText && (
        <div className="text-xs text-gray-800 bg-gray-100 rounded px-2 py-1 max-w-xs">
          {liveText}
          {!isFinal && <span className="animate-pulse"> …</span>}
        </div>
      )}
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
};


