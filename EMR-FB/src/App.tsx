
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import DoctorRoute from './components/DoctorRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

// Patient Pages
import PatientList from './pages/patients/PatientList';
import PatientDetails from './pages/patients/PatientDetails';
import PatientForm from './pages/patients/PatientForm';

// Visit Pages
import InitialVisitForm from './pages/visits/InitialVisitForm';
import FollowupVisitForm from './pages/visits/FollowupVisitForm';
import DischargeVisitForm from './pages/visits/DischargeVisitForm';
import VisitDetails from './pages/visits/VisitDetails';

// Appointment Pages
import AppointmentCalendar from './pages/appointments/AppointmentCalendar';
import AppointmentForm from './pages/appointments/AppointmentForm';

// Billing Pages
import BillingList from './pages/billing/BillingList';
import InvoiceDetails from './pages/billing/InvoiceDetails';
import InvoiceForm from './pages/billing/InvoiceForm';

// Report Pages
import UnsettledCaseReport from './pages/reports/UnsettledCaseReport';

// Layout Components
import MainLayout from './components/layouts/MainLayout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Patient Routes */}
            <Route path="patients" element={<PatientList />} />
            <Route path="patients/new" element={<PatientForm />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="patients/:id/edit" element={<PatientForm />} />
            
            {/* Visit Routes */}
            <Route path="patients/:id/visits/initial" element={<DoctorRoute><InitialVisitForm /></DoctorRoute>} />
            <Route path="patients/:id/visits/followup" element={<DoctorRoute><FollowupVisitForm /></DoctorRoute>} />
            <Route path="patients/:id/visits/discharge" element={<DoctorRoute><DischargeVisitForm /></DoctorRoute>} />
            <Route path="visits/:id" element={<VisitDetails />} />
            
            {/* Appointment Routes */}
            <Route path="appointments" element={<AppointmentCalendar />} />
            <Route path="appointments/new" element={<AppointmentForm />} />
            <Route path="appointments/:id/edit" element={<AppointmentForm />} />
            
            {/* Billing Routes */}
            <Route path="billing" element={<BillingList />} />
            <Route path="billing/new" element={<InvoiceForm />} />
            <Route path="billing/:id" element={<InvoiceDetails />} />
            <Route path="billing/:id/edit" element={<InvoiceForm />} />
            
            {/* Report Routes */}
            <Route path="reports/unsettled-cases" element={<UnsettledCaseReport />} />
            
            {/* Admin Routes */}
            <Route path="admin/*" element={<AdminRoute><div>Admin Panel</div></AdminRoute>} />
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;