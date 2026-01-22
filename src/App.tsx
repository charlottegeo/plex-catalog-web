import 'csh-material-bootstrap/dist/csh-material-bootstrap.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import Home from './pages/Home';
import MediaDetailsPage from './pages/MediaDetailsPage';
import SeasonPage from './pages/SeasonPage';
import LibraryPage from './pages/LibraryPage';
import ServersPage from './pages/ServersPage';
import PageContainer from './containers/PageContainer';
import NotFound from './pages/NotFound';

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
