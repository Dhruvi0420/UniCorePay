import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Radio, Sparkles } from "lucide-react";
import type { KitchenOrder } from "../../types";

interface PaytmSoundboxProps {
  latestOrder?: KitchenOrder;
}

export const PaytmSoundbox: React.FC<PaytmSoundboxProps> = ({ latestOrder }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState<string>(
    "Paytm Soundbox Active · Ready for campus canteen transactions"
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const speakPayment = (amount: number, token: string) => {
    const text = `Paytm par ${Math.round(amount)} rupaye prapt hue. Token number ${token}`;
    setAnnouncementText(text);

    if (!soundEnabled || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "hi-IN"; // Hindi voice
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (latestOrder && latestOrder.id !== lastAnnouncedId) {
      setLastAnnouncedId(latestOrder.id);
      speakPayment(latestOrder.totalPrice, latestOrder.tokenNumber);
    }
  }, [latestOrder, lastAnnouncedId, soundEnabled]);

  const handleTestVoice = () => {
    speakPayment(120, "#T-101");
  };

  return (
    <div className={`paytm-soundbox-card ${isPlaying ? "soundbox-pulsing" : ""}`}>
      <div className="soundbox-top">
        <div className="soundbox-badge">
          <span className="paytm-pill-mini">paytm</span>
          <span className="soundbox-model-label">Soundbox 3.0 · Smart Audio</span>
        </div>
        <button
          className={`soundbox-toggle-btn ${soundEnabled ? "enabled" : "muted"}`}
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "Mute Soundbox Voice" : "Enable Soundbox Voice"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      <div className="soundbox-speaker-grill">
        <div className="grill-bars">
          <span className="bar bar-1" />
          <span className="bar bar-2" />
          <span className="bar bar-3" />
          <span className="bar bar-4" />
          <span className="bar bar-5" />
        </div>
        <div className="soundbox-status-line">
          <Radio size={14} className={isPlaying ? "text-orange animate-pulse" : "text-muted"} />
          <p className="soundbox-text">{announcementText}</p>
        </div>
      </div>

      <div className="soundbox-footer">
        <span className="soundbox-net-tag">4G SIM Connected · Canteen Core</span>
        <button className="soundbox-test-btn" onClick={handleTestVoice}>
          <Sparkles size={13} />
          <span>Test Announcement</span>
        </button>
      </div>
    </div>
  );
};
