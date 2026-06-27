import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import api from '../api';
import socket from '../socket';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

function ImpactDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactStats();
    
    socket.connect();
    socket.on('dashboardUpdated', () => {
      fetchImpactStats();
    });

    return () => {
      socket.off('dashboardUpdated');
    };
  }, []);

  const fetchImpactStats = async () => {
    try {
      const { data } = await api.get('/food/stats/impact');
      setStats(data);
    } catch (error) {
      toast.error('Failed to load impact statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Failed to load statistics
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gradient">📊 Impact Dashboard</h1>
            <p className="text-gray-600 mt-2">See how Hunger Bridge is making a difference</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
          >
            ← Go Back
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="text-4xl font-bold text-green-600">{stats.totalMealsDonated}</div>
            <div className="text-gray-600 mt-1">Total Meals Donated</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
            <div className="text-4xl font-bold text-blue-600">{stats.totalMealsPicked}</div>
            <div className="text-gray-600 mt-1">Meals Picked Up</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-yellow-500">
            <div className="text-4xl font-bold text-yellow-600">{stats.wasteReducedKg} kg</div>
            <div className="text-gray-600 mt-1">Food Waste Reduced</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="text-4xl font-bold text-purple-600">{stats.completionRate}%</div>
            <div className="text-gray-600 mt-1">Pickup Success Rate</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Food Types Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800">🍽️ Food Types Distribution</h3>
            {stats.foodByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.foodByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, percent }) => `${_id}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="_id"
                  >
                    {stats.foodByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Monthly Trend Line Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800">📈 30-Day Activity Trend</h3>
            {stats.monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="donations" stroke="#3B82F6" name="Donations" strokeWidth={2} />
                  <Line type="monotone" dataKey="meals" stroke="#10B981" name="Meals" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Donors Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800">🏆 Top Donors</h3>
            {stats.topDonors.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topDonors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="points" fill="#3B82F6" name="Points" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Top Receivers Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800">⭐ Top Receivers</h3>
            {stats.topReceivers.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topReceivers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="pickupCount" fill="#10B981" name="Pickups" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white shadow-lg mb-8">
          <h3 className="text-2xl font-bold mb-4">🌍 Environmental Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
              <div className="text-3xl font-bold">{stats.wasteReducedKg} kg</div>
              <div className="text-green-100">Food waste prevented</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
              <div className="text-3xl font-bold">{Math.round(stats.wasteReducedKg * 2.5)} kg</div>
              <div className="text-green-100">CO₂ emissions saved</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
              <div className="text-3xl font-bold">{stats.totalMealsPicked * 3}</div>
              <div className="text-green-100">People fed (estimated)</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Together, we're building a world with zero food waste and zero hunger. 🌱</p>
        </div>
      </div>
    </div>
  );
}

export default ImpactDashboard;
