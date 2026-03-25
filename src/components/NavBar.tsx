import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Collapse,
  Container,
  Nav,
  Navbar,
  NavbarToggler,
  NavItem,
} from 'reactstrap';
import Profile from './Profile';

type NavBarProps = {
  onHomeClick?: () => void;
};

const NavBar: React.FunctionComponent<NavBarProps> = ({ onHomeClick }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <Navbar color="primary" dark expand="lg">
        <Container>
          <NavLink to="/" className={'navbar-brand'} onClick={onHomeClick}>
            Plex Catalog
          </NavLink>
          <NavbarToggler onClick={toggle} />
          <Collapse isOpen={isOpen} navbar>
            <Nav navbar>
              <NavItem>
                <NavLink to="/" className="nav-link" onClick={onHomeClick}>
                  Home
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink to="/servers" className="nav-link">
                  Servers
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink to="/requests" className="nav-link">
                  Requests
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
