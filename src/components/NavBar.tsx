import React from 'react';
import {
  Collapse,
  Container,
  Nav,
  Navbar,
  NavbarToggler,
  NavItem,
} from 'reactstrap';
import { NavLink } from 'react-router-dom';
import Profile from './Profile';

type NavBarProps = {
  onHomeClick?: () => void;
};

const NavBar: React.FunctionComponent<NavBarProps> = ({ onHomeClick }) => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  const handleHomeClick = () => {
    onHomeClick?.();
  };

  return (
    <div>
      <Navbar color="primary" dark expand="lg">
        <Container>
          <NavLink to="/" className={'navbar-brand'} onClick={handleHomeClick}>
            Plex Catalog
          </NavLink>
          <NavbarToggler onClick={toggle} />
          <Collapse isOpen={isOpen} navbar>
            <Nav navbar>
              <NavItem>
                <NavLink to="/" className="nav-link" onClick={handleHomeClick}>
                  Home
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink to="/servers" className="nav-link">
                  Servers
                </NavLink>
              </NavItem>
              {
                // to add stuff to the navbar, add a NavItem tag with a NavLink to the route
              }
            </Nav>
            <Nav navbar className="ml-auto">
              <Profile />
              <NavItem className="nav-link"></NavItem>
            </Nav>
          </Collapse>
        </Container>
      </Navbar>
    </div>
  );
};

export default NavBar;
