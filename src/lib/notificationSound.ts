/**
 * Web Audio Synthesizer & Browser Notification Service
 * Plays clear, audible chime notifications and triggers desktop/tab notifications
 * even when the admin dashboard tab is in the background.
 */

class AudioNotificationService {
  private audioCtx: AudioContext | null = null;

  private initAudio() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  /**
   * Plays a distinct, rich two-tone success / notification chime
   */
  public playChime(type: "success" | "alert" | "receipt" = "receipt") {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === "receipt" || type === "success") {
        // High-pitched cheerful two-tone chime (F5 -> A5 -> C6)
        const notes = [
          { freq: 698.46, start: 0.0, dur: 0.15 }, // F5
          { freq: 880.00, start: 0.12, dur: 0.18 }, // A5
          { freq: 1046.50, start: 0.25, dur: 0.40 }, // C6
        ];

        notes.forEach(({ freq, start, dur }) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + start);

          gain.gain.setValueAtTime(0.001, now + start);
          gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);

          osc.start(now + start);
          osc.stop(now + start + dur + 0.05);
        });
      } else {
        // Alert chime (E5 -> G5)
        const notes = [
          { freq: 659.25, start: 0.0, dur: 0.2 },
          { freq: 783.99, start: 0.15, dur: 0.35 },
        ];

        notes.forEach(({ freq, start, dur }) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + start);

          gain.gain.setValueAtTime(0.001, now + start);
          gain.gain.exponentialRampToValueAtTime(0.4, now + start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);

          osc.start(now + start);
          osc.stop(now + start + dur + 0.05);
        });
      }
    } catch (e) {
      console.warn("Could not play audio notification chime:", e);
    }
  }

  /**
   * Requests desktop notification permission
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  /**
   * Displays desktop notification & plays sound
   */
  public async notify(title: string, options?: NotificationOptions, sound: "success" | "alert" | "receipt" = "receipt") {
    // 1. Play audible chime
    this.playChime(sound);

    // 2. Trigger browser notification if permitted
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(title, {
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            dir: "rtl",
            lang: "ar",
            ...options,
          });

          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (e) {
          console.warn("Notification error:", e);
        }
      }
    }
  }
}

export const notificationService = new AudioNotificationService();
