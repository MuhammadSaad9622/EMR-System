import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';

interface Appointment {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  date: string;
  time: {
    start: string;
    end: string;
  };
  type: string;
  status: string;
  notes: string;
}

const AppointmentCalendar: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, view]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on view
      let startDate, endDate;
      if (view === 'day') {
        startDate = format(selectedDate, 'yyyy-MM-dd');
        endDate = format(selectedDate, 'yyyy-MM-dd');
      } else {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = addDays(start, 6);
        startDate = format(start, 'yyyy-MM-dd');
        endDate = format(end, 'yyyy-MM-dd');
      }
      
      const response = await axios.get(`http://localhost:5000/api/appointments?startDate=${startDate}&endDate=${endDate}`);
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentDate(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addWeeks(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleBackToWeek = () => {
    setView('week');
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => 
      isSameDay(parseISO(appointment.date), date)
    );
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {format(startDate, 'MMMM d')} - {format(addDays(startDate, 6), 'MMMM d, yyyy')}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={index} 
                className={`border rounded-lg overflow-hidden ${isToday ? 'border-blue-500' : 'border-gray-200'}`}
              >
                <div 
                  className={`p-2 text-center cursor-pointer ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}
                  onClick={() => handleDateClick(day)}
                >
                  <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                  <p className={`text-lg ${isToday ? 'font-bold text-blue-600' : 'font-semibold text-gray-800'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="p-2 h-64 overflow-y-auto">
                  {dayAppointments.length > 0 ? (
                    dayAppointments
                      .sort((a, b) => a.time.start.localeCompare(b.time.start))
                      .map(appointment => (
                        <Link
                          key={appointment._id}
                          to={`/appointments/${appointment._id}/edit`}
                          className="block p-2 mb-2 rounded-md border border-gray-200 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {appointment.time.start} - {appointment.time.end}
                              </p>
                              <p className="text-sm text-gray-600">
                                {appointment.patient?.firstName && appointment.patient?.lastName
  ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
  : 'Unknown Patient'}

                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {appointment.type}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getAppointmentStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                        </Link>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center mt-4">No appointments</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    const isToday = isSameDay(selectedDate, new Date());
    
    // Create time slots from 8:00 AM to 6:00 PM
    const timeSlots = Array.from({ length: 11 }, (_, i) => {
      const hour = i + 8;
      return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
    });
    
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <button
              onClick={handleBackToWeek}
              className="mr-2 p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              {isToday && <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Today</span>}
            </h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedDate(prev => addDays(prev, -1))}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(prev => addDays(prev, 1))}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {timeSlots.map((timeSlot, index) => {
            const slotAppointments = dayAppointments.filter(appointment => {
              const [hour, minutesPeriod] = timeSlot.split(':');
              const [minutes, period] = minutesPeriod.split(' ');
              const slotHour = parseInt(hour) + (period === 'PM' && parseInt(hour) !== 12 ? 12 : 0);
              const slotTime = `${slotHour.toString().padStart(2, '0')}:00`;
              
              const [appointmentHour] = appointment.time.start.split(':');
              return appointmentHour === slotHour.toString().padStart(2, '0');
            });
            
            return (
              <div 
                key={index} 
                className={`flex border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
              >
                <div className="w-24 p-4 border-r border-gray-200 flex items-start justify-center">
                  <p className="text-sm font-medium text-gray-700">{timeSlot}</p>
                </div>
                <div className="flex-1 p-2">
                  {slotAppointments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {slotAppointments.map(appointment => (
                        <Link
                          key={appointment._id}
                          to={`/appointments/${appointment._id}/edit`}
                          className="block p-3 rounded-md border border-gray-200 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <Clock className="h-4 w-4 text-gray-500 mr-1" />
                                <p className="text-sm font-medium text-gray-800">
                                  {appointment.time.start} - {appointment.time.end}
                                </p>
                              </div>
                              <div className="flex items-center mb-1">
                                <User className="h-4 w-4 text-gray-500 mr-1" />
                                <p className="text-sm text-gray-700">
                                  {appointment.patient.firstName} {appointment.patient.lastName}
                                </p>
                              </div>
                              <div className="flex items-center">
                                <CalendarIcon className="h-4 w-4 text-gray-500 mr-1" />
                                <p className="text-xs text-gray-600 capitalize">
                                  {appointment.type}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getAppointmentStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                          {appointment.notes && (
                            <p className="mt-2 text-xs text-gray-500 truncate">
                              {appointment.notes}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-gray-400">No appointments</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">Appointments</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              view === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setView('day');
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              view === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Day
          </button>
          <Link
            to="/appointments/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {view === 'week' ? renderWeekView() : renderDayView()}
        </div>
      )}

      {/* Appointment Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Scheduled</p>
              <p className="text-2xl font-semibold text-gray-800">
                {appointments.filter(a => a.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Completed</p>
              <p className="text-2xl font-semibold text-gray-800">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Cancelled</p>
              <p className="text-2xl font-semibold text-gray-800">
                {appointments.filter(a => a.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Today's Appointments</p>
              <p className="text-2xl font-semibold text-gray-800">
                {appointments.filter(a => isSameDay(parseISO(a.date), new Date())).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCalendar;