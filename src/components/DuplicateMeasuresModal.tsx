import React, { useState, useEffect } from 'react';
import { Copy, X } from 'lucide-react';

interface DuplicateMeasuresModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalMeasures: number;
  onDuplicate: (startMeasure: number, endMeasure: number) => void;
}

export const DuplicateMeasuresModal: React.FC<DuplicateMeasuresModalProps> = ({
  isOpen,
  onClose,
  totalMeasures,
  onDuplicate
}) => {
  const [startMeasure, setStartMeasure] = useState<number>(1);
  const [endMeasure, setEndMeasure] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setStartMeasure(1);
      setEndMeasure(totalMeasures || 1);
    }
  }, [isOpen, totalMeasures]);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onDuplicate(startMeasure, endMeasure);
    onClose();
  };

  const countToDuplicate = Math.max(1, endMeasure - startMeasure + 1);

  return (
    <div className="fixed inset-0 z-modal z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" style={{ zIndex: 9999 }}>
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 text-slate-100 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold font-outfit text-sky-400 flex items-center gap-2">
            <Copy className="w-5 h-5 text-sky-400" />
            Duplicate Range of Measures
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Select a range of measures to duplicate. Copies of these measures will be appended to the end of your tab chart.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Start Measure:</label>
              <input
                type="number"
                min={1}
                max={totalMeasures}
                value={startMeasure}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, totalMeasures));
                  setStartMeasure(val);
                  if (val > endMeasure) setEndMeasure(val);
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-1.5 font-mono text-sm font-bold text-sky-300 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">End Measure:</label>
              <input
                type="number"
                min={startMeasure}
                max={totalMeasures}
                value={endMeasure}
                onChange={(e) => {
                  const val = Math.max(startMeasure, Math.min(parseInt(e.target.value, 10) || startMeasure, totalMeasures));
                  setEndMeasure(val);
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-1.5 font-mono text-sm font-bold text-sky-300 outline-none"
              />
            </div>
          </div>

          {/* Quick Range Presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-semibold">Presets:</span>
            <button
              type="button"
              onClick={() => {
                setStartMeasure(1);
                setEndMeasure(totalMeasures);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold transition"
            >
              All (1-{totalMeasures})
            </button>
            {totalMeasures >= 4 && (
              <button
                type="button"
                onClick={() => {
                  setStartMeasure(Math.max(1, totalMeasures - 3));
                  setEndMeasure(totalMeasures);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold transition"
              >
                Last 4
              </button>
            )}
          </div>

          {/* Live Summary Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 font-mono">
            Summary: Duplicating {countToDuplicate} measure(s) (M{startMeasure} - M{endMeasure}) to append as new Measures M{totalMeasures + 1} - M{totalMeasures + countToDuplicate}.
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-sky-500/20"
            >
              Duplicate & Append
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
