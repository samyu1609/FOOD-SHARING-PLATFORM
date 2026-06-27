import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import socket from '../socket';

function Leaderboards() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('restaurants');
  const [restaurants, setRestaurants] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();

    socket.connect();
    socket.on('foodUpdated', fetchLeaderboards);
    socket.on('dashboardUpdated', fetchLeaderboards);

    return () => {
      socket.off('foodUpdated');
      socket.off('dashboardUpdated');
    };
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const resRest = await api.get('/leaderboard/restaurants');
      const resVol = await api.get('/leaderboard/volunteers');
      setRestaurants(resRest.data);
      setVolunteers(resVol.data);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      toast.error('Failed to load leaderboards');
    } finally {
      setLoading(false);
    }
  };

  const renderBadges = (badges) => {
    if (!badges || badges.length === 0) return null;
    return (
      <div className="flex gap-1">
        {badges.map((badge, idx) => {
          let color = "bg-gray-200 text-gray-800";
          if (badge === 'Bronze') color = "bg-amber-600 text-white";
          if (badge === 'Silver') color = "bg-gray-400 text-white";
          if (badge === 'Gold') color = "bg-yellow-500 text-white";
          if (badge === 'Platinum') color = "bg-teal-500 text-white";
          if (badge === 'Diamond') color = "bg-blue-400 text-white";
          if (badge === 'Legend') color = "bg-purple-600 text-white";
          return <span key={idx} className={`text-xs px-2 py-1 rounded-full font-bold ${color}`}>{badge}</span>;
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading leaderboards...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
            <p className="text-gray-600">Top contributors making an impact</p>
          </div>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Back
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${activeTab === 'restaurants' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
          >
            Restaurant Top Donors
          </button>
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${activeTab === 'volunteers' ? 'bg-accent-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
          >
            Top Volunteers
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {activeTab === 'restaurants' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badges</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Donations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meals Shared</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {restaurants.map((rest) => (
                    <tr key={rest._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${rest.rank === 1 ? 'bg-yellow-100 text-yellow-800 text-lg' : rest.rank === 2 ? 'bg-gray-200 text-gray-800' : rest.rank === 3 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                          #{rest.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{rest.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{renderBadges(rest.badges)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{rest.totalDonations}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{rest.mealsShared}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{rest.monthlyDonations}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">{rest.successRate}%</span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${rest.successRate}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-primary-600">{rest.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'volunteers' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badges</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deliveries</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Served</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meals Delivered</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {volunteers.map((vol) => (
                    <tr key={vol._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${vol.rank === 1 ? 'bg-yellow-100 text-yellow-800 text-lg' : vol.rank === 2 ? 'bg-gray-200 text-gray-800' : vol.rank === 3 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                          #{vol.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{vol.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{renderBadges(vol.badges)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-accent-600">Lvl {vol.level}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{vol.deliveriesCompleted}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{vol.hoursServed} hrs</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{vol.mealsDelivered}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-primary-600">{vol.currentPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Leaderboards;
