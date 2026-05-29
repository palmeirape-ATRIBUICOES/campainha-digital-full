/**
 * useDoorbellAlert
 * ─────────────────────────────────────────────────────────────────────────────
 * Campainha Digital — Hook de alerta de campainha
 *
 * Estratégia Dual de Áudio (compatível com iOS):
 *  1. Web Audio API — som "ding-dong" sintético via oscilador (preferencial)
 *  2. HTML5 <audio> fallback — arquivo de som externo (funciona quando Web Audio
 *     está bloqueado pelo iOS)
 *
 * IMPORTANTE iOS:
 *  - O AudioContext e <audio> precisam ser "desbloqueados" com uma interação
 *    do usuário (toque/click). Chame warmUpAudio() no primeiro toque do usuário.
 *  - Se startDoorbell() for chamado sem interação prévia, ele marca como
 *    "pendente" e o som toca assim que o usuário tocar na tela.
 *
 * Exporta:
 *  - warmUpAudio()    — Desbloqueia áudio no iOS (chamar no primeiro toque)
 *  - startDoorbell()  — Inicia som + vibração em loop
 *  - stopDoorbell()   — Para tudo imediatamente
 *  - isPending()      — Retorna true se há campainha pendente aguardando interação
 *  - tryResumePending() — Tenta tocar campainha pendente (chamar em onClick)
 */

let _ctx = null;              // AudioContext singleton
let _soundInterval = null;    // setInterval do Web Audio
let _vibeInterval  = null;    // setInterval da vibração
let _audioEl = null;          // HTML5 <audio> element fallback
let _isWarmedUp = false;      // Se o áudio já foi desbloqueado
let _pendingRing = false;     // Se há campainha aguardando interação do usuário
let _isPlaying = false;       // Se está tocando atualmente
let _playPromise = null;      // Promise ativa do play() HTML5 Audio para evitar bugs de play/pause do Safari/Chrome
let _webAudioGainNode = null; // Nó de ganho master do Web Audio para silenciamento instantâneo

// ─── Padrão de vibração campainha ─────────────────────────────────────────────
const VIBRATION_PATTERN = [300, 100, 600, 1000];

// URL de som de campainha (fallback HTML5)
const DOORBELL_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

// ─── Cria o elemento <audio> HTML5 singleton ──────────────────────────────────
function getAudioElement() {
  if (!_audioEl) {
    _audioEl = new Audio(DOORBELL_SOUND_URL);
    _audioEl.loop = true;
    _audioEl.preload = 'auto';
    _audioEl.volume = 1.0;
    // iOS precisa que o elemento seja carregado
    _audioEl.load();
  }
  return _audioEl;
}

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

// ─── Obtém o Nó de Ganho Master do Web Audio ─────────────────────────────────
function getWebAudioGainNode() {
  const ctx = getAudioContext();
  if (!_webAudioGainNode) {
    _webAudioGainNode = ctx.createGain();
    _webAudioGainNode.connect(ctx.destination);
  }
  return _webAudioGainNode;
}

// ─── Desbloqueia áudio no iOS ─────────────────────────────────────────────────
/**
 * Deve ser chamado em resposta a um gesto do usuário (click/touchstart).
 * Cria/resume o AudioContext e faz play/pause silencioso no <audio> HTML5
 * para desbloquear ambas as APIs de áudio no Safari iOS.
 */
export function warmUpAudio() {
  if (_isWarmedUp) return;
  
  try {
    // 1. Desbloqueia Web Audio API
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Toca um som inaudível para forçar desbloqueio
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime); // praticamente inaudível
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
    
    // 2. Desbloqueia HTML5 Audio
    const audio = getAudioElement();
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    }
    
    _isWarmedUp = true;
    console.log('[DoorbellAlert] Áudio desbloqueado com sucesso (warm-up)');
  } catch (err) {
    console.warn('[DoorbellAlert] Erro no warm-up:', err);
  }
}

// ─── Toca UMA batida de ding-dong via Web Audio ──────────────────────────────
function playOneDingDong() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      // Web Audio bloqueado — não tenta
      return false;
    }

    const master = getWebAudioGainNode();
    // Restaura o volume/ganho para o nível de chamada ativa
    master.gain.setValueAtTime(2.0, ctx.currentTime);

    const note = (freq, startSec, durSec) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startSec);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 0.55,
        ctx.currentTime + startSec + durSec
      );
      gain.gain.setValueAtTime(0.001, ctx.currentTime + startSec);
      gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + startSec + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startSec + durSec);
      osc.start(ctx.currentTime + startSec);
      osc.stop(ctx.currentTime + startSec + durSec + 0.05);
    };

    note(880, 0.0, 0.7);
    note(660, 0.65, 1.0);
    return true;
  } catch (err) {
    console.warn('[DoorbellAlert] Erro no Web Audio:', err);
    return false;
  }
}

