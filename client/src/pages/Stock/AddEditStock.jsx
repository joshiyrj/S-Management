import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { stockApi, masterApi } from '../../api/axios';
import toast from 'react-hot-toast';
import { MdAdd, MdClose, MdCheck } from 'react-icons/md';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import AddStockWorkspace from './AddStockWorkspace';
import { formatDateDDMMYYYY, isValidDisplayDate, toIsoDateString } from '../../utils/date';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptyBale = () => ({ id: Date.now() + Math.random(), baleNo: '', meter: '', billNo: '' });
const emptyThan = () => ({ id: Date.now() + Math.random(), thanMeter: '', checked: false, baleDetails: [] });
const emptyBaleInThan = () => ({ id: Date.now() + Math.random(), baleNo: '', meter: '', billNo: '' });

const toNum = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
const normalizeNonNegativeInput = (value) => {
  const text = String(value ?? '');
  if (text === '') return '';
  if (text.trim().startsWith('-')) return null;
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return text;
};
const hasMoreThanTwoDecimals = (value) => {
  const text = String(value ?? '').trim();
  if (!text || !text.includes('.')) return false;
  return text.split('.')[1].length > 2;
};

// ─── Bale Details Popup (for Mix than rows) ───────────────────────────────────
function BaleDetailsPopup({ open, onClose, baleDetails, thanMeter, sNo, onSave }) {
  const [bales, setBales] = useState(baleDetails.map((b) => ({ ...b, id: b.id || Date.now() + Math.random() })));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) setBales(baleDetails.length > 0 ? baleDetails.map((b) => ({ ...b, id: b.id || Date.now() + Math.random() })) : [emptyBaleInThan()]);
  }, [open]);

  const addRow = () => setBales((prev) => [...prev, emptyBaleInThan()]);
  const removeRow = (id) => setBales((prev) => prev.filter((b) => b.id !== id));
  const updateBale = (id, field, value) => {
    const nextValue = field === 'meter' ? normalizeNonNegativeInput(value) : value;
    if (nextValue === null) return;
    setBales((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: nextValue } : b)));
    setErrors((prev) => ({ ...prev, [`${id}_${field}`]: '' }));
  };

  const validate = () => {
    const errs = {};
    bales.forEach((b) => {
      if (!b.baleNo.trim()) errs[`${b.id}_baleNo`] = 'Required';
      if (!b.meter || isNaN(parseFloat(b.meter)) || parseFloat(b.meter) <= 0) errs[`${b.id}_meter`] = 'Required';
      else if (hasMoreThanTwoDecimals(b.meter)) errs[`${b.id}_meter`] = 'Max 2 decimals';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(bales.map((b, i) => ({ ...b, sNo: i + 1 })));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Bale Details — Than #${sNo} (${thanMeter} m)`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Manage bale rows</p>
            <p className="text-xs text-slate-500">Keep bale numbers, meter values, and bill numbers aligned for this than.</p>
          </div>
          <button type="button" className="btn-secondary btn-sm self-start sm:self-auto" onClick={addRow}>
            <MdAdd /> Add Bale
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-2 text-left w-10">#</th>
                <th className="px-3 py-2 text-left">Bale No *</th>
                <th className="px-3 py-2 text-left">Meter *</th>
                <th className="px-3 py-2 text-left">Bill No</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {bales.map((b, idx) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      className={`form-input py-1 ${errors[`${b.id}_baleNo`] ? 'form-input-error' : ''}`}
                      placeholder="Bale No"
                      value={b.baleNo}
                      onChange={(e) => updateBale(b.id, 'baleNo', e.target.value)}
                    />
                    {errors[`${b.id}_baleNo`] && <p className="form-error">{errors[`${b.id}_baleNo`]}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-input py-1 w-24 ${errors[`${b.id}_meter`] ? 'form-input-error' : ''}`}
                      placeholder="0.00"
                      value={b.meter}
                      onChange={(e) => updateBale(b.id, 'meter', e.target.value)}
                    />
                    {errors[`${b.id}_meter`] && <p className="form-error">{errors[`${b.id}_meter`]}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="form-input py-1"
                      placeholder="Bill No (optional)"
                      value={b.billNo}
                      onChange={(e) => updateBale(b.id, 'billNo', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {bales.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(b.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        <MdClose />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleSave}>
            <MdCheck /> Save Bales
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Animated Calculation Display ─────────────────────────────────────────────
function AnimatedMeter({ value, className = '', unit = 'm' }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState(safeValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousValueRef = useRef(safeValue);
  const frameRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = safeValue;

    if (Math.abs(endValue - startValue) < 0.005) {
      setDisplayValue(endValue);
      previousValueRef.current = endValue;
      return undefined;
    }

    setIsUpdating(true);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    let startTime = null;
    const duration = 320;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      const nextValue = startValue + ((endValue - startValue) * easedProgress);
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = endValue;
        timeoutRef.current = setTimeout(() => setIsUpdating(false), 140);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [safeValue]);

  return (
    <span className={`metric-value ${isUpdating ? 'metric-value-updating' : ''} ${className}`}>
      <span>{displayValue.toFixed(2)}</span>
      <span className="metric-value-unit">{unit}</span>
    </span>
  );
}

function CalculationMetric({ eyebrow, label, helper, value, tone = 'muted' }) {
  const toneClassName = {
    muted: 'metric-card metric-card-muted',
    emphasis: 'metric-card metric-card-emphasis',
    success: 'metric-card metric-card-success',
    danger: 'metric-card metric-card-danger',
  }[tone];

  return (
    <div className={toneClassName}>
      <p className="metric-kicker">{eyebrow}</p>
      <h4 className="metric-label">{label}</h4>
      <p className="metric-helper">{helper}</p>
      <AnimatedMeter value={value} className={tone === 'danger' ? 'text-red-600' : tone === 'emphasis' ? 'text-blue-700' : tone === 'success' ? 'text-emerald-700' : ''} />
    </div>
  );
}

function BreakdownRow({ label, value, tone = 'default' }) {
  const valueClassName = tone === 'result'
    ? 'text-base text-blue-700 sm:text-lg'
    : tone === 'negative'
      ? 'text-base text-red-600 sm:text-lg'
      : 'text-base text-slate-800 sm:text-lg';
  const rowClassName = tone === 'result'
    ? 'bg-blue-50'
    : tone === 'negative'
      ? 'bg-red-50'
      : 'bg-white';

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${rowClassName}`}>
      <span className={`text-sm ${tone === 'result' ? 'font-semibold text-slate-700' : tone === 'negative' ? 'font-semibold text-red-700' : 'font-medium text-slate-600'}`}>{label}</span>
      <AnimatedMeter value={value} className={valueClassName} />
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function AddEditStock() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [mills, setMills] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ─── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    date: formatDateDDMMYYYY(new Date()),
    millId: '',
    type: 'regular',
    qualityId: '',
    designId: '',
    lotNo: '',
    totalMeterReceived: '',
    second: '',
    unchecked: '',
  });

  // Regular
  const [baleDetails, setBaleDetails] = useState([emptyBale()]);
  // Mix
  const [thanDetails, setThanDetails] = useState([emptyThan()]);
  // Popup state for mix bale details
  const [balePopup, setBalePopup] = useState({ open: false, thanId: null, thanSNo: 1, thanMeter: 0 });

  // ─── Load masters & existing stock ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, qRes, dRes] = await Promise.all([
          masterApi.getMills(),
          masterApi.getQualities(),
          masterApi.getDesigns(),
        ]);
        setMills(mRes.data.data);
        setQualities(qRes.data.data);
        setDesigns(dRes.data.data);

        if (isEdit) {
          const sRes = await stockApi.getOne(id);
          const s = sRes.data.data;
          setForm({
            date: formatDateDDMMYYYY(s.date),
            millId: s.millId,
            type: s.type,
            qualityId: s.qualityId,
            designId: s.designId,
            lotNo: s.lotNo,
            totalMeterReceived: s.totalMeterReceived,
            second: s.second ?? '',
            unchecked: s.unchecked ?? '',
          });
          if (s.type === 'regular') {
            setBaleDetails(s.baleDetails.map((b) => ({ ...b, id: b._id || Date.now() + Math.random() })));
          } else {
            setThanDetails(s.thanDetails.map((t) => ({
              ...t,
              id: t._id || Date.now() + Math.random(),
              baleDetails: (t.baleDetails || []).map((b) => ({ ...b, id: b._id || Date.now() + Math.random() })),
            })));
          }
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [id]);

  // ─── Computed values ──────────────────────────────────────────────────────
  const totalMeter = toNum(form.totalMeterReceived);
  const second = toNum(form.second);
  const unchecked = toNum(form.unchecked);

  const meterOfTotalBales = baleDetails.reduce((s, b) => s + toNum(b.meter), 0);
  const meterOfTotalThan = thanDetails.reduce((s, t) => s + toNum(t.thanMeter), 0);

  const remaining =
    form.type === 'regular'
      ? totalMeter - meterOfTotalBales
      : totalMeter - meterOfTotalThan;

  const finalReport =
    form.type === 'regular'
      ? totalMeter - (meterOfTotalBales + second + unchecked)
      : totalMeter - (meterOfTotalThan + second + unchecked);

  const meterSold =
    form.type === 'regular'
      ? baleDetails.filter((b) => b.billNo && b.billNo.trim() !== '').reduce((s, b) => s + toNum(b.meter), 0)
      : thanDetails.filter((t) => t.checked).reduce((s, t) => s + toNum(t.thanMeter), 0);

  const stockRemaining =
    form.type === 'regular'
      ? baleDetails.filter((b) => !b.billNo || b.billNo.trim() === '').reduce((s, b) => s + toNum(b.meter), 0)
      : thanDetails.filter((t) => !t.checked).reduce((s, t) => s + toNum(t.thanMeter), 0);

  const flowLabel = form.type === 'regular' ? 'Bale' : 'Than';
  const flowLabelPlural = form.type === 'regular' ? 'bale rows' : 'than rows';
  const flowMeterLabel = form.type === 'regular' ? 'Meter of Total Bales' : 'Meter of Total Than';
  const flowMeterValue = form.type === 'regular' ? meterOfTotalBales : meterOfTotalThan;
  const breakdownLabel = form.type === 'regular' ? 'Total bale meter' : 'Total than meter';
  const deductionsTotal = second + unchecked;
  const selectedMillName = mills.find((mill) => mill._id === form.millId)?.name || '--';
  const selectedQualityName = qualities.find((quality) => quality._id === form.qualityId)?.name || '--';
  const selectedDesignName = designs.find((design) => design._id === form.designId)?.name || '--';
  const entryRowsCount = form.type === 'regular' ? baleDetails.length : thanDetails.length;
  const soldRowsCount = form.type === 'regular'
    ? baleDetails.filter((bale) => bale.billNo && bale.billNo.trim() !== '').length
    : thanDetails.filter((than) => than.checked).length;
  const inStockRowsCount = form.type === 'regular'
    ? baleDetails.filter((bale) => !bale.billNo || bale.billNo.trim() === '').length
    : thanDetails.filter((than) => !than.checked).length;
  const completionRatio = totalMeter > 0 ? Math.min((flowMeterValue / totalMeter) * 100, 100) : 0;
  const completionWidth = Math.max(Math.min(completionRatio, 100), 0);
  const typeLabel = form.type === 'regular' ? 'Regular' : 'Mix';
  const typeBadgeClass = form.type === 'regular' ? 'badge-regular' : 'badge-mix';
  const entryDateLabel = form.date || '--';
  const remainingToneClass = remaining < 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50';
  const finalReportToneClass = finalReport < 0 ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50';

  // ─── Bale row handlers ────────────────────────────────────────────────────
  const addBaleRow = () => setBaleDetails((prev) => [...prev, emptyBale()]);
  const removeBaleRow = (id) => setBaleDetails((prev) => prev.filter((b) => b.id !== id));
  const updateBale = (id, field, value) => {
    const nextValue = field === 'meter' ? normalizeNonNegativeInput(value) : value;
    if (nextValue === null) return;
    setBaleDetails((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: nextValue } : b)));
    setErrors((e) => ({ ...e, [`bale_${id}_${field}`]: '', baleDetails: '', finalReport: '' }));
  };

  // ─── Than row handlers ─────────────────────────────────────────────────────
  const addThanRow = () => setThanDetails((prev) => [...prev, emptyThan()]);
  const removeThanRow = (id) => setThanDetails((prev) => prev.filter((t) => t.id !== id));
  const updateThan = (id, field, value) => {
    const nextValue = field === 'thanMeter' ? normalizeNonNegativeInput(value) : value;
    if (nextValue === null) return;
    setThanDetails((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: nextValue } : t)));
    setErrors((e) => ({ ...e, [`than_${id}_${field}`]: '', thanDetails: '', finalReport: '' }));
  };

  const openBalePopup = (than, idx) => {
    setBalePopup({ open: true, thanId: than.id, thanSNo: idx + 1, thanMeter: than.thanMeter });
  };

  const saveBalesForThan = (thanId, bales) => {
    setThanDetails((prev) =>
      prev.map((t) => (t.id === thanId ? { ...t, baleDetails: bales } : t))
    );
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Date is required';
    else if (!isValidDisplayDate(form.date)) errs.date = 'Use DD/MM/YYYY';
    if (!form.millId) errs.millId = 'Mill is required';
    if (!form.qualityId) errs.qualityId = 'Quality is required';
    if (!form.designId) errs.designId = 'Design is required';
    if (!form.lotNo || isNaN(Number(form.lotNo)) || !Number.isInteger(Number(form.lotNo)) || Number(form.lotNo) < 1)
      errs.lotNo = 'Valid lot number is required';
    if (!form.totalMeterReceived || isNaN(parseFloat(form.totalMeterReceived)) || parseFloat(form.totalMeterReceived) <= 0)
      errs.totalMeterReceived = 'Total meter received must be greater than 0';
    else if (hasMoreThanTwoDecimals(form.totalMeterReceived))
      errs.totalMeterReceived = 'Use at most 2 decimal places';
    if (form.second !== '' && (isNaN(parseFloat(form.second)) || parseFloat(form.second) < 0))
      errs.second = 'Must be a valid number ≥ 0';
    else if (hasMoreThanTwoDecimals(form.second))
      errs.second = 'Use at most 2 decimal places';
    if (form.unchecked !== '' && (isNaN(parseFloat(form.unchecked)) || parseFloat(form.unchecked) < 0))
      errs.unchecked = 'Must be a valid number ≥ 0';
    else if (hasMoreThanTwoDecimals(form.unchecked))
      errs.unchecked = 'Use at most 2 decimal places';
    if (form.type === 'regular') {
      if (baleDetails.length === 0) errs.baleDetails = 'At least one bale is required';
      baleDetails.forEach((b) => {
        if (!b.baleNo.trim()) errs[`bale_${b.id}_baleNo`] = 'Bale No is required';
        if (!b.meter || isNaN(parseFloat(b.meter)) || parseFloat(b.meter) <= 0)
          errs[`bale_${b.id}_meter`] = 'Meter must be > 0';
        else if (hasMoreThanTwoDecimals(b.meter))
          errs[`bale_${b.id}_meter`] = 'Use at most 2 decimal places';
      });
      if (meterOfTotalBales > totalMeter) errs.baleDetails = 'Meter of total bales cannot exceed total meter received';
      if (meterOfTotalBales + second + unchecked > totalMeter)
        errs.finalReport = 'Final report cannot be negative. Check bale total, second, and unchecked values.';
    } else {
      if (thanDetails.length === 0) errs.thanDetails = 'At least one than is required';
      thanDetails.forEach((t) => {
        if (!t.thanMeter || isNaN(parseFloat(t.thanMeter)) || parseFloat(t.thanMeter) <= 0)
          errs[`than_${t.id}_thanMeter`] = 'Than meter must be > 0';
        else if (hasMoreThanTwoDecimals(t.thanMeter))
          errs[`than_${t.id}_thanMeter`] = 'Use at most 2 decimal places';
      });
      if (meterOfTotalThan > totalMeter) errs.thanDetails = 'Meter of total than cannot exceed total meter received';
      if (meterOfTotalThan + second + unchecked > totalMeter)
        errs.finalReport = 'Final report cannot be negative. Check than total, second, and unchecked values.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix all validation errors');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        date: toIsoDateString(form.date),
        lotNo: Number(form.lotNo),
        totalMeterReceived: parseFloat(form.totalMeterReceived),
        second: form.second !== '' ? parseFloat(form.second) : 0,
        unchecked: form.unchecked !== '' ? parseFloat(form.unchecked) : 0,
        baleDetails:
          form.type === 'regular'
            ? baleDetails.map((b, i) => ({
                sNo: i + 1,
                baleNo: b.baleNo.trim(),
                meter: parseFloat(b.meter),
                billNo: b.billNo?.trim() || '',
              }))
            : [],
        thanDetails:
          form.type === 'mix'
            ? thanDetails.map((t, i) => ({
                sNo: i + 1,
                thanMeter: parseFloat(t.thanMeter),
                checked: t.checked,
                baleDetails: (t.baleDetails || []).map((b, j) => ({
                  sNo: j + 1,
                  baleNo: b.baleNo?.trim() || '',
                  meter: parseFloat(b.meter) || 0,
                  billNo: b.billNo?.trim() || '',
                })),
              }))
            : [],
      };

      if (isEdit) {
        await stockApi.update(id, payload);
        toast.success('Stock updated successfully');
      } else {
        await stockApi.create(payload);
        toast.success('Stock added successfully');
      }
      navigate('/stocks');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return <Spinner center />;

  const currentThan = balePopup.thanId ? thanDetails.find((t) => t.id === balePopup.thanId) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-[1520px] space-y-4 pb-6">
      <AddStockWorkspace
        form={form}
        errors={errors}
        setForm={setForm}
        setErrors={setErrors}
        mills={mills}
        qualities={qualities}
        designs={designs}
        isEdit={isEdit}
        saving={saving}
        totalMeter={totalMeter}
        meterOfTotalBales={meterOfTotalBales}
        meterOfTotalThan={meterOfTotalThan}
        remaining={remaining}
        finalReport={finalReport}
        meterSold={meterSold}
        stockRemaining={stockRemaining}
        second={second}
        unchecked={unchecked}
        flowLabelPlural={flowLabelPlural}
        flowMeterLabel={flowMeterLabel}
        flowMeterValue={flowMeterValue}
        breakdownLabel={breakdownLabel}
        deductionsTotal={deductionsTotal}
        selectedMillName={selectedMillName}
        selectedQualityName={selectedQualityName}
        selectedDesignName={selectedDesignName}
        entryRowsCount={entryRowsCount}
        soldRowsCount={soldRowsCount}
        inStockRowsCount={inStockRowsCount}
        completionRatio={completionRatio}
        baleDetails={baleDetails}
        thanDetails={thanDetails}
        addBaleRow={addBaleRow}
        removeBaleRow={removeBaleRow}
        updateBale={updateBale}
        addThanRow={addThanRow}
        removeThanRow={removeThanRow}
        updateThan={updateThan}
        openBalePopup={openBalePopup}
        onCancel={() => navigate('/stocks')}
        AnimatedMeter={AnimatedMeter}
        BreakdownRow={BreakdownRow}
      />

      {balePopup.open && currentThan && (
        <BaleDetailsPopup
          open={balePopup.open}
          onClose={() => setBalePopup((p) => ({ ...p, open: false }))}
          baleDetails={currentThan.baleDetails}
          thanMeter={balePopup.thanMeter}
          sNo={balePopup.thanSNo}
          onSave={(bales) => saveBalesForThan(balePopup.thanId, bales)}
        />
      )}
    </form>
  );
}

