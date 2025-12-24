import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '@/utils/storage';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (storage.isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default Index;
