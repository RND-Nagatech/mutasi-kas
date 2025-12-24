import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage } from '@/utils/storage';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!storage.isAuthenticated()) {
      navigate('/login', { 
        replace: true, 
        state: { from: location.pathname } 
      });
    }
  }, [navigate, location]);

  if (!storage.isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}
