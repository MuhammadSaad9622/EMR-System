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
    {visit.chiropracticAdjustment?.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chiropractic Adjustment</h3>
        <p className="text-gray-800">
          Chiropractic adjustments were administered to the following areas: {visit.chiropracticAdjustment.join(', ')}.
        </p>
        {visit.chiropracticOther && <p className="text-gray-800">Additional notes: {visit.chiropracticOther}</p>}
      </div>
    )}

    {/* Acupuncture */}
    {visit.acupuncture?.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Acupuncture (Cupping)</h3>
        <p className="text-gray-800">
          Acupuncture was applied to the following regions: {visit.acupuncture.join(', ')}.
        </p>
        {visit.acupunctureOther && <p className="text-gray-800">Additional notes: {visit.acupunctureOther}</p>}
      </div>
    )}

    {/* Physiotherapy */}
    {visit.physiotherapy?.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Physiotherapy</h3>
        <p className="text-gray-800">
          The patient received physiotherapy including: {visit.physiotherapy.join(', ')}.
        </p>
      </div>
    )}

    {/* Rehabilitation Exercises */}
    {visit.rehabilitationExercises?.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Rehabilitation Exercises</h3>
        <p className="text-gray-800">
          Prescribed rehabilitation exercises include: {visit.rehabilitationExercises.join(', ')}.
        </p>
      </div>
    )}

    {/* Duration & Re-evaluation */}
    {(visit.durationFrequency?.timesPerWeek || visit.durationFrequency?.reEvalInWeeks) && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Duration & Re-evaluation</h3>
        <p className="text-gray-800">
          Therapy is scheduled {visit.durationFrequency.timesPerWeek} times per week, with a re-evaluation in {visit.durationFrequency.reEvalInWeeks} week(s).
        </p>
      </div>
    )}

    {/* Referrals */}
    {visit.referrals?.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Referrals</h3>
        <p className="text-gray-800">
          The patient was referred for: {visit.referrals.join(', ')}.
        </p>
      </div>
    )}

    {/* Imaging */}
    {visit.imaging && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Imaging</h3>
        {Object.entries(visit.imaging).map(([modality, parts]) => {
          const partList = (parts as string[]).join(', ');
          return (
            <p key={modality} className="text-gray-800">
              {modality.charAt(0).toUpperCase() + modality.slice(1)} was performed for: {partList}.
            </p>
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
    {visit.nerveStudy?.length > 0 && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nerve Study</h3>
        <p className="text-gray-800">
          Nerve studies revealed: {visit.nerveStudy.join(', ')}.
        </p>
      </div>
    )}

    {/* Restrictions */}
    {visit.restrictions && (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Restrictions</h3>
        <p className="text-gray-800">
          The patient is restricted from physical activity for {visit.restrictions.avoidActivityWeeks} week(s) with a lifting limit of {visit.restrictions.liftingLimitLbs} lbs.
          {visit.restrictions.avoidProlongedSitting && ' Prolonged sitting and standing should be avoided.'}
        </p>
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
  <div className="space-y-6">

    {/* Areas */}
    {(visit.areasImproving || visit.areasExacerbated || visit.areasSame) && (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Areas (Auto-generated from Initial)</h2>
        <p className="text-gray-700">
          The following observations were made:{" "}
          {visit.areasImproving && "Some areas are improving. "}
          {visit.areasExacerbated && "Certain areas are exacerbated. "}
          {visit.areasSame && "Some areas remain the same."}
        </p>
      </div>
    )}

    {/* Examination */}
    {(visit.musclePalpation || visit.painRadiating || visit.romWnlNoPain || visit.romWnlWithPain || visit.romImproved || visit.romDecreased || visit.romSame || (visit.orthos?.tests || visit.orthos?.result)) && (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Examination</h2>

        {visit.musclePalpation && (
          <p className="text-gray-700">
            <strong>Muscle Palpation:</strong> {visit.musclePalpation}
          </p>
        )}

        {visit.painRadiating && (
          <p className="text-gray-700">
            <strong>Pain Radiating:</strong> {visit.painRadiating}
          </p>
        )}

        {(visit.romWnlNoPain || visit.romWnlWithPain || visit.romImproved || visit.romDecreased || visit.romSame) && (
          <p className="text-gray-700">
            <strong>Range of Motion:</strong>{" "}
            {[
              visit.romWnlNoPain && "WNL (No Pain)",
              visit.romWnlWithPain && "WNL (With Pain)",
              visit.romImproved && "Improved",
              visit.romDecreased && "Decreased",
              visit.romSame && "Same"
            ].filter(Boolean).join(", ")}.
          </p>
        )}

        {(visit.orthos?.tests || visit.orthos?.result) && (
          <p className="text-gray-700">
            <strong>Orthopedic Tests:</strong> {visit.orthos?.tests || 'N/A'}, Result: {visit.orthos?.result || 'N/A'}
          </p>
        )}
      </div>
    )}

    {/* Activities that still cause pain */}
    {(visit.activitiesCausePain || visit.activitiesCausePainOther) && (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Activities that Still Cause Pain</h2>
        <p className="text-gray-700">
          {visit.activitiesCausePain}
          {visit.activitiesCausePainOther && ` Other: ${visit.activitiesCausePainOther}`}
        </p>
      </div>
    )}

    {/* Assessment and Plan */}
    {(visit.treatmentPlan?.treatments || visit.treatmentPlan?.timesPerWeek || visit.overallResponse?.improving || visit.overallResponse?.worse || visit.overallResponse?.same || visit.referrals || visit.diagnosticStudy?.study || visit.diagnosticStudy?.bodyPart || visit.diagnosticStudy?.result || visit.homeCare) && (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Assessment and Plan</h2>

        {/* Treatment Plan */}
        {(visit.treatmentPlan?.treatments || visit.treatmentPlan?.timesPerWeek) && (
          <p className="text-gray-700">
            <strong>Treatment Plan:</strong> {visit.treatmentPlan?.treatments || ''}{" "}
            {visit.treatmentPlan?.timesPerWeek && `Recommended frequency: ${visit.treatmentPlan.timesPerWeek} times per week.`}
          </p>
        )}

        {/* Overall Response */}
        {(visit.overallResponse?.improving || visit.overallResponse?.worse || visit.overallResponse?.same) && (
          <p className="text-gray-700">
            <strong>Overall Response to Care:</strong>{" "}
            {[
              visit.overallResponse?.improving && "Patient is improving",
              visit.overallResponse?.worse && "Condition is worsening",
              visit.overallResponse?.same && "Condition remains the same"
            ].filter(Boolean).join(", ")}.
          </p>
        )}

        {/* Referrals */}
        {visit.referrals && (
          <p className="text-gray-700">
            <strong>Referrals:</strong> {visit.referrals}
          </p>
        )}

        {/* Diagnostic Study */}
        {(visit.diagnosticStudy?.study || visit.diagnosticStudy?.bodyPart || visit.diagnosticStudy?.result) && (
          <p className="text-gray-700">
            <strong>Diagnostic Study:</strong>{" "}
            Study: {visit.diagnosticStudy?.study || 'N/A'}, Body Part: {visit.diagnosticStudy?.bodyPart || 'N/A'}, Result: {visit.diagnosticStudy?.result || 'N/A'}
          </p>
        )}

        {/* Home Care */}
        {visit.homeCare && (
          <p className="text-gray-700">
            <strong>Home Care:</strong> {visit.homeCare}
          </p>
        )}
      </div>
    )}

  </div>
)}


        {/* Discharge Visit Content */}
      {visit.visitType === 'discharge' && (
  <div className="space-y-4 text-gray-800 leading-relaxed">

    <h2 className="text-xl font-bold text-gray-900 border-b pb-1">EXAM FORM — DISCHARGE</h2>

    {(visit.areasImproving || visit.areasExacerbated || visit.areasSame) && (
      <p>•{" "}
        {[
          visit.areasImproving && "The patient is showing improvement in some areas.",
          visit.areasExacerbated && "Certain areas have worsened.",
          visit.areasSame && "Some areas remain unchanged."
        ].filter(Boolean).join(" ")}
      </p>
    )}

    {visit.musclePalpation && (
      <p>• <strong>Muscle Palpation:</strong> {visit.musclePalpation}</p>
    )}

    {visit.painRadiating && (
      <p>• <strong>Pain Radiating:</strong> {visit.painRadiating}</p>
    )}

    {visit.romPercent && (
      <p>• <strong>Range of Motion:</strong> The patient has regained approximately {visit.romPercent}% of pre-injury ROM.</p>
    )}

    {(visit.orthos?.tests || visit.orthos?.result) && (
      <p>• <strong>Orthopedic Tests:</strong> {visit.orthos?.tests || 'N/A'}, with the result: {visit.orthos?.result || 'N/A'}.</p>
    )}

    {visit.activitiesCausePain && (
      <p>• <strong>Activities Causing Pain:</strong> {visit.activitiesCausePain}</p>
    )}

    {visit.otherNotes && (
      <p>• <strong>Other Notes:</strong> {visit.otherNotes}</p>
    )}

    <h2 className="text-xl font-bold text-gray-900 border-b pt-4 pb-1">ASSESSMENT AND PLAN</h2>

    {visit.prognosis && (
      <p>• <strong>Prognosis:</strong> {visit.prognosis}</p>
    )}

    {(visit.diagnosticStudy?.study || visit.diagnosticStudy?.bodyPart || visit.diagnosticStudy?.result) && (
      <p>• <strong>Diagnostic Study:</strong> A {visit.diagnosticStudy?.study || 'N/A'} was performed on the {visit.diagnosticStudy?.bodyPart || 'N/A'}, showing: {visit.diagnosticStudy?.result || 'N/A'}.</p>
    )}

    {visit.futureMedicalCare?.length > 0 && (
      <p>• <strong>Recommended Future Medical Care:</strong> {visit.futureMedicalCare.join(", ")}.</p>
    )}

    {visit.croftCriteria && (
      <p>• <strong>Croft Criteria:</strong> This case aligns with Croft Grade {visit.croftCriteria}.</p>
    )}

    {visit.amaDisability && (
      <p>• <strong>AMA Disability:</strong> Rated as Grade {visit.amaDisability}.</p>
    )}

    {visit.homeCare?.length > 0 && (
      <p>• <strong>Home Care Instructions:</strong> {visit.homeCare.join(", ")}.</p>
    )}

    {visit.referralsNotes && (
      <p>• <strong>Referrals / Notes:</strong> {visit.referralsNotes}</p>
    )}
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