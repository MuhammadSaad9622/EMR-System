import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import BillingList from '../billing/BillingList';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  FileText, 
  DollarSign, 
  Printer,
  ChevronDown,
  ChevronUp,
  Download,
  FileArchive
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
    primaryInsured: string;
  };
  medicalHistory: {
    allergies: string[];
    medications: string[];
    conditions: string[];
    surgeries: string[];
    familyHistory: string[];
  };
  subjective?: {
    fullName: string;
    date: string;
    severity: string;
    timing: string;
    context: string;
    notes: string;
    bodyPart: string[];
  };
  assignedDoctor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

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
  notes?: string;
  __t: string;

  // Initial Visit fields
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

  referrals?: string[]; // InitialVisit has referrals as array

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
  homeCare?: string[]; // FollowupVisit and DischargeVisit have homeCare as array

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

  // Fields observed in VisitDetails.tsx for various visit types, not consistently in previous interface
  assessment?: string; // Used in InitialVisitDetails
  progressNotes?: string; // Used in FollowupVisitDetails for title/check
  assessmentUpdate?: string; // Used in FollowupVisitDetails
  romPercent?: string; // Used in DischargeVisitDetails
  prognosis?: string; // Used in DischargeVisitDetails
  futureMedicalCare?: string[]; // Used in DischargeVisitDetails
  croftCriteria?: string; // Used in DischargeVisitDetails
  amaDisability?: string; // Used in DischargeVisitDetails
  referralsNotes?: string; // Used in DischargeVisitDetails (as notes for referrals)

   // Plan details - matching structure in VisitDetails.tsx
   plan?: {
    diagnosis?: string[];
    labTests?: string[];
    imaging?: string[];
    medications?: { name: string; dosage: string; frequency: string }[];
  };

   // Referral field in Followup and Discharge is a string
   referral?: string;

   // Missing fields identified from linter errors/VisitDetails.tsx review
   rationale?: string;
   scheduleOfCare?: string;
   physicalModality?: string;
   reevaluation?: string;
   returnFrequency?: string;
}

interface Appointment {
  _id: string;
  patient: string;
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
  notes?: string; // Added notes field
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  dateIssued: string;
  dueDate: string;
  total: number;
  status: string;
}

