import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { email, password };
      if (isFirstTime) payload.adminSecret = adminSecret;

      const { data } = await api.post('/admin/login', payload);
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      toast.success('Admin login successful!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(`Error: ${error.response?.data?.message || error.message || 'Login failed'}`);
      console.error('Login error details:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white">Admin Portal</h2>
          <p className="text-gray-400 mt-2">Sign in to manage the platform</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-300">Email address</label>
            <input
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isFirstTime && (
            <div>
              <label className="block text-sm font-medium text-gray-300">Admin Setup Secret</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                checked={isFirstTime}
                onChange={(e) => setIsFirstTime(e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-400">First time setup</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-900"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
