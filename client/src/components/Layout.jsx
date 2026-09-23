import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { initials } from '../pipes';

/** Reusable navigation bar – items depend on the role (guest / user / admin). */
export function AppNavbar() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    ['/players', 'Играчи', 'bi-people'],
    ['/reports', 'Извештаи', 'bi-clipboard-data'],
    ['/clubs', 'Клубови', 'bi-shield'],
    ['/matches', 'Натпревари', 'bi-calendar-event'],
    ['/search', 'Пребарување', 'bi-search'],
    ['/dashboard', 'Статистика', 'bi-bar-chart'],
  ];
  return (
    <Navbar expand="lg" variant="dark" className="fs-navbar" collapseOnSelect>
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          <i className="bi bi-binoculars-fill me-1" /> FootballScout
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            {links.map(([to, label, icon]) => (
              <Nav.Link as={NavLink} to={to} key={to} eventKey={to}>
                <i className={`bi ${icon} me-1 d-lg-none d-xl-inline`} />{label}
              </Nav.Link>
            ))}
            {isLoggedIn && (
              <Nav.Link as={NavLink} to="/external" eventKey="/external">
                <i className="bi bi-cloud-download me-1 d-lg-none d-xl-inline" />TheSportsDB
              </Nav.Link>
            )}
          </Nav>
          <Nav>
            {isLoggedIn ? (
              <NavDropdown
                align="end"
                title={<span><span className="avatar avatar-sm me-1">{initials(user.username)}</span>{user.username}</span>}
              >
                <NavDropdown.Item as={Link} to="/history"><i className="bi bi-clock-history me-2" />Историја</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/reports?mine=true"><i className="bi bi-journal-text me-2" />Мои извештаи</NavDropdown.Item>
                {isAdmin && (
                  <>
                    <NavDropdown.Divider />
                    <NavDropdown.Header>Администрација</NavDropdown.Header>
                    <NavDropdown.Item as={Link} to="/admin/users"><i className="bi bi-person-gear me-2" />Корисници</NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/db"><i className="bi bi-database me-2" />База (/db)</NavDropdown.Item>
                  </>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={() => { logout(); navigate('/'); }}>
                  <i className="bi bi-box-arrow-right me-2" />Одјава
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={NavLink} to="/login"><i className="bi bi-box-arrow-in-right me-1" />Најава</Nav.Link>
                <Nav.Link as={NavLink} to="/register" className="btn btn-warning btn-sm text-dark ms-lg-2 px-3">Регистрација</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export function AppFooter() {
  return (
    <footer className="fs-footer py-3 mt-auto">
      <div className="container d-flex flex-wrap justify-content-between gap-2 small">
        <span>&copy; {new Date().getFullYear()} FootballScout · Веб програмирање</span>
        <span>
          <a href="/api/docs/" target="_blank" rel="noreferrer">REST API документација</a> ·{' '}
          Податоци: <a href="https://www.thesportsdb.com" target="_blank" rel="noreferrer">TheSportsDB</a>
        </span>
      </div>
    </footer>
  );
}

/** Uniform page frame: navbar, content, footer */
export default function Layout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <AppNavbar />
      <main className="container py-4 flex-grow-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
