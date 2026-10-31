import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { saveConnection, testConnection } from '../services/connection';

interface ConnectProps {
  onConnected: (name: string) => void;
  onBack?: () => void;
}

interface QrPayload {
  v: number;
  url: string;
  token: string;
  name: string;
}

type Mode = 'choose' | 'scan' | 'manual';

export function Connect({ onConnected, onBack }: ConnectProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualToken, setManualToken] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function finishWith(url: string, token: string) {
    setBusy(true);
    setError(null);
    const res = await testConnection(url, token);
    if (!res.ok) {
      setBusy(false);
      setError(res.error ?? 'No se pudo conectar');
      return;
    }
    stopCamera();
    saveConnection({ url: url.replace(/\/$/, ''), token, name: res.name ?? 'Mi PC' });
    onConnected(res.name ?? 'Mi PC');
  }

  function handleQrText(text: string) {
    try {
      const data = JSON.parse(text) as QrPayload;
      if (!data.url || !data.token) throw new Error('QR no válido');
      void finishWith(data.url, data.token);
    } catch {
      setError('El QR no es de OpenCode Mobile');
    }
  }

  useEffect(() => {
    if (mode !== 'scan') return;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        scan();
      } catch (e) {
        setError(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Actívalo en los ajustes del móvil.'
            : 'No se pudo abrir la cámara'
        );
      }
    }

    function scan() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height);
          if (code?.data) {
            stopCamera();
            handleQrText(code.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(scan);
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode]);

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col p-6">
      <header className="max-w-md mx-auto w-full mb-4">
        {onBack && (
          <button onClick={onBack} className="text-sm text-dark-muted hover:text-dark-text">
            ← Atrás
          </button>
        )}
        <h1 className="text-xl font-bold mt-2">Conectar con tu PC</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {mode === 'choose' && (
          <div className="w-full flex flex-col gap-4">
            <button onClick={() => setMode('scan')} className="btn-primary py-4 text-base">
              📷 Escanear QR
            </button>
            <button onClick={() => setMode('manual')} className="btn-secondary py-3">
              Introducir dirección a mano
            </button>
            <p className="text-center text-sm text-dark-muted mt-2">
              En tu PC, ejecuta el agente de OpenCode Mobile. Se abrirá una página con un QR.
            </p>
          </div>
        )}

        {mode === 'scan' && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-dark-border bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 border-4 border-primary-500/40 rounded-2xl pointer-events-none" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-sm text-dark-muted text-center">Apunta al QR de la página del PC</p>
            <button onClick={() => { stopCamera(); setMode('choose'); }} className="btn-ghost">
              Cancelar
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <form
            className="w-full flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void finishWith(manualUrl.trim(), manualToken.trim());
            }}
          >
            <label className="text-sm text-dark-muted">Dirección (la muestra el PC)</label>
            <input
              className="input"
              placeholder="http://192.168.1.10:8787"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <label className="text-sm text-dark-muted">Código de emparejamiento</label>
            <input
              className="input"
              placeholder="Pégalo desde la página del PC"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button type="submit" className="btn-primary" disabled={busy || !manualUrl || !manualToken}>
              {busy ? 'Conectando…' : 'Conectar'}
            </button>
            <button type="button" onClick={() => setMode('choose')} className="btn-ghost">
              Volver
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}