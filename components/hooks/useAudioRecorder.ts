import { useRef, useState } from "react";

export interface UseAudioRecorder {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  recording: boolean;
}

export function useAudioRecorder(): UseAudioRecorder {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [recording, setRecording] = useState<boolean>(false);

  const startRecording = async (): Promise<void> => {
    streamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType: "audio/webm",
    });

    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return;

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Stop mic stream
        streamRef.current?.getTracks().forEach((track) => track.stop());

        setRecording(false);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  return { startRecording, stopRecording, recording };
}
