// Simple stub component: registration has been disabled.
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8 text-center">
				<h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">Registration Disabled</h2>
				<p className="text-sm text-gray-600">New user sign-up has been disabled. Please contact an administrator to create an account.</p>
				<div>
					<button
						onClick={() => navigate('/login')}
						className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
					>
						Go to Login
					</button>
				</div>
			</div>
		</div>
	);
};

export default Register;
