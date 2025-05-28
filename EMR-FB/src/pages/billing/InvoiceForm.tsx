import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';


interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Visit {
  _id: string;
  date: string;
  visitType: string;
}

const InvoiceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: _user } = useAuth(); // Prefix with underscore to indicate it's intentionally unused
  const isEditMode = !!id;
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
 const [formData, setFormData] = useState({
  invoiceNumber: '', // ✅ required field
  patient: '',
  visit: '',
  dateIssued: new Date(),
  dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
  items: [{ description: '', code: '', quantity: 1, unitPrice: 0, total: 0 }],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  status: 'draft',
  notes: ''
});

  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch patients
        const patientsResponse = await axios.get('http://localhost:5000/api/patients');
        setPatients(patientsResponse.data.patients);
        
        // If in edit mode, fetch invoice data
        if (isEditMode) {
          const invoiceResponse = await axios.get(`http://localhost:5000/api/billing/${id}`);
          const invoiceData = invoiceResponse.data;
          
          setFormData({
  invoiceNumber: invoiceData.invoiceNumber || '',
  patient: invoiceData.patient?._id || '',
  visit: invoiceData.visit?._id || '',
  dateIssued: new Date(invoiceData.dateIssued),
  dueDate: new Date(invoiceData.dueDate),
  items: invoiceData.items || [],
  subtotal: invoiceData.subtotal || 0,
  tax: invoiceData.tax || 0,
  discount: invoiceData.discount || 0,
  total: invoiceData.total || 0,
  status: invoiceData.status || 'draft',
  notes: invoiceData.notes || ''
});

          
          // Fetch visits for this patient
          if (invoiceData.patient._id) {
            const visitsResponse = await axios.get(`http://localhost:5000/api/patients/${invoiceData.patient._id}/visits`);
            setVisits(visitsResponse.data);
          }
        } else {
          // Check if patient ID is provided in URL query params
          const searchParams = new URLSearchParams(location.search);
          const patientId = searchParams.get('patient');
          if (patientId) {
            setFormData(prev => ({ ...prev, patient: patientId }));
            
            // Fetch visits for this patient
            const visitsResponse = await axios.get(`http://localhost:5000/api/patients/${patientId}/visits`);
            setVisits(visitsResponse.data);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEditMode, location.search]);

  useEffect(() => {
    // Recalculate totals whenever items, tax, or discount changes
    calculateTotals();
  }, [formData.items, formData.tax, formData.discount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // If patient changes, fetch their visits
    if (name === 'patient' && value) {
      fetchPatientVisits(value);
    }
  };

  const fetchPatientVisits = async (patientId: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/patients/${patientId}/visits`);
      setVisits(response.data);
    } catch (error) {
      console.error('Error fetching patient visits:', error);
    }
  };

  const handleDateChange = (date: Date | null, field: string) => {
    if (date) {
      setFormData(prev => ({ ...prev, [field]: date }));
    }
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Calculate item total
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : updatedItems[index].unitPrice;
      updatedItems[index].total = quantity * unitPrice;
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', code: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + Number(formData.tax) - Number(formData.discount);
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.patient) newErrors.patient = 'Patient is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    if (!formData.invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';

    
    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.description) newErrors[`items[${index}].description`] = 'Description is required';
      if (item.quantity <= 0) newErrors[`items[${index}].quantity`] = 'Quantity must be greater than 0';
      if (item.unitPrice < 0) newErrors[`items[${index}].unitPrice`] = 'Unit price cannot be negative';
    });
    
    // Validate dates
    if (formData.dueDate < formData.dateIssued) {
      newErrors.dueDate = 'Due date must be after issue date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const invoiceData = {
  ...formData,
  dateIssued: formData.dateIssued.toISOString(),
  dueDate: formData.dueDate.toISOString(),
  visit: formData.visit || undefined, // 👈 ensures empty string is not sent
  patient: formData.patient || undefined
};

      
      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/billing/${id}`, invoiceData);
      } else {
        await axios.post('http://localhost:5000/api/billing', invoiceData);
      }
      
      navigate(`/patients/${formData.patient}`);

    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/billing')}
          className="mr-4 p-2 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit Invoice' : 'Create Invoice'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Patient Selection */}
          <div>
            <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-1">
              Patient*
            </label>
            <select
              id="patient"
              name="patient"
              value={formData.patient}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                errors.patient ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              disabled={isEditMode}
            >
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
            {errors.patient && <p className="mt-1 text-sm text-red-600">{errors.patient}</p>}
          </div>

          {/* Visit Selection */}
          <div>
            <label htmlFor="visit" className="block text-sm font-medium text-gray-700 mb-1">
              Related Visit
            </label>
            <select
              id="visit"
              name="visit"
              value={formData.visit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.patient || isEditMode}
            >
              <option value="">Select a visit (optional)</option>
              {visits.map((visit) => (
                <option key={visit._id} value={visit._id}>
                  {new Date(visit.date).toLocaleDateString()} - {visit.visitType === 'initial' ? 'Initial Visit' : visit.visitType === 'followup' ? 'Follow-up' : 'Discharge'}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Dates */}
          <div>
            <label htmlFor="dateIssued" className="block text-sm font-medium text-gray-700 mb-1">
              Issue Date*
            </label>
            <DatePicker
              selected={formData.dateIssued}
              onChange={(date) => handleDateChange(date, 'dateIssued')}
              dateFormat="MMMM d, yyyy"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date*
            </label>
            <DatePicker
              selected={formData.dueDate}
              onChange={(date) => handleDateChange(date, 'dueDate')}
              dateFormat="MMMM d, yyyy"
              className={`w-full px-3 py-2 border ${
                errors.dueDate ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>}
          </div>
<div>
  <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
    Invoice Number*
  </label>
  <input
    type="text"
    id="invoiceNumber"
    name="invoiceNumber"
    value={formData.invoiceNumber}
    onChange={handleChange}
    className={`w-full px-3 py-2 border ${errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
  />
  {errors.invoiceNumber && (
    <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber}</p>
  )}
</div>

          {/* Status (for edit mode) */}
          {isEditMode && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          )}
        </div>

        {/* Invoice Items */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Invoice Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </button>
          </div>
          
          {errors.items && <p className="mt-1 text-sm text-red-600 mb-2">{errors.items}</p>}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description*
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity*
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price*
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className={`w-full px-3 py-2 border ${
                          errors[`items[${index}].description`] ? 'border-red-500' : 'border-gray-300'
                        } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Item description"
                        required
                      />
                      {errors[`items[${index}].description`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items[${index}].description`]}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.code}
                        onChange={(e) => handleItemChange(index, 'code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Service code"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 border ${
                          errors[`items[${index}].quantity`] ? 'border-red-500' : 'border-gray-300'
                        } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        required
                      />
                      {errors[`items[${index}].quantity`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items[${index}].quantity`]}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                          className={`w-full pl-7 px-3 py-2 border ${
                            errors[`items[${index}].unitPrice`] ? 'border-red-500' : 'border-gray-300'
                          } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          required
                        />
                      </div>
                      {errors[`items[${index}].unitPrice`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items[${index}].unitPrice`]}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Totals */}
        <div className="mb-6 flex justify-end">
          <div className="w-full md:w-1/2 lg:w-1/3 space-y-4">
            <div className="flex justify-between items-center">
              <label htmlFor="subtotal" className="block text-sm font-medium text-gray-700">
                Subtotal:
              </label>
              <span className="text-gray-900">${formData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <label htmlFor="tax" className="block text-sm font-medium text-gray-700">
                Tax:
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  id="tax"
                  name="tax"
                  value={formData.tax}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <label htmlFor="discount" className="block text-sm font-medium text-gray-700">
                Discount:
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  id="discount"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <label htmlFor="total" className="block text-lg font-medium text-gray-900">
                Total:
              </label>
              <span className="text-lg font-bold text-gray-900">${formData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any notes or special instructions"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/billing')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Invoice
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;