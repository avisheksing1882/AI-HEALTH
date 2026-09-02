// Web Audio API Synthesizer for tactile feedback without external asset loading

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.getContext();
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(evt => {
          window.removeEventListener(evt, unlock);
        });
      };
      ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(evt => {
        window.addEventListener(evt, unlock, { once: true, passive: true });
      });
    }
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  // Soft UI Click
  public playTap() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio autoplay policies safely ignored
    }
  }

  // Camera Shutter Snap
  public playCameraSnap() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Noise burst for mechanical shutter
      const bufferSize = ctx.sampleRate * 0.06;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.06);
    } catch {
      // Ignore
    }
  }

  // AI Scan Success Chime
  public playSuccessChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.07);

        gain.gain.setValueAtTime(0, now + index * 0.07);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.25);
      });
    } catch {
      // Ignore
    }
  }

  // Goal & Milestone Ring Close Celebration
  public playRingCelebration() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const melody = [
        { f: 587.33, d: 0.1 }, // D5
        { f: 659.25, d: 0.1 }, // E5
        { f: 880.00, d: 0.15 }, // A5
        { f: 1046.50, d: 0.15 }, // C6
        { f: 1174.66, d: 0.35 }  // D6 triumph
      ];

      let t = now;
      melody.forEach(m => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(m.f, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + m.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + m.d);
        t += m.d * 0.8;
      });
    } catch {
      // Ignore
    }
  }

  // Water droplet sound
  public playWaterDrop() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }

  // 🔔 1. Elegant Multi-Harmonic Bell (Default Reminder Tone)
  public playReminderAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bells = [
        { f: 659.25, start: 0, dur: 0.45, vol: 0.16 }, // E5
        { f: 987.77, start: 0.08, dur: 0.55, vol: 0.14 }, // B5
        { f: 1318.51, start: 0.16, dur: 0.70, vol: 0.18 } // E6
      ];

      bells.forEach(b => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(b.f, now + b.start);

        gain.gain.setValueAtTime(0, now + b.start);
        gain.gain.linearRampToValueAtTime(b.vol, now + b.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + b.start + b.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + b.start);
        osc.stop(now + b.start + b.dur);
      });
    } catch {
      // Ignore
    }
  }

  // 💧 2. Water Hydration Reminder Chime (Dual Resonant Droplet Ripple)
  public playWaterReminderSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const drops = [
        { start: 0, fStart: 600, fEnd: 1500, dur: 0.14 },
        { start: 0.11, fStart: 820, fEnd: 1850, dur: 0.18 }
      ];

      drops.forEach(d => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(d.fStart, now + d.start);
        osc.frequency.exponentialRampToValueAtTime(d.fEnd, now + d.start + d.dur * 0.7);

        gain.gain.setValueAtTime(0.20, now + d.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + d.start + d.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + d.start);
        osc.stop(now + d.start + d.dur);
      });
    } catch {
      // Ignore
    }
  }

  // 🍽️ 3. Meal & Nutrition Reminder Chime (Warm Arpeggio)
  public playMealReminderSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.14, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  // 💊 4. Medication Alert (Urgent Double Pulse)
  public playMedicationAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const pulses = [
        { t: 0, f: 880 },
        { t: 0.12, f: 1174.66 }
      ];

      pulses.forEach(p => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.f, now + p.t);

        gain.gain.setValueAtTime(0, now + p.t);
        gain.gain.linearRampToValueAtTime(0.20, now + p.t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + p.t + 0.20);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + p.t);
        osc.stop(now + p.t + 0.20);
      });
    } catch {
      // Ignore
    }
  }

  // 🏃 5. Workout & Activity Alert (Energetic Upbeat Fanfare)
  public playWorkoutAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const fanfare = [
        { f: 523.25, d: 0.08 }, // C5
        { f: 659.25, d: 0.08 }, // E5
        { f: 783.99, d: 0.08 }, // G5
        { f: 1046.50, d: 0.28 }  // C6
      ];

      let t = now;
      fanfare.forEach(item => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + item.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + item.d);
        t += item.d * 0.85;
      });
    } catch {
      // Ignore
    }
  }

  // Smart dispatcher for any reminder type or title
  public playReminderSoundForType(typeOrTitle: string) {
    const lower = (typeOrTitle || '').toLowerCase();
    if (lower.includes('water') || lower.includes('hydration') || lower.includes('drink')) {
      this.playWaterReminderSound();
    } else if (lower.includes('meal') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast') || lower.includes('food') || lower.includes('nutrition')) {
      this.playMealReminderSound();
    } else if (lower.includes('med') || lower.includes('pill') || lower.includes('dose') || lower.includes('supplement')) {
      this.playMedicationAlert();
    } else if (lower.includes('workout') || lower.includes('step') || lower.includes('exercise') || lower.includes('run') || lower.includes('gym')) {
      this.playWorkoutAlert();
    } else {
      this.playReminderAlert();
    }
  }
}

export const soundFx = new SoundEngine();

export function triggerHaptic() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([15, 30, 20]);
    } catch {
      // Ignore
    }
  }
}
