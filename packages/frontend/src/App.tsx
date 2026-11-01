import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Tutorial, useTutorial } from './components/Tutorial';
import { Connect } from './pages/Connect';
import { Chat } from './pages/Chat';
import { clearConnection, loadConnection, type Connection } from './services/connection';

function TutorialPage() {
  const navigate = useNavigate();
  return <Tutorial onDone={() => navigate('/')} />;
}

function App() {
  const { show: showTutorial, dismiss: dismissTutorial } = useTutorial();
  const [connection, setConnection] = useState<Connection | null>(loadConnection);

  if (showTutorial) {
    return <Tutorial onDone={dismissTutorial} />;
  }

  if (!connection) {
    return <Connect onConnected={() => setConnection(loadConnection())} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Chat
              connection={connection}
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
