import React from 'react';
import { useNavigate } from 'react-router-dom';

// Registration UI has been intentionally disabled.
// Route removed and registration flows disabled in the client.
const Register = () => {
  const navigate = useNavigate();
  // If someone navigates here manually, redirect them to login.
  React.useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
};

export default Register;
