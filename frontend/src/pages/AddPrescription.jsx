import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { prescriptionService } from '../services/prescriptionService';

const AddPrescription = () => {
  const [patientDetails, setPatientDetails] = useState({
    name: '',
    age: '',
    gender: '',
    contact: '',
    idNumber: ''
  });
  const [medicines, setMedicines] = useState([{
    medicine: '',
    dosage: '',
    quantity: '',
    instructions: ''
  }]);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePatientChange = (e) => {
    setPatientDetails({
      ...patientDetails,
      [e.target.name]: e.target.value
    });
  };

  const handleMedicineChange = (index, e) => {
    const newMedicines = [...medicines];
    newMedicines[index][e.target.name] = e.target.value;
    setMedicines(newMedicines);
  };

  const addMedicineField = () => {
    setMedicines([...medicines, {
      medicine: '',
      dosage: '',
      quantity: '',
      instructions: ''
    }]);
  };

  const removeMedicineField = (index) => {
    const newMedicines = medicines.filter((_, i) => i !== index);
    setMedicines(newMedicines);
  };

  const handleFileChange = (e) => {
    setPrescriptionFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();

      // Add patient details
      Object.keys(patientDetails).forEach(key => {
        formData.append(key, patientDetails[key]);
      });

      // Add medicines
      medicines.forEach((medicine, index) => {
        Object.keys(medicine).forEach(key => {
          formData.append(`medicines[${index}][${key}]`, medicine[key]);
        });
      });

      // Add file if exists
      if (prescriptionFile) {
        formData.append('file', prescriptionFile);
      }

      // Add pharmacist info
      formData.append('added_by', user.id);
      formData.append('status', 'pending');

      await prescriptionService.addPrescription(formData);
      navigate('/pharmacist/dashboard');
    } catch (error) {
      console.error('Error adding prescription:', error);
      alert('Failed to add prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-glow">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Prescription <span className="text-indigo-600">Entry</span></h1>
            </div>
            <p className="text-lg text-slate-500 font-medium">Digitalize and authorize patient medications for the pharmaceutical ledger.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Patient Details Section */}
          <div className="glass-card rounded-[2.5rem] p-10 border border-white/60 shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h2 className="text-xl font-display font-bold text-slate-900">Patient Identity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Legal Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={patientDetails.name}
                  onChange={handlePatientChange}
                  required
                  placeholder="Identity as per official records..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Age (Years) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  name="age"
                  value={patientDetails.age}
                  onChange={handlePatientChange}
                  required
                  placeholder="Digital age..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Gender Profile <span className="text-rose-500">*</span></label>
                <select
                  name="gender"
                  value={patientDetails.gender}
                  onChange={handlePatientChange}
                  required
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm appearance-none"
                >
                  <option value="">Profile...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Network Contact <span className="text-rose-500">*</span></label>
                <input
                  type="tel"
                  name="contact"
                  value={patientDetails.contact}
                  onChange={handlePatientChange}
                  required
                  placeholder="+254..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Government ID</label>
                <input
                  type="text"
                  name="idNumber"
                  value={patientDetails.idNumber}
                  onChange={handlePatientChange}
                  placeholder="National ID / Passport..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Prescribed Medicines Section */}
          <div className="glass-card rounded-[2.5rem] p-10 border border-white/60 shadow-premium relative">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.638.319a4 4 0 01-2.154.493H8.5a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 011.929.5L13 3.5a2 2 0 011 1.732V9a2 2 0 01-2 2h-1M14 6a2 2 0 00-2 2v1M17 10a2 2 0 00-2 2v1" /></svg>
                </div>
                <h2 className="text-xl font-display font-bold text-slate-900">Prescribed Regimen</h2>
              </div>
              <button
                type="button"
                onClick={addMedicineField}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center gap-2 group"
              >
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5">Add Line Item</span>
              </button>
            </div>

            <div className="space-y-8">
              {medicines.map((medicine, index) => (
                <div key={index} className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100/80 relative group animate-scale-up">
                  <div className="absolute -left-3 top-8 w-6 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-glow-indigo">
                    {index + 1}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Medicine Asset <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        name="medicine"
                        value={medicine.medicine}
                        onChange={(e) => handleMedicineChange(index, e)}
                        required
                        placeholder="Search pharmaceutical name..."
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Dosage Spec <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        name="dosage"
                        value={medicine.dosage}
                        onChange={(e) => handleMedicineChange(index, e)}
                        required
                        placeholder="e.g. 500mg BD"
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Quantity <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        name="quantity"
                        value={medicine.quantity}
                        onChange={(e) => handleMedicineChange(index, e)}
                        required
                        placeholder="Total units..."
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Extended Instructions</label>
                      <textarea
                        name="instructions"
                        rows={2}
                        value={medicine.instructions}
                        onChange={(e) => handleMedicineChange(index, e)}
                        placeholder="Specify usage protocol, timing, and conditions..."
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 shadow-sm"
                      />
                    </div>
                  </div>

                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicineField(index)}
                      className="absolute -right-3 -top-3 w-8 h-8 bg-white border border-rose-200 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-premium opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Prescription Upload Section */}
          <div className="glass-card rounded-[2.5rem] p-10 border border-white/60 shadow-premium relative overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <h2 className="text-xl font-display font-bold text-slate-900">Ledger Documentation <span className="text-slate-400 font-medium text-sm ml-2">(Optional)</span></h2>
            </div>

            <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50 text-center hover:border-indigo-400 transition-colors group">
              <input
                type="file"
                id="prescription-file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="prescription-file" className="cursor-pointer">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-premium flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {prescriptionFile ? prescriptionFile.name : 'Click to upload source document'}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  Verified PDF, JPG, or PNG (MAX 10MB)
                </p>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 pb-12">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-5 bg-indigo-600 text-white rounded-3xl hover:bg-slate-900 shadow-premium hover:shadow-glow-indigo font-bold text-[11px] uppercase tracking-[0.2em] transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  <span>Authorize & Commit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPrescription;
