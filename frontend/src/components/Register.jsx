import React from 'react';
import { useNavigate } from 'react-router-dom';

// Component retained only to avoid breaking imports; registration is disabled.
const Register = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);
  return null;
};

export default Register;
