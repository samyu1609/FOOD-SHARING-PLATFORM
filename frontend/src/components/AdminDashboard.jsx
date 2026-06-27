import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/admin/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, donationsRes, requestsRes, notifsRes, certsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users'),
        api.get('/admin/donations'),
        api.get('/admin/requests'),
        api.get('/admin/notifications'),
        api.get('/admin/certificates/pending')
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setDonations(donationsRes.data);
      setRequests(requestsRes.data);
      setNotifications(notifsRes.data);
      setCertificates(certsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/admin/user/${userId}/status`, { status: newStatus });
      toast.success(`User marked as ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleApproveCertificate = async (userId, certId) => {
    try {
      await api.put(`/admin/certificates/${userId}/${certId}/approve`);
      toast.success('Certificate approved successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve certificate');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  const navItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'User Management' },
    { id: 'donations', icon: '🍲', label: 'Donation History' },
    { id: 'requests', icon: '🚚', label: 'Delivery Tracking' },
    { id: 'certificates', icon: '🏆', label: 'Certificates' },
    { id: 'notifications', icon: '🔔', label: 'System Logs' }
  ];

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">Loading Dashboard Data...</div>;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-xl border-r border-gray-100 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-orange-500">
            HungerBridge Admin
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-4">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-green-50 to-orange-50 text-green-700 shadow-sm border border-green-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium shadow-sm"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Soft Background Illustration (Admin Dashboard Style) */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: "url('/src/assets/dashboard-bg.png')", 
               backgroundSize: 'cover', 
               backgroundPosition: 'center',
               filter: 'blur(2px)'
             }}
        />

        <div className="relative z-10 p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-end mb-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-gray-500 mt-1">Monitor and manage platform activities.</p>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">👥</div>
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Users</h3>
                  <p className="text-4xl font-bold text-gray-800">{analytics?.totalUsers}</p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{analytics?.totalDonors} Donors</span>{' '}
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{analytics?.totalReceivers} Receivers</span>
                  </p>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">🍱</div>
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Food Donated</h3>
                  <p className="text-4xl font-bold text-gray-800">{analytics?.totalMealsDonated}</p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">Meals offered</p>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">✅</div>
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Food Delivered</h3>
                  <p className="text-4xl font-bold text-gray-800">{analytics?.totalMealsDelivered}</p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">Meals successfully received</p>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">🌱</div>
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Waste Prevented</h3>
                  <p className="text-4xl font-bold text-gray-800">{analytics?.totalFoodWastePrevented} <span className="text-xl text-gray-500">kg</span></p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">Approximate CO2 reduced</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Detailed Demographics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Restaurants</span>
                        <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-sm font-bold">{analytics?.totalRestaurants}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">NGOs / Ashrams</span>
                        <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm font-bold">{analytics?.totalNGOs}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Volunteers</span>
                        <span className="bg-purple-100 text-purple-800 py-1 px-3 rounded-full text-sm font-bold">{analytics?.totalVolunteers}</span>
                      </div>
                    </div>
                 </div>
                 
                 <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Platform Health</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Active Listings</span>
                        <span className="bg-orange-100 text-orange-800 py-1 px-3 rounded-full text-sm font-bold">{analytics?.activeFoodListings}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">Delivery Success Rate</span>
                        <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm font-bold">{analytics?.successRate}%</span>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role & Sub-Role</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Points</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {users.map(user => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{user.name}</span>
                            <span className="text-sm text-gray-500">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${user.role === 'donor' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {user.role.toUpperCase()} {user.subRole ? `• ${user.subRole}` : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-200">{user.points} pts</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${user.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleStatusChange(user._id, user.status || 'active')}
                            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors shadow-sm ${user.status === 'suspended' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                          >
                            {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DONATIONS TAB */}
          {activeTab === 'donations' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Donor</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Food Details</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {donations.map(doc => (
                      <tr key={doc._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                          {doc.donorId?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-800">{doc.foodType}</div>
                          <div className="text-xs text-gray-500">Qty: {doc.totalQuantity} | Exp: {new Date(doc.expiryTime).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                            {doc.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REQUESTS/TRACKING TAB */}
          {activeTab === 'requests' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Parties Involved</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {requests.map((req, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col gap-1 text-xs font-medium">
                            <div><span className="text-gray-500">D:</span> {req.donor || 'N/A'}</div>
                            <div><span className="text-gray-500">R:</span> {req.receiver || 'N/A'}</div>
                            {req.volunteer && <div><span className="text-gray-500">V:</span> {req.volunteer}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-800">{req.foodType}</div>
                          <div className="text-xs text-gray-500">Qty: {req.quantity}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                            req.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                            req.status === 'picked' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CERTIFICATES TAB */}
          {activeTab === 'certificates' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Certificate Management</h3>
              {certificates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No certificates found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {certificates.map(cert => (
                    <div key={cert.certId} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col">
                      <div className="mb-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${cert.userRole === 'donor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {cert.userRole.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-lg text-gray-900 mt-2">{cert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">Awarded to: <span className="font-bold">{cert.userName}</span></p>
                        <p className="text-xs text-gray-500 mt-1">Date: {new Date(cert.earnedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-200">
                        <a href={`http://localhost:5001${cert.url}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-semibold hover:underline">
                          View PDF
                        </a>
                        {!cert.isApproved && (
                          <button 
                            onClick={() => handleApproveCertificate(cert.userId, cert.certId)}
                            className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                        )}
                        {cert.isApproved && (
                          <span className="text-green-600 font-bold text-sm flex items-center gap-1">
                            ✅ Approved
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Message</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {notifications.map(notif => (
                      <tr key={notif._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {new Date(notif.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-bold border border-gray-200">
                            {notif.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                          {notif.userId?.name || 'System'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">
                          <span className="font-semibold block text-xs text-gray-500 mb-0.5">{notif.title}</span>
                          {notif.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
