'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Loader2, 
  Filter, 
  RefreshCw,
  Table,
  Check,
  AlertTriangle,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParsedRow {
  id: string; // client-side temp id for key and removal
  accountNumber: string;
  receiptNumber: string;
  holderName: string;
  startDate: string;
  endDate: string;
  principalAmount: number;
  withdrawAmount: number;
  interestRate: number;
  remarks: string | null;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean; // duplicated in DB or file
}

const FIELD_DEFINITIONS = [
  { key: 'accountNumber', label: 'Account Number', keywords: ['account', 'acct', 'accno', 'acc number', 'account no', 'account number'], required: true },
  { key: 'receiptNumber', label: 'Receipt Number', keywords: ['receipt', 'rcpt', 'receiptno', 'receipt no', 'receipt number', 'fd receipt'], required: true },
  { key: 'holderName', label: 'Holder Name', keywords: ['name', 'holder', 'holder name', 'holdername', 'owner', 'depositor'], required: true },
  { key: 'startDate', label: 'Start Date', keywords: ['start', 'start date', 'startdate', 'open date', 'open', 'date of deposit', 'deposit date'], required: true },
  { key: 'endDate', label: 'Maturity Date', keywords: ['end', 'end date', 'enddate', 'maturity', 'maturity date', 'maturitydate', 'due date'], required: true },
  { key: 'principalAmount', label: 'Principal Amount', keywords: ['principal', 'amount', 'principal amount', 'principalamount', 'sum assured', 'deposit amount'], required: true },
  { key: 'withdrawAmount', label: 'Maturity Amount', keywords: ['withdraw', 'withdraw amount', 'withdrawal', 'maturity amount', 'maturity value', 'expected maturity', 'maturityamount', 'expected returns'], required: true },
  { key: 'interestRate', label: 'Interest Rate', keywords: ['interest', 'rate', 'interest rate', 'interestrate', 'rate %', 'rate%', 'percentage', 'p.a.'], required: true },
  { key: 'remarks', label: 'Remarks', keywords: ['remark', 'remarks', 'remarks/notes', 'notes', 'comment', 'comments', 'remarks/description', 'description'], required: false },
];

