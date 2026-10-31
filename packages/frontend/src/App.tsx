import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Tutorial, useTutorial } from './components/Tutorial';
import { Connect } from './pages/Connect';
import { clearConnection, loadConnection } from './services/connection';

function Home({ name, onDisconnect }: { name: string; onDisconnect: () => void }) {
  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col">
      <header className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">OpenCode Mobile</h1>
          <p className="text-sm text-green-400">● Conectado a {name}</p>
        </div>
        <button onClick={onDisconnect} className="text-sm text-dark-muted hover:text-red-400">
          Desconectar
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
        <div className="text-5xl mb-4" aria-hidden>💬</div>
        <h2 className="text-xl font-bold mb-2">Todo listo</h2>
        <p className="text-dark-muted mb-6">
          Tu teléfono está vinculado con tu PC. El chat con OpenCode llegará en la siguiente fase.
        </p>
        <Link to="/tutorial" className="btn-secondary">
          Ver tutorial de nuevo
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
  const { show: showTutorial, dismiss: dismissTutorial } = useTutorial();
  const [connection, setConnection] = useState(loadConnection());

  if (showTutorial) {
    return <Tutorial onDone={dismissTutorial} />;
  }

  if (!connection) {
    return (
      <Connect
        onConnected={(name) => setConnection(loadConnection() ?? { url: '', token: '', name })}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              name={connection.name}
              onDisconnect={() => {
                clearConnection();
                setConnection(null);
              }}
            />
          }
        />
        <Route path="/tutorial" element={<TutorialPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;