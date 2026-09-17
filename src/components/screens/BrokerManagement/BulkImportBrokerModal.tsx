import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trash2,
  FileCheck,
  Check,
  Building2,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  downloadBrokerTemplate,
  uploadBrokerBulk,
  parseBrokerFile,
  generateCsvFileFromRows,
  type BrokerBifurcatedData,
} from '../../../admin/api/bulkBroker';

interface BulkImportBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportBrokerModal: React.FC<BulkImportBrokerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Stepper state: 1: Download Template, 2: Upload File, 3: Validate & Bifurcate
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 states
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Step 2 states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 states
  const [bifurcatedData, setBifurcatedData] = useState<BrokerBifurcatedData>({
    validData: [],
    errorData: [],
  });
  const [activeTab, setActiveTab] = useState<'valid' | 'error'>('valid');
  const [isFinishing, setIsFinishing] = useState(false);

  if (!isOpen) return null;

  // Reset modal state
  const handleClose = () => {
    if (uploading || isFinishing) return;
    setCurrentStep(1);
    setSelectedFile(null);
    setUploadError(null);
    setBifurcatedData({ validData: [], errorData: [] });
    setActiveTab('valid');
    onClose();
  };

  // Step 1: Download Template Handler
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await downloadBrokerTemplate();
      if (res.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Template downloaded successfully',
          showConfirmButton: false,
          timer: 2500,
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Download Failed',
        text: err?.message || 'Unable to download template file',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Step 2: File selection and drag-drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setUploadError('Invalid file format. Please upload a .csv or .xlsx file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Step 2: Validate file client-side and advance to Step 3 without hitting bulk-upload API yet
  const handleValidateFile = async () => {
    if (!selectedFile) {
      setUploadError('Please select a CSV or XLSX file to proceed.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const result = await parseBrokerFile(selectedFile);
      setBifurcatedData(result);

      // If there are only error records, switch to error tab initially
      if (result.validData.length === 0 && result.errorData.length > 0) {
        setActiveTab('error');
      } else {
        setActiveTab('valid');
      }

      setCurrentStep(3);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read and validate file.');
    } finally {
      setUploading(false);
    }
  };

  // Step 3: Discard single error row
  const handleDiscardErrorRow = (index: number) => {
    const updatedErrors = [...bifurcatedData.errorData];
    updatedErrors.splice(index, 1);
    const newErrorCount = updatedErrors.length;
    const currentValidCount = bifurcatedData.summary?.validCount ?? bifurcatedData.validData.length;
    setBifurcatedData({
      ...bifurcatedData,
      errorData: updatedErrors,
      summary: {
        total: currentValidCount + newErrorCount,
        validCount: currentValidCount,
        errorCount: newErrorCount,
      },
    });
  };

  // Step 3: Discard all error rows so upload can be finished
  const handleDiscardAllErrors = () => {
    const currentValidCount = bifurcatedData.summary?.validCount ?? bifurcatedData.validData.length;
    setBifurcatedData({
      ...bifurcatedData,
      errorData: [],
      summary: {
        total: currentValidCount,
        validCount: currentValidCount,
        errorCount: 0,
      },
    });
    setActiveTab('valid');
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'Skipped error records discarded',
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const validCount = bifurcatedData.summary?.validCount ?? bifurcatedData.validData.length;
  const errorCount = bifurcatedData.summary?.errorCount ?? bifurcatedData.errorData.length;
  const totalCount = bifurcatedData.summary?.total ?? (validCount + errorCount);

  // Step 3: Finish upload - hits POST /brokers/bulk-upload once data is valid
  const handleFinishUpload = async () => {
    if (errorCount > 0) {
      Swal.fire({
        title: 'Error Records Detected',
        text: 'Please resolve or discard all error records before finishing the import.',
        icon: 'warning',
        confirmButtonColor: '#3B82F6',
      });
      return;
    }

    if (validCount === 0) {
      Swal.fire({
        title: 'No Valid Records',
        text: 'There are no valid broker records to finish importing.',
        icon: 'warning',
        confirmButtonColor: '#3B82F6',
      });
      return;
    }

    if (!selectedFile) return;

    setIsFinishing(true);
    try {
      // Build file to send: if any rows were discarded, build clean CSV from validData
      const totalOriginal = bifurcatedData.summary?.total ?? bifurcatedData.validData.length;
      const uploadFile =
        bifurcatedData.validData.length !== totalOriginal
          ? generateCsvFileFromRows(
              bifurcatedData.validData,
              selectedFile.name.replace(/\.[^/.]+$/, '') + '_cleaned.csv'
            )
          : selectedFile;

      const serverRes = await uploadBrokerBulk(uploadFile);

      // If server returned any skipped / error records
      if (serverRes.errorData.length > 0) {
        setBifurcatedData(serverRes);
        setActiveTab('error');
        Swal.fire({
          title: 'Server Validation Issues',
          text: serverRes.rawResponse?.message || 'Some records were skipped by the server.',
          icon: 'warning',
          confirmButtonColor: '#F59E0B',
        });
        return;
      }

      const importedCount = serverRes.summary?.validCount ?? serverRes.validData.length;
      Swal.fire({
        title: 'Import Completed!',
        text: `Successfully imported ${importedCount || validCount} broker record(s).`,
        icon: 'success',
        confirmButtonColor: '#10B981',
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error completing import:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to import broker records. Please check the file and try again.';
      Swal.fire({
        title: 'Import Failed',
        text: errMsg,
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setIsFinishing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 anim-fade-in text-left">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] z-[101] border border-slate-100 anim-scale-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Bulk Import Brokers</h2>
              <p className="text-xs text-slate-400 font-medium">
                Import multiple channel partners via CSV or Excel spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading || isFinishing}
            className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between sm:justify-center gap-2 sm:gap-8">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 1
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : currentStep === 1
                  ? 'bg-[#1A56DB] text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span
              className={`text-xs font-bold ${
                currentStep === 1 ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              Download Template
            </span>
          </div>

          <div className="w-8 sm:w-16 h-0.5 bg-slate-200" />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 2
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : currentStep === 2
                  ? 'bg-[#1A56DB] text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span
              className={`text-xs font-bold ${
                currentStep === 2 ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              Upload File
            </span>
          </div>

          <div className="w-8 sm:w-16 h-0.5 bg-slate-200" />

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3
                  ? 'bg-[#1A56DB] text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-bold ${
                currentStep === 3 ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              Validate & Bifurcate
            </span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700">
          {/* STEP 1: DOWNLOAD TEMPLATE */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50/60 border border-blue-100/80 rounded-2xl p-5 flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Step 1: Download the Standard Broker Template
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Download the pre-formatted CSV template with the exact column headers expected
                    by the system. Fill in your broker information or paste data matching these
                    headers before proceeding to upload.
                  </p>
                </div>
              </div>

              {/* BROKER BULK UPLOAD GUIDELINES */}
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 text-slate-700 shadow-xs text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base leading-none">⚠️</span>
                  <h4 className="text-xs font-black text-amber-900 tracking-wider uppercase">
                    Broker Bulk Upload Guidelines
                  </h4>
                </div>

                <p className="text-[11px] font-semibold text-amber-800/90 mb-3">
                  Before uploading your CSV or Excel file, please ensure:
                </p>

                <div className="space-y-2.5 text-xs text-slate-700 font-medium leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-700 shrink-0">•</span>
                    <p>
                      <strong className="text-slate-900 font-bold">Broker Name:</strong> Mandatory field for every record.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-700 shrink-0">•</span>
                    <p>
                      <strong className="text-slate-900 font-bold">Mobile Number:</strong> Must be a valid 10-digit number.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-700 shrink-0">•</span>
                    <p>
                      <strong className="text-slate-900 font-bold">Duplicate Check:</strong> Mobile numbers must be unique. The file will fail if a mobile number already exists in the system or is repeated within the file.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-700 shrink-0">•</span>
                    <p>
                      <strong className="text-slate-900 font-bold">Alternate Mobile:</strong> Optional field.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-700 shrink-0">•</span>
                    <p>
                      <strong className="text-slate-900 font-bold">All-or-Nothing Import Rule:</strong> If any single row in the file contains an invalid or duplicate mobile number, the entire upload will be rejected and zero brokers will be imported.
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-amber-200/60 text-[11px] font-semibold text-amber-800">
                  <strong>Note:</strong> If the upload fails, exact row line numbers and error reasons will be listed in the response summary.
                </div>
              </div>

              {/* Download CTA Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">
                  File name: <span className="font-bold text-slate-700">visited_list_import_template.csv</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer w-full sm:w-auto"
                >
                  {downloadingTemplate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Downloading Template...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Sample File (.csv)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD FILE */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Drag and drop box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-blue-400 bg-slate-50/40 hover:bg-blue-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    selectedFile
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {selectedFile ? (
                    <FileCheck className="w-7 h-7" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    {selectedFile ? 'Change selected file' : 'Drag and drop your spreadsheet here'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium block mt-1">
                    Supports <span className="font-bold text-slate-600">.CSV</span>,{' '}
                    <span className="font-bold text-slate-600">.XLSX</span>, or{' '}
                    <span className="font-bold text-slate-600">.XLS</span> (Max 15MB)
                  </span>
                </div>

                <button
                  type="button"
                  className="mt-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Browse from Computer
                </button>
              </div>

              {/* Selected File Card */}
              {selectedFile && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 anim-fade-up">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB &middot; Ready for validation
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 anim-fade-in text-red-700 text-xs">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Upload Error</span>
                    <span className="font-medium mt-0.5 block">{uploadError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: VALIDATE & BIFURCATE DATA */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Summary Stats Pill Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Processed
                  </span>
                  <span className="text-lg font-black text-slate-800 mt-0.5 block">
                    {totalCount}
                  </span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Valid (Imported)
                  </span>
                  <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                    {validCount}
                  </span>
                </div>

                <div className="bg-rose-50/60 border border-rose-100 p-3.5 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                    Error (Skipped)
                  </span>
                  <span className="text-lg font-black text-rose-700 mt-0.5 block">
                    {errorCount}
                  </span>
                </div>
              </div>

              {/* Status Alert for Errors */}
              {errorCount > 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>{errorCount} record(s)</strong> contain errors or were skipped. Please
                      review the reasons in the Error Data tab.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscardAllErrors}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold text-[11px] transition shrink-0 cursor-pointer"
                  >
                    Discard All Errors ({errorCount})
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    All records validated successfully! There are 0 errors. You can now click Finish
                    Upload below to complete importing.
                  </span>
                </div>
              )}

              {/* Tabs for Valid vs Error Data */}
              <div className="flex items-center border-b border-slate-100 gap-6 text-xs font-bold uppercase tracking-wider pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('valid')}
                  className={`pb-2.5 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'valid'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>Valid Data</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      activeTab === 'valid'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {validCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('error')}
                  className={`pb-2.5 transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'error'
                      ? 'text-rose-600 border-b-2 border-rose-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>Error Data</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      errorCount > 0
                        ? 'bg-rose-100 text-rose-700 font-black'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {errorCount}
                  </span>
                </button>
              </div>

              {/* Table Views */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-72 overflow-y-auto bg-slate-50/30">
                {activeTab === 'valid' ? (
                  bifurcatedData.validData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No valid broker records found.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3"># / ID</th>
                          <th className="py-2.5 px-3">Broker Name</th>
                          <th className="py-2.5 px-3">Mobile Number</th>
                          <th className="py-2.5 px-3">Company</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">City / State</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                        {bifurcatedData.validData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {row.id ? (
                                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                  BRK-{row.id}
                                </span>
                              ) : (
                                `#${idx + 1}`
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {row.broker_name || row.name || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {row.mobile_number || row.mobile || row.contact_number || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {row.company_name || row.company || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{row.email || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Valid / Imported
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : bifurcatedData.errorData.length === 0 ? (
                  <div className="p-8 text-center text-emerald-600 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Great! There are no error records.</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-rose-50 text-[10px] font-bold text-rose-800 uppercase tracking-wider border-b border-rose-200">
                      <tr>
                        <th className="py-2.5 px-3">Row / #</th>
                        <th className="py-2.5 px-3">Mobile Number</th>
                        <th className="py-2.5 px-3">Error / Skipped Reason</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white font-medium text-slate-700">
                      {bifurcatedData.errorData.map((errRow, idx) => {
                        const rowNum =
                          errRow.rowIndex ||
                          errRow.row ||
                          errRow.row_number ||
                          errRow.index ||
                          errRow.id ||
                          idx + 1;
                        const errorReason =
                          errRow.reason ||
                          errRow.error ||
                          errRow.message ||
                          errRow.skippedReason ||
                          errRow.skipped_reason ||
                          (Array.isArray(errRow.errors)
                            ? errRow.errors.join(', ')
                            : typeof errRow === 'string'
                            ? errRow
                            : 'Skipped during validation');
                        const mobile =
                          errRow.mobile_number || errRow.mobile || errRow.data?.mobile_number || '—';

                        return (
                          <tr key={idx} className="hover:bg-rose-50/40 transition">
                            <td className="py-2.5 px-3 font-bold text-rose-600 text-[11px]">
                              Row {rowNum}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-semibold">{mobile}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100/70 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                <span>{errorReason}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDiscardErrorRow(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Discard this row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Template</span>
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={isFinishing}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Upload Another File</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading || isFinishing}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>Next: Upload File</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleValidateFile}
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] disabled:bg-blue-300 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg disabled:shadow-none transition-all cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating File...</span>
                  </>
                ) : (
                  <>
                    <span>Next: Validate Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleFinishUpload}
                disabled={
                  errorCount > 0 ||
                  validCount === 0 ||
                  isFinishing
                }
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  errorCount === 0 && validCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title={
                  errorCount > 0
                    ? 'Please resolve or discard all error records before finishing'
                    : 'Finish import and update brokers list'
                }
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finishing Import...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      Finish Upload ({validCount} imported records)
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
