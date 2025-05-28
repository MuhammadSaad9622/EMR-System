import express from 'express';
import Billing from '../models/Billing.js';
import Patient from '../models/Patient.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // make sure this is at the top
const router = express.Router();

// Get all invoices (with filtering)
router.get('/', authenticateToken, async (req, res) => {

  try {
    const { 
      status, 
      patient: patientId,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;
    
    // Build filter
    const filter = {};
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Patient filter
    if (patientId) {
      filter.patient = patientId;
    }
    
    // Date range filter
    if (startDate && endDate) {
      filter.dateIssued = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.dateIssued = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.dateIssued = { $lte: new Date(endDate) };
    }
    
    // If user is a doctor, only show invoices for their patients
    if (req.user.role === 'doctor') {
      const patients = await Patient.find({ assignedDoctor: req.user.id }).select('_id');
      const patientIds = patients.map(p => p._id);
      filter.patient = { $in: patientIds };
    }
    
    const invoices = await Billing.find(filter)
      .populate('patient', 'firstName lastName')
      .populate('visit', 'date visitType')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ dateIssued: -1 });
    
    const count = await Billing.countDocuments(filter);
    
    res.json({
      invoices,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalInvoices: count
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Get total invoice count for a patient
router.get('/count/:patientId', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // ✅ Access control: only admin or assigned doctor
    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const count = await Billing.countDocuments({ patient: req.params.patientId });
    res.json({ totalInvoices: count });
  } catch (error) {
    console.error('Error fetching invoice count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get invoice by ID
router.get('/:id', authenticateToken, async (req, res) => {

  try {
    const invoice = await Billing.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth gender phone email address')
      .populate('visit', 'date visitType');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // If user is a doctor, check if invoice is for their patient
    if (req.user.role === 'doctor') {
      const patient = await Patient.findById(invoice.patient._id);
      if (patient.assignedDoctor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    
    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new invoice


/**
 * @route   POST /api/billing
 * @desc    Create a new invoice
 * @access  Private
 * @param   {string} invoiceNumber - Unique invoice number
 * @param   {string} patient - Patient ID
 * @param   {Array} items - Invoice items
 * @returns {Object} Created invoice or error message
 */
router.post('/', authenticateToken, async (req, res) => {
  const startTime = new Date();
  const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  console.log(`[${startTime.toISOString()}] [${requestId}] Invoice creation started`, {
    user: req.user.id,
    invoiceNumber: req.body.invoiceNumber,
    patient: req.body.patient
  });
  
  try {
    const invoiceData = req.body;
    
    // Check if patient exists
    const patient = await Patient.findById(invoiceData.patient);
    if (!patient) {
      console.warn(`[${new Date().toISOString()}] [${requestId}] Patient not found`, {
        patientId: invoiceData.patient,
        user: req.user.id
      });
      return res.status(404).json({ 
        success: false,
        message: 'Patient not found',
        error: 'PATIENT_NOT_FOUND'
      });
    }
    
    // If user is a doctor, check if patient is assigned to them
    if (req.user.role === 'doctor' && patient.assignedDoctor.toString() !== req.user.id) {
      console.warn(`[${new Date().toISOString()}] [${requestId}] Unauthorized access attempt`, {
        user: req.user.id,
        patientId: patient._id,
        assignedDoctor: patient.assignedDoctor
      });
      return res.status(403).json({ 
        success: false,
        message: 'Access denied: Patient not assigned to you',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }
    
    // Check for duplicate invoice number
    const existingInvoice = await Billing.findOne({ invoiceNumber: invoiceData.invoiceNumber });
    if (existingInvoice) {
      console.warn(`[${new Date().toISOString()}] [${requestId}] Duplicate invoice number`, {
        invoiceNumber: invoiceData.invoiceNumber,
        existingInvoiceId: existingInvoice._id,
        user: req.user.id
      });
      return res.status(409).json({ 
        success: false,
        message: `Invoice number '${invoiceData.invoiceNumber}' is already in use`,
        error: 'DUPLICATE_INVOICE_NUMBER',
        existingInvoiceId: existingInvoice._id,
        field: 'invoiceNumber'
      });
    }
    
    // Calculate totals
    let subtotal = 0;
    invoiceData.items.forEach(item => {
      item.total = item.quantity * item.unitPrice;
      subtotal += item.total;
    });
    
    invoiceData.subtotal = subtotal;
    invoiceData.total = subtotal + (invoiceData.tax || 0) - (invoiceData.discount || 0);
    
    const invoice = new Billing(invoiceData);
    await invoice.save();
    
    const endTime = new Date();
    const processingTime = endTime - startTime;
    
    console.log(`[${endTime.toISOString()}] [${requestId}] Invoice created successfully`, {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      patient: invoice.patient,
      total: invoice.total,
      processingTime: `${processingTime}ms`,
      user: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice,
      requestId,
      processingTime: `${processingTime}ms`
    });
  } catch (error) {
    const errorTime = new Date();
    const processingTime = errorTime - startTime;
    
    // Log the full error for debugging
    console.error(`[${errorTime.toISOString()}] [${requestId}] Create invoice error`, {
      error: error.message,
      stack: error.stack,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      processingTime: `${processingTime}ms`,
      user: req.user?.id,
      invoiceNumber: req.body.invoiceNumber
    });
    
    // Handle duplicate key error (E11000)
    if (error.code === 11000) {
      const keyValue = error.keyValue?.invoiceNumber || 'unknown';
      console.warn(`[${errorTime.toISOString()}] [${requestId}] Duplicate invoice number detected`, {
        invoiceNumber: keyValue,
        errorCode: error.code,
        processingTime: `${processingTime}ms`
      });
      
      // Try to find the conflicting invoice
      try {
        const existingInvoice = await Billing.findOne({ invoiceNumber: keyValue });
        return res.status(409).json({
          success: false,
          message: `An invoice with number '${keyValue}' already exists`,
          error: 'DUPLICATE_INVOICE_NUMBER',
          field: 'invoiceNumber',
          existingInvoiceId: existingInvoice?._id,
          requestId,
          processingTime: `${processingTime}ms`
        });
      } catch (lookupError) {
        // If we can't find the existing invoice, return a generic error
        console.error(`[${new Date().toISOString()}] [${requestId}] Error looking up duplicate invoice`, {
          error: lookupError.message,
          invoiceNumber: keyValue
        });
      }
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        errors,
        requestId,
        processingTime: `${processingTime}ms`
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      success: false,
      message: 'An unexpected error occurred while creating the invoice',
      error: process.env.NODE_ENV === 'production' ? 'INTERNAL_SERVER_ERROR' : error.message,
      requestId,
      processingTime: `${processingTime}ms`
    });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // If user is a doctor, check if invoice is for their patient
    if (req.user.role === 'doctor') {
      const patient = await Patient.findById(invoice.patient);
      if (patient.assignedDoctor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Don't allow updating paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot update a paid invoice' });
    }
    
    // Calculate totals
    let subtotal = 0;
    req.body.items.forEach(item => {
      item.total = item.quantity * item.unitPrice;
      subtotal += item.total;
    });
    
    req.body.subtotal = subtotal;
    req.body.total = subtotal + (req.body.tax || 0) - (req.body.discount || 0);
    
    // Update invoice
    const updatedInvoice = await Billing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record payment
router.post('/:id/payments', async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // If user is a doctor, check if invoice is for their patient
    if (req.user.role === 'doctor') {
      const patient = await Patient.findById(invoice.patient);
      if (patient.assignedDoctor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
  
    const { amount, method, reference, notes } = req.body;
    
    // Add payment to history
    invoice.paymentHistory.push({
      amount,
      method,
      reference,
      notes,
      date: new Date()
    });
    
    // Calculate total paid
    const totalPaid = invoice.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Update status based on payment
    if (totalPaid >= invoice.total) {
      invoice.status = 'paid';
    } else if (totalPaid > 0) {
      invoice.status = 'partial';
    }
    
    await invoice.save();
    
    res.json({
      message: 'Payment recorded successfully',
      invoice
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get billing summary (for dashboard)
router.get('/summary/dashboard', async (req, res) => {
  try {
    // Build filter for doctor's patients
    const filter = {};
    if (req.user.role === 'doctor') {
      const patients = await Patient.find({ assignedDoctor: req.user.id }).select('_id');
      const patientIds = patients.map(p => p._id);
      filter.patient = { $in: patientIds };
    }
    
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get total billed this month
    const billedThisMonth = await Billing.aggregate([
      { $match: { ...filter, dateIssued: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // Get total collected this month
    const collectedThisMonth = await Billing.aggregate([
      { $match: { ...filter, status: 'paid', dateIssued: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // Get outstanding balance
    const outstanding = await Billing.aggregate([
      { $match: { ...filter, status: { $in: ['draft', 'sent', 'overdue', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // Get count by status
    const statusCounts = await Billing.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    res.json({
      billedThisMonth: billedThisMonth[0]?.total || 0,
      collectedThisMonth: collectedThisMonth[0]?.total || 0,
      outstanding: outstanding[0]?.total || 0,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get billing summary error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;