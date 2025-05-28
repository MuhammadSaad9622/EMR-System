import mongoose from 'mongoose';

// Base schema for all visits
const baseVisitSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    notes: String
  },
  {
    discriminatorKey: 'visitType', // ✅ Mongoose will add this automatically
    collection: 'visits',
    timestamps: true // ✅ for createdAt and updatedAt
  }
);

const Visit = mongoose.model('Visit', baseVisitSchema);

const initialVisitSchema = new mongoose.Schema({
  chiefComplaint: { type: String, required: true },
  chiropracticAdjustment: [String],
  chiropracticOther: [String],
  acupuncture: [String],
  acupunctureOther: [String], 
  physiotherapy: [String],
  rehabilitationExercises: [String],
  
  durationFrequency: {
    timesPerWeek: { type: Number },
    reEvalInWeeks: { type: Number }
  },

  referrals: [String],

  imaging: {
    xray: [String],
    mri: [String],
    ct: [String]
  },

  diagnosticUltrasound: String,
  nerveStudy: [String],

  restrictions: {
    avoidActivityWeeks: { type: Number },
    liftingLimitLbs: { type: Number },
    avoidProlongedSitting: { type: Boolean }
  },

  disabilityDuration: String,

  // ✅ Only keep this one
  otherNotes: { type: String },

  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }

}, { timestamps: true });



// Follow-up Visit Schema
const followupVisitSchema = new mongoose.Schema({
  previousVisit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  // Fields based on EXAM FORM---REEVALUATION template
  areas: { type: String },
  areasImproving: { type: Boolean },
  areasExacerbated: { type: Boolean },
  areasSame: { type: Boolean },
  musclePalpation: { type: String },
  painRadiating: { type: String },
  romWnlNoPain: { type: Boolean },
  romWnlWithPain: { type: Boolean },
  romImproved: { type: Boolean },
  romDecreased: { type: Boolean },
  romSame: { type: Boolean },
  orthos: {
    tests: { type: String },
    result: { type: String }
  },
  activitiesCausePain: { type: String },
  activitiesCausePainOther: { type: String },
  treatmentPlan: {
    treatments: { type: String },
    timesPerWeek: { type: String }
  },
  overallResponse: {
    improving: { type: Boolean },
    worse: { type: Boolean },
    same: { type: Boolean }
  },
  referrals: { type: String },
  diagnosticStudy: {
    study: { type: String },
    bodyPart: { type: String },
    result: { type: String }
  },
  homeCare: { type: String },
  // Notes field is in the base schema
});


// Discharge Visit Schema
const dischargeVisitSchema = new mongoose.Schema({
  areasImproving: Boolean,
  areasExacerbated: Boolean,
  areasSame: Boolean,

  musclePalpation: String,
  painRadiating: String,
  romPercent: Number,
  orthos: {
    tests: String,
    result: String
  },
  activitiesCausePain: String,
  otherNotes: String,

  prognosis: String, // selected prognosis
  diagnosticStudy: {
    study: String,
    bodyPart: String,
    result: String
  },
  futureMedicalCare: [String],
  croftCriteria: String,
  amaDisability: String,
  homeCare: [String],
  referralsNotes: String
});


// Discriminators (no `visitType` manually added here)
const InitialVisit = Visit.discriminator('initial', initialVisitSchema);
const FollowupVisit = Visit.discriminator('followup', followupVisitSchema);
const DischargeVisit = Visit.discriminator('discharge', dischargeVisitSchema);



export { Visit, InitialVisit, FollowupVisit, DischargeVisit };
