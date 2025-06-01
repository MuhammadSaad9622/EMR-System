import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, FileText as FileTextIcon } from 'lucide-react';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  status: string;
  visits: Array<{
    _id: string;
    visitType: string;
    status: string;
    date: string;
  }>;
  assignedDoctor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

const UnsettledCaseReport: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalUnsettled, setTotalUnsettled] = useState(0);

  useEffect(() => {
    fetchActivePatients();
  }, []);

  const fetchActivePatients = async () => {
    setIsLoading(true);
    try {
      // First, get all active patients
      const response = await axios.get('http://localhost:5000/api/patients?status=active');
      const activePatients = response.data.patients || [];
      
      // Filter out patients who have a discharge visit
      const unsettledPatients = activePatients.filter((patient: Patient) => {
        return !patient.visits || !patient.visits.some(visit => visit.visitType === 'discharge');
      });
      
      setPatients(unsettledPatients);
      setTotalUnsettled(unsettledPatients.length);
    } catch (error) {
      console.error('Error fetching unsettled cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredPatients = patients.filter(patient => 
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm) ||
    patient.phone.includes(searchTerm) ||
    patient.email.toLowerCase().includes(searchTerm)
  );

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getLastVisitDate = (visits: any[]) => {
    if (!visits || visits.length === 0) return 'No visits';
    const sortedVisits = [...visits].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return new Date(sortedVisits[0].date).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Unsettled Case Report</h1>
          <div className="flex items-center mt-2">
            <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full flex items-center">
              <FileTextIcon className="h-4 w-4 mr-1" />
              <span>Total Unsettled Cases: {totalUnsettled}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age/Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              MR# {patient._id.substring(0, 8).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.phone}</div>
                        <div className="text-sm text-gray-500">{patient.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{calculateAge(patient.dateOfBirth)} years</div>
                        <div className="text-sm text-gray-500 capitalize">{patient.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getLastVisitDate(patient.visits || [])}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.assignedDoctor
                            ? `Dr. ${patient.assignedDoctor.firstName} ${patient.assignedDoctor.lastName}`
                            : 'Not assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/patients/${patient._id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View
                        </Link>
                        <Link
                          to={`/patients/${patient._id}/visits/initial`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Add Visit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchTerm ? 'No matching patients found' : 'No unsettled cases found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnsettledCaseReport;
