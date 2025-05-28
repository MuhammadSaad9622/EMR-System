import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
}

interface Visit {
  _id: string;
  date: string;
  visitType: string;
  __t: string;
}

const FollowupVisitForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: _user } = useAuth(); // Prefix with _ to indicate intentionally unused
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [previousVisits, setPreviousVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [formData, setFormData] = useState({
    previousVisit: '',
    areas: '',
    areasImproving: false,
    areasExacerbated: false,
    areasSame: false,
    musclePalpation: '',
    painRadiating: '',
    romWnlNoPain: false,
    romWnlWithPain: false,
    romImproved: false,
    romDecreased: false,
    romSame: false,
    orthos: {
      tests: '',
      result: ''
    },
    activitiesCausePain: '',
    activitiesCausePainOther: '',
    treatmentPlan: {
      treatments: '',
      timesPerWeek: ''
    },
    overallResponse: {
      improving: false,
      worse: false,
      same: false
    },
    referrals: '',
    diagnosticStudy: {
      study: '',
      bodyPart: '',
      result: ''
    },
    homeCare: '',
    notes: ''
  });
  
  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<number | null>(null);
  const [localFormData, setLocalFormData] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch patient data
        const patientResponse = await axios.get(`http://localhost:5000/api/patients/${id}`);
        setPatient(patientResponse.data);
        
        // Fetch previous visits
        const visitsResponse = await axios.get(`http://localhost:5000/api/patients/${id}/visits`);
        setPreviousVisits(visitsResponse.data);
        
        // Check for locally saved form data
        const savedData = localStorage.getItem(`followupVisit_${id}`);
        if (savedData) {
          setLocalFormData(savedData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Clean up auto-save timer on unmount
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      let updatedValue: any = value;

      if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        updatedValue = e.target.checked;
      }

      // Handle nested objects
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof typeof prev] as any),
            [child]: updatedValue
          }
        };
      } else {
        return { ...prev, [name]: updatedValue };
      }
    });
    
    // Set up auto-save
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      localStorage.setItem(`followupVisit_${id}`, JSON.stringify(formData));
      setAutoSaveStatus('Form auto-saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    }, 2000);
    
    setAutoSaveTimer(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.previousVisit) {
      alert('Please select a previous visit');
      return;
    }
    
    setIsSaving(true);
    setIsGeneratingNarrative(true);
    
    try {
      // 1. Call AI to generate narrative
      const aiApiUrl = `${import.meta.env.VITE_API_URL}/api/generate-narrative`;
      console.log('Calling AI API at:', aiApiUrl); // Log the URL being called
      const aiResponse = await axios.post(aiApiUrl, formData);
      const generatedNarrative = aiResponse.data.narrative;
      console.log('Generated narrative:', generatedNarrative);

      // 2. Prepare payload for visit submission, including the generated narrative
      const payload = {
        ...formData,
        visitType: 'followup',
        patient: id,
        // Append generated narrative to the existing notes or a new field
        notes: `${formData.notes || ''}\n\nAI Generated Narrative:\n${generatedNarrative}`.trim(),
      };

      // The API endpoint and data structure will likely need to be updated on the server-side
      // to match the new form fields. This call assumes the backend is updated to receive
      // the new formData structure.
      await axios.post(`http://localhost:5000/api/patients/${id}/visits/followup`, payload);
      
      // Clear local storage after successful submission
      localStorage.removeItem(`followupVisit_${id}`);
      
      navigate(`/patients/${id}`);
    } catch (error) {
      console.error('Error saving visit:', error);
      alert('Failed to save visit. Please try again.');
    } finally {
      setIsSaving(false);
      setIsGeneratingNarrative(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">Patient not found</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/patients')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patients
        </button>
      </div>
    );
  }

  if (previousVisits.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No previous visits found for this patient. Please create an initial visit first.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => navigate(`/patients/${id}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patient
          </button>
          <button
            onClick={() => navigate(`/patients/${id}/visits/initial`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Initial Visit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="mr-4 p-2 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">EXAM FORM---REEVALUATION</h1>
          <p className="text-gray-600">
            Patient: {patient.firstName} {patient.lastName}
          </p>
          <p className="text-gray-600">
            Date: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {localFormData && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You have an unsaved form. Would you like to continue where you left off?
              </p>
              <div className="mt-2">
                <button
                  onClick={() => {
                    setFormData(JSON.parse(localFormData));
                    setLocalFormData(null);
                  }}
                  className="mr-2 text-sm font-medium text-yellow-700 hover:text-yellow-600"
                >
                  Load saved form
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(`followupVisit_${id}`);
                    setLocalFormData(null);
                  }}
                  className="text-sm font-medium text-gray-600 hover:text-gray-500"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {autoSaveStatus && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-md shadow-md">
          {autoSaveStatus}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="space-y-6">
          {/* Previous Visit Selection */}
          <div>
            <label htmlFor="previousVisit" className="block text-sm font-medium text-gray-700 mb-1">
              Previous Visit*
            </label>
            <select
              id="previousVisit"
              name="previousVisit"
              value={formData.previousVisit}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select previous visit</option>
              {previousVisits.map((visit) => (
                <option key={visit._id} value={visit._id}>
                  {new Date(visit.date).toLocaleDateString()} - {visit.__t === 'initial' ? 'Initial Visit' : 'Follow-up'}
                </option>
              ))}
            </select>
          </div>

          {/* Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Areas: Auto generated from Initial</label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="areasImproving"
                  name="areasImproving"
                  type="checkbox"
                  checked={formData.areasImproving}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="areasImproving" className="ml-2 block text-sm text-gray-900">Improving</label>
              </div>
              <div className="flex items-center">
                <input
                  id="areasExacerbated"
                  name="areasExacerbated"
                  type="checkbox"
                  checked={formData.areasExacerbated}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="areasExacerbated" className="ml-2 block text-sm text-gray-900">Exacerbated</label>
              </div>
              <div className="flex items-center">
                <input
                  id="areasSame"
                  name="areasSame"
                  type="checkbox"
                  checked={formData.areasSame}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="areasSame" className="ml-2 block text-sm text-gray-900">Same</label>
              </div>
            </div>
          </div>

          {/* Muscle Palpation */}
          <div>
            <label htmlFor="musclePalpation" className="block text-sm font-medium text-gray-700 mb-1">Muscle Palpation: </label>
            <input
              type="text"
              id="musclePalpation"
              name="musclePalpation"
              value={formData.musclePalpation}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List of muscles specific to that body part"
            />
          </div>

          {/* Pain Radiating */}
          <div>
            <label htmlFor="painRadiating" className="block text-sm font-medium text-gray-700 mb-1">Pain Radiating: </label>
            <input
              type="text"
              id="painRadiating"
              name="painRadiating"
              value={formData.painRadiating}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ROM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ROM:</label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="romWnlNoPain"
                  name="romWnlNoPain"
                  type="checkbox"
                  checked={formData.romWnlNoPain}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="romWnlNoPain" className="ml-2 block text-sm text-gray-900">WNL (No Pain)</label>
              </div>
              <div className="flex items-center">
                <input
                  id="romWnlWithPain"
                  name="romWnlWithPain"
                  type="checkbox"
                  checked={formData.romWnlWithPain}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="romWnlWithPain" className="ml-2 block text-sm text-gray-900">WNL (With Pain)</label>
              </div>
              <div className="flex items-center">
                <input
                  id="romImproved"
                  name="romImproved"
                  type="checkbox"
                  checked={formData.romImproved}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="romImproved" className="ml-2 block text-sm text-gray-900">Improved</label>
              </div>
              <div className="flex items-center">
                <input
                  id="romDecreased"
                  name="romDecreased"
                  type="checkbox"
                  checked={formData.romDecreased}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="romDecreased" className="ml-2 block text-sm text-gray-900">Decreased</label>
              </div>
               <div className="flex items-center">
                <input
                  id="romSame"
                  name="romSame"
                  type="checkbox"
                  checked={formData.romSame}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="romSame" className="ml-2 block text-sm text-gray-900">Same</label>
              </div>
            </div>
          </div>

          {/* Orthos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orthos:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="orthos.tests" className="block text-xs text-gray-500 mb-1">List of tests specific for body part</label>
                <input
                  type="text"
                  id="orthos.tests"
                  name="orthos.tests"
                  value={formData.orthos.tests}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                 <label htmlFor="orthos.result" className="block text-xs text-gray-500 mb-1">Result</label>
                 <input
                  type="text"
                  id="orthos.result"
                  name="orthos.result"
                  value={formData.orthos.result}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Activities that still cause pain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activities that still cause pain:</label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <input
                      type="text"
                      id="activitiesCausePain"
                      name="activitiesCausePain"
                      value={formData.activitiesCausePain}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       placeholder="List of things specific to selected body part"
                    />
                </div>
                 <div>
                    <label htmlFor="activitiesCausePainOther" className="block text-xs text-gray-500 mb-1">Other:</label>
                    <input
                      type="text"
                      id="activitiesCausePainOther"
                      name="activitiesCausePainOther"
                      value={formData.activitiesCausePainOther}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">ASSESSMENT AND PLAN</h2>

          {/* Treatment plan */}
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment plan:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  id="treatmentPlan.treatments"
                  name="treatmentPlan.treatments"
                  value={formData.treatmentPlan.treatments}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List of treatments"
                />
              </div>
              <div>
                <input
                  type="text"
                  id="treatmentPlan.timesPerWeek"
                  name="treatmentPlan.timesPerWeek"
                  value={formData.treatmentPlan.timesPerWeek}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Times per week"
                />
              </div>
            </div>
          </div>

          {/* Overall response to care */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overall response to care:</label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="overallResponseImproving"
                  name="overallResponse.improving"
                  type="checkbox"
                  checked={formData.overallResponse.improving}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="overallResponseImproving" className="ml-2 block text-sm text-gray-900">Improving</label>
              </div>
              <div className="flex items-center">
                <input
                  id="overallResponseWorse"
                  name="overallResponse.worse"
                  type="checkbox"
                  checked={formData.overallResponse.worse}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="overallResponseWorse" className="ml-2 block text-sm text-gray-900">Worse</label>
              </div>
              <div className="flex items-center">
                <input
                  id="overallResponseSame"
                  name="overallResponse.same"
                  type="checkbox"
                  checked={formData.overallResponse.same}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="overallResponseSame" className="ml-2 block text-sm text-gray-900">Same</label>
              </div>
            </div>
          </div>

          {/* Referrals */}
          <div>
            <label htmlFor="referrals" className="block text-sm font-medium text-gray-700 mb-1">Referrals: </label>
            <input
              type="text"
              id="referrals"
              name="referrals"
              value={formData.referrals}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List of Imaging and specialists"
            />
          </div>

          {/* Review of diagnostic study with the patient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review of diagnostic study with the patient:</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="diagnosticStudy.study" className="block text-xs text-gray-500 mb-1">Study</label>
                <input
                  type="text"
                  id="diagnosticStudy.study"
                  name="diagnosticStudy.study"
                  value={formData.diagnosticStudy.study}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="diagnosticStudy.bodyPart" className="block text-xs text-gray-500 mb-1">Body Part</label>
                <input
                  type="text"
                  id="diagnosticStudy.bodyPart"
                  name="diagnosticStudy.bodyPart"
                  value={formData.diagnosticStudy.bodyPart}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="diagnosticStudy.result" className="block text-xs text-gray-500 mb-1">Result:</label>
                <input
                  type="text"
                  id="diagnosticStudy.result"
                  name="diagnosticStudy.result"
                  value={formData.diagnosticStudy.result}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Home Care */}
          <div>
            <label htmlFor="homeCare" className="block text-sm font-medium text-gray-700 mb-1">Home Care: </label>
            <input
              type="text"
              id="homeCare"
              name="homeCare"
              value={formData.homeCare}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List of home care"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or observations"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate(`/patients/${id}`)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isGeneratingNarrative}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  Saving...
                </>
              ) : isGeneratingNarrative ? (
                 <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  Generating Narrative...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Visit
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FollowupVisitForm;