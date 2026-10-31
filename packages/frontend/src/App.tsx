// Main App component
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center">OpenCode Mobile - Frontend running</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;