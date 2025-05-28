import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

type FormData = {
  areasImproving: boolean;
  areasExacerbated: boolean;
  areasSame: boolean;
  musclePalpation: string;
  painRadiating: string;
  romPercent: string;
  orthos: {
    tests: string;
    result: string;
  };
  activitiesCausePain: string;
  otherNotes: string;
  prognosis: string;
  diagnosticStudy: {
    study: string;
    bodyPart: string;
    result: string;
  };
  futureMedicalCare: string[];
  croftCriteria: string;
  amaDisability: string;
  homeCare: string[];
  referralsNotes: string;
};

const DischargeVisitForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    areasImproving: false,
    areasExacerbated: false,
    areasSame: false,
    musclePalpation: '',
    painRadiating: '',
    romPercent: '',
    orthos: {
      tests: '',
      result: ''
    },
    activitiesCausePain: '',
    otherNotes: '',
    prognosis: '',
    diagnosticStudy: {
      study: '',
      bodyPart: '',
      result: ''
    },
    futureMedicalCare: [],
    croftCriteria: '',
    amaDisability: '',
    homeCare: [],
    referralsNotes: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNestedChange = (section: keyof FormData, field: string, value: string | boolean) => {
    setFormData((prev) => {
      const sectionValue = prev[section];
      if (typeof sectionValue === 'object' && sectionValue !== null) {
        return {
          ...prev,
          [section]: {
            ...sectionValue,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsGeneratingNarrative(true);

    try {
      const aiApiUrl = `${import.meta.env.VITE_API_URL}/api/generate-narrative`;
      console.log('Calling AI API at:', aiApiUrl);
      const aiResponse = await axios.post(aiApiUrl, formData);
      const generatedNarrative = aiResponse.data.narrative;
      console.log('Generated narrative:', generatedNarrative);

      const payload = {
        ...formData,
        visitType: 'discharge',
        patient: id,
        otherNotes: `${formData.otherNotes}\n\nAI Generated Narrative:\n${generatedNarrative}`.trim(),
      };

      await axios.post('http://localhost:5000/api/visits', payload);
      
      navigate(`/patients/${id}`);
    } catch (err) {
      console.error('Error submitting form', err);
      alert('Form submission failed. Check console for details.');
    } finally {
      setIsSaving(false);
      setIsGeneratingNarrative(false);
    }
  };
  

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-semibold">EXAM FORM — DISCHARGE</h2>

      <div className="flex gap-4">
        <label><input type="checkbox" name="areasImproving" checked={formData.areasImproving} onChange={handleChange} /> Improving</label>
        <label><input type="checkbox" name="areasExacerbated" checked={formData.areasExacerbated} onChange={handleChange} /> Exacerbated</label>
        <label><input type="checkbox" name="areasSame" checked={formData.areasSame} onChange={handleChange} /> Same</label>
      </div>

      <textarea name="musclePalpation" value={formData.musclePalpation} onChange={handleChange} placeholder="Muscle Palpation Results" className="w-full border p-2" />
      <textarea name="painRadiating" value={formData.painRadiating} onChange={handleChange} placeholder="Pain Radiating" className="w-full border p-2" />
      <input type="number" name="romPercent" value={formData.romPercent} onChange={handleChange} placeholder="ROM % Pre-injury" className="w-full border p-2" />

      <input type="text" value={formData.orthos.tests} onChange={(e) => handleNestedChange('orthos', 'tests', e.target.value)} placeholder="Orthos Tests" className="w-full border p-2" />
      <input type="text" value={formData.orthos.result} onChange={(e) => handleNestedChange('orthos', 'result', e.target.value)} placeholder="Orthos Result" className="w-full border p-2" />

      <textarea name="activitiesCausePain" value={formData.activitiesCausePain} onChange={handleChange} placeholder="Activities That Cause Pain" className="w-full border p-2" />
      <textarea name="otherNotes" value={formData.otherNotes} onChange={handleChange} placeholder="Other Notes" className="w-full border p-2" />

      <h2 className="text-xl font-semibold">ASSESSMENT AND PLAN</h2>

      <select name="prognosis" value={formData.prognosis} onChange={handleChange} className="w-full border p-2">
        <option value="">Select Prognosis</option>
        <option>The patient has reached a plateau...</option>
        <option>The patient has received maximum benefits...</option>
      </select>

      <input type="text" value={formData.diagnosticStudy.study} onChange={(e) => handleNestedChange('diagnosticStudy', 'study', e.target.value)} placeholder="Study Type" className="w-full border p-2" />
      <input type="text" value={formData.diagnosticStudy.bodyPart} onChange={(e) => handleNestedChange('diagnosticStudy', 'bodyPart', e.target.value)} placeholder="Body Part" className="w-full border p-2" />
      <input type="text" value={formData.diagnosticStudy.result} onChange={(e) => handleNestedChange('diagnosticStudy', 'result', e.target.value)} placeholder="Result" className="w-full border p-2" />

      <input type="text" name="croftCriteria" value={formData.croftCriteria} onChange={handleChange} placeholder="Croft Criteria Grade" className="w-full border p-2" />

      <select name="amaDisability" value={formData.amaDisability} onChange={handleChange} className="w-full border p-2">
        <option value="">Select AMA Disability Grade</option>
        <option>Grade I</option>
        <option>Grade II</option>
        <option>Grade III</option>
        <option>Grade IV</option>
      </select>

      <textarea name="referralsNotes" value={formData.referralsNotes} onChange={handleChange} placeholder="Referrals / Recommendations / Notes" className="w-full border p-2" />

      <button type="submit" disabled={isSaving || isGeneratingNarrative} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {isSaving ? 'Submitting...' : isGeneratingNarrative ? 'Generating Narrative...' : 'Submit'}
      </button>
    </form>
  );
};

export default DischargeVisitForm;
