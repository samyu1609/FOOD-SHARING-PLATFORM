import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './components/LandingPage';
import LoginDonor from './components/LoginDonor';
import LoginReceiver from './components/LoginReceiver';
import DonorDashboard from './components/DonorDashboard';
import ReceiverDashboard from './components/ReceiverDashboard';
import CertificatePage from './components/CertificatePage';
import ImpactDashboard from './components/ImpactDashboard';
import Leaderboards from './components/Leaderboards';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

import ForgotPassword from './components/ForgotPassword';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/donor/login" element={<LoginDonor />} />
          <Route path="/receiver/login" element={<LoginReceiver />} />
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
          <Route path="/receiver/dashboard" element={<ReceiverDashboard />} />
          <Route path="/certificates" element={<CertificatePage />} />
          <Route path="/impact-dashboard" element={<ImpactDashboard />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
