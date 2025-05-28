import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    patientCount: 0,
    appointmentsToday: 0,
    appointmentsUpcoming: 0,
    overdueFollowups: 0
  });
  const [billingStats, setBillingStats] = useState({
    billedThisMonth: 0,
    collectedThisMonth: 0,
    outstanding: 0,
    statusCounts: {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      partial: 0
    }
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [appointmentStats, setAppointmentStats] = useState({
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
        const nextWeek = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0];
        
        // Fetch patients count
        const patientsResponse = await axios.get('http://localhost:5000/api/patients?limit=1');
        
        // Fetch today's appointments
        const todayAppointmentsResponse = await axios.get(`http://localhost:5000/api/appointments?startDate=${today}&endDate=${tomorrow}`);
        
        // Fetch upcoming appointments
        const upcomingAppointmentsResponse = await axios.get(`http://localhost:5000/api/appointments?startDate=${tomorrow}&endDate=${nextWeek}`);
        
        // Fetch billing summary
        const billingSummaryResponse = await axios.get('http://localhost:5000/api/billing/summary/dashboard');
        
        // Fetch recent appointments
        const recentAppointmentsResponse = await axios.get('http://localhost:5000/api/appointments?limit=5');
        
        // Calculate appointment stats
        const allAppointments = [...todayAppointmentsResponse.data, ...upcomingAppointmentsResponse.data];
        const appointmentStatsCounts = {
          scheduled: allAppointments.filter(a => a.status === 'scheduled').length,
          completed: allAppointments.filter(a => a.status === 'completed').length,
          cancelled: allAppointments.filter(a => a.status === 'cancelled').length,
          noShow: allAppointments.filter(a => a.status === 'no-show').length
        };
        
        setStats({
          patientCount: patientsResponse.data.totalPatients || 0,
          appointmentsToday: todayAppointmentsResponse.data.length,
          appointmentsUpcoming: upcomingAppointmentsResponse.data.length,
          overdueFollowups: 0 // This would require additional logic to determine
        });
        
        setBillingStats(billingSummaryResponse.data);
        setRecentAppointments(recentAppointmentsResponse.data.slice(0, 5));
        setAppointmentStats(appointmentStatsCounts);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Chart data
  const appointmentChartData = {
    labels: ['Scheduled', 'Completed', 'Cancelled', 'No Show'],
    datasets: [
      {
        label: 'Appointments',
        data: [
          appointmentStats.scheduled,
          appointmentStats.completed,
          appointmentStats.cancelled,
          appointmentStats.noShow
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const billingChartData = {
    labels: ['Billed', 'Collected', 'Outstanding'],
    datasets: [
      {
        label: 'Amount ($)',
        data: [
          billingStats.billedThisMonth,
          billingStats.collectedThisMonth,
          billingStats.outstanding
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome, {user?.firstName} {user?.lastName}
        </h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 font-medium">Total Patients</p>
              <p className="text-2xl font-semibold text-gray-800">{stats.patientCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/patients" className="text-sm text-blue-600 hover:text-blue-800">
              View all patients →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 font-medium">Today's Appointments</p>
              <p className="text-2xl font-semibold text-gray-800">{stats.appointmentsToday}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/appointments" className="text-sm text-green-600 hover:text-green-800">
              View schedule →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 font-medium">Upcoming Appointments</p>
              <p className="text-2xl font-semibold text-gray-800">{stats.appointmentsUpcoming}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/appointments" className="text-sm text-purple-600 hover:text-purple-800">
              View upcoming →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 font-medium">Outstanding Balance</p>
              <p className="text-2xl font-semibold text-gray-800">${billingStats.outstanding.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/billing" className="text-sm text-yellow-600 hover:text-yellow-800">
              View billing →
            </Link>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Appointment Status Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Appointment Status</h2>
          <div className="h-64">
            <Doughnut 
              data={appointmentChartData} 
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }} 
            />
          </div>
        </div>

        {/* Billing Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Billing Overview</h2>
          <div className="h-64">
            <Bar 
              data={billingChartData} 
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }} 
            />
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Appointments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentAppointments.length > 0 ? (
                recentAppointments.map((appointment: any) => (
                  <tr key={appointment._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
  {appointment.patient?.firstName && appointment.patient?.lastName
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Unknown Patient'}
</div>

                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(appointment.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.time.start} - {appointment.time.end}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {appointment.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link to={`/appointments/${appointment._id}/edit`} className="text-blue-600 hover:text-blue-900 mr-3">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent appointments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <Link to="/appointments" className="text-sm text-blue-600 hover:text-blue-800">
            View all appointments →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/patients/new"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <span className="text-blue-700 font-medium">Add New Patient</span>
          </Link>
          <Link
            to="/appointments/new"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Calendar className="h-6 w-6 text-green-600 mr-3" />
            <span className="text-green-700 font-medium">Schedule Appointment</span>
          </Link>
          <Link
            to="/billing/new"
            className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <DollarSign className="h-6 w-6 text-yellow-600 mr-3" />
            <span className="text-yellow-700 font-medium">Create Invoice</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;