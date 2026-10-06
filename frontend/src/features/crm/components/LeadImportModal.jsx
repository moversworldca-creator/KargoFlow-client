import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { 
  X, UploadCloud, ChevronRight, ChevronLeft, 
  CheckCircle2, AlertCircle, Loader2, FileDown 
} from 'lucide-react';
import api from '../../../services/axios';
import LeadImportTable from './LeadImportTable';

const CRM_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: false },
  { key: 'email', label: 'Email Address', required: false },
  { key: 'phone', label: 'Phone Number', required: true },
  { key: 'lead_source', label: 'Lead Source', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'origin_address', label: 'Origin Address', required: false },
  { key: 'destination_address', label: 'Destination Address', required: false },
  { key: 'move_size', label: 'Move Size', required: false },
  { key: 'move_type', label: 'Move Type', required: false },
  { key: 'move_date', label: 'Move Date', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

const excelSerialToDateOnly = (serial) => {
  const date = new Date(Math.round((Number(serial) - 25569) * 86400 * 1000));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const normalizeDateOnly = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

export default function LeadImportModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [fileColumns, setFileColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  const toList = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.results)) return res.results;
    return [];
  };

  // Fetch branches on open
  useEffect(() => {
    if (isOpen) {
      api.get('/branches/').then(res => {
        const results = toList(res);
        setBranches(results);
        if (results.length > 0) {
          // Default to main branch or first branch
          const main = results.find(b => b.is_main);
          setSelectedBranch(main ? main.id : results[0].id);
        }
      }).catch(err => console.error("Failed to fetch branches", err));
    }
  }, [isOpen]);

  // Parse Excel/CSV file
  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      if (json.length > 0) {
        setFileColumns(Object.keys(json[0]));
        setParsedData(json);
        // Auto-map based on exact or fuzzy matches
        const autoMapping = {};
        Object.keys(json[0]).forEach(col => {
          const lowerCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = CRM_FIELDS.find(f => 
            f.key.replace(/_/g, '') === lowerCol || 
            f.label.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerCol
          );
          if (match) {
            autoMapping[match.key] = col;
          }
        });
        setMapping(autoMapping);
        setStep(2);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const handleMappingChange = (crmField, fileColumn) => {
    setMapping(prev => {
      const next = { ...prev };
      // Prevent duplicate mapping
      Object.keys(next).forEach(k => {
        if (next[k] === fileColumn) delete next[k];
      });
      if (fileColumn) {
        next[crmField] = fileColumn;
      } else {
        delete next[crmField];
      }
      return next;
    });
  };

  // Transformation & Validation
  const { transformedData, validationErrors, validCount, invalidCount } = useMemo(() => {
    const transformed = [];
    const errors = {};
    let valid = 0;
    let invalid = 0;

    parsedData.forEach((row, index) => {
      const newRow = {};
      const rowErrors = [];
      
      CRM_FIELDS.forEach(field => {
        const fileCol = mapping[field.key];
        let val = fileCol ? row[fileCol] : '';
        if (val !== null && val !== undefined) {
           val = String(val).trim();
        } else {
           val = '';
        }
        
        if (field.key === 'move_date' && val) {
          if (!isNaN(val)) {
            // Excel serial date format
            val = excelSerialToDateOnly(val);
            if (!val) {
              rowErrors.push("Invalid move_date format");
            }
          } else if (!isNaN(Date.parse(val))) {
            val = normalizeDateOnly(val);
            if (!val) {
              rowErrors.push("Invalid move_date format. Must be a valid date.");
            }
          } else {
             rowErrors.push("Invalid move_date format. Must be a valid date.");
          }
        }
        
        newRow[field.key] = val;
        
        if (field.required && !val) {
          rowErrors.push(`${field.label} is required`);
        }
      });
      
      if (newRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRow.email)) {
        rowErrors.push("Invalid email format");
      }
      // Very basic phone check
      if (newRow.phone && newRow.phone.length < 5) {
        rowErrors.push("Invalid phone format");
      }

      if (rowErrors.length > 0) {
        errors[index] = rowErrors;
        invalid++;
      } else {
        valid++;
      }
      
      transformed.push(newRow);
    });

    return { transformedData: transformed, validationErrors: errors, validCount: valid, invalidCount: invalid };
  }, [parsedData, mapping]);

  const handleImport = async () => {
    setImporting(true);
    setStep(5);
    
    // Only import valid records
    const recordsToImport = transformedData.filter((_, i) => !validationErrors[i]);
    
    try {
      // Chunking if needed, but for up to 50k TanStack Query / Axios can handle a large JSON payload
      // or we just send it to our bulk import endpoint.
      const res = await api.post('/leads/leads/import/', {
        duplicate_action: duplicateAction,
        file_name: file.name,
        branch_id: selectedBranch,
        records: recordsToImport
      });
      
      setImportStats(res);
    } catch (err) {
      console.error("Import failed", err);
      setImportStats({ error: "API request failed. Please check your network or contact support." });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (onSuccess && importStats && !importStats.error) {
      onSuccess();
    }
    setStep(1);
    setFile(null);
    setParsedData([]);
    setImportStats(null);
    onClose();
  };

  const downloadErrorReport = () => {
    if (!importStats || !importStats.errors) return;
    
    let csv = 'Row,Error\n';
    importStats.errors.forEach(err => {
      csv += `${err.row},"${err.error.replace(/"/g, '""')}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([{
      "First Name": "John",
      "Last Name": "Doe",
      "Company": "Movers LLC",
      "Email Address": "john@example.com",
      "Phone Number": "1234567890",
      "Lead Source": "Website",
      "Status": "new",
      "Origin Address": "123 Main St, New York, NY",
      "Destination Address": "456 Market St, San Francisco, CA",
      "Move Size": "2 Bedroom",
      "Move Type": "Local",
      "Move Date": "2023-12-01",
      "Notes": "Looking to move next month"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "lead_import_sample.xlsx");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Import Leads</h2>
            <p className="text-sm text-gray-500 mt-1">Upload CSV or Excel files to bulk import leads</p>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          
          {step === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto py-8">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? "Drop file here..." : "Drag & drop your file here"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Supports .csv, .xls, .xlsx up to 50MB
                </p>
                <div className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                  Browse Files
                </div>
              </div>

              <div className="text-center">
                <button 
                  onClick={downloadSample}
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Sample Template
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Map Columns</h3>
                  <p className="text-sm text-gray-500">Match your file's columns to CRM fields. We've auto-matched where possible.</p>
                </div>
                <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {parsedData.length} rows detected
                </div>
              </div>
              
              <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 font-medium text-gray-900">CRM Field</th>
                      <th className="px-6 py-3 font-medium text-gray-900">File Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {CRM_FIELDS.map(field => (
                      <tr key={field.key} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${field.required ? 'text-gray-900' : 'text-gray-600'}`}>
                            {field.label}
                          </span>
                          {field.required && <span className="ml-1 text-red-500">*</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={mapping[field.key] || ''}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            <option value="">-- Ignore --</option>
                            {fileColumns.map(col => {
                              // Check if used by another field
                              const isUsed = Object.entries(mapping).find(([k, v]) => v === col && k !== field.key);
                              return (
                                <option key={col} value={col} disabled={isUsed}>
                                  {col} {isUsed ? '(Mapped)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 h-full flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-500 mb-1">Total Records</div>
                  <div className="text-2xl font-bold text-gray-900">{parsedData.length}</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 shadow-sm">
                  <div className="text-sm font-medium text-green-700 mb-1">Valid Records</div>
                  <div className="text-2xl font-bold text-green-700">{validCount}</div>
                </div>
                <div className={`bg-red-50 border border-red-100 rounded-lg p-4 shadow-sm ${invalidCount > 0 ? 'animate-pulse' : ''}`}>
                  <div className="text-sm font-medium text-red-700 mb-1">Invalid Records</div>
                  <div className="text-2xl font-bold text-red-700">{invalidCount}</div>
                </div>
              </div>

              <div className="flex-1 min-h-[400px]">
                <LeadImportTable 
                  data={transformedData} 
                  validationErrors={validationErrors}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 max-w-2xl mx-auto py-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Import</h3>
                <p className="text-gray-500">You are about to import <span className="font-bold text-green-600">{validCount}</span> valid records. Invalid records will be skipped.</p>
              </div>

              <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-2">Target Branch</h4>
                  <p className="text-sm text-gray-500 mb-4">Select the branch to assign these leads to.</p>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <hr />
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Duplicate Handling Strategy</h4>
                  <p className="text-sm text-gray-500 mb-4">How should we handle leads that already exist in the CRM? (Matched by Phone or Email)</p>
                  
                  <div className="space-y-3">
                    {[
                      { id: 'skip', title: 'Skip Duplicates', desc: 'Existing leads remain unchanged. Only new leads are added.' },
                      { id: 'update', title: 'Update Existing Leads', desc: 'Overwrites existing lead fields with imported data.' },
                      { id: 'create_new_only', title: 'Create New Only', desc: 'Similar to skip, but strictly enforces uniqueness.' }
                    ].map(opt => (
                      <label 
                        key={opt.id} 
                        className={`flex p-4 border rounded-lg cursor-pointer transition-all ${
                          duplicateAction === opt.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="duplicateAction" 
                          value={opt.id}
                          checked={duplicateAction === opt.id}
                          onChange={(e) => setDuplicateAction(e.target.value)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <span className={`block text-sm font-medium ${duplicateAction === opt.id ? 'text-blue-900' : 'text-gray-900'}`}>
                            {opt.title}
                          </span>
                          <span className={`block text-sm ${duplicateAction === opt.id ? 'text-blue-700' : 'text-gray-500'}`}>
                            {opt.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="max-w-xl mx-auto py-12 text-center space-y-6">
              {importing ? (
                <>
                  <div className="relative inline-flex">
                    <div className="w-24 h-24 rounded-full border-4 border-blue-100 animate-pulse"></div>
                    <Loader2 className="w-24 h-24 text-blue-500 animate-spin absolute top-0 left-0" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Importing Leads...</h3>
                  <p className="text-gray-500">Please wait while we process your data. This may take a moment for large files.</p>
                </>
              ) : importStats ? (
                importStats.error ? (
                  <>
                    <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
                    <h3 className="text-2xl font-bold text-red-600">Import Failed</h3>
                    <p className="text-gray-600">{importStats.error}</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
                    <h3 className="text-2xl font-bold text-gray-900">Import Completed!</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-gray-900">{importStats.imported}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Imported</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-blue-600">{importStats.updated}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Updated</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-orange-500">{importStats.skipped}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Skipped</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-red-600">{importStats.failed}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">Failed</div>
                      </div>
                    </div>

                    {importStats.failed > 0 && (
                      <button 
                        onClick={downloadErrorReport}
                        className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Download Error Report
                      </button>
                    )}
                  </>
                )
              ) : null}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        {!importing && step < 5 && (
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </button>
            ) : (
              <div /> // Placeholder
            )}
            
            {step === 1 && file && (
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
            
            {step === 2 && (
              <button
                onClick={() => {
                  const hasRequired = CRM_FIELDS.filter(f => f.required).every(f => mapping[f.key]);
                  if (!hasRequired) {
                    alert('Please map all required fields (First Name, Phone).');
                    return;
                  }
                  setStep(3);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Preview Data
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
            
            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                disabled={validCount === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleImport}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Start Import
                <UploadCloud className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        )}
        
        {!importing && step === 5 && (
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
             <button
                onClick={handleClose}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Close & View Leads
              </button>
          </div>
        )}
      </div>
    </div>
  );
}
