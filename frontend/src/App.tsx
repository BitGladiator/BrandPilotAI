import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { WorkspacePage } from './pages/WorkspacePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}>
        <Navbar />
        <main style={{ flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/app" element={<WorkspacePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
