import express from 'express';
// Add this import at the top
import Patient from '../models/Patient.js';
import { Visit, InitialVisit, FollowupVisit, DischargeVisit } from '../models/Visit.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation middleware for initial visit
const validateInitialVisit = (req, res, next) => {
  const { visitType, chiefComplaint, patient, doctor } = req.body;

  if (visitType !== 'initial') return next();

  if (!chiefComplaint || !patient || !doctor) {
    return res.status(400).json({ 
      message: 'Missing required fields', 
      required: ['chiefComplaint', 'patient', 'doctor'] 
    });
  }

  next();
};


// Create a visit based on visitType
router.post('/', authenticateToken, validateInitialVisit, async (req, res) => {
  try {
    const { visitType, ...visitData } = req.body;

    // Add doctor from auth token if not provided
    if (!visitData.doctor) {
      visitData.doctor = req.user.id;
    }

    let newVisit;

    if (visitType === 'initial') {
      newVisit = new InitialVisit(visitData);
    } else if (visitType === 'followup') {
      newVisit = new FollowupVisit(visitData);
    } else if (visitType === 'discharge') {
      newVisit = new DischargeVisit(visitData);

      // ✅ Also update patient status to discharged
      await Patient.findByIdAndUpdate(visitData.patient, {
        status: 'discharged'
      });
    } else {
      return res.status(400).json({ message: 'Invalid visit type' });
    }

    const savedVisit = await newVisit.save();

    // Populate patient and doctor
    await savedVisit.populate('patient', 'firstName lastName dateOfBirth');
    await savedVisit.populate('doctor', 'firstName lastName');

    res.status(201).json({
      message: 'Visit created successfully',
      visit: savedVisit
    });

  } catch (error) {
    console.error('Visit creation error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        message: 'Validation error',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate visit',
        error: 'A visit with these details already exists'
      });
    }

    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


// Get all visits for a patient
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const visits = await Visit.find({ patient: req.params.patientId })
      .populate('doctor')
      .populate('patient');

    res.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
