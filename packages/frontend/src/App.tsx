import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Tutorial, useTutorial } from './components/Tutorial';

function Home() {
  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col">
      <header className="border-b border-dark-border px-6 py-4">
        <h1 className="text-lg font-semibold">OpenCode Mobile</h1>
        <p className="text-sm text-dark-muted">Controla OpenCode desde tu teléfono</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
        <div className="text-5xl mb-4" aria-hidden>📱</div>
        <h2 className="text-xl font-bold mb-2">Tu PC, en tu bolsillo</h2>
        <p className="text-dark-muted mb-6">
          Envía instrucciones a OpenCode, observa el progreso en tiempo real y recibe resultados desde
          cualquier lugar.
        </p>
        <Link to="/tutorial" className="btn-primary">
          Ver tutorial de configuración
        </Link>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-dark-muted border-t border-dark-border">
        OpenCode Mobile · MVP
      </footer>
    </div>
  );
}

function TutorialPage() {
  const navigate = useNavigate();
  return <Tutorial onDone={() => navigate('/')} />;
}

function App() {
  const { show, dismiss } = useTutorial();

  if (show) {
    return <Tutorial onDone={dismiss} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tutorial" element={<TutorialPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;