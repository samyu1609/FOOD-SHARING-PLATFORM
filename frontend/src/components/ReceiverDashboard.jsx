import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import api from '../api';
import socket from '../socket';
import NotificationBell from './NotificationBell';
import NotificationSettings from './NotificationSettings';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function ReceiverDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [foodList, setFoodList] = useState([]);
  const [urgentFood, setUrgentFood] = useState([]);
  const [stats, setStats] = useState({
    points: 0,
    pickupCount: 0,
    trustScore: 0
  });
  const [requestQuantities, setRequestQuantities] = useState({});
  const [showQR, setShowQR] = useState({});
  const [userQR, setUserQR] = useState(null);
  const [showUserQR, setShowUserQR] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFoodId, setReviewFoodId] = useState(null);
  const [reviewFoodType, setReviewFoodType] = useState('');
  const [reviewData, setReviewData] = useState({
    rating: 5,
    review: '',
    foodQuality: 'good',
    packaging: 'good',
    onTime: true
  });
  const [reviewedItems, setReviewedItems] = useState({});

  // Impact Dashboard states
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'impact'
  const [impactStats, setImpactStats] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const [mobilePopup, setMobilePopup] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return Number(d.toFixed(1));
  };

  const handleAcceptFoodFromPopup = async (food) => {
    try {
      const quantity = food.remainingQuantity;
      await api.post(`/food/request/${food._id}`, { quantity });
      toast.success('Food accepted successfully!');
      setMobilePopup(null);
      fetchData(user || JSON.parse(localStorage.getItem('user')));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept food');
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/receiver/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'receiver') {
      toast.error('Access denied: You are not registered as a receiver');
      navigate('/');
      return;
    }
    setUser(parsedUser);
    fetchData(parsedUser);
    fetchUrgentFood();
    fetchUserQR(); // Fetch user QR code on login

    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, [navigate]);

  useEffect(() => {
    socket.connect();
    
    const handleFoodAdded = (newFood) => {
      fetchData(user || JSON.parse(localStorage.getItem('user')));
      
      if (newFood?.donorId?.latitude && userProfile?.latitude) {
        const distance = calculateDistance(
          userProfile.latitude, userProfile.longitude,
          newFood.donorId.latitude, newFood.donorId.longitude
        );
        
        if (distance !== null && distance <= 10) {
          setMobilePopup({ ...newFood, distance });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Food Nearby!", {
              body: `${newFood.foodType} is available ${distance}km away.`,
            });
          }
        }
      }
    };

    socket.on('foodAdded', handleFoodAdded);
    socket.on('foodUpdated', () => fetchData(user || JSON.parse(localStorage.getItem('user'))));

    return () => {
      socket.off('foodAdded', handleFoodAdded);
      socket.off('foodUpdated');
    };
  }, [userProfile]);

  const fetchData = async (currentUser) => {
    try {
      const [foodRes, profileRes, statsRes] = await Promise.all([
        api.get('/food/available'),
        api.get('/user/profile'),
        api.get('/food/receiver/stats')
      ]);

      setFoodList(foodRes.data);
      setUserProfile(profileRes.data);
      setStats({
        points: statsRes.data.points,
        pickupCount: statsRes.data.totalPickups || profileRes.data.pickupCount,
        trustScore: statsRes.data.trustScore
      });

      const reviewedMap = {};
      const userId = currentUser?._id?.toString() || user?._id?.toString();

      if (userId) {
        await Promise.all(foodRes.data.map(async (food) => {
          const request = food.requests.find(r => {
            const reqId = typeof r.receiverId === 'object'
              ? r.receiverId?._id?.toString()
              : r.receiverId?.toString();
            return reqId === userId;
          });

          if (request?.status === 'picked') {
            try {
              const { data } = await api.get(`/food/${food._id}/has-reviewed`);
              reviewedMap[food._id] = data.hasReviewed;
            } catch (err) {
              reviewedMap[food._id] = false;
            }
          }
        }));
      }

      setReviewedItems(reviewedMap);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/receiver/login');
      }
    }
  };

  const fetchUrgentFood = async () => {
    try {
      const { data } = await api.get('/food/urgent');
      setUrgentFood(data);
    } catch (error) {
      console.error('Failed to fetch urgent food');
    }
  };

  const fetchImpactStats = async () => {
    try {
      setImpactLoading(true);
      const { data } = await api.get('/food/receiver/impact');
      setImpactStats(data);
    } catch (error) {
      toast.error('Failed to load impact statistics');
    } finally {
      setImpactLoading(false);
    }
  };

  // Load impact stats when switching to impact tab
  useEffect(() => {
    if (activeTab === 'impact' && !impactStats) {
      fetchImpactStats();
    }
  }, [activeTab]);

  // Fetch User QR Code
  const fetchUserQR = async () => {
    try {
      const { data } = await api.get('/user/my-qr');
      setUserQR(data.qrCode);
    } catch (error) {
      console.error('Failed to fetch user QR');
    }
  };

  // Generate User QR Code
  const generateUserQR = async () => {
    try {
      const { data } = await api.post('/user/generate-qr');
      setUserQR(data.qrCode);
      toast.success('Your QR Code generated!');
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleQuantityChange = (foodId, quantity) => {
    setRequestQuantities({ ...requestQuantities, [foodId]: quantity });
  };

  // Check if food is near expiry (within 2 hours)
  const getExpiryStatus = (expiryTime) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);
    const minutesUntilExpiry = (expiry - now) / (1000 * 60);

    if (hoursUntilExpiry < 0) return 'expired';
    if (hoursUntilExpiry <= 1) return 'critical'; // New: Last 1 hour
    if (hoursUntilExpiry <= 3) return 'urgent';  // Changed: 3 hours
    if (hoursUntilExpiry <= 6) return 'warning';
    return 'normal';
  };

  const getExpiryStyles = (status) => {
    switch (status) {
      case 'expired':
        return 'bg-gray-200 text-gray-600 border-gray-400 grayscale';
      case 'critical':
        return 'bg-red-600 text-white border-red-800 animate-pulse shadow-lg shadow-red-500/50';
      case 'urgent':
        return 'bg-red-500 text-white border-red-700 animate-pulse';
      case 'warning':
        return 'bg-orange-500 text-white border-orange-700';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getCardBorderStyle = (status) => {
    switch (status) {
      case 'expired':
        return 'border-2 border-gray-400 opacity-60';
      case 'critical':
        return 'border-4 border-red-600 shadow-xl shadow-red-500/30';
      case 'urgent':
        return 'border-3 border-red-500 shadow-lg shadow-red-400/20';
      case 'warning':
        return 'border-2 border-orange-500';
      default:
        return 'border border-gray-200';
    }
  };

  // Show toast alert for urgent food
  useEffect(() => {
    const checkExpiryAlerts = () => {
      foodList.forEach((food) => {
        const status = getExpiryStatus(food.expiryTime);
        if (status === 'critical' || status === 'urgent') {
          const timeLeft = Math.ceil((new Date(food.expiryTime) - new Date()) / (1000 * 60 * 60));
          toast.warning(
            <div>
              <strong>⏰ Expiry Alert!</strong>
              <div className="text-sm mt-1">
                {food.foodType} expires in {timeLeft}h! Request quickly!
              </div>
            </div>,
            {
              position: 'top-right',
              autoClose: 8000,
              style: {
                background: status === 'critical' ? '#DC2626' : '#EF4444',
                color: '#fff',
                borderRadius: '12px'
              }
            }
          );
        }
      });
    };

    if (foodList.length > 0) {
      checkExpiryAlerts();
    }
  }, [foodList]);

  const handleRequest = async (foodId) => {
    const quantity = Number(requestQuantities[foodId]);
    if (!quantity || quantity < 1) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      await api.post(`/food/request/${foodId}`, { quantity });
      toast.success('Food requested successfully!');
      setRequestQuantities({ ...requestQuantities, [foodId]: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request food');
    }
  };

  const handlePickup = async (foodId) => {
    try {
      const { data } = await api.put(`/food/pickup/${foodId}`);
      toast.success('Pickup confirmed! +10 points');

      if (data.receiverCertificate) {
        toast.success(`🎉 Congratulations! You earned ${data.receiverCertificate.title}!`);
      }
      if (data.donorCertificate) {
        toast.success(`🎉 Donor earned ${data.donorCertificate.title}!`);
      }

      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm pickup');
    }
  };

  // 2. Partial Claim - Cancel Request
  const handleCancel = async (foodId) => {
    try {
      const { data } = await api.put(`/food/cancel/${foodId}`);
      toast.success(data.message);
      toast.info(data.penalty); // Trust score -10
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  // Review Functions
  const openReviewModal = async (foodId, foodType) => {
    try {
      const { data } = await api.get(`/food/${foodId}/has-reviewed`);
      if (data.hasReviewed) {
        setReviewedItems(prev => ({ ...prev, [foodId]: true }));
        toast.info('You have already reviewed this pickup.');
        return;
      }
    } catch (error) {
      console.error('Error checking review status:', error);
    }

    setReviewFoodId(foodId);
    setReviewFoodType(foodType);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewFoodId(null);
    setReviewFoodType('');
    setReviewData({
      rating: 5,
      review: '',
      foodQuality: 'good',
      packaging: 'good',
      onTime: true
    });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewFoodId) return;

    console.log('Submitting review for food:', reviewFoodId);
    console.log('Review data:', reviewData);

    try {
      const { data } = await api.post(`/food/${reviewFoodId}/review`, reviewData);
      console.log('Review submitted successfully:', data);
      toast.success('Review submitted successfully!');
      setReviewedItems(prev => ({ ...prev, [reviewFoodId]: true }));
      closeReviewModal();
      fetchData();
    } catch (error) {
      console.error('Review submission error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const StarRating = ({ rating, setRating, readonly = false }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && setRating && setRating(star)}
            className={`text-2xl transition-all ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} ${!readonly && 'hover:scale-110'}`}
            disabled={readonly}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  // 7. QR Code - Generate QR for pickup
  const generateQR = async (foodId) => {
    try {
      const { data } = await api.post(`/food/generate-qr/${foodId}`);
      setShowQR(prev => ({ ...prev, [foodId]: data.qrCode }));
      toast.success('QR Code generated! Show this to donor');
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/receiver/login');
  };

  const hasRequested = (food) => {
    const userId = user?._id?.toString();
    return food.requests.some(r => {
      const reqId = typeof r.receiverId === 'object' ? r.receiverId?._id?.toString() : r.receiverId?.toString();
      return reqId === userId;
    });
  };

  const getMyRequest = (food) => {
    const userId = user?._id?.toString();
    return food.requests.find(r => {
      const reqId = typeof r.receiverId === 'object' ? r.receiverId?._id?.toString() : r.receiverId?.toString();
      return reqId === userId;
    });
  };

  return (
    <div className="min-h-screen p-4 bg-dashboard">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Receiver Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell user={user} />
            {/* 5. Trust Score Badge */}
            <span className={`px-4 py-2 rounded-full text-sm font-bold border ${stats.trustScore >= 80 ? 'bg-purple-100 text-purple-700 border-purple-300' :
              stats.trustScore >= 50 ? 'bg-green-100 text-green-700 border-green-300' :
                stats.trustScore >= 20 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                  'bg-gray-100 text-gray-600 border-gray-300'
              }`}>
              {stats.trustScore >= 80 ? '⭐⭐⭐ Trusted Expert' :
                stats.trustScore >= 50 ? '⭐⭐ High Trust' :
                  stats.trustScore >= 20 ? '⭐ Medium Trust' :
                    'New User'}
              <span className="ml-1">({stats.trustScore})</span>
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all shadow-md"
            >
              ⚙️ Settings
            </button>
            <button onClick={handleLogout} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>

        <NotificationSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </span>
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'impact'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              My Impact
            </span>
          </button>
        </div>

        {/* User QR Code Section - Only show on dashboard tab */}
        {activeTab === 'dashboard' && (<>
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Your Identity QR Code</h3>
                  <p className="text-sm text-gray-600">Show this to donors for quick identification</p>
                </div>
              </div>
              <button
                onClick={() => setShowUserQR(!showUserQR)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold"
              >
                {showUserQR ? 'Hide QR' : 'Show QR'}
              </button>
            </div>

            {showUserQR && (
              <div className="mt-4 flex justify-center">
                {userQR ? (
                  <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-purple-300 text-center">
                    <img src={userQR} alt="User QR Code" className="w-48 h-48 mx-auto rounded-lg" />
                    <p className="text-sm text-gray-500 mt-2">Scan this to verify your identity</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">No QR code generated yet</p>
                    <button
                      onClick={generateUserQR}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                    >
                      Generate QR Code
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards - Improved Points Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card from-yellow-500 to-yellow-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="text-4xl font-bold">{stats.points}</div>
            <div className="text-sm opacity-90 font-semibold">Points Earned</div>
            <div className="text-xs mt-1 opacity-75">+10 per pickup</div>
          </div>
          <div className="stat-card from-green-500 to-green-600">
            <div className="text-4xl font-bold">{stats.pickupCount}</div>
            <div className="text-sm opacity-90 font-semibold">Pickups Made</div>
            <div className="text-xs mt-1 opacity-75">Total donations</div>
          </div>
          <div className="stat-card from-blue-500 to-blue-600">
            <div className="text-4xl font-bold">{stats.trustScore}</div>
            <div className="text-sm opacity-90 font-semibold">Trust Score</div>
            <div className="text-xs mt-1 opacity-75">Based on activity</div>
          </div>
          <div className="stat-card from-purple-500 to-purple-600">
            <div className="text-4xl font-bold">{foodList.length}</div>
            <div className="text-sm opacity-90 font-semibold">Available</div>
            <div className="text-xs mt-1 opacity-75">Food items</div>
          </div>
        </div>

        {/* 8. Emergency Mode - Urgent Food Section */}
        {urgentFood.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-red-600 flex items-center gap-2">
              🚨 URGENT FOOD - Pickup ASAP!
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {urgentFood.map((food) => (
                <div key={food._id} className="card-gradient p-6 rounded-xl border-4 border-red-500 shadow-lg shadow-red-200 bg-red-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-red-800">{food.foodType}</h3>
                      <p className="text-sm text-red-600 font-medium">
                        by {food.donorId?.name} ({food.donorId?.subRole})
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                      🚨 URGENT
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-red-700">
                      <strong>Location:</strong> {food.locationName}
                    </div>
                    <div className="text-sm text-red-700">
                      <strong>Expires:</strong> {new Date(food.expiryTime).toLocaleString()}
                    </div>
                    <div className="text-sm text-red-700">
                      <strong>Remaining:</strong> {food.remainingQuantity} meals
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 mb-8 border border-yellow-200">
          <h3 className="font-semibold text-gray-800 mb-2">Your Progress</h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>Volunteer Certificate: {stats.pickupCount}/5 pickups</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-600"></span>
              <span>Gold Volunteer: {stats.pickupCount}/10 pickups</span>
            </div>
          </div>
        </div>

        {/* Available Food */}
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Available Food</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {foodList.map((food) => {
            const requested = hasRequested(food);
            const myRequest = getMyRequest(food);
            const expiryStatus = getExpiryStatus(food.expiryTime);
            const isExpired = expiryStatus === 'expired';

            return (
              <div key={food._id} className={`card-gradient rounded-xl ${getCardBorderStyle(expiryStatus)} ${isExpired ? 'opacity-60' : ''} transition-all overflow-hidden`}>
                {/* Food Image */}
                {food.imageUrl && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={`http://localhost:5001${food.imageUrl}`}
                      alt={food.foodType}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getExpiryStyles(expiryStatus)}`}>
                        {expiryStatus === 'expired' ? '❌ EXPIRED' :
                          expiryStatus === 'critical' ? '🚨 < 1 HOUR!' :
                            expiryStatus === 'urgent' ? '⚠️ < 3 HOURS' :
                              expiryStatus === 'warning' ? '⏰ < 6 HOURS' :
                                `✅ ${food.remainingQuantity} left`}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{food.foodType}</h3>
                    <p className="text-sm text-primary-600 font-medium">
                      by {food.donorId?.name} ({food.donorId?.subRole})
                    </p>
                  </div>
                  {!food.imageUrl && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getExpiryStyles(expiryStatus)}`}>
                    {expiryStatus === 'expired' ? '❌ EXPIRED' :
                      expiryStatus === 'critical' ? '🚨 < 1 HOUR LEFT!' :
                        expiryStatus === 'urgent' ? '⚠️ < 3 HOURS LEFT' :
                          expiryStatus === 'warning' ? '⏰ < 6 HOURS LEFT' :
                            `✅ ${food.remainingQuantity} left`}
                  </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {food.locationName || food.location}
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-semibold ${expiryStatus === 'critical' ? 'text-red-700 animate-pulse' :
                    expiryStatus === 'urgent' ? 'text-red-600' :
                      expiryStatus === 'warning' ? 'text-orange-600' :
                        'text-gray-600'
                    }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Expires: {new Date(food.expiryTime).toLocaleString()}
                  </div>
                </div>

                {food.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{food.description}</p>
                )}
                </div>

                {/* Request/Pickup Actions */}
                {!requested ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={food.remainingQuantity}
                        placeholder="Qty"
                        className="w-20 input-field py-2"
                        value={requestQuantities[food._id] || ''}
                        onChange={(e) => handleQuantityChange(food._id, e.target.value)}
                      />
                      <button
                        onClick={() => handleRequest(food._id)}
                        className="flex-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold rounded-lg py-2 hover:from-accent-600 hover:to-accent-700 transition-all"
                      >
                        Request
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Max: {food.remainingQuantity} meals</p>
                  </div>
                ) : myRequest?.status === 'requested' ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800 font-medium">
                        📦 You requested {myRequest.quantity} meals
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Show QR code to donor for pickup verification
                      </p>
                    </div>

                    {/* 7. QR Code Display - IMPROVED */}
                    {showQR[food._id] ? (
                      <div className="bg-white border-2 border-purple-300 rounded-xl p-4 shadow-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                            </div>
                            <span className="font-bold text-purple-700">Your Pickup QR Code</span>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3 mb-3">
                            <img src={showQR[food._id]} alt="QR Code" className="w-40 h-40 mx-auto rounded-lg shadow-md" />
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            Show this code to the donor to verify your pickup
                          </p>
                          <button
                            onClick={() => setShowQR(prev => ({ ...prev, [food._id]: null }))}
                            className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
                          >
                            Hide QR Code
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateQR(food._id)}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Show QR Code
                      </button>
                    )}

                    <button
                      onClick={() => handlePickup(food._id)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-md"
                    >
                      ✅ Mark as Picked Up
                    </button>

                    {/* 2. Partial Claim - Cancel Button */}
                    <button
                      onClick={() => handleCancel(food._id)}
                      className="w-full bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-all text-sm font-medium border border-red-200"
                    >
                      ❌ Cancel Request (-10 Trust Score)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-green-100 text-green-700 text-center py-2 rounded-lg text-sm font-semibold">
                      ✓ Picked up
                    </div>
                    {reviewedItems[food._id] ? (
                      <div className="bg-purple-100 text-purple-700 text-center py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Reviewed
                      </div>
                    ) : (
                      <button
                        onClick={() => openReviewModal(food._id, food.foodType)}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Rate & Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {foodList.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No food available right now. Check back soon!
          </div>
        )}
        </>)}

        {/* Impact Dashboard Tab */}
        {activeTab === 'impact' && (
          <div className="space-y-6">
            {impactLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : impactStats ? (
              <>
                {/* Impact Header */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <h2 className="text-2xl font-bold mb-2">🌍 Your Impact</h2>
                  <p className="opacity-90">See how your contributions are making a difference!</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                    <div className="text-3xl font-bold text-green-600">{impactStats.totalMealsPicked}</div>
                    <div className="text-gray-600 text-sm mt-1">Meals Picked Up</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500">
                    <div className="text-3xl font-bold text-yellow-600">{impactStats.totalPointsEarned}</div>
                    <div className="text-gray-600 text-sm mt-1">Points Earned</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
                    <div className="text-3xl font-bold text-blue-600">{impactStats.totalPickups}</div>
                    <div className="text-gray-600 text-sm mt-1">Total Pickups</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
                    <div className="text-3xl font-bold text-purple-600">{impactStats.reviewsGiven}</div>
                    <div className="text-gray-600 text-sm mt-1">Reviews Given</div>
                  </div>
                </div>

                {/* Environmental Impact */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <h3 className="text-xl font-bold mb-4">🌱 Environmental Impact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
                      <div className="text-3xl font-bold">{impactStats.wasteReducedKg} kg</div>
                      <div className="text-green-100 text-sm">Food waste prevented</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
                      <div className="text-3xl font-bold">{impactStats.co2SavedKg} kg</div>
                      <div className="text-green-100 text-sm">CO₂ emissions saved</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
                      <div className="text-3xl font-bold">{impactStats.peopleFed}</div>
                      <div className="text-green-100 text-sm">People fed (estimated)</div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                {impactStats.monthlyStats.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">📈 Monthly Activity</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={impactStats.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="pickups" stroke="#3B82F6" name="Pickups" strokeWidth={2} />
                        <Line type="monotone" dataKey="meals" stroke="#10B981" name="Meals" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Food Types */}
                {impactStats.foodTypes.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">🍽️ Food Types You've Received</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {impactStats.foodTypes.map((type, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                            {type.count}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{type.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Donor Interactions */}
                {impactStats.donorInteractions.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">🤝 Donors You've Worked With</h3>
                    <div className="space-y-3">
                      {impactStats.donorInteractions.map((donor, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {donor.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{donor.name}</span>
                          </div>
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {donor.count} pickups
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Reviews */}
                {impactStats.recentReviews.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">⭐ Your Recent Reviews</h3>
                    <div className="space-y-4">
                      {impactStats.recentReviews.map((review) => (
                        <div key={review._id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-800">{review.foodId?.foodType}</span>
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm">{review.review}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            By {review.donorId?.name} • {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No impact data available yet.</p>
                <p className="text-sm mt-2">Start picking up food to see your impact!</p>
              </div>
            )}
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Rate & Review</h3>
                <button
                  onClick={closeReviewModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Reviewing: <span className="font-semibold text-gray-800">{reviewFoodType}</span></p>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <StarRating
                    rating={reviewData.rating}
                    setRating={(rating) => setReviewData({ ...reviewData, rating })}
                  />
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                  <textarea
                    value={reviewData.review}
                    onChange={(e) => setReviewData({ ...reviewData, review: e.target.value })}
                    placeholder="How was the food? Share your experience..."
                    className="w-full input-field"
                    rows="4"
                    required
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">{reviewData.review.length}/500 characters</p>
                </div>

                {/* Food Quality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Food Quality</label>
                  <select
                    value={reviewData.foodQuality}
                    onChange={(e) => setReviewData({ ...reviewData, foodQuality: e.target.value })}
                    className="w-full input-field"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="average">Average</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>

                {/* Packaging */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Packaging</label>
                  <select
                    value={reviewData.packaging}
                    onChange={(e) => setReviewData({ ...reviewData, packaging: e.target.value })}
                    className="w-full input-field"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="average">Average</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>

                {/* On Time Delivery */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="onTime"
                    checked={reviewData.onTime}
                    onChange={(e) => setReviewData({ ...reviewData, onTime: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="onTime" className="text-sm text-gray-700">Food was available on time</label>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeReviewModal}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold shadow-md"
                    disabled={!reviewData.review.trim()}
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Mobile Popup Modal for Nearby Food */}
        {mobilePopup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  <h3 className="font-bold text-lg">New Food Nearby!</h3>
                </div>
                <button 
                  onClick={() => setMobilePopup(null)}
                  className="bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-xl font-extrabold text-gray-800">{mobilePopup.foodType}</h4>
                  <p className="text-sm text-gray-600 mt-1 font-medium">{mobilePopup.donorId?.name}</p>
                </div>
                
                <div className="space-y-3 mb-6 bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-lg">📍</span>
                    <span className="font-semibold">{mobilePopup.distance} km away</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-lg">📦</span>
                    <span className="font-semibold">{mobilePopup.remainingQuantity} meals available</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-lg">⏰</span>
                    <span>Expires: {new Date(mobilePopup.expiryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setMobilePopup(null)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Ignore
                  </button>
                  <button
                    onClick={() => handleAcceptFoodFromPopup(mobilePopup)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-colors shadow-lg shadow-green-500/30"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReceiverDashboard;
