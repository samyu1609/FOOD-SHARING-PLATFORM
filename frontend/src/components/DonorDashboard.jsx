import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api';
import UploadFoodForm from './UploadFoodForm';
import socket from '../socket';
import NotificationBell from './NotificationBell';
import NotificationSettings from './NotificationSettings';

function DonorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalMeals: 0,
    points: 0
  });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scannerRef = useRef(null);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/donor/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'donor') {
      toast.error('Access denied: You are not registered as a donor');
      navigate('/');
      return;
    }
    setUser(parsedUser);
    fetchDonations();
    fetchReviews();

    socket.connect();
    socket.on('foodAdded', () => fetchDonations());
    socket.on('foodUpdated', () => fetchDonations());

    return () => {
      socket.off('foodAdded');
      socket.off('foodUpdated');
    };
  }, [navigate]);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get('/food/donor/reviews');
      setReviews(data.reviews);
      setReviewStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch reviews');
    }
  };

  const fetchDonations = async () => {
    try {
      const [donationsRes, statsRes] = await Promise.all([
        api.get('/food/myDonations'),
        api.get('/food/donor/stats')
      ]);
      setDonations(donationsRes.data);
      setStats({
        totalDonations: statsRes.data.totalDonations,
        completedDonations: statsRes.data.completedDonations,
        totalMeals: statsRes.data.totalMeals,
        points: statsRes.data.points
      });
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/donor/login');
      }
    }
  };

  // 1. Smart Food Matching - Get suggestions
  const fetchSuggestions = async (foodId) => {
    try {
      const { data } = await api.get(`/food/suggestions/${foodId}`);
      setSuggestions(prev => ({ ...prev, [foodId]: data.suggestions }));
      setShowSuggestions(prev => ({ ...prev, [foodId]: true }));
    } catch (error) {
      toast.error('Failed to fetch suggestions');
    }
  };

  // 8. Emergency Mode - Toggle urgent status
  const toggleUrgent = async (foodId, currentStatus) => {
    try {
      const { data } = await api.put(`/food/mark-urgent/${foodId}`);
      toast.success(data.message);
      fetchDonations();
    } catch (error) {
      toast.error('Failed to update urgent status');
    }
  };

  // 7. QR Code Scanner - Verify QR
  const verifyQR = async () => {
    try {
      const { data } = await api.post('/food/verify-qr', { qrData: qrInput });
      toast.success(data.message);
      setQrInput('');
      setShowQRScanner(false);
      setScanning(false);
      fetchDonations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid QR code');
    }
  };

  // Start camera scanning
  const startScanning = () => {
    setScanning(true);
    setTimeout(() => {
      if (scannerRef.current) {
        const scanner = new Html5QrcodeScanner('qr-reader', {
          qrbox: { width: 250, height: 250 },
          fps: 10,
          aspectRatio: 1.0,
        }, false);
        
        scanner.render(
          (decodedText) => {
            // Success callback
            setQrInput(decodedText);
            toast.success('QR Code scanned successfully!');
            scanner.clear();
            setScanning(false);
          },
          (error) => {
            // Error callback - ignore scan errors during scanning
            console.log('Scan error:', error);
          }
        );
        
        scannerRef.current = scanner;
      }
    }, 100);
  };

  // Stop camera scanning
  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Close scanner modal
  const closeScanner = () => {
    stopScanning();
    setShowQRScanner(false);
    setQrInput('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/donor/login');
  };

  // 5. Trust Score Badge Color
  const getTrustBadgeColor = (score) => {
    if (score >= 80) return 'bg-purple-100 text-purple-700 border-purple-300';
    if (score >= 50) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 20) return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-gray-100 text-gray-600 border-gray-300';
  };

  return (
    <div className="min-h-screen p-4 bg-dashboard">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Donor Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell user={user} />
            <button
              onClick={() => navigate('/impact-dashboard')}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md"
            >
              📊 Impact
            </button>
            <button
              onClick={() => navigate('/certificates')}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md"
            >
              🏆 Certificates
            </button>
            <button
              onClick={() => setShowQRScanner(!showQRScanner)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md"
            >
              📷 Scan QR
            </button>
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

        {/* QR Scanner Modal - WITH CAMERA */}
        {showQRScanner && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-purple-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">📷 Verify Pickup</h3>
                  <p className="text-sm text-gray-500">Scan receiver's QR code to confirm</p>
                </div>
              </div>
              
              {/* Camera Scanner Section */}
              <div className="mb-4">
                {!scanning ? (
                  <div className="bg-purple-50 rounded-xl p-4 border-2 border-dashed border-purple-300 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-purple-700 mb-3">
                      Use your camera to scan the receiver's QR code
                    </p>
                    <button
                      onClick={startScanning}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md"
                    >
                      📷 Start Camera Scanner
                    </button>
                  </div>
                ) : (
                  <div className="bg-black rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center bg-purple-600 text-white px-4 py-2">
                      <span className="font-semibold text-sm">Camera Scanner</span>
                      <button
                        onClick={stopScanning}
                        className="text-white hover:text-purple-200 text-sm"
                      >
                        ✕ Stop
                      </button>
                    </div>
                    <div id="qr-reader" ref={scannerRef} className="w-full"></div>
                    <p className="text-center text-gray-400 text-xs py-2 bg-black">
                      Point camera at QR code to scan
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-xs text-gray-500 font-medium">OR MANUAL ENTRY</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              {/* Manual Input Section */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 text-center mb-3">
                  Paste QR data manually if camera doesn't work:
                </p>
                <textarea
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg mb-3 font-mono text-xs bg-white focus:border-purple-500 focus:outline-none"
                  rows="3"
                  placeholder="Paste QR data here... (JSON format)"
                />
                {qrInput && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    QR data ready to verify
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={verifyQR}
                  disabled={!qrInput.trim()}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    qrInput.trim() 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  ✅ Verify Pickup
                </button>
                <button
                  onClick={closeScanner}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card from-primary-500 to-primary-600">
            <div className="text-3xl font-bold">{stats.totalDonations}</div>
            <div className="text-sm opacity-90">Total Donations</div>
          </div>
          <div className="stat-card from-secondary-500 to-secondary-600">
            <div className="text-3xl font-bold">{stats.completedDonations || 0}</div>
            <div className="text-sm opacity-90">Completed</div>
          </div>
          <div className="stat-card from-accent-500 to-accent-600">
            <div className="text-3xl font-bold">{stats.totalMeals}</div>
            <div className="text-sm opacity-90">Meals Saved</div>
          </div>
          <div className="stat-card from-purple-500 to-purple-600">
            <div className="text-3xl font-bold">{stats.points}</div>
            <div className="text-sm opacity-90">Points Earned</div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="btn-secondary"
          >
            {showUploadForm ? 'Hide Upload Form' : '+ Upload New Food'}
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="card-gradient max-w-md mb-8 p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Upload Food</h2>
            <UploadFoodForm onFoodAdded={() => {
              fetchDonations();
              setShowUploadForm(false);
            }} />
          </div>
        )}

        {/* My Donations */}
        <h2 className="text-2xl font-bold mb-4 text-gray-800">My Donations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donations.map((donation) => (
            <div key={donation._id} className={`card-gradient p-6 rounded-xl border-2 ${
              donation.isUrgent ? 'border-red-500 shadow-lg shadow-red-200' : 
              donation.status === 'urgent' ? 'border-orange-500' : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {donation.foodType}
                    {donation.isUrgent && (
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full animate-pulse">
                        🚨 URGENT
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">{donation.locationName || donation.location}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  donation.status === 'available' 
                    ? 'bg-secondary-100 text-secondary-700' 
                    : donation.status === 'urgent'
                    ? 'bg-red-100 text-red-700 animate-pulse'
                    : donation.status === 'expired'
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {donation.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-semibold">{donation.totalQuantity} meals</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <span className={`font-semibold ${
                    donation.remainingQuantity > 0 ? 'text-secondary-600' : 'text-gray-500'
                  }`}>
                    {donation.remainingQuantity} meals
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Expires:</span>
                  <span className={`font-semibold ${
                    new Date(donation.expiryTime) < new Date(Date.now() + 30 * 60 * 1000)
                      ? 'text-red-600 animate-pulse'
                      : 'text-accent-600'
                  }`}>
                    {new Date(donation.expiryTime).toLocaleString()}
                  </span>
                </div>
              </div>

              {donation.description && (
                <p className="text-sm text-gray-600 mb-4">{donation.description}</p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => fetchSuggestions(donation._id)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  🤖 Smart Match
                </button>
                <button
                  onClick={() => toggleUrgent(donation._id, donation.isUrgent)}
                  className={`flex-1 text-sm py-2 rounded-lg transition-all ${
                    donation.isUrgent
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                  }`}
                >
                  {donation.isUrgent ? '✓ Urgent' : '🚨 Mark Urgent'}
                </button>
              </div>

              {/* Smart Suggestions Panel */}
              {showSuggestions[donation._id] && suggestions[donation._id] && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-blue-800">🤖 Suggested Receivers</h4>
                    <button
                      onClick={() => setShowSuggestions(prev => ({ ...prev, [donation._id]: false }))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {suggestions[donation._id].map((receiver, idx) => (
                      <div key={receiver._id} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-sm">{idx + 1}. {receiver.name}</span>
                            <span className={`text-xs ml-2 px-2 py-0.5 rounded-full border ${getTrustBadgeColor(receiver.trustScore)}`}>
                              {receiver.trustBadge}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {receiver.subRole} • {receiver.phone}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {receiver.matchReasons.map((reason, i) => (
                            <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requests */}
              {donation.requests.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Requests:</h4>
                  <div className="space-y-2">
                    {donation.requests.map((req, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <div>
                          <span className="text-sm font-medium">{req.receiverId?.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({req.quantity} meals)</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          req.status === 'picked' 
                            ? 'bg-secondary-100 text-secondary-700' 
                            : req.status === 'auto_reassigned'
                            ? 'bg-orange-100 text-orange-700'
                            : req.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {donations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No donations yet. Start by uploading food!
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-8">
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {showReviews ? 'Hide Reviews' : `Reviews from Receivers ${reviewStats ? `(${reviewStats.totalReviews})` : ''}`}
            {reviewStats && (
              <span className="bg-white/20 px-2 py-1 rounded-full text-sm">
                ⭐ {reviewStats.averageRating}/5
              </span>
            )}
          </button>

          {showReviews && (
            <div className="mt-4 space-y-4">
              {/* Review Stats */}
              {reviewStats && reviewStats.totalReviews > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Review Summary</h3>
                      <p className="text-sm text-gray-500">Based on {reviewStats.totalReviews} reviews</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-yellow-500">{reviewStats.averageRating}</div>
                      <div className="text-sm text-gray-500">out of 5</div>
                    </div>
                  </div>
                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-sm w-8">{star}★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-400 h-2 rounded-full transition-all"
                            style={{
                              width: `${reviewStats.totalReviews > 0 ? (reviewStats.ratingCounts[star] / reviewStats.totalReviews) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-8">{reviewStats.ratingCounts[star] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {reviews.length > 0 ? (
                <div className="grid gap-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-400">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800">{review.foodId?.foodType}</h4>
                          <p className="text-sm text-gray-500">{review.foodId?.locationName}</p>
                        </div>
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{review.review}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${review.foodQuality === 'excellent' ? 'bg-green-100 text-green-700' : review.foodQuality === 'good' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          Quality: {review.foodQuality}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${review.packaging === 'excellent' ? 'bg-green-100 text-green-700' : review.packaging === 'good' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          Packaging: {review.packaging}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${review.onTime ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {review.onTime ? 'On Time ✓' : 'Delayed'}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          By {review.receiverId?.name} ({review.receiverId?.subRole})
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <p className="text-gray-500">No reviews yet. Reviews will appear here when receivers rate your donations.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DonorDashboard;
