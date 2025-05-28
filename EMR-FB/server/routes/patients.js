import express from 'express';
import Patient from '../models/Patient.js';
import { Visit, InitialVisit, FollowupVisit, DischargeVisit } from '../models/Visit.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all patients (with pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const searchQuery = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    if (req.user.role === 'doctor') {
      searchQuery.assignedDoctor = req.user.id;
    }

    const patients = await Patient.find(searchQuery)
      .populate('assignedDoctor', 'firstName lastName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 });

    const count = await Patient.countDocuments(searchQuery);

    res.json({
      patients,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalPatients: count
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get patient by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'firstName lastName');

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (req.user.role === 'doctor' && patient.assignedDoctor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new patient
router.post('/', authenticateToken, async (req, res) => {
  try {
    const patientData = req.body;

    if (req.user.role === 'doctor') {
      patientData.assignedDoctor = req.user.id;
    }

    const patient = new Patient({
      ...patientData,
      subjective: patientData.subjective || {}
    });
    await patient.save();

    res.status(201).json({
      message: 'Patient created successfully',
      patient
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update patient
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        subjective: req.body.subjective || {}
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Patient updated successfully',
      patient: updatedPatient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get patient visits
router.get('/:id/visits', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visits = await Visit.find({ patient: req.params.id })
      .sort({ date: -1 })
      .populate('doctor', 'firstName lastName');

    res.json(visits);
  } catch (error) {
    console.error('Get patient visits error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create initial visit
router.post('/:id/visits/initial', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visit = new InitialVisit({
      ...req.body,
      patient: req.params.id,
      doctor: req.user.id
    });
    await visit.save();

    res.status(201).json({ message: 'Initial visit created successfully', visit });
  } catch (error) {
    console.error('Create initial visit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create follow-up visit
router.post('/:id/visits/followup', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const previousVisit = await Visit.findById(req.body.previousVisit);
    if (!previousVisit) return res.status(404).json({ message: 'Previous visit not found' });

    const visit = new FollowupVisit({
      ...req.body,
      patient: req.params.id,
      doctor: req.user.id
    });
    await visit.save();

    res.status(201).json({ message: 'Follow-up visit created successfully', visit });
  } catch (error) {
    console.error('Create follow-up visit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create discharge visit
router.post('/:id/visits/discharge', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visit = new DischargeVisit({
      ...req.body,
      patient: req.params.id,
      doctor: req.user.id
    });
    await visit.save();

    patient.status = 'discharged';
    await patient.save();

    res.status(201).json({ message: 'Discharge visit created successfully', visit });
  } catch (error) {
    console.error('Create discharge visit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific visit
router.get('/visits/:visitId', authenticateToken, async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.visitId)
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName');

    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (req.user.role === 'doctor' && visit.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(visit);
  } catch (error) {
    console.error('Get visit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete patient
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Patient.findByIdAndDelete(req.params.id);
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
