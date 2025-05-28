import express from 'express';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();


// Cancel appointment
router.patch('/:id/cancel', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // If user is a doctor, check if appointment is for them
    if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update status to cancelled
    appointment.status = 'cancelled';
    appointment.notes = req.body.notes || appointment.notes;
    await appointment.save();
    
    res.json({
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark appointment as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // If user is a doctor, check if appointment is for them
    if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update status to completed
    appointment.status = 'completed';
    appointment.notes = req.body.notes || appointment.notes;
    await appointment.save();
    
    res.json({
      message: 'Appointment marked as completed',
      appointment
    });
  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all appointments (with filtering)
router.get('/', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      doctor, 
      patient: patientId 
    } = req.query;
    
    // Build filter
    const filter = {};
    
    // Date range filter
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.date = { $lte: new Date(endDate) };
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Doctor filter
    if (doctor) {
      filter.doctor = doctor;
    } else if (req.user.role === 'doctor') {
      // If user is a doctor, only show their appointments
      filter.doctor = req.user.id;
    }
    
    // Patient filter
    if (patientId) {
      filter.patient = patientId;
    }
    
    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName')
      .sort({ date: 1, 'time.start': 1 });
    
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth gender phone email')
      .populate('doctor', 'firstName lastName');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // If user is a doctor, check if appointment is for them
    if (req.user.role === 'doctor' && appointment.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new appointment
router.post('/', async (req, res) => {
  try {
    const appointmentData = req.body;
    
    // Check if patient exists
    const patient = await Patient.findById(appointmentData.patient);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // If user is a doctor, check if patient is assigned to them
    if (req.user.role === 'doctor') {
      if (patient.assignedDoctor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied: Patient not assigned to you' });
      }
      
      // Set doctor to current user
      appointmentData.doctor = req.user.id;
    }
    
    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      doctor: appointmentData.doctor,
      date: appointmentData.date,
      $or: [
        {
          'time.start': { $lte: appointmentData.time.start },
          'time.end': { $gt: appointmentData.time.start }
        },
        {
          'time.start': { $lt: appointmentData.time.end },
          'time.end': { $gte: appointmentData.time.end }
        },
        {
          'time.start': { $gte: appointmentData.time.start },
          'time.end': { $lte: appointmentData.time.end }
        }
      ],
      status: { $nin: ['cancelled', 'no-show'] }
    });
    
    if (conflictingAppointment) {
      return res.status(400).json({ message: 'Conflicting appointment exists' });
    }
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update appointment
router.put('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // If user is a doctor, check if appointment is for them
    if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check for conflicting appointments if date/time is changed
    if (
      req.body.date !== appointment.date.toISOString().split('T')[0] ||
      req.body.time.start !== appointment.time.start ||
      req.body.time.end !== appointment.time.end
    ) {
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: req.params.id }, // Exclude current appointment
        doctor: appointment.doctor,
        date: req.body.date,
        $or: [
          {
            'time.start': { $lte: req.body.time.start },
            'time.end': { $gt: req.body.time.start }
          },
          {
            'time.start': { $lt: req.body.time.end },
            'time.end': { $gte: req.body.time.end }
          },
          {
            'time.start': { $gte: req.body.time.start },
            'time.end': { $lte: req.body.time.end }
          }
        ],
        status: { $nin: ['cancelled', 'no-show'] }
      });
      
      if (conflictingAppointment) {
        return res.status(400).json({ message: 'Conflicting appointment exists' });
      }
    }
    
    // Update appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // If doctor, make sure it's theirs
    if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;