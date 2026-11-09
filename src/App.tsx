import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import Admin from './pages/Admin';
import AuthCallback from './pages/AuthCallback';
import Bookings from './pages/Bookings';
import Guidance from './pages/Guidance';
import GuidanceArticle from './pages/GuidanceArticle';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Services from './pages/Services';
import Signup from './pages/Signup';
import Testimonials from './pages/Testimonials';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="guidance" element={<Guidance />} />
          <Route path="guidance/:slug" element={<GuidanceArticle />} />
          <Route path="testimonials" element={<Testimonials />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route
            path="bookings"
            element={
              <RequireAuth>
                <Bookings />
              </RequireAuth>
            }
          />
          <Route
            path="notifications"
            element={
              <RequireAuth>
                <Notifications />
              </RequireAuth>
            }
          />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="admin"
            element={
              <RequireAuth adminOnly>
                <Admin />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
