import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';

const donorSubRoles = [
  'Restaurant',
  'Event Management',
  'Hostel / College',
  'Individual Donor'
];

function LoginDonor() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    subRole: 'Restaurant',
    address: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    latitude: null,
    longitude: null
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.info('Detecting location...', { autoClose: 2000 });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const address = data.address;
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address: data.display_name,
            city: address.city || address.town || address.village || '',
            district: address.county || address.state_district || '',
            state: address.state || '',
            pinCode: address.postcode || ''
          }));
          toast.success('Location detected successfully!');
        } catch (error) {
          toast.error('Failed to get address details');
          setFormData(prev => ({ ...prev, latitude, longitude }));
        }
      },
      () => {
        toast.error('Unable to retrieve your location');
      }
    );
  };

  // SMS-style popup function
  const showSMSPopup = (userName) => {
    toast.success(
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ 
          background: '#10B981', 
          borderRadius: '50%', 
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </div>
        <div>
          <strong>📱 SMS Message</strong>
          <div style={{ fontSize: '14px', marginTop: '4px' }}>
            Welcome {userName}! You have successfully logged in to Hunger Bridge via phone number.
          </div>
        </div>
      </div>,
      {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: '#1F2937',
          color: '#fff',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          border: '2px solid #10B981',
          minWidth: '350px'
        }
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const loginData = loginMethod === 'email' 
          ? { email: formData.email, password: formData.password }
          : { phone: formData.phone, password: formData.password };
          
        const { data } = await api.post('/auth/login', loginData);
        if (data.role !== 'donor') {
          toast.error('Please login as a donor');
          return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        
        // Show SMS-style popup for phone login
        if (loginMethod === 'phone') {
          showSMSPopup(data.name);
        } else {
          toast.success('Login successful!');
        }
        
        navigate('/donor/dashboard');
      } else {
        const { data } = await api.post('/auth/register', {
          ...formData,
          role: 'donor'
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        toast.success('Registration successful!');
        navigate('/donor/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-landing">
      <div className="card-gradient max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Food Donor</h1>
          <p className="text-gray-600">Share food, spread kindness</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Login Method Toggle - Only show during login */}
          {isLogin && (
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'email'
                    ? 'bg-white text-secondary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-white text-secondary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📱 Phone
              </button>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your name"
                required={!isLogin}
              />
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Type</label>
              <select
                name="subRole"
                value={formData.subRole}
                onChange={handleChange}
                className="input-field"
              >
                {donorSubRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}

          {/* Phone Number - Show during registration OR phone login */}
          {(!isLogin || (isLogin && loginMethod === 'phone')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isLogin ? '📱 Phone Number' : 'Phone Number'}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your phone number"
                required={!isLogin || loginMethod === 'phone'}
              />
            </div>
          )}

          {/* Email - Show during registration OR email login */}
          {(!isLogin || (isLogin && loginMethod === 'email')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isLogin ? '📧 Email' : 'Email'}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your email"
                required={!isLogin || loginMethod === 'email'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your password"
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Location Details</h3>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-md text-sm font-medium hover:bg-secondary-200"
                >
                  📍 Detect GPS
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="input-field" placeholder="Full Address" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} className="input-field" placeholder="City" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input type="text" name="district" value={formData.district} onChange={handleChange} className="input-field" placeholder="District" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} className="input-field" placeholder="State" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                  <input type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} className="input-field" placeholder="PIN Code" required />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="w-full btn-secondary">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          {isLogin && (
            <button
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-gray-500 hover:text-secondary-600 font-medium transition-colors"
            >
              Forgot Password?
            </button>
          )}
          <p className="text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-secondary-600 font-semibold hover:text-secondary-700"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/receiver/login')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Login as Food Receiver →
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginDonor;
