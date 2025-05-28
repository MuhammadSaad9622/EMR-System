import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  dateOfBirth: String,
  gender: String,
  email: String,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    primaryInsured: String
  },
  medicalHistory: {
    allergies: [String],
    medications: [String],
    conditions: [String],
    surgeries: [String],
    familyHistory: [String]
  },
  subjective: {
    fullName: String,
    date: String,
    physical: [String],
    sleep: [String],
    cognitive: [String],
    digestive: [String],
    emotional: [String],
    bodyPart: [String],
    severity: String,
    quality: [String],
    timing: String,
    context: String,
    exacerbatedBy: [String],
    symptoms: [String],
    notes: String,
    radiatingTo: String,
    radiatingRight: Boolean,
    radiatingLeft: Boolean,
    sciaticaRight: Boolean,
    sciaticaLeft: Boolean
  },
  assignedDoctor: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true  // ✅ add this if doctors must be assigned
}
,
status: {
  type: String,
  enum: ['active', 'discharged'],
  default: 'active'
}

}, {
  timestamps: true
});

const Patient = mongoose.model('Patient', PatientSchema);
export default Patient;