export default function ImportFDs() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing database FDs (combination of acct-rcpt) for client-side duplicate checking
  const [existingFds, setExistingFds] = useState<Set<string>>(new Set());
  const [isDbLoading, setIsDbLoading] = useState(true);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Column Mapping State
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [showMappingPanel, setShowMappingPanel] = useState(false);

  // Validation Preview State
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'INVALID' | 'DUPLICATE'>('ALL');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    skipped: number;
  } | null>(null);

  // Load existing FDs for duplicate matching
  useEffect(() => {
    async function fetchFds() {
      try {
        const res = await fetch('/api/fds?status=ACTIVE,MATURED,RENEWED,WITHDRAWN');
        if (res.ok) {
          const data = await res.json();
          const set = new Set<string>(
            data.map((fd: any) => `${fd.accountNumber.trim().toLowerCase()}-${fd.receiptNumber.trim().toLowerCase()}`)
          );
          setExistingFds(set);
        }
      } catch (err) {
        console.error('Error fetching FDs for duplicate check:', err);
      } finally {
        setIsDbLoading(false);
      }
    }
    fetchFds();
  }, []);

  // Helper to parse Excel dates (supporting numbers, string structures, Date objects)
  const parseDateValue = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') {
      // Excel serial date to JS date
      const date = new Date((val - 25569) * 86400 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      let parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed;

      // Handle DD/MM/YYYY or DD-MM-YYYY
      const parts = trimmed.split(/[/\-]/);
      if (parts.length === 3) {
        // DD/MM/YYYY (usually year is 4 digits)
        if (parts[2].length === 4) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // 0-based index
          const year = parseInt(parts[2], 10);
          parsed = new Date(year, month, day);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        // YYYY-MM-DD
        if (parts[0].length === 4) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          parsed = new Date(year, month, day);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }
    }
    return null;
  };

  // Generate mapping template
  const downloadTemplate = () => {
    const headers = [
      'Account Number',
      'Receipt Number',
      'Holder Name',
      'Start Date',
      'Maturity Date',
      'Principal Amount',
      'Maturity Amount',
      'Interest Rate',
      'Remarks'
    ];
    
    const sampleData = [
      {
        'Account Number': '1092837465',
        'Receipt Number': 'FD/2026/001',
        'Holder Name': 'Ramesh Sharma',
        'Start Date': '2026-01-15',
        'Maturity Date': '2027-01-15',
        'Principal Amount': 500000,
        'Maturity Amount': 536250,
        'Interest Rate': 7.25,
        'Remarks': 'SBI Term Deposit'
      },
      {
        'Account Number': '9876543210',
        'Receipt Number': 'FD/2026/002',
        'Holder Name': 'Sita Sharma',
        'Start Date': '2026-03-01',
        'Maturity Date': '2029-03-01',
        'Principal Amount': 200000,
        'Maturity Amount': 248000,
        'Interest Rate': 8.00,
        'Remarks': 'HDFC Family Trust Fund'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'FD Vault Template');
    XLSX.writeFile(workbook, 'fd_vault_import_template.xlsx');
  };

  // Handle file reading
  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsParsing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse sheet into raw 2D array
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rows.length === 0) {
          throw new Error('Spreadsheet appears to be empty.');
        }

        const headers = (rows[0] || []).map(h => String(h).trim());
        const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));

        setRawHeaders(headers);
        setRawRows(dataRows);

        // Auto Map columns based on keywords
        const autoMap: Record<string, string> = {};
        FIELD_DEFINITIONS.forEach(def => {
          const match = headers.find(h => {
            const norm = h.toLowerCase();
            return def.keywords.some(kw => norm.includes(kw) || kw.includes(norm));
          });
          if (match) {
            autoMap[def.key] = match;
          }
        });
        setMapping(autoMap);

        // Determine if mapping panel is required
        const missingRequired = FIELD_DEFINITIONS.some(def => def.required && !autoMap[def.key]);
        if (missingRequired) {
          setShowMappingPanel(true);
        } else {
          // Process rows immediately
          processRows(dataRows, headers, autoMap);
        }

      } catch (err: any) {
        alert(err.message || 'Error parsing file');
        resetState();
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Process raw rows using mapping
  const processRows = (rows: any[][], headers: string[], currentMap: Record<string, string>) => {
    const localSeen = new Set<string>();
    
    const mapped = rows.map((row, index) => {
      const errors: string[] = [];
      
      const getVal = (key: string) => {
        const colHeader = currentMap[key];
        if (!colHeader) return undefined;
        const colIndex = headers.indexOf(colHeader);
        return colIndex !== -1 ? row[colIndex] : undefined;
      };

      const accountNumRaw = getVal('accountNumber');
      const receiptNumRaw = getVal('receiptNumber');
      const holderNameRaw = getVal('holderName');
      const startDateRaw = getVal('startDate');
      const endDateRaw = getVal('endDate');
      const principalRaw = getVal('principalAmount');
      const withdrawRaw = getVal('withdrawAmount');
      const interestRateRaw = getVal('interestRate');
      const remarksRaw = getVal('remarks');

      // 1. Account Number
      const accountNumber = accountNumRaw !== undefined ? String(accountNumRaw).trim() : '';
      if (!accountNumber) errors.push('Account number is missing');

      // 2. Receipt Number
      const receiptNumber = receiptNumRaw !== undefined ? String(receiptNumRaw).trim() : '';
      if (!receiptNumber) errors.push('Receipt number is missing');

      // 3. Holder Name
      const holderName = holderNameRaw !== undefined ? String(holderNameRaw).trim() : '';
      if (!holderName) errors.push('Holder name is missing');

      // 4. Start Date
      const startDateParsed = parseDateValue(startDateRaw);
      let startDate = '';
      if (!startDateRaw) {
        errors.push('Start date is missing');
      } else if (!startDateParsed) {
        errors.push('Start date format is invalid');
      } else {
        startDate = startDateParsed.toISOString().substring(0, 10);
      }

      // 5. Maturity Date
      const endDateParsed = parseDateValue(endDateRaw);
      let endDate = '';
      if (!endDateRaw) {
        errors.push('Maturity date is missing');
      } else if (!endDateParsed) {
        errors.push('Maturity date format is invalid');
      } else {
        endDate = endDateParsed.toISOString().substring(0, 10);
      }

      // Start < End check
      if (startDateParsed && endDateParsed && endDateParsed <= startDateParsed) {
        errors.push('Maturity date must be after start date');
      }

      // 6. Principal
      const principalAmount = Number(principalRaw);
      if (principalRaw === undefined || principalRaw === '') {
        errors.push('Principal amount is missing');
      } else if (isNaN(principalAmount) || principalAmount <= 0) {
        errors.push('Principal amount must be a positive number');
      }

      // 7. Withdraw Amount
      const withdrawAmount = Number(withdrawRaw);
      if (withdrawRaw === undefined || withdrawRaw === '') {
        errors.push('Maturity amount is missing');
      } else if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        errors.push('Maturity amount must be a positive number');
      }

      // 8. Interest Rate
      const interestRate = Number(interestRateRaw);
      if (interestRateRaw === undefined || interestRateRaw === '') {
        errors.push('Interest rate is missing');
      } else if (isNaN(interestRate) || interestRate < 0) {
        errors.push('Interest rate must be a non-negative number');
      }

      const remarks = remarksRaw !== undefined ? String(remarksRaw).trim() : null;

      // Duplicate Check
      const comboKey = `${accountNumber.toLowerCase()}-${receiptNumber.toLowerCase()}`;
      const isDuplicate = existingFds.has(comboKey) || localSeen.has(comboKey);
      
      if (accountNumber && receiptNumber) {
        localSeen.add(comboKey);
      }

      return {
        id: `row-${index}-${Date.now()}`,
        accountNumber,
        receiptNumber,
        holderName,
        startDate,
        endDate,
        principalAmount: isNaN(principalAmount) ? 0 : principalAmount,
        withdrawAmount: isNaN(withdrawAmount) ? 0 : withdrawAmount,
        interestRate: isNaN(interestRate) ? 0 : interestRate,
        remarks,
        isValid: errors.length === 0,
        errors,
        isDuplicate,
      };
    });

    setParsedRows(mapped);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Triggers column re-processing
  const applyMapping = () => {
    setShowMappingPanel(false);
    processRows(rawRows, rawHeaders, mapping);
  };

  // Delete a parsed row from import list
  const deleteRow = (rowId: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Submit bulk data to DB
  const executeImport = async () => {
    const validRowsToImport = parsedRows.filter(r => r.isValid && !r.isDuplicate);
    if (validRowsToImport.length === 0) return;

    setIsImporting(true);
    try {
      const payload = validRowsToImport.map(({ 
        accountNumber, 
        receiptNumber, 
        holderName, 
        startDate, 
        endDate, 
        principalAmount, 
        withdrawAmount, 
        interestRate, 
        remarks 
      }) => ({
        accountNumber,
        receiptNumber,
        holderName,
        startDate,
        endDate,
        principalAmount,
        withdrawAmount,
        interestRate,
        remarks,
      }));

      const res = await fetch('/api/fds/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to complete import process');
      }

      const result = await res.json();
      setImportResult({
        success: true,
        message: result.message,
        imported: result.imported,
        skipped: result.skipped,
      });

      // Refresh cache in Next.js router
      router.refresh();

    } catch (err: any) {
      alert(err.message || 'Error uploading data');
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFileName(null);
    setRawHeaders([]);
    setRawRows([]);
    setParsedRows([]);
    setMapping({});
    setShowMappingPanel(false);
    setImportResult(null);
  };

  // Summary Metrics
  const totalRows = parsedRows.length;
  const duplicateRowsCount = parsedRows.filter(r => r.isDuplicate).length;
  const invalidRowsCount = parsedRows.filter(r => !r.isValid && !r.isDuplicate).length;
  const validToImportCount = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;

  const filteredRows = parsedRows.filter(row => {
    if (filterMode === 'VALID') return row.isValid && !row.isDuplicate;
    if (filterMode === 'INVALID') return !row.isValid && !row.isDuplicate;
    if (filterMode === 'DUPLICATE') return row.isDuplicate;
    return true;
  });

  // Guard access
  if (!isAdmin) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20 p-8 text-center backdrop-blur-sm">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-white">Access Denied</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-xs leading-normal">
          Only administrators have permission to perform bulk spreadsheet imports.
        </p>
        <Link
          href="/fds"
          className="mt-6 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
        >
          Go back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Download Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/fds"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white sm:text-2xl">Bulk Import FDs</h1>
            <p className="text-xs text-slate-450 mt-0.5">Upload Excel or CSV sheets to register multiple FDs at once</p>
          </div>
        </div>

        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:text-white px-4 py-2.5 text-xs font-semibold text-slate-350 transition-all cursor-pointer shadow-md"
        >
          <Download className="h-4 w-4" />
          Download Sample Template
        </button>
      </div>

      {isDbLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <span className="mt-3 text-xs font-semibold">Initializing duplicate indexing cache...</span>
        </div>
      ) : !fileName ? (
        /* Dropzone Upload Section */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex min-h-[350px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 backdrop-blur-sm ${
            dragActive 
              ? 'border-emerald-400 bg-slate-900/50 scale-[1.01]' 
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 transition-all group-hover:text-emerald-400">
            {isParsing ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            ) : (
              <Upload className="h-6 w-6 text-slate-400" />
            )}
          </div>

          <h3 className="mt-6 text-sm font-bold text-white tracking-wide">
            {isParsing ? 'Analyzing your spreadsheet...' : 'Upload your Fixed Deposit file'}
          </h3>
          <p className="mt-2 text-xs text-slate-450 max-w-sm leading-relaxed">
            Drag and drop your <code className="text-emerald-400 font-mono">.xlsx</code>, <code className="text-emerald-400 font-mono">.xls</code>, or <code className="text-emerald-400 font-mono">.csv</code> file here, or click to browse files.
          </p>

          <div className="mt-6 flex items-center justify-center gap-6 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Auto duplicate detection</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Flexible column mapping</span>
          </div>
        </motion.div>
      ) : (
        /* Results Details Panel */
        <div className="space-y-6">
          {/* File Meta Summary */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
                <Table className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{fileName}</h4>
                <p className="text-[10px] text-slate-450 mt-0.5">Found {totalRows} records in sheet</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMappingPanel(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-850 bg-slate-950 px-3.5 py-2 text-[10px] font-bold text-slate-350 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Change Column Mapping
              </button>
              <button
                onClick={resetState}
                className="rounded-xl border border-rose-950/20 bg-rose-950/10 px-3.5 py-2 text-[10px] font-bold text-rose-455 hover:bg-rose-950/20 transition-all cursor-pointer"
              >
                Clear File
              </button>
            </div>
          </div>

          {/* Import Complete Results Card */}
          {importResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-sm space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Import Process Completed!</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{importResult.message}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <div className="rounded-xl bg-slate-950/40 border border-slate-850 p-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Imported Successfully</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{importResult.imported}</p>
                </div>
                <div className="rounded-xl bg-slate-950/40 border border-slate-850 p-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Duplicates Skipped</span>
                  <p className="text-2xl font-black text-amber-500 mt-1">{importResult.skipped}</p>
                </div>
                <div className="rounded-xl bg-slate-950/40 border border-slate-850 p-4 flex items-center justify-center">
                  <Link
                    href="/fds"
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-xs font-bold text-slate-950 hover:from-emerald-450 hover:to-teal-450 transition-all cursor-pointer shadow-md"
                  >
                    View Fixed Deposits
                    <ArrowRight className="h-4 w-4 stroke-[3px]" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Validation Metrics Grid */}
          {!importResult && (
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 shadow-sm backdrop-blur-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Sheet Rows</span>
                <p className="text-2xl font-extrabold text-white mt-1.5">{totalRows}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 shadow-sm backdrop-blur-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block text-emerald-400">Ready to Import</span>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1.5">{validToImportCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 shadow-sm backdrop-blur-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block text-rose-455">Invalid Records</span>
                <p className="text-2xl font-extrabold text-rose-455 mt-1.5">{invalidRowsCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 shadow-sm backdrop-blur-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block text-amber-500">Duplicate Entries</span>
                <p className="text-2xl font-extrabold text-amber-500 mt-1.5">{duplicateRowsCount}</p>
              </div>
            </div>
          )}

          {/* Column Mapping Configuration Panel */}
          <AnimatePresence>
            {showMappingPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-emerald-450" />
                    Configure Column Mapping
                  </h3>
                  <button
                    onClick={() => setShowMappingPanel(false)}
                    className="text-slate-500 hover:text-slate-350 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Map the columns from your uploaded file to the fields required by the vault. Unmapped optional fields will be left blank.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 mt-5">
                  {FIELD_DEFINITIONS.map(def => (
                    <div key={def.key} className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-350">
                        {def.label} {def.required && <span className="text-rose-500">*</span>}
                      </label>
                      <select
                        value={mapping[def.key] || ''}
                        onChange={(e) => setMapping(prev => ({ ...prev, [def.key]: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      >
                        <option value="">-- Choose Column --</option>
                        {rawHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setShowMappingPanel(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyMapping}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 rounded-xl text-xs font-bold text-slate-950 transition-all cursor-pointer shadow-md"
                  >
                    Apply Mapping
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Results Table */}
          {!importResult && parsedRows.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 shadow-xl backdrop-blur-sm overflow-hidden space-y-4 p-6">
              {/* Toolbar */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/60 pb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-emerald-450" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Preview & Validation Filters</span>
                </div>
                
                {/* Filter Selector */}
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'VALID', 'INVALID', 'DUPLICATE'] as const).map(mode => {
                    const count = 
                      mode === 'VALID' ? validToImportCount :
                      mode === 'INVALID' ? invalidRowsCount :
                      mode === 'DUPLICATE' ? duplicateRowsCount :
                      totalRows;
                    return (
                      <button
                        key={mode}
                        onClick={() => setFilterMode(mode)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          filterMode === mode
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode === 'ALL' && 'All Rows'}
                        {mode === 'VALID' && 'Valid Only'}
                        {mode === 'INVALID' && 'Errors Only'}
                        {mode === 'DUPLICATE' && 'Duplicates'}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[8px]">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/30">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-450 font-bold">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Account Number</th>
                      <th className="px-4 py-3">Receipt Number</th>
                      <th className="px-4 py-3">Holder Name</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">Maturity Date</th>
                      <th className="px-4 py-3 text-right">Principal</th>
                      <th className="px-4 py-3 text-right">Interest Rate</th>
                      <th className="px-4 py-3 text-right">Maturity Value</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-semibold">
                          No records match the current filter selection
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr 
                          key={row.id} 
                          className={`border-b border-slate-900/60 hover:bg-slate-900/20 transition-all ${
                            row.isDuplicate 
                              ? 'bg-amber-500/[0.02]' 
                              : !row.isValid 
                              ? 'bg-rose-500/[0.02]' 
                              : 'bg-emerald-500/[0.01]'
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/25 bg-amber-500/10 text-[8px] font-bold text-amber-400 uppercase">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Duplicate
                              </span>
                            ) : row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-[8px] font-bold text-emerald-400 uppercase">
                                <Check className="h-2.5 w-2.5" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-500/20 bg-rose-500/10 text-[8px] font-bold text-rose-455 uppercase">
                                <AlertCircle className="h-2.5 w-2.5" />
                                Error
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-200">{row.accountNumber || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 font-semibold text-slate-200">{row.receiptNumber || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-slate-300 font-medium truncate max-w-[120px]">{row.holderName || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{row.startDate || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{row.endDate || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-200">
                            {row.principalAmount ? `₹${row.principalAmount.toLocaleString('en-IN')}` : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-teal-400 font-semibold">
                            {row.interestRate ? `${row.interestRate}%` : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-200">
                            {row.withdrawAmount ? `₹${row.withdrawAmount.toLocaleString('en-IN')}` : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => deleteRow(row.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-900 transition-all cursor-pointer"
                              title="Delete from list"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Errors Panel list */}
              {parsedRows.some(r => !r.isValid) && (
                <div className="rounded-xl border border-rose-500/10 bg-rose-500/[0.02] p-4 space-y-2">
                  <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Validation Error Details
                  </h4>
                  <ul className="text-[10px] text-rose-455 space-y-1 list-disc pl-4 font-medium">
                    {parsedRows.filter(r => !r.isValid).slice(0, 5).map((row, idx) => (
                      <li key={row.id || idx}>
                        Row #{idx + 1} (Receipt: {row.receiptNumber || 'None'}): {row.errors.join(', ')}
                      </li>
                    ))}
                    {parsedRows.filter(r => !r.isValid).length > 5 && (
                      <li className="list-none pl-0 font-semibold italic text-slate-500">
                        ...and {parsedRows.filter(r => !r.isValid).length - 5} more validation errors.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Action Actions Panel */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 font-semibold">
                  * Rows marked as <span className="text-amber-500 font-bold">Duplicate</span> or <span className="text-rose-455 font-bold">Error</span> will be skipped during the import process.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={resetState}
                    className="px-5 py-2.5 border border-slate-800 text-xs font-semibold text-slate-350 hover:text-white rounded-xl bg-slate-950/20 transition-all cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={executeImport}
                    disabled={validToImportCount === 0 || isImporting}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Import {validToImportCount} FDs
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
