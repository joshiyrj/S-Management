import { MdAdd, MdArrowBack, MdClose, MdSave } from 'react-icons/md';
import DateSelector from '../../components/common/DateSelector';

export default function AddStockWorkspace({
  form,
  errors,
  setForm,
  setErrors,
  mills,
  qualities,
  designs,
  isEdit,
  saving,
  totalMeter,
  meterOfTotalBales,
  meterOfTotalThan,
  remaining,
  finalReport,
  meterSold,
  stockRemaining,
  second,
  unchecked,
  flowLabelPlural,
  flowMeterLabel,
  flowMeterValue,
  breakdownLabel,
  deductionsTotal,
  selectedMillName,
  selectedQualityName,
  selectedDesignName,
  entryRowsCount,
  soldRowsCount,
  inStockRowsCount,
  completionRatio,
  baleDetails,
  thanDetails,
  addBaleRow,
  removeBaleRow,
  updateBale,
  addThanRow,
  removeThanRow,
  updateThan,
  openBalePopup,
  onCancel,
  AnimatedMeter,
  BreakdownRow,
}) {
  const typeLabel = form.type === 'regular' ? 'Regular' : 'Mix';
  const typeBadgeClass = form.type === 'regular' ? 'badge-regular' : 'badge-mix';
  const entryDateLabel = form.date || '--';
  const completionWidth = Math.max(Math.min(completionRatio, 100), 0);
  const remainingToneClass = remaining < 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50';
  const finalReportToneClass = finalReport < 0 ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50';
  const normalizeNonNegativeInput = (value) => {
    const text = String(value ?? '');
    if (text === '') return '';
    if (text.trim().startsWith('-')) return null;
    const parsed = Number.parseFloat(text);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return text;
  };

  return (
    <div className="space-y-3">
      <section className="stock-workspace-card section-reveal">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Stock Entry' : 'Add Stock Entry'}</h2>
              <span className={`badge ${typeBadgeClass}`}>{typeLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-slate-100 text-slate-600">{entryDateLabel}</span>
            <span className="badge bg-slate-100 text-slate-600">Lot {form.lotNo || '--'}</span>
            <span className="badge bg-slate-100 text-slate-600">{selectedMillName}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2 section-reveal sm:grid-cols-3" style={{ animationDelay: '60ms' }}>
        <div className="compact-kpi">
          <p className="stock-kicker">Received</p>
          <AnimatedMeter value={totalMeter} className="mt-1 text-xl text-slate-900 sm:text-2xl" />
        </div>
        <div className="compact-kpi">
          <p className="stock-kicker">{flowMeterLabel}</p>
          <AnimatedMeter value={flowMeterValue} className="mt-1 text-xl text-slate-900 sm:text-2xl" />
        </div>
        <div className="compact-kpi">
          <p className="stock-kicker">Stock Remaining</p>
          <AnimatedMeter value={stockRemaining} className="mt-1 text-xl text-slate-900 sm:text-2xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 min-w-0 space-y-3 xl:order-1">
          <section className="stock-workspace-card section-reveal" style={{ animationDelay: '110ms' }}>
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="form-label">Date *</label>
                  <DateSelector
                    value={form.date}
                    onChange={(nextDate) => {
                      setForm((currentForm) => ({ ...currentForm, date: nextDate }));
                      setErrors((currentErrors) => ({ ...currentErrors, date: '' }));
                    }}
                    error={Boolean(errors.date)}
                  />
                  {errors.date && <p className="form-error">{errors.date}</p>}
                </div>

                <div>
                  <label className="form-label">Mill Name *</label>
                  <select
                    className={`form-select ${errors.millId ? 'form-input-error' : ''}`}
                    value={form.millId}
                    onChange={(e) => {
                      setForm((currentForm) => ({ ...currentForm, millId: e.target.value }));
                      setErrors((currentErrors) => ({ ...currentErrors, millId: '' }));
                    }}
                  >
                    <option value="">-- Select Mill --</option>
                    {mills.map((mill) => (
                      <option key={mill._id} value={mill._id}>
                        {mill.name}
                      </option>
                    ))}
                  </select>
                  {errors.millId && <p className="form-error">{errors.millId}</p>}
                </div>

                <div className="md:col-span-2 xl:col-span-1">
                  <label className="form-label">Stock Type *</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['regular', 'mix'].map((type) => (
                      <label key={type} className={`chip-radio ${form.type === type ? 'chip-radio-active' : ''}`}>
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={form.type === type}
                          onChange={() => setForm((currentForm) => ({ ...currentForm, type }))}
                          className="sr-only"
                        />
                        <span className={`h-2.5 w-2.5 rounded-full ${form.type === type ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        <span className="capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Quality Name *</label>
                  <select
                    className={`form-select ${errors.qualityId ? 'form-input-error' : ''}`}
                    value={form.qualityId}
                    onChange={(e) => {
                      setForm((currentForm) => ({ ...currentForm, qualityId: e.target.value }));
                      setErrors((currentErrors) => ({ ...currentErrors, qualityId: '' }));
                    }}
                  >
                    <option value="">-- Select Quality --</option>
                    {qualities.map((quality) => (
                      <option key={quality._id} value={quality._id}>
                        {quality.name}
                      </option>
                    ))}
                  </select>
                  {errors.qualityId && <p className="form-error">{errors.qualityId}</p>}
                </div>

                <div>
                  <label className="form-label">Design No *</label>
                  <select
                    className={`form-select ${errors.designId ? 'form-input-error' : ''}`}
                    value={form.designId}
                    onChange={(e) => {
                      setForm((currentForm) => ({ ...currentForm, designId: e.target.value }));
                      setErrors((currentErrors) => ({ ...currentErrors, designId: '' }));
                    }}
                  >
                    <option value="">-- Select Design --</option>
                    {designs.map((design) => (
                      <option key={design._id} value={design._id}>
                        {design.name}
                      </option>
                    ))}
                  </select>
                  {errors.designId && <p className="form-error">{errors.designId}</p>}
                </div>

                <div>
                  <label className="form-label">Lot No *</label>
                  <input
                    type="number"
                    min="1"
                    className={`form-input ${errors.lotNo ? 'form-input-error' : ''}`}
                    placeholder="e.g. 101"
                    value={form.lotNo}
                    onChange={(e) => {
                      const nextValue = normalizeNonNegativeInput(e.target.value);
                      if (nextValue === null) return;
                      setForm((currentForm) => ({ ...currentForm, lotNo: nextValue }));
                      setErrors((currentErrors) => ({ ...currentErrors, lotNo: '' }));
                    }}
                  />
                  {errors.lotNo && <p className="form-error">{errors.lotNo}</p>}
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <label className="form-label">Total Meter Received *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`form-input ${errors.totalMeterReceived ? 'form-input-error' : ''}`}
                    placeholder="0.00"
                    value={form.totalMeterReceived}
                    onChange={(e) => {
                      const nextValue = normalizeNonNegativeInput(e.target.value);
                      if (nextValue === null) return;
                      setForm((currentForm) => ({ ...currentForm, totalMeterReceived: nextValue }));
                      setErrors((currentErrors) => ({
                        ...currentErrors,
                        totalMeterReceived: '',
                        baleDetails: '',
                        thanDetails: '',
                        finalReport: '',
                      }));
                    }}
                  />
                  {errors.totalMeterReceived && <p className="form-error">{errors.totalMeterReceived}</p>}
                </div>
              </div>

              <div className="stock-input-cluster">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Adjustments</h4>
                  <AnimatedMeter value={deductionsTotal} className="mt-0 text-base text-slate-900 sm:text-base" />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Second (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-input ${errors.second ? 'form-input-error' : ''}`}
                      placeholder="0.00"
                      value={form.second}
                      onChange={(e) => {
                        const nextValue = normalizeNonNegativeInput(e.target.value);
                        if (nextValue === null) return;
                        setForm((currentForm) => ({ ...currentForm, second: nextValue }));
                        setErrors((currentErrors) => ({ ...currentErrors, second: '', finalReport: '' }));
                      }}
                    />
                    {errors.second && <p className="form-error">{errors.second}</p>}
                  </div>

                  <div>
                    <label className="form-label">Unchecked (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-input ${errors.unchecked ? 'form-input-error' : ''}`}
                      placeholder="0.00"
                      value={form.unchecked}
                      onChange={(e) => {
                        const nextValue = normalizeNonNegativeInput(e.target.value);
                        if (nextValue === null) return;
                        setForm((currentForm) => ({ ...currentForm, unchecked: nextValue }));
                        setErrors((currentErrors) => ({ ...currentErrors, unchecked: '', finalReport: '' }));
                      }}
                    />
                    {errors.unchecked && <p className="form-error">{errors.unchecked}</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="stock-workspace-card section-reveal" style={{ animationDelay: '160ms' }}>
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{form.type === 'regular' ? 'Bale Details' : 'Than Details'}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-slate-100 text-slate-600">{entryRowsCount} rows</span>
                <span className="badge bg-emerald-100 text-emerald-700">{soldRowsCount} sold</span>
                <span className="badge bg-blue-100 text-blue-700">{inStockRowsCount} in stock</span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={form.type === 'regular' ? addBaleRow : addThanRow}
                >
                  <MdAdd className="text-lg" />
                  {form.type === 'regular' ? 'Add Bale Row' : 'Add Than Row'}
                </button>
              </div>
            </div>

            {form.type === 'regular' ? (
              <>
                {errors.baleDetails && <p className="mt-3 form-error text-sm">{errors.baleDetails}</p>}
                <div className="stock-table-pane mt-3 rounded-[20px] border border-slate-200 bg-white/80">
                  <table className="min-w-[680px] w-full text-sm">
                    <thead className="table-header">
                      <tr>
                        <th className="w-10 px-3 py-3 text-left">#</th>
                        <th className="px-3 py-3 text-left">Bale No *</th>
                        <th className="w-[150px] px-3 py-3 text-left">Meter *</th>
                        <th className="px-3 py-3 text-left">Bill No</th>
                        <th className="w-[110px] px-3 py-3 text-center">Status</th>
                        <th className="w-10 px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {baleDetails.map((bale, index) => (
                        <tr key={bale.id} className="border-b border-slate-100">
                          <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                          <td className="px-3 py-3">
                            <input
                              className={`form-input py-2 ${errors[`bale_${bale.id}_baleNo`] ? 'form-input-error' : ''}`}
                              placeholder="Bale No"
                              value={bale.baleNo}
                              onChange={(e) => updateBale(bale.id, 'baleNo', e.target.value)}
                            />
                            {errors[`bale_${bale.id}_baleNo`] && <p className="form-error">{errors[`bale_${bale.id}_baleNo`]}</p>}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className={`form-input py-2 ${errors[`bale_${bale.id}_meter`] ? 'form-input-error' : ''}`}
                              placeholder="0.00"
                              value={bale.meter}
                              onChange={(e) => updateBale(bale.id, 'meter', e.target.value)}
                            />
                            {errors[`bale_${bale.id}_meter`] && <p className="form-error">{errors[`bale_${bale.id}_meter`]}</p>}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              className="form-input py-2"
                              placeholder="Bill No (if sold)"
                              value={bale.billNo}
                              onChange={(e) => updateBale(bale.id, 'billNo', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            {bale.billNo && bale.billNo.trim() !== '' ? (
                              <span className="badge bg-emerald-100 text-emerald-700 text-xs">Sold</span>
                            ) : (
                              <span className="badge bg-slate-100 text-slate-500 text-xs">Stock</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {baleDetails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBaleRow(bale.id)}
                                className="rounded-lg p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <MdClose />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-blue-200 bg-blue-50">
                        <td colSpan={2} className="px-3 py-3 text-right text-xs font-semibold text-slate-600">Meter of Total Bales:</td>
                        <td className="px-3 py-3 text-sm font-bold font-mono text-blue-700">
                          <AnimatedMeter value={meterOfTotalBales} className="mt-0 text-sm text-blue-700 sm:text-sm" />
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <>
                {errors.thanDetails && <p className="mt-3 form-error text-sm">{errors.thanDetails}</p>}
                <div className="stock-table-pane mt-3 rounded-[20px] border border-slate-200 bg-white/80">
                  <table className="min-w-[620px] w-full text-sm">
                    <thead className="table-header">
                      <tr>
                        <th className="w-10 px-3 py-3 text-left">#</th>
                        <th className="w-[150px] px-3 py-3 text-left">Than Meter *</th>
                        <th className="w-[120px] px-3 py-3 text-center">Sold?</th>
                        <th className="px-3 py-3 text-center">Bale Details</th>
                        <th className="w-10 px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {thanDetails.map((than, index) => (
                        <tr key={than.id} className="border-b border-slate-100">
                          <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className={`form-input py-2 ${errors[`than_${than.id}_thanMeter`] ? 'form-input-error' : ''}`}
                              placeholder="0.00"
                              value={than.thanMeter}
                              onChange={(e) => updateThan(than.id, 'thanMeter', e.target.value)}
                            />
                            {errors[`than_${than.id}_thanMeter`] && <p className="form-error">{errors[`than_${than.id}_thanMeter`]}</p>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded text-blue-600"
                                checked={than.checked}
                                onChange={(e) => updateThan(than.id, 'checked', e.target.checked)}
                              />
                              <span className="text-xs font-medium text-slate-600">{than.checked ? 'Sold' : 'Stock'}</span>
                            </label>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button type="button" className="btn-secondary btn-xs" onClick={() => openBalePopup(than, index)}>
                              {than.baleDetails.length > 0 ? `${than.baleDetails.length} Bale(s)` : '+ Add Bales'}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            {thanDetails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeThanRow(than.id)}
                                className="rounded-lg p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <MdClose />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-purple-200 bg-purple-50">
                        <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600">Meter of Total Than:</td>
                        <td className="px-3 py-3 text-sm font-bold font-mono text-purple-700">
                          <AnimatedMeter value={meterOfTotalThan} className="mt-0 text-sm text-purple-700 sm:text-sm" />
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </section>

          <div className="sticky bottom-2 z-20 section-reveal" style={{ animationDelay: '220ms' }}>
            <div className="sticky-command-bar">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="stock-action-note">
                  {flowMeterLabel}: {flowMeterValue.toFixed(2)} m of {totalMeter.toFixed(2)} m received.
                  {remaining < 0 ? ' Adjust row totals before saving.' : ''}
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onCancel}>
                    <MdArrowBack /> Cancel
                  </button>
                  <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
                    <MdSave />
                    {saving ? 'Saving...' : isEdit ? 'Update Stock' : 'Save Stock'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="order-1 space-y-3 xl:order-2 xl:sticky xl:top-24 xl:self-start">
          <div className="stock-workspace-card section-reveal" style={{ animationDelay: '140ms' }}>
            <h3 className="text-base font-semibold text-slate-900">Entry Snapshot</h3>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-800">{entryDateLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Mill</span>
                <span className="font-semibold text-slate-800">{selectedMillName}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Quality</span>
                <span className="font-semibold text-slate-800">{selectedQualityName}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Design</span>
                <span className="font-semibold text-slate-800">{selectedDesignName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="stock-mini-stat p-2.5">
                  <p className="stock-kicker">Rows</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{entryRowsCount}</p>
                </div>
                <div className="stock-mini-stat p-2.5">
                  <p className="stock-kicker">Progress</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{completionRatio.toFixed(0)}%</p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${form.type === 'regular' ? 'bg-blue-600' : 'bg-purple-600'}`}
                      style={{ width: `${completionWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="stock-workspace-card section-reveal" style={{ animationDelay: '180ms' }}>
            <h3 className="text-base font-semibold text-slate-900">Live Calculations</h3>
            {errors.finalReport && <p className="mt-2 form-error">{errors.finalReport}</p>}

            <div className="mt-2 space-y-1.5">
              <div className={`rounded-xl border px-3 py-2 ${finalReportToneClass}`}>
                <p className={`stock-kicker ${finalReport < 0 ? 'text-red-700' : 'text-blue-700'}`}>Final Report</p>
                <AnimatedMeter
                  value={finalReport}
                  className={finalReport < 0 ? 'mt-1 text-lg text-red-600 sm:text-lg' : 'mt-1 text-lg text-blue-700 sm:text-lg'}
                />
              </div>
              <div className={`rounded-xl border px-3 py-2 ${remainingToneClass}`}>
                <p className="stock-kicker">{flowMeterLabel}</p>
                <AnimatedMeter value={flowMeterValue} className="mt-1 text-lg text-slate-900 sm:text-lg" />
              </div>
              <div className={`rounded-xl border px-3 py-2 ${remainingToneClass}`}>
                <p className="stock-kicker">Remaining</p>
                <AnimatedMeter
                  value={remaining}
                  className={remaining < 0 ? 'mt-1 text-lg text-red-600 sm:text-lg' : 'mt-1 text-lg text-slate-900 sm:text-lg'}
                />
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="stock-kicker text-emerald-700">Meter Sold</p>
                <AnimatedMeter value={meterSold} className="mt-1 text-lg text-emerald-700 sm:text-lg" />
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="stock-kicker text-blue-700">Stock Remaining</p>
                <AnimatedMeter value={stockRemaining} className="mt-1 text-lg text-blue-700 sm:text-lg" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="stock-kicker">Second + Unchecked</p>
                <AnimatedMeter value={deductionsTotal} className="mt-1 text-lg text-slate-900 sm:text-lg" />
              </div>
            </div>

            <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-2.5">
              <p className="metric-kicker">Breakdown</p>
              <div className="mt-2 space-y-1.5">
                <BreakdownRow label="Total received" value={totalMeter} />
                <BreakdownRow label={`Less: ${breakdownLabel}`} value={flowMeterValue} />
                <BreakdownRow label="Less: Second" value={second} />
                <BreakdownRow label="Less: Unchecked" value={unchecked} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
