import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useCallback } from 'react';

/**
 * Custom Hook: useAuthCheck
 * Provides a function to check login status and redirect if needed
 * * Usage:
 * const { checkAuth } = useAuthCheck();
 * * const handleAddToCart = () => {
 * if (!checkAuth()) return; // Stops here if not logged in
 * // Proceed with cart logic
 * }
 */
export const useAuthCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authStatus = useSelector((state) => state.auth.status);

  const checkAuth = useCallback(() => {
    if (!authStatus) {
      const confirmLogin = window.confirm("You must be logged in to perform this action. Go to login page?");
      if (confirmLogin) {
        navigate('/login', { state: { from: location } });
      }
      return false;
    }
    return true;
  }, [authStatus, navigate, location]);

  return { checkAuth, isLoggedIn: authStatus };
};