import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Define the interface for the form data
interface InitialVisitFormData {
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
}

const InitialVisitForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Use the defined interface for the state type
  const [formData, setFormData] = useState<InitialVisitFormData>({
    chiefComplaint: '', // ✅ Add this
    chiropracticAdjustment: [],
    chiropracticOther: '', // ✅ NEW
    acupuncture: [],
    acupunctureOther: '',  // ✅ NEW
    physiotherapy: [],
    rehabilitationExercises: [],
    durationFrequency: {
      timesPerWeek: '',
      reEvalInWeeks: ''
    },
    referrals: [],
    imaging: {
      xray: [],
      mri: [],
      ct: []
    },
    diagnosticUltrasound: '',
    nerveStudy: [],
    restrictions: {
      avoidActivityWeeks: '',
      liftingLimitLbs: '',
      avoidProlongedSitting: false
    },
    disabilityDuration: '',
    otherNotes: ''
  });

  const handleCheckboxArrayChange = (field: string, value: string, group?: keyof Omit<InitialVisitFormData, 'durationFrequency' | 'restrictions'>) => {
    setFormData(prev => {
      let targetArray: string[] = [];

      if (group) {
        const parent = prev[group];
        if (typeof parent === 'object' && parent !== null && field in parent && Array.isArray((parent as any)[field])) {
          targetArray = (parent as any)[field];
        }
      } else {
        if (field in prev && Array.isArray(prev[field as keyof InitialVisitFormData])) {
           targetArray = prev[field as keyof InitialVisitFormData] as string[];
        }
      }

      const updated = targetArray.includes(value)
        ? targetArray.filter((item: string) => item !== value)
        : [...targetArray, value];

      if (group) {
        return {
          ...prev,
          [group]: {
            ...(prev[group] as any),
            [field]: updated
          }
        };
      } else {
        return {
          ...prev,
          [field as keyof InitialVisitFormData]: updated
        };
      }
    });

    triggerAutoSave();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => {
      if (name.includes('.')) {
        const [group, field] = name.split('.') as [keyof InitialVisitFormData, string];
        const currentGroup = prev[group] as any;
        return {
          ...prev,
          [group]: {
            ...(typeof currentGroup === 'object' && currentGroup !== null ? currentGroup : {}),
            [field]: type === 'checkbox' ? checked : value
          }
        };
      }
      return { ...prev, [name as keyof InitialVisitFormData]: type === 'checkbox' ? checked : value };
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
      // First, save the visit data
      const response = await axios.post(`http://localhost:5000/api/visits`, {
         ...formData,
         patient: id,
         doctor: user?._id,
         visitType: 'initial'
      });

      const savedVisitId = response.data.visit._id;
      
      // Then, generate AI narrative
      try {
        const aiResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/generate-narrative`, {
          ...formData,
          visitType: 'initial'
        });

        if (aiResponse.data.success) {
          // Update the visit with the AI narrative
          await axios.patch(`http://localhost:5000/api/visits/${savedVisitId}`, {
            aiNarrative: aiResponse.data.narrative
          });
        }
      } catch (aiError) {
        console.error('Error generating AI narrative:', aiError);
        // Continue with the form submission even if AI generation fails
      }

      localStorage.removeItem(`initialVisit_${id}`);
      navigate(`/patients/${id}`);
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSaving(false);
    }
  };
  
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


{/* Physiotherapy */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Physiotherapy</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {['Hot Pack/Cold Pack', 'Ultrasound', 'EMS', 'E-Stim', 'Therapeutic Exercises', 'NMR', 'Orthion Bed', 'Mechanical Traction', 'Paraffin Wax', 'Infrared'].map(item => (
      <label key={item} className="flex items-center gap-2">
        <input type="checkbox" checked={formData.physiotherapy.includes(item)} onChange={() => handleCheckboxArrayChange('physiotherapy', item)} />
        {item}
      </label>
    ))}
  </div>
</section>

{/* Rehabilitation Exercises */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Rehabilitation Exercises</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {formData.chiropracticAdjustment.map(item => (
      <label key={item + '-rehab'} className="flex items-center gap-2">
        <input type="checkbox" checked={formData.rehabilitationExercises.includes(item)} onChange={() => handleCheckboxArrayChange('rehabilitationExercises', item)} />
        {item}
      </label>
    ))}
  </div>
</section>

{/* Duration and Re-Evaluation */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Duration & Re-Evaluation</h2>
  <div className="flex flex-wrap gap-4">
    <label>
      Times per Week:
      <input type="number" name="durationFrequency.timesPerWeek" value={formData.durationFrequency.timesPerWeek} onChange={handleInputChange} className="ml-2 border px-2 py-1 rounded" />
    </label>
    <label>
      Re-Evaluation in Weeks:
      <input type="number" name="durationFrequency.reEvalInWeeks" value={formData.durationFrequency.reEvalInWeeks} onChange={handleInputChange} className="ml-2 border px-2 py-1 rounded" />
    </label>
  </div>
</section>

{/* Referrals */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Referrals</h2>
  <div className="flex flex-wrap gap-4">
    {['Orthopedist', 'Neurologist', 'Pain Management'].map(item => (
      <label key={item} className="flex items-center gap-2">
        <input type="checkbox" checked={formData.referrals.includes(item)} onChange={() => handleCheckboxArrayChange('referrals', item)} />
        {item}
      </label>
    ))}
  </div>
</section>

{/* Imaging (X-Ray, MRI, CT) */}
{['xray', 'mri', 'ct'].map(modality => (
  <section key={modality}>
    <h2 className="text-lg font-semibold mt-6 mb-2">{modality.toUpperCase()}</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {['C/S', 'T/S', 'L/S', 'Sacroiliac Joint R', 'Sacroiliac Joint L', 'Hip R', 'Hip L', 'Knee R', 'Knee L', 'Ankle R', 'Ankle L', 'Shoulder R', 'Shoulder L', 'Elbow R', 'Elbow L', 'Wrist R', 'Wrist L'].map(region => (
        <label key={`${modality}-${region}`} className="flex items-center gap-2">
          <input type="checkbox" checked={formData.imaging[modality as keyof InitialVisitFormData['imaging']].includes(region)} onChange={() => handleCheckboxArrayChange(modality, region, 'imaging')} />
          {region}
        </label>
      ))}
    </div>
  </section>
))}

{/* Diagnostic Ultrasound */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Diagnostic Ultrasound</h2>
  <textarea name="diagnosticUltrasound" value={formData.diagnosticUltrasound} onChange={handleInputChange} rows={2} className="w-full border rounded px-3 py-2" placeholder="Enter area of ultrasound" />
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

{/* Disability Duration */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Disability Duration</h2>
  <input type="text" name="disabilityDuration" value={formData.disabilityDuration} onChange={handleInputChange} className="w-full border px-3 py-2 rounded" placeholder="e.g., 1 week, 2 weeks, 1 month" />
</section>

{/* Additional Notes */}
<section>
  <h2 className="text-lg font-semibold mt-6 mb-2">Other Notes</h2>
  <textarea name="otherNotes" value={formData.otherNotes} onChange={handleInputChange} rows={3} className="w-full border rounded px-3 py-2" placeholder="Add any other comments" />
</section>

{/* Submit Button */}
<div className="flex justify-end mt-6">
  <button type="submit" disabled={isSaving} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
    {isSaving ? 'Saving...' : 'Save Visit'}
  </button>
</div>

      </form>
      </div>  
      </div>
    </div>
  );
};

export default InitialVisitForm;