import * as Speech from "expo-speech";
import { Platform } from "react-native";

const VOICE_CONFIG = {
  en: {
    language: "en-US",
    pitch: 0.9,
    rate: Platform.OS === "web" ? 0.95 : 0.9,
  },
  ta: {
    language: "ta-IN",
    pitch: 1.0,
    rate: Platform.OS === "web" ? 0.9 : 0.85,
  },
};

let currentSpeechId = 0;

export function stopSpeech() {
  currentSpeechId++;
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

export function speak(
  text: string,
  lang: "en" | "ta" = "en",
  onDone?: () => void,
  onStart?: () => void
): void {
  const id = ++currentSpeechId;
  const config = VOICE_CONFIG[lang];

  Speech.stop();

  setTimeout(() => {
    if (id !== currentSpeechId) return;

    Speech.speak(text, {
      language: config.language,
      pitch: config.pitch,
      rate: config.rate,
      onStart: () => {
        if (id === currentSpeechId && onStart) onStart();
      },
      onDone: () => {
        if (id === currentSpeechId && onDone) onDone();
      },
      onError: () => {
        if (id === currentSpeechId && onDone) onDone();
      },
      onStopped: () => {
        if (id === currentSpeechId && onDone) onDone();
      },
    });
  }, 200);
}

export function speakChunked(
  text: string,
  lang: "en" | "ta" = "en",
  onChunkStart?: (chunkIndex: number) => void,
  onAllDone?: () => void
): void {
  const id = ++currentSpeechId;
  const sentences = text
    .split(/(?<=[.!?।])\s+/)
    .filter((s) => s.trim().length > 0);

  if (sentences.length === 0) {
    onAllDone?.();
    return;
  }

  let index = 0;

  function speakNext() {
    if (id !== currentSpeechId || index >= sentences.length) {
      if (id === currentSpeechId) onAllDone?.();
      return;
    }

    const chunk = sentences[index];
    onChunkStart?.(index);

    speak(
      chunk,
      lang,
      () => {
        index++;
        speakNext();
      }
    );
  }

  speakNext();
}
