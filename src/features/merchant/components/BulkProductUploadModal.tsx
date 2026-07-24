import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';

interface ParsedProductRow {
  rowNum: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  brand?: string;
  unit?: string;
  isValid: boolean;
  errorReason?: string;
}

interface BulkProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedProducts: any[]) => void;
}

const SAMPLE_CSV_HEADER = 'Product Name,Category,Price,Stock,SKU,Brand,Unit\n';
const SAMPLE_CSV_ROWS =
  'Fresh Strawberries 250g,FRUITS,99,20,AM-FRU-0001,Aether Farm,250g\n' +
  'Organic Cow Milk 1L,DAIRY,65,50,AM-DAIRY-0001,Amul,1L\n' +
  'Whole Wheat Bread 400g,BAKERY,45,30,AM-GROC-0001,Britannia,400g\n';

export const BulkProductUploadModal: React.FC<BulkProductUploadModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_HEADER + SAMPLE_CSV_ROWS], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'aether_mart_bulk_product_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      showToast({ type: 'error', title: 'Invalid File', description: 'The CSV file is empty or invalid.' });
      return;
    }

    const rows: ParsedProductRow[] = [];
    const seenSkus = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      const [name, category, priceStr, stockStr, skuStr, brand, unit] = parts;

      const price = parseFloat(priceStr || '0');
      const stock = parseInt(stockStr || '0', 10);
      const sku = skuStr || `AM-AUTO-${Math.floor(1000 + Math.random() * 9000)}`;

      let isValid = true;
      let errorReason = '';

      if (!name) {
        isValid = false;
        errorReason = 'Missing Product Name';
      } else if (isNaN(price) || price <= 0) {
        isValid = false;
        errorReason = 'Invalid Price (> ₹0 required)';
      } else if (isNaN(stock) || stock < 0) {
        isValid = false;
        errorReason = 'Invalid Stock (>= 0 required)';
      } else if (seenSkus.has(sku)) {
        isValid = false;
        errorReason = `Duplicate SKU in file (${sku})`;
      }

      if (sku) seenSkus.add(sku);

      rows.push({
        rowNum: i + 1,
        name: name || 'Unnamed Product',
        category: category || 'GROCERY',
        price: isNaN(price) ? 0 : price,
        stock: isNaN(stock) ? 0 : stock,
        sku,
        brand,
        unit,
        isValid,
        errorReason,
      });
    }

    setParsedRows(rows);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      parseCSVText(content);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      showToast({ type: 'error', title: 'File Error', description: 'Failed to read the file.' });
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast({ type: 'error', title: 'Cannot Import', description: 'No valid rows found to import.' });
      return;
    }

    onImportSuccess(validRows);
    showToast({
      type: 'success',
      title: 'Partial Import Complete',
      description: `Successfully imported ${validRows.length} valid products.${
        invalidCount > 0 ? ` ${invalidCount} errored rows were skipped.` : ''
      }`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-3xl bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Bulk Product Import</h3>
                <p className="text-xs text-text-secondary">Import multiple products instantly via CSV or Excel</p>
              </div>
            </div>

            <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sample Download & Upload Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface-subtle border border-border rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-text-primary">1. Download Template</h4>
                <p className="text-[11px] text-text-secondary leading-normal">
                  Download sample CSV format pre-configured with column documentation and example Kirana store rows.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="w-full py-2 bg-surface border border-border hover:bg-border text-text-primary text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4 text-brand-primary" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-4 border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 hover:border-brand-primary rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="w-6 h-6 text-brand-primary" />
              <p className="text-xs font-bold text-text-primary">2. Upload CSV / Excel File</p>
              <p className="text-[10px] text-text-secondary">
                {fileName ? <span className="font-semibold text-brand-primary">{fileName}</span> : 'Click or drop .csv file here'}
              </p>
            </div>
          </div>

          {/* Validation & Preview Table */}
          {parsedRows.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-2 border border-border rounded-xl p-3 bg-surface">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">
                  Row Validation Report ({parsedRows.length} Rows Found)
                </span>
                <div className="flex items-center space-x-3 text-[11px] font-semibold">
                  <span className="text-success flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{validCount} Valid</span>
                  </span>
                  <span className="text-error flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{invalidCount} Errored</span>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto border border-border rounded-lg max-h-56 scrollbar-none">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-surface-subtle border-b border-border sticky top-0 font-bold text-text-secondary">
                    <tr>
                      <th className="p-2">Row</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Stock</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {parsedRows.map((r) => (
                      <tr key={r.rowNum} className={cn(r.isValid ? 'hover:bg-surface-subtle' : 'bg-error/5')}>
                        <td className="p-2 text-text-secondary">#{r.rowNum}</td>
                        <td className="p-2 font-semibold text-text-primary">{r.name}</td>
                        <td className="p-2 text-text-secondary">{r.category}</td>
                        <td className="p-2 font-bold text-text-primary">₹{r.price}</td>
                        <td className="p-2 text-text-primary">{r.stock}</td>
                        <td className="p-2 font-mono text-text-secondary">{r.sku}</td>
                        <td className="p-2">
                          {r.isValid ? (
                            <span className="text-success font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="text-error font-bold flex items-center space-x-1" title={r.errorReason}>
                              <AlertTriangle className="w-3 h-3" />
                              <span>{r.errorReason}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-[11px] text-text-secondary">
              * Errored rows will be safely skipped during partial import.
            </span>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-border rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Import {validCount} Products</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
