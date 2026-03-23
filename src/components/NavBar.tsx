import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Collapse,
  Container,
  Nav,
  Navbar,
  NavbarToggler,
  NavItem,
} from 'reactstrap';
import { fetchNotificationCount, useApiFetch } from '../utils/api';
import Profile from './Profile';

type NavBarProps = {
  onHomeClick?: () => void;
};

const NavBar: React.FunctionComponent<NavBarProps> = ({ onHomeClick }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const apiFetch = useApiFetch();
  const location = useLocation();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await fetchNotificationCount(apiFetch);
        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
    };
    fetchCount();
  }, [apiFetch, location.pathname]);

  useEffect(() => {
    if (location.pathname === '/requests') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  const handleHomeClick = () => {
    setUnreadCount(0);
    onHomeClick?.();
  };

  const handleNavClick = () => {
    setUnreadCount(0);
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
                <NavLink
                  to="/servers"
                  className="nav-link"
                  onClick={handleNavClick}
                >
                  Servers
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  to="/requests"
                  className="nav-link d-flex align-items-center"
                  onClick={handleNavClick}
                >
                  Requests
                  {unreadCount > 0 && (
                    <span
                      className="badge badge-warning rounded-circle ml-2"
                      style={{
                        width: '12px',
                        height: '12px',
                        padding: 0,
                        display: 'inline-block',
                      }}
                      title={`${unreadCount} fulfilled requests`}
                    />
                  )}
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
