import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Timeout = ReturnType<typeof setTimeout>;

type FormData = {
  chiefComplaint: string;
  chiropracticAdjustment: string[];
  chiropracticOther: string;
  acupuncture: string[];
  acupunctureOther: string;
  physiotherapy: string[];
  rehabilitationExercises: string[];
  durationFrequency: {
    timesPerWeek: string;
    reEvalInWeeks: string;
  };
  referrals: string[];
  imaging: {
    xray: string[];
    mri: string[];
    ct: string[];
  };
  diagnosticUltrasound: string;
  nerveStudy: string[];
  restrictions: {
    avoidActivityWeeks: string;
    liftingLimitLbs: string;
    avoidProlongedSitting: boolean;
  };
  disabilityDuration: string;
  otherNotes: string;
};

const InitialVisitForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<Timeout | null>(null);
  const [formData, setFormData] = useState<FormData>({
    chiefComplaint: '',
    chiropracticAdjustment: [],
    chiropracticOther: '', // ✅ NEW
    acupuncture: [],
    acupunctureOther: '',  // ✅ NEW
    physiotherapy: [],
    rehabilitationExercises: [],
    durationFrequency: {
      timesPerWeek: '',
      reEvalInWeeks: '',
    },
    referrals: [],
    imaging: {
      xray: [],
      mri: [],
      ct: [],
    },
    diagnosticUltrasound: '',
    nerveStudy: [],
    restrictions: {
      avoidActivityWeeks: '',
      liftingLimitLbs: '',
      avoidProlongedSitting: false
    },
    disabilityDuration: '',
    otherNotes: '',
  });

  const handleCheckboxArrayChange = (field: keyof Omit<FormData, 'imaging' | 'durationFrequency' | 'restrictions'> | keyof FormData['imaging'], value: string, group?: 'imaging') => {
    setFormData(prev => {
      let updatedPrev = { ...prev };

      if (group) {
        // Handle nested array fields like imaging.xray
        const parentArray = updatedPrev[group][field as keyof FormData['imaging']];
        const updatedParentArray = Array.isArray(parentArray) ?
          parentArray.includes(value)
            ? parentArray.filter(item => item !== value)
            : [...parentArray, value]
          : [value]; // If not array, start new array

        updatedPrev = {
          ...updatedPrev,
          [group]: {
            ...updatedPrev[group],
            [field]: updatedParentArray,
          },
        };

      } else {
        // Handle flat array fields like chiropracticAdjustment, referrals, nerveStudy, physiotherapy, rehabilitationExercises, acupuncture
        const flatFieldArray = updatedPrev[field as keyof Omit<FormData, 'imaging' | 'durationFrequency' | 'restrictions'>];
        const updatedFlatFieldArray = Array.isArray(flatFieldArray) ?
          flatFieldArray.includes(value)
            ? flatFieldArray.filter(item => item !== value)
            : [...flatFieldArray, value]
          : [value]; // If not array, start new array

        updatedPrev = {
          ...updatedPrev,
          [field as keyof Omit<FormData, 'imaging' | 'durationFrequency' | 'restrictions'>]: updatedFlatFieldArray,
        };
      }

      return updatedPrev;
    });

    triggerAutoSave();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement; // Cast to HTMLInputElement to access 'checked'
    const { name, value, type } = target;
    const checked = type === 'checkbox' ? target.checked : undefined;

    setFormData(prev => {
      let updatedPrev = { ...prev };

      if (name.includes('.')) {
        const [group, field] = name.split('.') as [keyof FormData, string];
        const parent = updatedPrev[group] as Record<string, any>;

        if (group === 'durationFrequency' || group === 'restrictions') {
           updatedPrev = {
             ...updatedPrev,
             [group]: {
               ...parent,
               [field]: type === 'number' ? parseFloat(value) : (type === 'checkbox' ? checked : value),
             } as any // Temporary cast if needed, but aim for stronger typing
           };
        } else if (group === 'imaging') {
           // Imaging is handled by handleCheckboxArrayChange for arrays, but might have other fields later
           // For now, assume direct string/boolean fields within imaging if any were added.
            updatedPrev = {
             ...updatedPrev,
             [group]: {
               ...parent,
               [field]: type === 'checkbox' ? checked : value,
             } as any
           };
        } else {
           // Handle other potential nested objects with dynamic fields
            updatedPrev = {
             ...updatedPrev,
             [group]: {
               ...parent,
               [field]: value,
             } as any
           };
        }

      } else {
        // Handle top-level fields
         updatedPrev = { ...updatedPrev, [name as keyof FormData]: type === 'checkbox' ? checked : value } as FormData;
      }
      return updatedPrev;
    });

    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      localStorage.setItem(`initialVisit_${id}`, JSON.stringify(formData));
      setAutoSaveStatus('Auto-saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    }, 1500);
    setAutoSaveTimer(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Submit form data to the server
      const response = await axios.post(`/api/visits/${id}/initial`, {
        ...formData,
        providerId: user?._id  // Using _id instead of id to match the User type
      });
      
      if (response.data.success) {
        navigate(`/visits/${id}`);
      }
    } catch (error) {
      console.error('Error saving visit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load saved form data on mount
  useEffect(() => {
    if (id) {
      const savedData = localStorage.getItem(`initialVisit_${id}`);
      if (savedData) {
        setFormData(JSON.parse(savedData));
      }
    }

    // Cleanup timer on unmount
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [id]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-4">
        <button onClick={() => navigate(-1)} className="mr-2 text-gray-600 hover:text-black">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-semibold">Initial Visit Form</h1>
      </div>

      {autoSaveStatus && (
        <div className="text-green-700 bg-green-100 p-2 rounded mb-4">{autoSaveStatus}</div>
      )}
    <div className="min-h-screen bg-gray-100 py-6 px-6">
  <div className="w-full bg-white rounded-md shadow-md p-8">

    <h1 className="text-2xl font-bold mb-6 text-center">EXAM & TREATMENT PLAN</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* FORM UI WILL BE ADDED HERE */}
        <div>
          
        <label className="block text-base font-bold text-gray-900 mb-2">Chief Complaint *</label>

  <input
    type="text"
    name="chiefComplaint"
    value={formData.chiefComplaint}
    onChange={handleInputChange}
    className="w-full px-3 py-2 border rounded"
    required
  />
</div>

{/* Chiropractic Adjustment */}
<section>
<h2 className="text-lg font-semibold mt-6 mb-2">Chiropractic Adjustment</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-800">
    {[
      'Cervical Spine', 'Thoracic Spine', 'Lumbar Spine', 'Sacroiliac Spine',
      'Hip R / L', 'Knee (Patella) R / L', 'Ankle R / L',
      'Shoulder (GHJ) R / L', 'Elbow R / L', 'Wrist Carpals R / L'
    ].map(item => (
      <label key={item} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.chiropracticAdjustment.includes(item)}
          onChange={() => handleCheckboxArrayChange('chiropracticAdjustment', item)}
        />
        {item}
      </label>
    ))}
  </div>
  <div className="mt-2">
    <label className="text-sm text-gray-700 mr-2">Other:</label>
    <input
      type="text"
      name="chiropracticOther"
      value={formData.chiropracticOther || ''}
      onChange={handleInputChange}
      className="border px-2 py-1 rounded w-1/2"
      placeholder="_______________________________"
    />
  </div>
</section>

{/* Acupuncture (Cupping) */}
<section className="mt-6">
  <h2 className="text-lg font-semibold mt-6 mb-2">Acupuncture (Cupping)</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-800">
    {[
      'Cervical Spine', 'Thoracic Spine', 'Lumbar Spine', 'Sacroiliac Spine',
      'Hip R / L', 'Knee (Patella) R / L', 'Ankle R / L',
      'Shoulder (GHJ) R / L', 'Elbow R / L', 'Wrist Carpals R / L'
    ].map(item => (
      <label key={item} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.acupuncture.includes(item)}
          onChange={() => handleCheckboxArrayChange('acupuncture', item)}
        />
        {item}
      </label>
    ))}
  </div>
  <div className="mt-2">
    <label className="text-sm text-gray-700 mr-2">Other:</label>
    <input
      type="text"
      name="acupunctureOther"
      value={formData.acupunctureOther || ''}
      onChange={handleInputChange}
      className="border px-2 py-1 rounded w-1/2"
      placeholder="_______________________________"
    />
  </div>
</section>


        {/* Imaging Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Imaging</h2>
          
          {(['xray', 'mri', 'ct'] as const).map(modality => {
            const imagingModality = modality as keyof typeof formData.imaging;
            return (
              <div key={modality} className="mb-4">
                <h3 className="font-medium mb-2">{modality.toUpperCase()}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['C/S', 'T/S', 'L/S', 'Sacroiliac Joint R', 'Sacroiliac Joint L', 'Hip R', 'Hip L', 'Knee R', 'Knee L', 'Ankle R', 'Ankle L', 'Shoulder R', 'Shoulder L', 'Elbow R', 'Elbow L', 'Wrist R', 'Wrist L'].map(region => (
                    <label key={`${modality}-${region}`} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={formData.imaging[imagingModality].includes(region)} 
                        onChange={() => handleCheckboxArrayChange(imagingModality, region, 'imaging')} 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{region}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

{/* Diagnostic Ultrasound */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Diagnostic Ultrasound</h2>
  <textarea name="diagnosticUltrasound" value={formData.diagnosticUltrasound} onChange={handleInputChange} rows={2} className="w-full border rounded px-3 py-2" placeholder="Enter area of ultrasound" />
</section>

{/* Additional Notes */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Other Notes</h2>
  <textarea name="otherNotes" value={formData.otherNotes} onChange={handleInputChange} rows={3} className="w-full border rounded px-3 py-2" placeholder="Add any other comments" />
</section>

{/* Nerve Study */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Nerve Study</h2>
  <div className="flex gap-6">
    {['EMG/NCV upper', 'EMG/NCV lower'].map(test => (
      <label key={test} className="flex items-center gap-2">
        <input type="checkbox" checked={formData.nerveStudy.includes(test)} onChange={() => handleCheckboxArrayChange('nerveStudy', test)} />
        {test}
      </label>
    ))}
  </div>
</section>

{/* Recommendations/Restrictions */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Restrictions</h2>
  <div className="space-y-3">
    <label className="block">
      Avoid Activity (weeks):
      <input type="number" name="restrictions.avoidActivityWeeks" value={formData.restrictions.avoidActivityWeeks} onChange={handleInputChange} className="ml-2 border px-2 py-1 rounded" />
    </label>
    <label className="block">
      Lifting Limit (lbs):
      <input type="number" name="restrictions.liftingLimitLbs" value={formData.restrictions.liftingLimitLbs} onChange={handleInputChange} className="ml-2 border px-2 py-1 rounded" />
    </label>
    <label className="block flex items-center gap-2">
      <input type="checkbox" name="restrictions.avoidProlongedSitting" checked={formData.restrictions.avoidProlongedSitting} onChange={handleInputChange} />
      Avoid Prolonged Sitting/Standing
    </label>
  </div>
</section>

        {/* Form Actions */}
        <div className="mt-6 flex justify-between border-t pt-4">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            {autoSaveStatus && (
              <span className="text-sm text-gray-500">
                {autoSaveStatus}
              </span>
            )}
            <button 
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-white ${isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
    </div>
  </div>
);
};

export default InitialVisitForm;