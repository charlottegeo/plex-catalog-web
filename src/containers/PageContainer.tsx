import { Container } from 'reactstrap';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

type Props = {
  children: React.ReactNode;
  onHomeClick?: () => void;
};

export default function PageContainer({ children, onHomeClick }: Props) {
  return (
    <div className="page-and-navbar">
      <NavBar onHomeClick={onHomeClick} />
      <Container className="main" fluid>
        <Container className="main-child">{children}</Container>
      </Container>
      <Container className="main-footer" fluid>
        <Container className="main-child">
          <Footer />
        </Container>
      </Container>
    </div>
  );
}
