import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';

function CertificatePage() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [pickupCount, setPickupCount] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchCertificates();
    fetchPoints();
  }, [navigate]);

  const fetchCertificates = async () => {
    try {
      const { data } = await api.get('/user/certificates');
      setCertificates(data);
    } catch (error) {
      toast.error('Failed to load certificates');
    }
  };

  const fetchPoints = async () => {
    try {
      const { data } = await api.get('/user/points');
      setPoints(data.points);
      setPickupCount(data.pickupCount);
    } catch (error) {
      console.error('Failed to load points');
    }
  };

  const getNextMilestone = () => {
    if (user?.role === 'donor') {
      if (points < 100) return { title: 'Bronze Donor Certificate', needed: 100 - points, unit: 'meals' };
      if (points < 500) return { title: 'Silver Donor Certificate', needed: 500 - points, unit: 'meals' };
      if (points < 1000) return { title: 'Gold Donor Certificate', needed: 1000 - points, unit: 'meals' };
      if (points < 5000) return { title: 'Platinum Donor Certificate', needed: 5000 - points, unit: 'meals' };
      return null;
    } else {
      if (pickupCount < 10) return { title: 'Bronze Volunteer Certificate', needed: 10 - pickupCount, unit: 'deliveries' };
      if (pickupCount < 50) return { title: 'Silver Volunteer Certificate', needed: 50 - pickupCount, unit: 'deliveries' };
      if (pickupCount < 100) return { title: 'Gold Volunteer Certificate', needed: 100 - pickupCount, unit: 'deliveries' };
      if (pickupCount < 500) return { title: 'Platinum Volunteer Certificate', needed: 500 - pickupCount, unit: 'deliveries' };
      return null;
    }
  };

  const nextMilestone = getNextMilestone();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient">My Certificates</h1>
            <p className="text-gray-600">View and download your achievements</p>
          </div>
          <button
            onClick={() => navigate(user?.role === 'donor' ? '/donor/dashboard' : '/receiver/dashboard')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Progress */}
        <div className="card-gradient p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {user?.role === 'donor' ? 'Donor Progress' : 'Volunteer Progress'}
              </h2>
              <p className="text-gray-600">
                {user?.role === 'donor' 
                  ? `You've donated ${points} meals` 
                  : `You've completed ${pickupCount} pickups`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gradient">
                {user?.role === 'donor' ? points : pickupCount}
              </div>
              <div className="text-sm text-gray-500">
                {user?.role === 'donor' ? 'points' : 'pickups'}
              </div>
            </div>
          </div>

          {nextMilestone && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Next Goal:</span> {nextMilestone.title}
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{nextMilestone.needed} more {nextMilestone.unit} needed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: user?.role === 'donor' 
                        ? `${(points / (points + nextMilestone.needed)) * 100}%`
                        : `${(pickupCount / (pickupCount + nextMilestone.needed)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {!nextMilestone && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
              <p className="text-center text-gray-700 font-semibold">
                🎉 Congratulations! You've earned all available certificates!
              </p>
            </div>
          )}
        </div>

        {/* Certificates List */}
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Earned Certificates</h2>
        
        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert, idx) => (
              <div key={idx} className="card-gradient p-6 border-2 border-yellow-300">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{cert.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Earned on {new Date(cert.earnedAt).toLocaleDateString()}
                    </p>
                    <a
                      href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${cert.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-gradient p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Certificates Yet</h3>
            <p className="text-gray-500">
              {user?.role === 'donor'
                ? 'Start donating food to earn certificates!'
                : 'Complete food pickups to earn volunteer certificates!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CertificatePage;
