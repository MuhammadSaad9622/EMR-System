import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';

interface Visit {
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
  visitType: string;
  notes: string;
  __t: string;
  
  // Initial Visit fields
// Initial Visit fields (new structure)
chiefComplaint?: string;
chiropracticAdjustment?: string[];
chiropracticOther?: string;
acupuncture?: string[];
acupunctureOther?: string;
physiotherapy?: string[];
rehabilitationExercises?: string[];

durationFrequency?: {
  timesPerWeek?: number;
  reEvalInWeeks?: number;
};

referrals?: string[];

imaging?: {
  xray?: string[];
  mri?: string[];
  ct?: string[];
};

diagnosticUltrasound?: string;
nerveStudy?: string[];

restrictions?: {
  avoidActivityWeeks?: number;
  liftingLimitLbs?: number;
  avoidProlongedSitting?: boolean;
};

disabilityDuration?: string;
otherNotes?: string;

  // Follow-up Visit fields (matching the EXAM FORM---REEVALUATION template)
  areas?: string;
  areasImproving?: boolean;
  areasExacerbated?: boolean;
  areasSame?: boolean;
  musclePalpation?: string;
  painRadiating?: string;
  romWnlNoPain?: boolean;
  romWnlWithPain?: boolean;
  romImproved?: boolean;
  romDecreased?: boolean;
  romSame?: boolean;
  orthos?: {
    tests?: string;
    result?: string;
  };
  activitiesCausePain?: string;
  activitiesCausePainOther?: string;
  treatmentPlan?: {
    treatments?: string;
    timesPerWeek?: string;
  };
  overallResponse?: {
    improving?: boolean;
    worse?: boolean;
    same?: boolean;
  };
  diagnosticStudy?: {
    study?: string;
    bodyPart?: string;
    result?: string;
  };
  homeCare?: string[];

  // Discharge Visit fields
  treatmentSummary?: string;
  dischargeDiagnosis?: string[];
  medicationsAtDischarge?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  followUpInstructions?: string;
  returnPrecautions?: string[];
  dischargeStatus?: string;
  
  // Add other missing properties that are used in the component
  assessment?: string;
  progressNotes?: string;
  assessmentUpdate?: string;
  romPercent?: string;
  prognosis?: string;
  futureMedicalCare?: string[];
  croftCriteria?: string;
  amaDisability?: string;
  referralsNotes?: string;
}

const VisitDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVisit = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/patients/visits/${id}`);
        setVisit(response.data);
      } catch (error) {
        console.error('Error fetching visit:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVisit();
  }, [id]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Visit_${visit?.visitType}_${new Date(visit?.date || '').toLocaleDateString()}`,
  });

  const generatePDF = () => {
    if (!visit) return;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`${visit.visitType.charAt(0).toUpperCase() + visit.visitType.slice(1)} Visit`, 105, 15, { align: 'center' });
    
    // Add patient name
    doc.setFontSize(16);
    doc.text(`${visit.patient.firstName} ${visit.patient.lastName}`, 105, 25, { align: 'center' });
    
    // Add visit info
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(visit.date).toLocaleDateString()}`, 20, 40);
    doc.text(`Provider: Dr. ${visit.doctor.firstName} ${visit.doctor.lastName}`, 20, 50);
    
    // Add visit details based on type
    if (visit.__t === 'InitialVisit' && visit.chiefComplaint) {
      doc.text('Chief Complaint:', 20, 65);
      doc.text(visit.chiefComplaint, 30, 75);
      
      if (visit.assessment) {
        doc.text('Assessment:', 20, 90);
        doc.text(visit.assessment, 30, 100);
      }
    } else if (visit.__t === 'FollowupVisit' && visit.progressNotes) {
      doc.text('Progress Notes:', 20, 65);
      doc.text(visit.progressNotes, 30, 75);
      
      if (visit.assessmentUpdate) {
        doc.text('Assessment Update:', 20, 90);
        doc.text(visit.assessmentUpdate, 30, 100);
      }
    } else if (visit.__t === 'DischargeVisit' && visit.treatmentSummary) {
      doc.text('Treatment Summary:', 20, 65);
      doc.text(visit.treatmentSummary, 30, 75);
      
      if (visit.followUpInstructions) {
        doc.text('Follow-up Instructions:', 20, 90);
        doc.text(visit.followUpInstructions, 30, 100);
      }
    }
    
    // Save the PDF
    doc.save(`Visit_${visit.visitType}_${new Date(visit.date).toLocaleDateString()}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">Visit not found</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <button
            onClick={() => navigate(`/patients/${visit.patient._id}`)}
            className="mr-4 p-2 rounded-full hover:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {visit.visitType === 'initial' ? 'Initial Visit' : 
               visit.visitType === 'followup' ? 'Follow-up Visit' : 
               'Discharge Visit'}
            </h1>
            <p className="text-gray-600">
              {visit.patient.firstName} {visit.patient.lastName} • {new Date(visit.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </button>
          <button
            onClick={generatePDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div ref={printRef} className="bg-white shadow-md rounded-lg p-6">
        {/* Visit Header */}
        <div className="border-b border-gray-200 pb-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Patient</p>
              <p className="font-medium">
                {visit.patient.firstName} {visit.patient.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Provider</p>
              <p className="font-medium">
                Dr. {visit.doctor.firstName} {visit.doctor.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{new Date(visit.date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

       {/* Initial Visit Content */}
       {visit.visitType === 'initial' && (
  <div className="space-y-6">

    {/* Chief Complaint */}
    {visit.chiefComplaint && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chief Complaint</h3>
        <p className="text-gray-800">{visit.chiefComplaint}</p>
      </div>
    )}

    {/* Chiropractic Adjustment */}
    {visit.chiropracticAdjustment && visit.chiropracticAdjustment.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chiropractic Adjustment</h3>
        <ul className="list-disc pl-5 text-gray-800">
          {visit.chiropracticAdjustment.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        {visit.chiropracticOther && <p className="text-gray-800 mt-1"><strong>Other:</strong> {visit.chiropracticOther}</p>}
      </div>
    )}

    {/* Acupuncture */}
    {visit.acupuncture && visit.acupuncture.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Acupuncture (Cupping)</h3>
        <ul className="list-disc pl-5 text-gray-800">
          {visit.acupuncture.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        {visit.acupunctureOther && <p className="text-gray-800 mt-1"><strong>Other:</strong> {visit.acupunctureOther}</p>}
      </div>
    )}

    {/* Physiotherapy */}
    {visit.physiotherapy && visit.physiotherapy.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Physiotherapy</h3>
        <ul className="list-disc pl-5 text-gray-800">
          {visit.physiotherapy.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Rehabilitation Exercises */}
    {visit.rehabilitationExercises && visit.rehabilitationExercises.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Rehabilitation Exercises</h3>
        <ul className="list-disc pl-5 text-gray-800">
          {visit.rehabilitationExercises.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Duration & Re-evaluation */}
    {(visit.durationFrequency?.timesPerWeek || visit.durationFrequency?.reEvalInWeeks) && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Duration & Re-evaluation</h3>
        <p className="text-gray-800">
          {visit.durationFrequency.timesPerWeek} times/week, Re-evaluation in {visit.durationFrequency.reEvalInWeeks} week(s)
        </p>
      </div>
    )}

    {/* Referrals */}
    {visit.referrals && visit.referrals.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Referrals</h3>
        <ul className="list-disc pl-5 text-gray-800">
          {visit.referrals.map((ref: string, idx: number) => (
            <li key={idx}>{ref}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Imaging */}
    {visit.imaging && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Imaging</h3>
        {Object.entries(visit.imaging).map(([modality, parts]) => {
          const typedModality = modality as keyof typeof visit.imaging;
          const typedParts = parts as string[] | undefined;
          
          if (!typedParts || typedParts.length === 0) return null;
          
          return (
            <div key={typedModality}>
              <p className="font-semibold capitalize">{typedModality}</p>
              <ul className="list-disc pl-5 text-gray-800">
                {typedParts.map((part: string, idx: number) => (
                  <li key={idx}>{part}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    )}

    {/* Diagnostic Ultrasound */}
    {visit.diagnosticUltrasound && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Diagnostic Ultrasound</h3>
        <p className="text-gray-800">{visit.diagnosticUltrasound}</p>
      </div>
    )}

    {/* Nerve Study */}
    {visit.nerveStudy && visit.nerveStudy.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nerve Study</h3>
        <ul className="list-disc pl-5 text-gray-800">
          {visit.nerveStudy.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Restrictions */}
    {visit.restrictions && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Restrictions</h3>
        <ul className="list-disc pl-5 text-gray-800">
          <li>Avoid Activity: {visit.restrictions.avoidActivityWeeks} week(s)</li>
          <li>Lifting Limit: {visit.restrictions.liftingLimitLbs} lbs</li>
          {visit.restrictions.avoidProlongedSitting && <li>Avoid prolonged sitting/standing</li>}
        </ul>
      </div>
    )}

    {/* Disability Duration */}
    {visit.disabilityDuration && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Disability Duration</h3>
        <p className="text-gray-800">{visit.disabilityDuration}</p>
      </div>
    )}

    {/* Other Notes */}
    {visit.otherNotes && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Other Notes</h3>
        <p className="text-gray-800 whitespace-pre-line">{visit.otherNotes}</p>
      </div>
    )}

  </div>
)}


       
        {/* Follow-up Visit Details */}
        {visit.visitType === 'followup' && (
          <div>
            {/* Areas */}
            {(visit.areasImproving !== undefined || visit.areasExacerbated !== undefined || visit.areasSame !== undefined) && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Areas: Auto generated from Initial</h2>
                 <ul className="list-disc list-inside text-gray-700 space-y-1">
                   {visit.areasImproving && <li>Improving</li>}
                   {visit.areasExacerbated && <li>Exacerbated</li>}
                   {visit.areasSame && <li>Same</li>}
                 </ul>
              </div>
            )}

            {/* Examination */}
            {(visit.musclePalpation || visit.painRadiating || visit.romWnlNoPain !== undefined || visit.romWnlWithPain !== undefined || visit.romImproved !== undefined || visit.romDecreased !== undefined || visit.romSame !== undefined || (visit.orthos?.tests || visit.orthos?.result)) && (
               <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Examination</h2>

                {/* Muscle Palpation */}
                {visit.musclePalpation && (
                  <div className="mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Muscle Palpation:</h3>
                    <p className="text-gray-700">{visit.musclePalpation}</p>
                  </div>
                )}

                {/* Pain Radiating */}
                {visit.painRadiating && (
                  <div className="mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Pain Radiating:</h3>
                     <p className="text-gray-700">{visit.painRadiating}</p>
                  </div>
                )}

                {/* ROM */}
                {(visit.romWnlNoPain !== undefined || visit.romWnlWithPain !== undefined || visit.romImproved !== undefined || visit.romDecreased !== undefined || visit.romSame !== undefined) && (
                   <div className="mb-2">
                     <h3 className="text-lg font-medium text-gray-900">ROM:</h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                       {visit.romWnlNoPain && <li>WNL (No Pain)</li>}
                       {visit.romWnlWithPain && <li>WNL (With Pain)</li>}
                       {visit.romImproved && <li>Improved</li>}
                       {visit.romDecreased && <li>Decreased</li>}
                       {visit.romSame && <li>Same</li>}
                      </ul>
                   </div>
                )}

                 {/* Orthos */}
                 {(visit.orthos?.tests || visit.orthos?.result) && (
                  <div className="mb-2">
                     <h3 className="text-lg font-medium text-gray-900">Orthos:</h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                         <li>
                           Tests: {visit.orthos?.tests || 'N/A'},
                           Result: {visit.orthos?.result || 'N/A'}
                         </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Activities that still cause pain */}
            {(visit.activitiesCausePain || visit.activitiesCausePainOther) && (
              <div className="mb-4">
                 <h2 className="text-xl font-semibold text-gray-800 mb-2">Activities that still cause pain:</h2>
                  <p className="text-gray-700">
                    {visit.activitiesCausePain}
                    {visit.activitiesCausePainOther && ` Other: ${visit.activitiesCausePainOther}`}
                  </p>
              </div>
            )}

            {/* ASSESSMENT AND PLAN */}
            {(visit.treatmentPlan?.treatments || visit.treatmentPlan?.timesPerWeek || visit.overallResponse?.improving !== undefined || visit.overallResponse?.worse !== undefined || visit.overallResponse?.same !== undefined || visit.referrals || visit.diagnosticStudy?.study || visit.diagnosticStudy?.bodyPart || visit.diagnosticStudy?.result || visit.homeCare) && (
               <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">ASSESSMENT AND PLAN</h2>

                 {/* Treatment plan */}
                 {(visit.treatmentPlan?.treatments || visit.treatmentPlan?.timesPerWeek) && (
                   <div className="mb-2">
                     <h3 className="text-lg font-medium text-gray-900">Treatment plan:</h3>
                      <p className="text-gray-700">
                        {visit.treatmentPlan?.treatments}
                        {visit.treatmentPlan?.timesPerWeek && ` Times per week: ${visit.treatmentPlan.timesPerWeek}`}
                      </p>
                   </div>
                 )}

                {/* Overall response to care */}
                 {(visit.overallResponse?.improving !== undefined || visit.overallResponse?.worse !== undefined || visit.overallResponse?.same !== undefined) && (
                   <div className="mb-2">
                     <h3 className="text-lg font-medium text-gray-900">Overall response to care:</h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                       {visit.overallResponse?.improving && <li>Improving</li>}
                       {visit.overallResponse?.worse && <li>Worse</li>}
                       {visit.overallResponse?.same && <li>Same</li>}
                      </ul>
                   </div>
                 )}

                {/* Referrals */}
                 {visit.referrals && (
                   <div className="mb-2">
                     <h3 className="text-lg font-medium text-gray-900">Referrals:</h3>
                     <p className="text-gray-700">{visit.referrals}</p>
                   </div>
                 )}

                {/* Review of diagnostic study with the patient */}
                 {(visit.diagnosticStudy?.study || visit.diagnosticStudy?.bodyPart || visit.diagnosticStudy?.result) && (
                   <div className="mb-2">
                     <h3 className="text-lg font-medium text-gray-900">Review of diagnostic study with the patient:</h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                         <li>
                           Study: {visit.diagnosticStudy?.study || 'N/A'},
                           Body Part: {visit.diagnosticStudy?.bodyPart || 'N/A'},
                           Result: {visit.diagnosticStudy?.result || 'N/A'}
                         </li>
                    </ul>
                  </div>
                )}

                {/* Home Care */}
                 {visit.homeCare && (
                   <div className="mb-2">
                     <h3 className="text-lg font-medium text-gray-900">Home Care:</h3>
                     <p className="text-gray-700">{visit.homeCare}</p>
                   </div>
                 )}

              </div>
            )}

          </div>
        )}


        {/* Discharge Visit Content */}
        {visit.visitType === 'discharge' && (
  <div className="space-y-6">

    <h2 className="text-xl font-bold text-gray-900">EXAM FORM — DISCHARGE</h2>

    <div>
      <h3 className="font-medium text-gray-800">Areas:</h3>
      <p className="text-gray-700">
        {visit.areasImproving && 'Improving '}
        {visit.areasExacerbated && 'Exacerbated '}
        {visit.areasSame && 'Same '}
      </p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Muscle Palpation:</h3>
      <p className="text-gray-700">{visit.musclePalpation}</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Pain Radiating:</h3>
      <p className="text-gray-700">{visit.painRadiating}</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">ROM:</h3>
      <p className="text-gray-700">{visit.romPercent}% of pre-injury</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Orthos:</h3>
      <p className="text-gray-700"><strong>Tests:</strong> {visit.orthos?.tests}</p>
      <p className="text-gray-700"><strong>Result:</strong> {visit.orthos?.result}</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Activities Causing Pain:</h3>
      <p className="text-gray-700">{visit.activitiesCausePain}</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Other Notes:</h3>
      <p className="text-gray-700">{visit.otherNotes}</p>
    </div>

    <h2 className="text-xl font-bold text-gray-900 mt-6">ASSESSMENT AND PLAN</h2>

    <div>
      <h3 className="font-medium text-gray-800">Prognosis:</h3>
      <p className="text-gray-700">{visit.prognosis}</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Diagnostic Study:</h3>
      <p className="text-gray-700">
        <strong>Study:</strong> {visit.diagnosticStudy?.study} <br />
        <strong>Body Part:</strong> {visit.diagnosticStudy?.bodyPart} <br />
        <strong>Result:</strong> {visit.diagnosticStudy?.result}
      </p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Recommended Future Medical Care:</h3>
      <ul className="list-disc pl-5 text-gray-700">
        {visit.futureMedicalCare?.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Croft Criteria:</h3>
      <p className="text-gray-700">{visit.croftCriteria}</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">AMA Disability:</h3>
      <p className="text-gray-700">{visit.amaDisability}</p>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Home Care Instructions:</h3>
      <ul className="list-disc pl-5 text-gray-700">
        {visit.homeCare?.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="font-medium text-gray-800">Referrals / Notes:</h3>
      <p className="text-gray-700">{visit.referralsNotes}</p>
    </div>
  </div>
)}


        {/* Additional Notes */}
        {visit.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Additional Notes</h3>
            <p className="text-gray-800 whitespace-pre-line">{visit.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitDetails;