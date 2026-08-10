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
import CoursesPage from './pages/CoursesPage';
import StaffLogin from './pages/StaffLogin';
import EnrolledCourses from './pages/EnrolledCourses';
import AccessoriesStore from './pages/AccessoriesStore';
import AccessoriesCart from './pages/AccessoriesCart';
import AccessoriesTracking from './pages/AccessoriesTracking';
import AdminAccessories from './pages/AdminAccessories';
import AdminOrders from './pages/AdminOrders';
import PaymentCollection from './pages/PaymentCollection';
import SalaryWallet from './pages/SalaryWallet';
import CourseStudyPage from './pages/CourseStudyPage';
import StudentProfilePage from './pages/StudentProfilePage';
import SupportPage from './pages/SupportPage';
import StudentPrintCertificate from './pages/StudentPrintCertificate';
import VerifyCertificate from './pages/VerifyCertificate';
import CourseStorePage from './pages/CourseStorePage';
import PDFReaderPage from './pages/PDFReaderPage';


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
          <Route path="/student/pdf-reader/:bookId" element={<PDFReaderPage />} />
          <Route path="/courses/:courseId" element={<CourseStudyPage />} />
          <Route path="/student/profile" element={<StudentProfilePage />} />
          <Route path="/student/store" element={<CourseStorePage />} />
          <Route path="/student/support" element={<SupportPage />} />
          <Route path="/print-certificate/:id" element={<StudentPrintCertificate />} />
          <Route path="/verify-certificate/:certNumber" element={<VerifyCertificate />} />
          <Route path="/enrolled-courses" element={<EnrolledCourses />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/repair/register" element={<RepairRegister />} />
          <Route path="/track/:trackingNumber" element={<TrackingPage />} />
          <Route path="/accessories" element={<AccessoriesStore />} />
          <Route path="/accessories/cart" element={<AccessoriesCart />} />
          <Route path="/accessories/track/:trackingNumber" element={<AccessoriesTracking />} />
          <Route path="/admin/accessories" element={<AdminAccessories />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/technician" element={<TechnicianDashboard />} />
          <Route path="/technician/repair/:id" element={<RepairDetail />} />
          <Route path="/technician/repair/:id/pickup" element={<PickupVerification />} />
          <Route path="/technician/repair/:id/payment" element={<PaymentPage />} />
          <Route path="/repair/:id/payment" element={<PaymentPage />} />
          <Route path="/dashboard/collection" element={<PaymentCollection />} />
          <Route path="/dashboard/salary" element={<SalaryWallet />} />
        </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
