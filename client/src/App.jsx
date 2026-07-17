import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { NotificationProvider } from './lib/NotificationContext';
import LiveNotificationPopup from './components/LiveNotificationPopup';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CustomerRegister from './pages/CustomerRegister';
import CustomerDashboard from './pages/CustomerDashboard';
import RepairRegister from './pages/RepairRegister';
import TrackingPage from './pages/TrackingPage';
import TechnicianDashboard from './pages/TechnicianDashboard';
import RepairDetail from './pages/RepairDetail';
import PickupVerification from './pages/PickupVerification';
import PaymentPage from './pages/PaymentPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminRepairControl from './pages/AdminRepairControl';
import MasterDashboard from './pages/MasterDashboard';
import StudentDashboard from './pages/StudentDashboard';
import CoursesPage from './pages/CoursePurchasePage';
import StaffLogin from './pages/StaffLogin';
import EnrolledCourses from './pages/EnrolledCourses';
import api from './lib/api';
import PrintCertificate from './pages/PrintCertificate';
import ResetPassword from './pages/ResetPassword';
function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <LiveNotificationPopup />
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login/staff" element={<StaffLogin />} />
          <Route path="/login/:role" element={<LoginPage />} />
          <Route path="/register/customer" element={<CustomerRegister />} />
          <Route path="/dashboard/customer" element={<CustomerDashboard />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/admin/repair-control" element={<AdminRepairControl />} />
          <Route path="/dashboard/master" element={<MasterDashboard />} />
          <Route path="/dashboard/student" element={<StudentDashboard />} />
          <Route path="/enrolled-courses" element={<EnrolledCourses />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/repair/register" element={<RepairRegister />} />
          <Route path="/track/:trackingNumber" element={<TrackingPage />} />
          <Route path="/technician" element={<TechnicianDashboard />} />
          <Route path="/technician/repair/:id" element={<RepairDetail />} />
          <Route path="/technician/repair/:id/pickup" element={<PickupVerification />} />
          <Route path="/technician/repair/:id/payment" element={<PaymentPage />} />
          <Route path="/repair/:id/payment" element={<PaymentPage />} />
           <Route path="/student/certificates/:id/html" element={<PrintCertificate />} />
           <Route path="/reset-password" element={<ResetPassword />} />
         </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
