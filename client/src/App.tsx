import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AnalyzePage } from './pages/AnalyzePage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <Link to="/" className="app-logo">
            <span className="eyebrow">SnapMend</span>
          </Link>
          <nav className="app-nav">
            <Link to="/" className="nav-link">New Analysis</Link>
            <Link to="/cases" className="nav-link">History</Link>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<AnalyzePage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