const PatientDetails: React.FC<{}> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Using _ prefix to indicate this is intentionally unused
  // const [_invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Invoice type is used in the state type definition
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personalInfo: false,
    contactInfo: false,
    medicalHistory: false,
    insuranceInfo: false
  });

  useEffect(() => {
    const fetchPatientData = async () => {
      setIsLoading(true);
      try {
        // Fetch patient details
        const patientResponse = await axios.get(`http://localhost:5000/api/patients/${id}`);
        setPatient(patientResponse.data);
        
        // Fetch patient visits
        const visitsResponse = await axios.get(`http://localhost:5000/api/patients/${id}/visits`);
        
        const parsedVisits = visitsResponse.data.map((visit: any) => ({
          ...visit,
          plan: typeof visit.plan === 'string' ? JSON.parse(visit.plan) : visit.plan,
        }));
        setVisits(parsedVisits);
        
        // Fetch patient appointments
        const appointmentsResponse = await axios.get(`http://localhost:5000/api/appointments?patient=${id}`);
        setAppointments(appointmentsResponse.data);
        // ✅ Fetch invoice count for the patient
const invoiceResponse = await axios.get(`http://localhost:5000/api/billing?patient=${id}`);
setInvoiceCount(invoiceResponse.data.totalInvoices);

        
        // We don't need to fetch invoices here anymore as BillingList will handle it
        // setInvoices([]); // Clear the local invoices state
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPatientData();
  }, [id]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Patient_${patient?.firstName}_${patient?.lastName}`,
  });

  const generatePDF = () => {
    if (!patient) return;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Patient Summary', 105, 15, { align: 'center' });
    
    // Add patient name
    doc.setFontSize(16);
    doc.text(`${patient.firstName} ${patient.lastName}`, 105, 25, { align: 'center' });
    
    // Add basic info
    doc.setFontSize(12);
    doc.text(`Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString()}`, 20, 40);
    doc.text(`Gender: ${patient.gender}`, 20, 50);
    doc.text(`Status: ${patient.status}`, 20, 60);
    doc.text(`Email: ${patient.email}`, 20, 70);
    doc.text(`Phone: ${patient.phone}`, 20, 80);
    
    // Add address
    doc.text('Address:', 20, 95);
    if (patient.address.street) doc.text(`${patient.address.street}`, 30, 105);
    if (patient.address.city || patient.address.state) {
      doc.text(`${patient.address.city}, ${patient.address.state} ${patient.address.zipCode}`, 30, 115);
    }
    if (patient.address.country) doc.text(`${patient.address.country}`, 30, 125);
    
    // Add medical history
    doc.text('Medical History:', 20, 140);
    
    // Allergies
    if (patient.medicalHistory.allergies.length > 0) {
      doc.text('Allergies:', 30, 150);
      patient.medicalHistory.allergies.forEach((allergy, index) => {
        if (allergy) doc.text(`- ${allergy}`, 40, 160 + (index * 10));
      });
    }
    
    // Save the PDF
    doc.save(`Patient_${patient.firstName}_${patient.lastName}.pdf`);
  };

  const generateFullReport = async (): Promise<void> => {
    try {
      if (!patient || visits.length === 0) {
        console.error('No patient data or visits available');
        return;
      }

      const doc = new jsPDF();
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yOffset = 20;
      const lineHeight = 7;

      // Add header
      doc.setFontSize(12);
      doc.text('Tina Taguhi Lusikyan', margin, yOffset);
      yOffset += lineHeight;
      doc.text('100 W. Broadway, Suite 1040', margin, yOffset);
      yOffset += lineHeight;
      doc.text('Glendale, CA 91210', margin, yOffset);
      yOffset += lineHeight * 2;

      // Add patient information table
      doc.setFontSize(10);
      doc.text('Patient Information', margin + 60, yOffset);
      yOffset += lineHeight;
      
      // Draw table borders
      doc.rect(margin, yOffset, pageWidth - margin * 2, lineHeight * 5);
      doc.line(margin + 15, yOffset, margin + 15, yOffset + lineHeight * 5);
      doc.line(margin + 30, yOffset, margin + 30, yOffset + lineHeight * 5);
      doc.line(margin + 45, yOffset, margin + 45, yOffset + lineHeight * 5);
      
      // Horizontal lines
      for (let i = 1; i < 5; i++) {
        doc.line(margin, yOffset + lineHeight * i, pageWidth - margin, yOffset + lineHeight * i);
      }

      // Add patient info content
      doc.setFont('helvetica', 'bold');
      doc.text('Patient', margin + 2, yOffset + lineHeight * 0.7);
      doc.text('Date of Birth', margin + 2, yOffset + lineHeight * 1.7);
      doc.text('Patient Gender', margin + 2, yOffset + lineHeight * 2.7);
      doc.text('Marital Status', margin + 2, yOffset + lineHeight * 3.7);
      doc.text('Injury', margin + 2, yOffset + lineHeight * 4.7);

      doc.setFont('helvetica', 'normal');
      doc.text(`${patient.firstName} ${patient.lastName}`, margin + 17, yOffset + lineHeight * 0.7);
      doc.text(new Date(patient.dateOfBirth).toLocaleDateString(), margin + 17, yOffset + lineHeight * 1.7);
      doc.text(patient.gender, margin + 17, yOffset + lineHeight * 2.7);
      doc.text('N/A', margin + 17, yOffset + lineHeight * 3.7); // Marital status not in our data
      doc.text('N/A', margin + 17, yOffset + lineHeight * 4.7); // Injury date not in our data

      yOffset += lineHeight * 6;

      // Process each visit
      visits.forEach((visit: Visit) => {
        // Check if we need a new page
        if (yOffset > pageHeight - 30) {
          doc.addPage();
          yOffset = 20;
        }

        // Visit header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const visitType = visit.visitType === 'initial' ? 'Initial' : 
                         visit.visitType === 'followup' ? 'Progress' : 'Final';
        doc.text(`Narrative Encounter - Exam -- ${visitType} ${patient.firstName} ${patient.lastName}`, margin, yOffset);
        yOffset += lineHeight * 2;

        doc.setFontSize(12);
        doc.text(new Date(visit.date).toLocaleDateString(), margin, yOffset);
        yOffset += lineHeight * 2;

        // Subjective section
        doc.setFont('helvetica', 'bold');
        doc.text('Subjective', margin, yOffset);
        yOffset += lineHeight;

        // Chief Complaint
        if (visit.chiefComplaint) {
          doc.setFont('helvetica', 'bold');
          doc.text('Chief Complaint', margin + 5, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          const complaintStatus = visit.areasImproving ? 'Improving' :
                                visit.areasExacerbated ? 'Worse' :
                                visit.areasSame ? 'Same' : undefined;
          const text = complaintStatus ? 
            `• ${visit.chiefComplaint} (${complaintStatus})` :
            `• ${visit.chiefComplaint}`;
          doc.text(text, margin + 10, yOffset);
          yOffset += lineHeight;
        }

        // History of Present Illness (from medical history)
        if (visit.visitType === 'initial' && patient.medicalHistory) {
          doc.setFont('helvetica', 'bold');
          doc.text('History of Present Illness', margin + 5, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          const historyItems = [
            ...(patient.medicalHistory.conditions || []), // Ensure it's an array
            ...(patient.medicalHistory.medications || []),
            ...(patient.medicalHistory.allergies || [])
          ];
          historyItems.forEach(item => {
            if (item) {
              doc.text(`• ${item}`, margin + 10, yOffset);
              yOffset += lineHeight;
            }
          });
          if (historyItems.length > 0) yOffset += lineHeight; // Add space if items were added
        }

        // Past, Family, and Social History
        if (visit.visitType === 'initial' && patient.medicalHistory) {
          doc.setFont('helvetica', 'bold');
          doc.text('Past, Family, and Social History', margin + 5, yOffset);
          yOffset += lineHeight;

          // Social History
          doc.setFont('helvetica', 'bold');
          doc.text('Social History', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          if (patient.address?.street || patient.address?.city || patient.address?.state || patient.address?.country) {
            let addressLine = `• Address: `;
            if (patient.address.street) addressLine += patient.address.street;
            if (patient.address.city || patient.address.state) {
              if (patient.address.street) addressLine += ', ';
              addressLine += `${patient.address.city || ''}${patient.address.city && patient.address.state ? ', ' : ''}${patient.address.state || ''} ${patient.address.zipCode || ''}`.trim();
            }
            if (patient.address.country) {
               if (patient.address.street || patient.address.city || patient.address.state) addressLine += ', ';
               addressLine += patient.address.country;
            }
             if (addressLine !== `• Address: `) {
                doc.text(addressLine, margin + 15, yOffset);
                yOffset += lineHeight;
             }
          }
          if (patient.phone) {
            doc.text(`• Phone: ${patient.phone}`, margin + 15, yOffset);
            yOffset += lineHeight;
          }
          if (patient.address?.street || patient.address?.city || patient.address?.state || patient.address?.country || patient.phone) {
               yOffset += lineHeight; // Add space if social history was added
          }

          // Family History
          doc.setFont('helvetica', 'bold');
          doc.text('Family History', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          if (patient.medicalHistory.familyHistory && patient.medicalHistory.familyHistory.length > 0) {
             patient.medicalHistory.familyHistory.forEach(item => {
              if (item) {
                doc.text(`• ${item}`, margin + 15, yOffset);
                yOffset += lineHeight;
              }
            });
             if (patient.medicalHistory.familyHistory.some(item => item)) yOffset += lineHeight; // Add space if family history was added
          } else {
             doc.text('• No family history provided', margin + 15, yOffset);
             yOffset += lineHeight * 2; // Add space even if no history
          }

          // Past History (Surgeries)
          doc.setFont('helvetica', 'bold');
          doc.text('Past History', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          if (patient.medicalHistory.surgeries && patient.medicalHistory.surgeries.length > 0) {
             patient.medicalHistory.surgeries.forEach(item => {
              if (item) {
                doc.text(`• ${item}`, margin + 15, yOffset);
                yOffset += lineHeight;
              }
            });
             if (patient.medicalHistory.surgeries.some(item => item)) yOffset += lineHeight; // Add space if past history was added
          } else {
             doc.text('• No past surgeries recorded', margin + 15, yOffset);
             yOffset += lineHeight * 2; // Add space even if no surgeries
          }
        }

        // Objective section
        doc.setFont('helvetica', 'bold');
        doc.text('Objective', margin, yOffset);
        yOffset += lineHeight;

        // Neurological
        if (visit.nerveStudy && visit.nerveStudy.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Examination Neurological', margin + 5, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          visit.nerveStudy.forEach(item => {
            doc.text(`• ${item}`, margin + 10, yOffset);
            yOffset += lineHeight;
          });
          yOffset += lineHeight;
        }

        // Musculoskeletal
        doc.setFont('helvetica', 'bold');
        doc.text('Musculoskeletal', margin + 5, yOffset);
        yOffset += lineHeight;

        // Muscle Palpation
        if (visit.musclePalpation) {
          doc.setFont('helvetica', 'bold');
          doc.text('Palpations', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          doc.text(`• ${visit.musclePalpation}`, margin + 15, yOffset);
          yOffset += lineHeight;
        }

        // Range of Motion
        if (visit.romWnlNoPain || visit.romWnlWithPain || visit.romImproved || visit.romDecreased || visit.romSame) {
          doc.setFont('helvetica', 'bold');
          doc.text('Range of Motions', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          if (visit.romWnlNoPain) doc.text('• WNL (No Pain)', margin + 15, yOffset);
          if (visit.romWnlWithPain) doc.text('• WNL (With Pain)', margin + 15, yOffset);
          if (visit.romImproved) doc.text('• Improved', margin + 15, yOffset);
          if (visit.romDecreased) doc.text('• Decreased', margin + 15, yOffset);
          if (visit.romSame) doc.text('• Same', margin + 15, yOffset);
          yOffset += lineHeight;
        }

        // Assessment and Plan
        doc.setFont('helvetica', 'bold');
        doc.text('Assessment and Plan', margin, yOffset);
        yOffset += lineHeight;

        // Treatment Plans/Rationale
        doc.setFont('helvetica', 'bold');
        doc.text('Treatment Plans/Rationale', margin + 5, yOffset);
        yOffset += lineHeight;

        doc.setFont('helvetica', 'normal');
        if (visit.chiropracticAdjustment) {
          visit.chiropracticAdjustment.forEach(item => {
            doc.text(`• ${item}`, margin + 10, yOffset);
            yOffset += lineHeight;
          });
        }
        if (visit.acupuncture) {
          visit.acupuncture.forEach(item => {
            doc.text(`• ${item}`, margin + 10, yOffset);
            yOffset += lineHeight;
          });
        }
        if (visit.physiotherapy) {
          visit.physiotherapy.forEach(item => {
            doc.text(`• ${item}`, margin + 10, yOffset);
            yOffset += lineHeight;
          });
        }
        yOffset += lineHeight;

        // Schedule of Care
        if (visit.scheduleOfCare) {
          doc.setFont('helvetica', 'bold');
          doc.text('Schedule of care:', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          doc.text(`• ${visit.scheduleOfCare}`, margin + 15, yOffset);
          yOffset += lineHeight;
        }

        // Reevaluation
        if (visit.reevaluation) {
          doc.setFont('helvetica', 'bold');
          doc.text('Reevaluation:', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          doc.text(visit.reevaluation, margin + 15, yOffset);
          yOffset += lineHeight * 2;
        }

        // Return Frequency
        if (visit.returnFrequency) {
          doc.setFont('helvetica', 'bold');
          doc.text('Return', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          doc.text(visit.returnFrequency, margin + 15, yOffset);
          yOffset += lineHeight * 2;
        }

        // Referrals
        if (visit.referral || (visit.referrals && Array.isArray(visit.referrals))) {
          doc.setFont('helvetica', 'bold');
          doc.text('Referral.', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          if (visit.referral) {
            doc.text(`• ${visit.referral}`, margin + 15, yOffset);
            yOffset += lineHeight;
          }
          if (visit.referrals && Array.isArray(visit.referrals)) {
            visit.referrals.forEach(ref => {
              doc.text(`• ${ref}`, margin + 15, yOffset);
              yOffset += lineHeight;
            });
          }
          yOffset += lineHeight;
        }

        // Restrictions
        if (visit.restrictions) {
          doc.setFont('helvetica', 'bold');
          doc.text('Restrictions:', margin + 10, yOffset);
          yOffset += lineHeight;

          doc.setFont('helvetica', 'normal');
          if (visit.restrictions.avoidActivityWeeks) {
            doc.text(`• Avoid Activity: ${visit.restrictions.avoidActivityWeeks} week(s)`, margin + 15, yOffset);
            yOffset += lineHeight;
          }
          if (visit.restrictions.liftingLimitLbs) {
            doc.text(`• Lifting Limit: ${visit.restrictions.liftingLimitLbs} lbs`, margin + 15, yOffset);
            yOffset += lineHeight;
          }
          if (visit.restrictions.avoidProlongedSitting) {
            doc.text('• Avoid prolonged sitting/standing', margin + 15, yOffset);
            yOffset += lineHeight;
          }
          yOffset += lineHeight;
        }

        // Final Exam specific sections
        if (visit.visitType === 'discharge') {
          // Prognosis
          if (visit.prognosis) {
            doc.setFont('helvetica', 'bold');
            doc.text('Prognosis:', margin + 10, yOffset);
            yOffset += lineHeight;

            doc.setFont('helvetica', 'normal');
            doc.text(visit.prognosis, margin + 15, yOffset);
            yOffset += lineHeight * 2;
          }

          // Croft Criteria
          if (visit.croftCriteria) {
            doc.setFont('helvetica', 'bold');
            doc.text('Frequency of Treatment Guideline Placement', margin + 5, yOffset);
            yOffset += lineHeight;

            doc.setFont('helvetica', 'normal');
            const croftLines = doc.splitTextToSize(visit.croftCriteria, pageWidth - margin * 2);
            croftLines.forEach((line: string) => {
              doc.text(line, margin + 10, yOffset);
              yOffset += lineHeight;
            });
            yOffset += lineHeight * 2;
          }

          // AMA Guidelines
          if (visit.amaDisability) {
            doc.setFont('helvetica', 'bold');
            doc.text('AMA Guidelines 5th Edition for Impairment', margin + 5, yOffset);
            yOffset += lineHeight;

            doc.setFont('helvetica', 'normal');
            const amaLines = doc.splitTextToSize(visit.amaDisability, pageWidth - margin * 2);
            amaLines.forEach((line: string) => {
              doc.text(line, margin + 10, yOffset);
              yOffset += lineHeight;
            });
            yOffset += lineHeight * 2;
          }

          // Future Medical Care
          if (visit.futureMedicalCare) {
            doc.setFont('helvetica', 'bold');
            doc.text('Miscellaneous Notes', margin + 5, yOffset);
            yOffset += lineHeight;

            doc.setFont('helvetica', 'bold');
            doc.text('Future Medical Care', margin + 10, yOffset);
            yOffset += lineHeight;

            doc.setFont('helvetica', 'normal');
            visit.futureMedicalCare.forEach(item => {
              const lines = doc.splitTextToSize(item, pageWidth - margin * 2);
              lines.forEach((line: string) => {
                doc.text(line, margin + 15, yOffset);
                yOffset += lineHeight;
              });
            });
            yOffset += lineHeight * 2;
          }

          // Add provider signature for final visit
          doc.setFont('helvetica', 'bold');
          doc.text('Harold Iseke, D.C.', margin, yOffset);
          yOffset += lineHeight;
          doc.setFont('helvetica', 'normal');
          doc.text('Treating Provider', margin, yOffset);
          yOffset += lineHeight * 2;
        }

        // Add page break between visits
        yOffset += lineHeight * 2;
      });

      // Save the PDF
      doc.save(`${patient.firstName}_${patient.lastName}_Medical_Report.pdf`);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report. Please try again.');
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

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <button
            onClick={() => navigate('/patients')}
            className="mr-4 p-2 rounded-full hover:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-600">
              {calculateAge(patient.dateOfBirth)} years • {patient.gender} • {patient.status}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/patients/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Link>
          {user?.role === 'doctor' && (
            <>
              <Link
                to={`/appointments/new?patient=${id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Link>
              {visits.length > 0 ? (
                <>
                  <Link
                    to={`/patients/${id}/visits/followup`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    New Follow-up
                  </Link>
                  {patient.status !== 'discharged' && (
                    <Link
                      to={`/patients/${id}/visits/discharge`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Discharge
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  to={`/patients/${id}/visits/initial`}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Initial Visit
                </Link>
              )}
            </>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </button>
          <button
            onClick={generateFullReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('visits')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'visits'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Visits ({visits.length})
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'billing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Billing ({invoiceCount})

            </button>
          </nav>
        </div>
      </div>

      <div ref={printRef}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div 
                className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('personalInfo')}
              >
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                {expandedSections.personalInfo ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
              {expandedSections.personalInfo && (
                <div className="px-6 py-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{patient.firstName} {patient.lastName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(patient.dateOfBirth).toLocaleDateString()} ({calculateAge(patient.dateOfBirth)} years)
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Gender</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">{patient.gender}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            patient.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : patient.status === 'inactive'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {patient.status}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Assigned Doctor</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        Dr. {patient.assignedDoctor?.firstName} {patient.assignedDoctor?.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Patient Since</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(patient.createdAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div 
                className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('contactInfo')}
              >
                <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
                {expandedSections.contactInfo ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
              {expandedSections.contactInfo && (
                <div className="px-6 py-4">
                  <dl className="grid grid-cols-1 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{patient.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{patient.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {patient.address.street && <p>{patient.address.street}</p>}
                        {(patient.address.city || patient.address.state) && (
                          <p>
                            {patient.address.city}, {patient.address.state} {patient.address.zipCode}
                          </p>
                        )}
                        {patient.address.country && <p>{patient.address.country}</p>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {patient.emergencyContact.name ? (
                          <>
                            <p>{patient.emergencyContact.name}</p>
                            <p className="text-gray-600">
                              {patient.emergencyContact.relationship && `${patient.emergencyContact.relationship} • `}
                              {patient.emergencyContact.phone}
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-500">No emergency contact provided</p>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            {/* Medical History */}
            <div className="bg-white shadow rounded-lg overflow-hidden md:col-span-2">
              <div 
                className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('medicalHistory')}
              >
                <h2 className="text-lg font-medium text-gray-900">Medical History</h2>
                {expandedSections.medicalHistory ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
              {expandedSections.medicalHistory && (
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Allergies</h3>
                      {patient.medicalHistory.allergies.length > 0 && patient.medicalHistory.allergies[0] ? (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {patient.medicalHistory.allergies.map((allergy, index) => (
                            allergy && <li key={index}>{allergy}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No known allergies</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Current Medications</h3>
                      {patient.medicalHistory.medications.length > 0 && patient.medicalHistory.medications[0] ? (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {patient.medicalHistory.medications.map((medication, index) => (
                            medication && <li key={index}>{medication}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No current medications</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Medical Conditions</h3>
                      {patient.medicalHistory.conditions.length > 0 && patient.medicalHistory.conditions[0] ? (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {patient.medicalHistory.conditions.map((condition, index) => (
                            condition && <li key={index}>{condition}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No known medical conditions</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Past Surgeries</h3>
                      {patient.medicalHistory.surgeries.length > 0 && patient.medicalHistory.surgeries[0] ? (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {patient.medicalHistory.surgeries.map((surgery, index) => (
                            surgery && <li key={index}>{surgery}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No past surgeries</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Family History</h3>
                      {patient.medicalHistory.familyHistory.length > 0 && patient.medicalHistory.familyHistory[0] ? (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {patient.medicalHistory.familyHistory.map((history, index) => (
                            history && <li key={index}>{history}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No family history provided</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

{/* Subjective Intake */}
<div className="bg-white shadow rounded-lg overflow-hidden md:col-span-2">
  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
    <h2 className="text-lg font-medium text-gray-900">Subjective Intake</h2>
  </div>
  <div className="px-6 py-4">
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
      <div>
        <dt className="text-sm font-medium text-gray-500">Full Name</dt>
        <dd className="mt-1 text-sm text-gray-900">{patient.subjective?.fullName || 'N/A'}</dd>
      </div>
      <div>
        <dt className="text-sm font-medium text-gray-500">Date</dt>
        <dd className="mt-1 text-sm text-gray-900">{patient.subjective?.date || 'N/A'}</dd>
      </div>
      <div>
        <dt className="text-sm font-medium text-gray-500">Severity</dt>
        <dd className="mt-1 text-sm text-gray-900">{patient.subjective?.severity || 'N/A'}</dd>
      </div>
      <div className="md:col-span-2">
        <dt className="text-sm font-medium text-gray-500">Notes</dt>
        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{patient.subjective?.notes || 'N/A'}</dd>
      </div>
      <div className="md:col-span-2">
        <dt className="text-sm font-medium text-gray-500">Body Parts</dt>
        <dd className="mt-1 text-sm text-gray-900">
          {patient.subjective?.bodyPart?.length
            ? patient.subjective.bodyPart.join(', ')
            : 'N/A'}
        </dd>
      </div>
      <div className="md:col-span-2">
        <dt className="text-sm font-medium text-gray-500">Timing</dt>
        <dd className="mt-1 text-sm text-gray-900">{patient.subjective?.timing || 'N/A'}</dd>
      </div>
      <div className="md:col-span-2">
        <dt className="text-sm font-medium text-gray-500">Context</dt>
        <dd className="mt-1 text-sm text-gray-900">{patient.subjective?.context || 'N/A'}</dd>
      </div>
    </dl>
  </div>
</div>

            {/* Insurance Information */}
            <div className="bg-white shadow rounded-lg overflow-hidden md:col-span-2">
              <div 
                className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('insuranceInfo')}
              >
                <h2 className="text-lg font-medium text-gray-900">Insurance Information</h2>
                {expandedSections.insuranceInfo ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
              {expandedSections.insuranceInfo && (
                <div className="px-6 py-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Insurance Provider</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {patient.insuranceInfo.provider || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Policy Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {patient.insuranceInfo.policyNumber || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Group Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {patient.insuranceInfo.groupNumber || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Primary Insured</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {patient.insuranceInfo.primaryInsured || 'Not provided'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Visit History</h2>
              {user?.role === 'doctor' && (
                <div className="flex space-x-2">
                  {visits.length > 0 ? (
                    <>
                      <Link
                        to={`/patients/${id}/visits/followup`}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        New Follow-up
                      </Link>
                      <button
                        onClick={generateFullReport}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <FileArchive className="mr-2 h-4 w-4" />
                        Full Report
                      </button>
                      {patient.status !== 'discharged' && (
                        <Link
                          to={`/patients/${id}/visits/discharge`}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Discharge
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link
                      to={`/patients/${id}/visits/initial`}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Initial Visit
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visits.length > 0 ? (
                    visits.map((visit) => (
                      <tr key={visit._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(visit.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              visit.visitType === 'initial'
                                ? 'bg-blue-100 text-blue-800'
                                : visit.visitType === 'followup'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {visit.visitType === 'initial'
                              ? 'Initial Visit'
                              : visit.visitType === 'followup'
                              ? 'Follow-up'
                              : 'Discharge'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Dr. {visit.doctor.firstName} {visit.doctor.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {(visit.notes ||
                           visit.otherNotes ||
                           visit.referralsNotes ||
                           'No notes provided') as string}
                        </td>


                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
  to={`/visits/${visit._id}`} 
  className="text-blue-600 hover:text-blue-900 underline"
>
  View Details
</Link>

                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No visits recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {selectedVisit && (
  <div className="p-6 mt-6 bg-gray-50 border border-gray-200 rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-2">Assessment and Plan</h2>
    <h3 className="text-base font-bold mb-2 underline">Treatment Plans/Rationale</h3>
    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-800">
    {selectedVisit.plan?.diagnosis && (
  <li>
    <strong>Diagnosis:</strong> {selectedVisit.plan.diagnosis.join(', ')}
  </li>
)}


{selectedVisit.plan?.medications && (
  <li>
    <strong>Medications:</strong>
    <ul className="list-disc pl-5">
      {selectedVisit.plan.medications.map((med, index) => (
        <li key={index}>
          {med.name} - {med.dosage}, {med.frequency}
        </li>
      ))}
    </ul>
  </li>
)}
<li>{selectedVisit.scheduleOfCare || 'Schedule of care not provided.'}</li>
<li>{selectedVisit.physicalModality || 'Physical modality not specified.'}</li>
<li>{selectedVisit.reevaluation || 'Re-evaluation plan not specified.'}</li>
<li>{selectedVisit.returnFrequency || 'Visit frequency not mentioned.'}</li>
<li>{selectedVisit.referral || 'Referral notes not added.'}</li>
{selectedVisit.restrictions ? (
  <li>
    <strong>Restrictions:</strong>
    <ul>
      {selectedVisit.restrictions.avoidActivityWeeks && <li>Avoid Activity: {selectedVisit.restrictions.avoidActivityWeeks} week(s)</li>}
      {selectedVisit.restrictions.liftingLimitLbs && <li>Lifting Limit: {selectedVisit.restrictions.liftingLimitLbs} lbs</li>}
      {selectedVisit.restrictions.avoidProlongedSitting && <li>Avoid prolonged sitting/standing</li>}
    </ul>
  </li>
) : (
  <li>No activity restrictions recorded.</li>
)}



{selectedVisit.plan?.medications && (
  <li>
    <strong>Medications:</strong>{' '}
    <ul className="list-disc pl-5">
      {selectedVisit.plan.medications.map((med, index) => (
        <li key={index}>
          {med.name} - {med.dosage}, {med.frequency}
        </li>
      ))}
    </ul>
  </li>
)}

      <li>{selectedVisit.scheduleOfCare || 'Schedule of care not provided.'}</li>
      <li>{selectedVisit.physicalModality || 'Physical modality not specified.'}</li>
      <li>{selectedVisit.reevaluation || 'Re-evaluation plan not specified.'}</li>
      <li>{selectedVisit.returnFrequency || 'Visit frequency not mentioned.'}</li>
      <li>{selectedVisit.referral || 'Referral notes not added.'}</li>
      {selectedVisit.restrictions ? (
        <li>
          <strong>Restrictions:</strong>
          <ul>
            {selectedVisit.restrictions.avoidActivityWeeks && <li>Avoid Activity: {selectedVisit.restrictions.avoidActivityWeeks} week(s)</li>}
            {selectedVisit.restrictions.liftingLimitLbs && <li>Lifting Limit: {selectedVisit.restrictions.liftingLimitLbs} lbs</li>}
            {selectedVisit.restrictions.avoidProlongedSitting && <li>Avoid prolonged sitting/standing</li>}
          </ul>
        </li>
      ) : (
        <li>No activity restrictions recorded.</li>
      )}
    </ul>
    <div className="mt-4">
      <button
        onClick={() => setSelectedVisit(null)}
        className="text-sm text-blue-500 underline"
      >
        Close Details
      </button>
    </div>
  </div>
)}

            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Appointments</h2>
              <Link
                to={`/appointments/new?patient=${id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Appointment
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.length > 0 ? (
                    appointments.map((appointment) => (
                      <tr key={appointment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{new Date(appointment.date).toLocaleDateString()}</div>
                          <div className="text-gray-500">
                            {appointment.time.start} - {appointment.time.end}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {appointment.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              appointment.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : appointment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : appointment.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {appointment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {appointment.notes || 'No notes provided'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link to={`/appointments/${appointment._id}/edit`} className="text-blue-600 hover:text-blue-900">
                            View/Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No appointments scheduled
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Billing & Invoices</h2>
              <Link
                to={`/billing/new?patient=${id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Create Invoice
              </Link>
            </div>
            <div className="p-4">
            <BillingList 
  patientId={id} 
  showPatientColumn={false} 
  showHeader={true} 
  onInvoiceCountChange={setInvoiceCount} 
/>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetails;