import { useState } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  hint?: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Bienvenido a OpenCode Mobile',
    description:
      'Controla OpenCode desde tu teléfono. Envía instrucciones a tu PC y recibe los resultados, todo desde una app tipo chat.',
    icon: '👋',
  },
  {
    title: '1. Instala el agente en tu PC',
    description:
      'Descarga el instalador de OpenCode Mobile para tu ordenador y ábrelo. No hace falta terminal: el instalador arranca todo solo.',
    icon: '💻',
    hint: 'Windows, macOS y Linux',
  },
  {
    title: '2. Aparecerá un código QR',
    description:
      'El agente abre una página en el navegador de tu PC con un código QR. Deja esa ventana abierta mientras conectas el móvil.',
    icon: '🔳',
  },
  {
    title: '3. Escanea el QR con esta app',
    description:
      'Pulsa "Escanear QR" y apunta al código de la pantalla del PC. Si la cámara falla, puedes introducir la dirección y el código a mano.',
    icon: '📷',
  },
  {
    title: '4. ¡Listo para chatear!',
    description:
      'Escribe instrucciones como "abre Firefox y reproduce mi serie favorita". Verás el progreso, podrás cancelar tareas y las acciones peligrosas pedirán confirmación.',
    icon: '💬',
  },
];

const STORAGE_KEY = 'ocm_tutorial_done';

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    onDone();
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col p-6">
      <div className="flex justify-end">
        <button onClick={finish} className="text-sm text-dark-muted hover:text-dark-text transition-colors">
          Saltar
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full text-center">
        <div className="text-6xl mb-6 select-none" aria-hidden>
          {current.icon}
        </div>
        <h1 className="text-2xl font-bold mb-3">{current.title}</h1>
        <p className="text-dark-muted leading-relaxed mb-3">{current.description}</p>
        {current.hint && (
          <span className="text-xs px-3 py-1 rounded-full bg-primary-500/15 text-primary-300">
            {current.hint}
          </span>
        )}
      </div>

      <div className="max-w-md mx-auto w-full">
        <div className="flex justify-center gap-2 mb-6" aria-label="Progreso del tutorial">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary-500' : 'w-2 bg-dark-border'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="btn-secondary flex-1">
              Anterior
            </button>
          )}
          <button
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="btn-primary flex-1"
          >
            {isLast ? 'Conectar mi PC' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useTutorial() {
  const [show, setShow] = useState(() => localStorage.getItem(STORAGE_KEY) !== '1');
  return { show, dismiss: () => setShow(false) };
}