// ─── Toca via HTML5 Audio (fallback) ──────────────────────────────────────────
function playHTML5Audio() {
  try {
    const audio = getAudioElement();
    audio.muted = false;
    audio.volume = 1.0;
    audio.currentTime = 0;
    audio.loop = true;
    _playPromise = audio.play();
    if (_playPromise) {
      _playPromise.then(() => {
        console.log('[DoorbellAlert] HTML5 Audio tocando com sucesso');
      }).catch((err) => {
        console.warn('[DoorbellAlert] HTML5 Audio bloqueado:', err.message);
      });
    }
  } catch (err) {
    console.warn('[DoorbellAlert] Erro HTML5 Audio:', err);
  }
}

// ─── Para HTML5 Audio ─────────────────────────────────────────────────────────
function stopHTML5Audio() {
  if (_audioEl) {
    try {
      // Muta e zera o volume instantaneamente para silenciar o auto-falante 
      // antes mesmo do pause() concluir (previne som residual ou travado por promise ativa)
      _audioEl.muted = true;
      _audioEl.volume = 0;
      
      if (_playPromise) {
        _playPromise.then(() => {
          _audioEl.pause();
          _audioEl.currentTime = 0;
        }).catch(() => {
          _audioEl.pause();
          _audioEl.currentTime = 0;
        });
      } else {
        _audioEl.pause();
        _audioEl.currentTime = 0;
      }
    } catch (err) {
      console.warn('[DoorbellAlert] Erro ao parar HTML5 Audio:', err.message);
    }
  }
}

// ─── Dispara vibração ─────────────────────────────────────────────────────────
function vibrateOnce() {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(VIBRATION_PATTERN); } catch {}
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia o alerta de campainha: som + vibração em loop.
 * Usa Web Audio API como primário e HTML5 Audio como fallback.
 * Se nenhum funcionar (iOS sem interação), marca como pendente.
 */
export function startDoorbell() {
  if (_isPlaying) return; // Já está tocando
  stopDoorbell(); // Limpa qualquer estado anterior

  console.log('[DoorbellAlert] Iniciando campainha...');
  
  // Tenta Web Audio primeiro
  const webAudioWorked = playOneDingDong();
  
  // Sempre tenta HTML5 Audio também (redundância)
  playHTML5Audio();
  
  // Vibração
  vibrateOnce();
  
  _isPlaying = true;
  _pendingRing = false;

  // Se Web Audio funcionou, mantém o loop do ding-dong sintético
  if (webAudioWorked) {
    _soundInterval = setInterval(() => {
      playOneDingDong();
    }, 2200);
  }

  // Vibração em loop sempre
  _vibeInterval = setInterval(() => {
    vibrateOnce();
  }, 2200);

  // Se nenhum áudio funcionou, marca como pendente
  if (!webAudioWorked && _audioEl && _audioEl.paused) {
    console.warn('[DoorbellAlert] Áudio bloqueado — marcando como pendente');
    _pendingRing = true;
  }
}

/**
 * Para o alerta de campainha imediatamente.
 */
export function stopDoorbell() {
  _isPlaying = false;
  _pendingRing = false;
  
  if (_soundInterval) {
    clearInterval(_soundInterval);
    _soundInterval = null;
  }
  if (_vibeInterval) {
    clearInterval(_vibeInterval);
    _vibeInterval = null;
  }

  // Zera o ganho do Web Audio imediatamente para parar qualquer oscilador agendado/ativo
  if (_webAudioGainNode && _ctx) {
    try {
      _webAudioGainNode.gain.setValueAtTime(0.0, _ctx.currentTime);
    } catch (err) {
      console.warn('[DoorbellAlert] Erro ao silenciar Web Audio:', err.message);
    }
  }

  stopHTML5Audio();
  if ('vibrate' in navigator) {
    try { navigator.vibrate(0); } catch {}
  }
}

/**
 * Retorna true se há campainha pendente aguardando interação do usuário.
 */
export function isPending() {
  return _pendingRing;
}

/**
 * Tenta tocar campainha pendente. Chamar em onClick/onTouchStart.
 * Retorna true se havia pendência e foi resolvida.
 */
export function tryResumePending() {
  if (!_pendingRing) return false;
  
  console.log('[DoorbellAlert] Resumindo campainha pendente após interação do usuário');
  warmUpAudio();
  _pendingRing = false;
  
  // Reinicia o som com AudioContext desbloqueado
  playOneDingDong();
  playHTML5Audio();
  vibrateOnce();
  
  // Inicia loops
  if (!_soundInterval) {
    _soundInterval = setInterval(() => {
      playOneDingDong();
    }, 2200);
  }
  
  return true;
}
