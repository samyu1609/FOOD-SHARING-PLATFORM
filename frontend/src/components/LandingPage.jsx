import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-landing">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-4">
              Hunger Bridge
            </h1>
            <p className="text-xl text-gray-600 mb-2">Food Sharing Platform</p>
            <p className="text-gray-500 max-w-lg mx-auto">
              Connecting food donors with those in need. Share surplus food, reduce waste, feed the hungry.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <div className="text-2xl font-bold text-primary-600">500+</div>
              <div className="text-xs text-gray-500">Meals Shared</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <div className="text-2xl font-bold text-secondary-600">50+</div>
              <div className="text-xs text-gray-500">Active Donors</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <div className="text-2xl font-bold text-accent-600">100+</div>
              <div className="text-xs text-gray-500">Volunteers</div>
            </div>
          </div>

          {/* Login Options */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Donor Card */}
            <div className="card-gradient p-8 hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/donor/login')}>
              <div className="w-16 h-16 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Food Donor</h2>
              <p className="text-gray-600 mb-4">Share your surplus food with those in need</p>
              <button className="btn-secondary w-full">Login as Donor</button>
            </div>

            {/* Receiver Card */}
            <div className="card-gradient p-8 hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/receiver/login')}>
              <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Food Receiver</h2>
              <p className="text-gray-600 mb-4">Find and collect food donations near you</p>
              <button className="w-full bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold rounded-lg px-6 py-3 shadow-lg hover:from-accent-600 hover:to-accent-700 hover:shadow-xl transition-all">
                Login as Receiver
              </button>
            </div>

            {/* Admin Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl shadow-xl hover:scale-105 transition-transform cursor-pointer border border-gray-200" onClick={() => navigate('/admin/login')}>
              <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">System Admin</h2>
              <p className="text-gray-600 mb-4">Monitor and manage the entire platform</p>
              <button className="w-full bg-gradient-to-r from-gray-700 to-gray-900 text-white font-semibold rounded-lg px-6 py-3 shadow-lg hover:from-gray-800 hover:to-black hover:shadow-xl transition-all">
                Login as Admin
              </button>
            </div>
          </div>

          {/* Public Views */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/impact-dashboard')}
              className="px-6 py-2 bg-white text-primary-600 rounded-full font-medium shadow-md hover:shadow-lg transition-all border border-primary-100"
            >
              📊 View Impact Dashboard
            </button>
            <button
              onClick={() => navigate('/leaderboards')}
              className="px-6 py-2 bg-white text-accent-600 rounded-full font-medium shadow-md hover:shadow-lg transition-all border border-accent-100"
            >
              🏆 View Leaderboards
            </button>
          </div>

          {/* Footer */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="text-gray-400 text-sm">
              Together we can make a difference. Every meal counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
