/**
 * useDoorbellAlert
 * ─────────────────────────────────────────────────────────────────────────────
 * Campainha Digital — Hook de alerta de campainha
 *
 * Responsabilidades:
 *  1. Toca um "ding-dong" real via Web Audio API (sem arquivo externo)
 *     com volume máximo forçado via GainNode (gain = 2.0).
 *  2. Vibra o dispositivo de forma repetitiva e sincronizada com o ritmo
 *     do ding-dong: [300ms ON, 100ms OFF, 500ms ON, 800ms PAUSA] → loop.
 *  3. Expõe startDoorbell() e stopDoorbell() para controle externo.
 *
 * Compatibilidade:
 *  - Web Audio API: suportado em todos os browsers modernos, inclusive Safari iOS.
 *  - Vibration API: suportado em Android (Chrome/Firefox). iOS ainda não suporta
 *    Vibration API em browsers — nesse caso o código simplesmente ignora.
 *
 * IMPORTANTE: No iOS, para contornar a restrição de autoplay de áudio,
 * o AudioContext deve ser criado/retomado dentro de um evento de interação
 * do usuário. Por isso, startDoorbell() deve ser chamado em resposta a um
 * evento do socket (que é disparado após interação prévia do usuário na página).
 */

let _ctx = null;           // AudioContext singleton (reutilizado entre chamadas)
let _soundInterval = null; // ID do setInterval do som
let _vibeInterval  = null; // ID do setInterval da vibração

// ─── Padrão de vibração campainha ─────────────────────────────────────────────
// [300ms ligado, 100ms desligado, 600ms ligado, 1000ms pausa]
// Duração total do padrão: 2000ms — igual ao intervalo do som (2.2s)
const VIBRATION_PATTERN = [300, 100, 600, 1000];

// ─── Cria ou retoma o AudioContext ────────────────────────────────────────────
function getAudioContext() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

// ─── Toca UMA batida de ding-dong ─────────────────────────────────────────────
function playOneDingDong() {
  try {
    const ctx = getAudioContext();

    // Master gain com volume máximo (2.0 = força clipping suave — máximo audível)
    const master = ctx.createGain();
    master.gain.setValueAtTime(2.0, ctx.currentTime);
    master.connect(ctx.destination);

    /**
     * Cria um oscilador com envelope ADSR simplificado.
     * @param {number} freq      - Frequência em Hz
     * @param {number} startSec  - Offset em segundos a partir de ctx.currentTime
     * @param {number} durSec    - Duração total em segundos
     */
    const note = (freq, startSec, durSec) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(master);

      osc.type = 'sine';

      // Frequência: começa no tom e decai levemente (caráter de sino)
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startSec);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 0.55,
        ctx.currentTime + startSec + durSec
      );

      // Envelope de amplitude: attack rápido, decay longo (comportamento de sino)
      gain.gain.setValueAtTime(0.001, ctx.currentTime + startSec);
      gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + startSec + 0.01); // attack 10ms
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startSec + durSec);

      osc.start(ctx.currentTime + startSec);
      osc.stop(ctx.currentTime + startSec + durSec + 0.05);
    };

    // DING — 880 Hz (nota A5), duração 0.7s
    note(880, 0.0, 0.7);
    // DONG — 660 Hz (nota E5), duração 1.0s, começa 0.65s depois
    note(660, 0.65, 1.0);

  } catch (err) {
    console.warn('[DoorbellAlert] Erro no Web Audio:', err);
  }
}

// ─── Dispara vibração uma vez com o padrão campainha ─────────────────────────
function vibrateOnce() {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(VIBRATION_PATTERN);
    } catch {}
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia o alerta de campainha: som + vibração em loop.
 * Deve ser chamado em contexto de interação do usuário (ou evento de socket
 * disparado após interação) para respeitar a política de autoplay do iOS.
 */
export function startDoorbell() {
  stopDoorbell(); // garante que não há loop duplo

  // Primeira execução imediata
  playOneDingDong();
  vibrateOnce();

  // Loop: repete a cada 2.2s (som ding=0.7s + dong=1.0s + pausa ~0.5s)
  _soundInterval = setInterval(() => {
    playOneDingDong();
  }, 2200);

  // Vibração repete a cada 2.2s também (sincronizado com o som)
  _vibeInterval = setInterval(() => {
    vibrateOnce();
  }, 2200);
}

/**
 * Para o alerta de campainha imediatamente.
 * Chame ao atender, ignorar ou encerrar a chamada.
 */
export function stopDoorbell() {
  if (_soundInterval) {
    clearInterval(_soundInterval);
    _soundInterval = null;
  }
  if (_vibeInterval) {
    clearInterval(_vibeInterval);
    _vibeInterval = null;
  }
  // Para vibração imediatamente
  if ('vibrate' in navigator) {
    try { navigator.vibrate(0); } catch {}
  }
}
