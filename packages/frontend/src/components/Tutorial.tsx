import { useState } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  code?: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Bienvenido a OpenCode Mobile',
    description:
      'Controla OpenCode desde tu teléfono. Envía instrucciones a tu PC, mira el progreso en tiempo real y recibe los resultados, todo desde una app tipo chat.',
    icon: '👋',
  },
  {
    title: '1. Arranca OpenCode en tu PC',
    description:
      'En la computadora donde quieres que se ejecuten las tareas, abre una terminal y arranca el servidor de OpenCode. Anota la contraseña que muestra: la necesitarás luego.',
    icon: '💻',
    code: 'opencode serve --port 8080',
  },
  {
    title: '2. Arranca el backend',
    description:
      'El backend conecta tu teléfono con el agente de tu PC. Puedes ejecutarlo con Docker Compose (recomendado) o directamente con Node.',
    icon: '🚀',
    code: 'docker compose -f docker/docker-compose.yml up -d',
  },
  {
    title: '3. Arranca el agente en tu PC',
    description:
      'El agente se conecta al backend y ejecuta las órdenes contra OpenCode. Ejecútalo en la misma máquina que OpenCode.',
    icon: '🤖',
    code: 'pnpm --filter @opencode-mobile/agent dev --pair',
  },
  {
    title: '4. Empareja este teléfono',
    description:
      'Al arrancar el agente verás un código de 6 dígitos en la terminal. Introdúcelo en la app para vincular este teléfono con tu PC. El código caduca en 2 minutos y solo sirve una vez.',
    icon: '🔗',
  },
  {
    title: '5. ¡A chatear!',
    description:
      'Ya puedes escribir instrucciones como "abre Firefox y reproduce mi serie favorita". Verás el estado de la tarea, podrás cancelarla y revisar el historial. Las acciones peligrosas pedirán confirmación.',
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
        <p className="text-dark-muted leading-relaxed mb-6">{current.description}</p>

        {current.code && (
          <pre className="w-full text-left bg-black/40 border border-dark-border rounded-lg p-4 overflow-x-auto scrollbar-thin">
            <code className="font-mono text-sm text-primary-300 whitespace-pre">{current.code}</code>
          </pre>
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
            {isLast ? 'Empezar' : 'Siguiente'}
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