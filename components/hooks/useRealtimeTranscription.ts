'use client';

import { useCallback, useEffect, useRef, useState } from "react";

interface RealtimeTranscriptionOptions {
  url: string;
  chunkMillis?: number;
}

export interface RealtimeTranscriptionState {
  transcript: string;
  isFinal: boolean;
  recording: boolean;
  connecting: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Stream microphone audio to a websocket STT service and surface live text.
 * Note: the server protocol is assumed to accept raw audio/webm chunks and
 * return JSON messages containing either `text` or `transcript` plus an
 * optional `isFinal` flag. If your server uses different event names/payloads,
 * adjust parsing/sent signals accordingly.
 */
export function useRealtimeTranscription(
  options: RealtimeTranscriptionOptions
): RealtimeTranscriptionState {
  const { url, chunkMillis = 250 } = options;
  const TARGET_SAMPLE_RATE = 24000;

  const socketRef = useRef<WebSocket | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanupMedia = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close().catch(() => undefined);
    processorRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const cleanupSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: "stop" }));
      } catch (err) {
        console.warn("Unable to send end event", err);
      }
      socketRef.current.close();
    } else if (socketRef.current) {
      socketRef.current.close();
    }
    socketRef.current = null;
  }, []);

  const stop = useCallback(async () => {
    cleanupMedia();
    cleanupSocket();
    setRecording(false);
    setConnecting(false);
  }, [cleanupMedia, cleanupSocket]);

  const start = useCallback(async () => {
    if (recording || connecting) return;
    setError(null);
    setTranscript("");
    setIsFinal(false);
    setConnecting(true);

    try {
      socketRef.current = new WebSocket(url);
      socketRef.current.binaryType = "arraybuffer";
      isReadyRef.current = false;

      socketRef.current.onopen = async () => {
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: TARGET_SAMPLE_RATE,
            },
          });

          // Set up audio graph for PCM16 mono @ 24 kHz
          audioContextRef.current = new AudioContext({
            sampleRate: TARGET_SAMPLE_RATE,
          });
          sourceRef.current = audioContextRef.current.createMediaStreamSource(
            streamRef.current
          );

          // Buffer size ~ chunkMillis (at 24kHz, 1024 ≈ 42ms, 2048 ≈ 85ms)
          const samplesPerChunk = Math.max(
            1024,
            Math.min(4096, Math.floor((TARGET_SAMPLE_RATE * chunkMillis) / 1000))
          );
          processorRef.current = audioContextRef.current.createScriptProcessor(
            samplesPerChunk,
            1,
            1
          );

          const toBase64 = (buffer: ArrayBuffer) => {
            const bytes = new Uint8Array(buffer);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
          };

          processorRef.current.onaudioprocess = (audioEvent) => {
            const input = audioEvent.inputBuffer.getChannelData(0);
            // Convert Float32 [-1,1] to PCM16 little-endian
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            if (
              socketRef.current?.readyState === WebSocket.OPEN &&
              isReadyRef.current
            ) {
              socketRef.current.send(
                JSON.stringify({
                  type: "audio",
                  data: toBase64(pcm16.buffer),
                })
              );
            }
          };

          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current.destination);

          setConnecting(false);
          setRecording(true);
        } catch (mediaError) {
          console.error("Media setup error", mediaError);
          setError("Unable to access microphone.");
          setConnecting(false);
          stop();
        }
      };

      socketRef.current.onmessage = (event: MessageEvent) => {
        try {
          if (typeof event.data === "string") {
            const payload = JSON.parse(event.data);
            switch (payload?.type) {
              case "ready":
                isReadyRef.current = true;
                // Send config once server is ready.
                socketRef.current?.send(
                  JSON.stringify({
                    type: "config",
                    language: "en",
                  })
                );
                break;
              case "speech_started":
                setIsFinal(false);
                break;
              case "speech_stopped":
                // server VAD ended speech; wait for final transcript event
                break;
              case "transcript": {
                const text: string =
                  payload?.text ??
                  payload?.transcript ??
                  payload?.message ??
                  "";
                if (text) {
                  setTranscript(text);
                  setIsFinal(Boolean(payload?.is_final));
                }
                break;
              }
              case "error":
                setError(payload?.message || "Realtime error");
                break;
              case "closed":
                cleanupMedia();
                setRecording(false);
                setConnecting(false);
                break;
              default:
                break;
            }
          }
        } catch (parseError) {
          console.warn("Unable to parse transcription message", parseError);
        }
      };

      socketRef.current.onerror = (socketError) => {
        console.error("WebSocket error", socketError);
        setError("Realtime connection failed.");
      };

      socketRef.current.onclose = () => {
        cleanupMedia();
        setRecording(false);
        setConnecting(false);
      };
    } catch (socketInitError) {
      console.error("Unable to start websocket", socketInitError);
      setError("Unable to start realtime transcription.");
      setConnecting(false);
      stop();
    }
  }, [
    cleanupMedia,
    cleanupSocket,
    connecting,
    recording,
    stop,
    url,
    TARGET_SAMPLE_RATE,
  ]);

  useEffect(() => {
    return () => {
      cleanupMedia();
      cleanupSocket();
    };
  }, [cleanupMedia, cleanupSocket]);

  return {
    transcript,
    isFinal,
    recording,
    connecting,
    error,
    start,
    stop,
  };
}

