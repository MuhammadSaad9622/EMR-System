import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Save, ArrowLeft } from 'lucide-react';

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
}

const PatientForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth(); // ✅ new — now you have access to token

  const isEditMode = !!id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [formData, setFormData] = useState({

    subjective: {
      fullName: '',
      date: '',
      physical: [],
      sleep: [],
      cognitive: [],
      digestive: [],
      emotional: [],
      bodyPart: [],
      severity: '',
      quality: [],
      timing: '',
      context: '',
      exacerbatedBy: [],
      symptoms: [],
      notes: '',
      radiatingTo: '',
      radiatingRight: false,
      radiatingLeft: false,
      sciaticaRight: false,
      sciaticaLeft: false
    },

    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      groupNumber: '',
      primaryInsured: ''
    },
    medicalHistory: {
      allergies: [''],
      medications: [''],
      conditions: [''],
      surgeries: [''],
      familyHistory: ['']
    },
    assignedDoctor: user?.role === 'doctor' ? (user._id) : '',
    status: 'active'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // If in edit mode, fetch patient data
       if (isEditMode) {
  const patientResponse = await axios.get(`http://localhost:5000/api/patients/${id}`);
  const patientData = patientResponse.data;

  if (patientData.dateOfBirth) {
    patientData.dateOfBirth = new Date(patientData.dateOfBirth).toISOString().split('T')[0];
  }

  // ✅ Ensure subjective exists to avoid crashing on older patients
  if (!patientData.subjective) {
    patientData.subjective = {
      fullName: '',
      date: '',
      physical: [],
      sleep: [],
      cognitive: [],
      digestive: [],
      emotional: [],
      bodyPart: [],
      severity: '',
      quality: [],
      timing: '',
      context: '',
      exacerbatedBy: [],
      symptoms: [],
      notes: '',
      radiatingTo: '',
      radiatingRight: false,
      radiatingLeft: false,
      sciaticaRight: false,
      sciaticaLeft: false
    };
  }

  setFormData(patientData);
}
 
        // If user is admin, fetch doctors for dropdown
        if (user?.role === 'admin') {
          const doctorsResponse = await axios.get('http://localhost:5000/api/auth/doctors');
          setDoctors(doctorsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEditMode, user?.role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        const parentValue = prev[parent as keyof typeof prev];
        if (typeof parentValue === 'object' && parentValue !== null) {
          return {
            ...prev,
            [parent]: {
              ...parentValue,
              [child]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
            }
          };
        }
        return prev;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleArrayChange = (category: string, index: number, value: string) => {
    const updatedArray = [...formData.medicalHistory[category as keyof typeof formData.medicalHistory] as string[]];
    updatedArray[index] = value;
    
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        [category]: updatedArray
      }
    }));
  };

  const addArrayItem = (category: string) => {
    const updatedArray = [...formData.medicalHistory[category as keyof typeof formData.medicalHistory] as string[], ''];
    
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        [category]: updatedArray
      }
    }));
  };

  const removeArrayItem = (category: string, index: number) => {
    const updatedArray = [...formData.medicalHistory[category as keyof typeof formData.medicalHistory] as string[]];
    updatedArray.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        [category]: updatedArray
      }
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.assignedDoctor) newErrors.assignedDoctor = 'Assigned doctor is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Phone validation
    const phoneRegex = /^\d{10,15}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/[^\d]/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
    if (isEditMode) {
  await axios.put(`http://localhost:5000/api/patients/${id}`, formData, {
    headers: {
      Authorization: `Bearer ${token}` // ✅ correct
    }
  });
} else {
  await axios.post('http://localhost:5000/api/patients', formData, {
  headers: {
    Authorization: `Bearer ${token}` // ✅ use the `token` directly from useAuth()
  }
});


console.log('Using token:', token);


}
  
      navigate('/patients');
    } catch (error) {
      console.error('Error saving patient:', error);
    } finally {
      setIsSaving(false);
    }
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
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit Patient' : 'Add New Patient'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name*
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name*
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth*
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender*
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email*
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone*
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discharged">Discharged</option>
                </select>
              </div>
              {user?.role === 'admin' && (
                <div>
                  <label htmlFor="assignedDoctor" className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Doctor*
                  </label>
                  <select
                    id="assignedDoctor"
                    name="assignedDoctor"
                    value={formData.assignedDoctor}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${
                      errors.assignedDoctor ? 'border-red-500' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        Dr. {doctor.firstName} {doctor.lastName}
                      </option>
                    ))}
                  </select>
                  {errors.assignedDoctor && <p className="mt-1 text-sm text-red-600">{errors.assignedDoctor}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-1">
                  Street
                </label>
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="address.city"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="address.state"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  id="address.zipCode"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="address.country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  id="address.country"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          {/* <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="emergencyContact.name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="emergencyContact.name"
                  name="emergencyContact.name"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="emergencyContact.relationship" className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  id="emergencyContact.relationship"
                  name="emergencyContact.relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="emergencyContact.phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="emergencyContact.phone"
                  name="emergencyContact.phone"
                  value={formData.emergencyContact.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div> */}

          {/* Insurance Information */}
          {/* <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Insurance Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="insuranceInfo.provider" className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <input
                  type="text"
                  id="insuranceInfo.provider"
                  name="insuranceInfo.provider"
                  value={formData.insuranceInfo.provider}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="insuranceInfo.policyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Number
                </label>
                <input
                  type="text"
                  id="insuranceInfo.policyNumber"
                  name="insuranceInfo.policyNumber"
                  value={formData.insuranceInfo.policyNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="insuranceInfo.groupNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Group Number
                </label>
                <input
                  type="text"
                  id="insuranceInfo.groupNumber"
                  name="insuranceInfo.groupNumber"
                  value={formData.insuranceInfo.groupNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="insuranceInfo.primaryInsured" className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Insured
                </label>
                <input
                  type="text"
                  id="insuranceInfo.primaryInsured"
                  name="insuranceInfo.primaryInsured"
                  value={formData.insuranceInfo.primaryInsured}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div> */}

          {/* Medical History */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Medical History</h2>
            
            {/* Allergies */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-2">Allergies</h3>
              {formData.medicalHistory.allergies.map((allergy, index) => (
                <div key={`allergy-${index}`} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={allergy}
                    onChange={(e) => handleArrayChange('allergies', index, e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter allergy"
                  />
                  {formData.medicalHistory.allergies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('allergies', index)}
                      className="ml-2 p-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('allergies')}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Allergy
              </button>
            </div>
            
            {/* Medications */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-2">Medications</h3>
              {formData.medicalHistory.medications.map((medication, index) => (
                <div key={`medication-${index}`} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={medication}
                    onChange={(e) => handleArrayChange('medications', index, e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter medication"
                  />
                  {formData.medicalHistory.medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('medications', index)}
                      className="ml-2 p-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('medications')}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Medication
              </button>
            </div>
            
            {/* Conditions */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-2">Medical Conditions</h3>
              {formData.medicalHistory.conditions.map((condition, index) => (
                <div key={`condition-${index}`} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => handleArrayChange('conditions', index, e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter condition"
                  />
                  {formData.medicalHistory.conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('conditions', index)}
                      className="ml-2 p-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('conditions')}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Condition
              </button>
            </div>
            
            {/* Surgeries */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-2">Past Surgeries</h3>
              {formData.medicalHistory.surgeries.map((surgery, index) => (
                <div key={`surgery-${index}`} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={surgery}
                    onChange={(e) => handleArrayChange('surgeries', index, e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter surgery"
                  />
                  {formData.medicalHistory.surgeries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('surgeries', index)}
                      className="ml-2 p-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('surgeries')}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Surgery
              </button>
            </div>
            
            {/* Family History */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-2">Family History</h3>
              {formData.medicalHistory.familyHistory.map((history, index) => (
                <div key={`family-${index}`} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={history}
                    onChange={(e) => handleArrayChange('familyHistory', index, e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter family history"
                  />
                  {formData.medicalHistory.familyHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('familyHistory', index)}
                      className="ml-2 p-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('familyHistory')}
                className="mt-1 text-sm text  -blue-600 hover:text-blue-800"
              >
                + Add Family History
              </button>
            </div>
          </div>
        </div>
{/* SUBJECTIVE INTAKE SECTION */}
        <div className="mt-12 border-t pt-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Subjective Intake</h2>

          {/* Full Name and Date */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <input
              type="text"
              name="subjective.fullName"
              value={formData.subjective.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="date"
              name="subjective.date"
              value={formData.subjective.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div> */}

          {/* Body Part */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Body Part</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              {['C/S', 'T/S', 'L/S', 'SH', 'ELB', 'WR', 'Hand', 'Finger(s)', 'Hip', 'KN', 'AN', 'Foot', 'Toe(s)', 'L Ant/Post/Lat/Med', 'R Ant/Post/Lat/Med', 'Headache', 'Frontal', 'Parietal', 'Temporal', 'Occipital', 'Head contusion'].map(part => (
                <label key={part} className="flex items-center space-x-2">
                  <input type="checkbox" name="subjective.bodyPart" value={part} onChange={handleChange} />
                  <span>{part}</span>
                </label>
              ))}
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="subjective.bodyPart" value="Other" onChange={handleChange} />
                <span>Other</span>
                <input type="text" name="subjective.bodyPartOther" placeholder="Specify" className="border rounded px-2 py-1 text-sm" />
              </label>
            </div>
          </div>

          {/* Severity */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Severity</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              {['1','2','3','4','5','6','7','8','9','10','Mild','Moderate','Severe'].map(val => (
                <label key={val} className="flex items-center space-x-2">
                  <input type="radio" name="subjective.severity" value={val} onChange={handleChange} />
                  <span>{val}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Timing</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              {['Constant', 'Frequent', 'Intermittent', 'Occasional', 'Activity Dependent'].map(val => (
                <label key={val} className="flex items-center space-x-2">
                  <input type="radio" name="subjective.timing" value={val} onChange={handleChange} />
                  <span>{val}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Context</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              {['New', 'Improving', 'Worsening', 'Recurrent'].map(val => (
                <label key={val} className="flex items-center space-x-2">
                  <input type="radio" name="subjective.context" value={val} onChange={handleChange} />
                  <span>{val}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label htmlFor="subjective.notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="subjective.notes"
              id="subjective.notes"
              rows={3}
              value={formData.subjective.notes}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            ></textarea>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Patient
              </>
            )}
          </button>
        </div>
      
        

</form>
    </div>
  );
};

export default PatientForm;