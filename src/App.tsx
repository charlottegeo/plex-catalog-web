import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import MediaDetailsPage from "./pages/MediaDetailsPage";
import SeasonPage from './pages/SeasonPage';
import LibraryPage from './pages/LibraryPage';
import PageContainer from "./containers/PageContainer";
import "csh-material-bootstrap/dist/csh-material-bootstrap.css";
import NotFound from "./pages/NotFound";

type Props = {
  rerouteHomeOn404?: boolean;
};

export default function App({ rerouteHomeOn404 = undefined }: Props) {
  return (
    <Router>
      <PageContainer>

        <div style={{ padding: '1rem' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/media/:guid" element={<MediaDetailsPage />} />
            <Route path="/servers/:serverId/seasons/:seasonId" element={<SeasonPage />} />
            <Route path="/servers/:serverId/libraries/:libraryKey/:serverName/:libraryName" element={<LibraryPage />} />
            <Route
              path="*"
              element={(rerouteHomeOn404 ?? true) ? <Home /> : <NotFound />}
            />
          </Routes>
        </div>
      </PageContainer>
    </Router>
  );
}