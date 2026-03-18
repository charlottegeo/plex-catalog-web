import 'csh-material-bootstrap/dist/csh-material-bootstrap.css';
import { useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import PageContainer from './containers/PageContainer';
import Home from './pages/Home';
import LibraryPage from './pages/LibraryPage';
import MediaDetailsPage from './pages/MediaDetailsPage';
import NotFound from './pages/NotFound';
import RequestsPage from './pages/RequestsPage';
import SeasonPage from './pages/SeasonPage';
import ServersPage from './pages/ServersPage';

type Props = {
  rerouteHomeOn404?: boolean;
};

function AppContent({ rerouteHomeOn404 = undefined }: Props) {
  const [resetHomeKey, setResetHomeKey] = useState(0);

  const handleHomeClick = () => {
    sessionStorage.removeItem('lastSearchResults');
    sessionStorage.removeItem('lastSearchQuery');
    setResetHomeKey((prev) => prev + 1);
  };

  return (
    <PageContainer onHomeClick={handleHomeClick}>
      <div style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<Home key={resetHomeKey} />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/servers" element={<ServersPage />} />
          <Route path="/media/*" element={<MediaDetailsPage />} />
          <Route
            path="/servers/:serverId/seasons/:seasonId"
            element={<SeasonPage />}
          />
          <Route
            path="/servers/:serverId/libraries/:libraryKey/:serverName/:libraryName"
            element={<LibraryPage />}
          />
          <Route
            path="*"
            element={
              (rerouteHomeOn404 ?? true) ? (
                <Home key={resetHomeKey} />
              ) : (
                <NotFound />
              )
            }
          />
        </Routes>
      </div>
    </PageContainer>
  );
}

export default function App({ rerouteHomeOn404 = undefined }: Props) {
  return (
    <Router>
      <AppContent rerouteHomeOn404={rerouteHomeOn404} />
    </Router>
  );
}
