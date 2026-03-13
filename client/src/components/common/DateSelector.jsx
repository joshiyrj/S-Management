import { useEffect, useMemo, useRef, useState } from 'react';
import { MdCalendarMonth, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { formatDateDDMMYYYY, normalizeDateInput, parseDisplayDate } from '../../utils/date';

const WEEK_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const getCalendarGrid = (year, monthIndex) => {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const days = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

export default function DateSelector({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  className = '',
  error = false,
}) {
  const pickerRef = useRef(null);
  const selectedDate = parseDisplayDate(value);
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() || now.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() || now.getMonth());

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!pickerRef.current || pickerRef.current.contains(event.target)) return;
      setOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const monthTitle = useMemo(
    () =>
      new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [viewYear, viewMonth]
  );

  const monthGrid = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const moveMonth = (direction) => {
    setViewMonth((currentMonth) => {
      const nextMonth = currentMonth + direction;
      if (nextMonth < 0) {
        setViewYear((year) => year - 1);
        return 11;
      }
      if (nextMonth > 11) {
        setViewYear((year) => year + 1);
        return 0;
      }
      return nextMonth;
    });
  };

  const selectDay = (day) => {
    if (!day) return;
    const selected = new Date(viewYear, viewMonth, day);
    onChange(formatDateDDMMYYYY(selected));
    setOpen(false);
  };

  const isSelectedDay = (day) => {
    if (!day || !selectedDate) return false;
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day) => {
    if (!day) return false;
    return now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
  };

  return (
    <div ref={pickerRef} className={`date-picker ${className}`}>
      <div className={`date-picker-input-wrap ${error ? 'date-picker-input-wrap-error' : ''}`}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          className="date-picker-input"
          value={value || ''}
          placeholder={placeholder}
          onChange={(event) => onChange(normalizeDateInput(event.target.value))}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          className="date-picker-trigger"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle date picker"
        >
          <MdCalendarMonth className={`h-5 w-5 transition-transform duration-200 ${open ? 'scale-110 text-blue-600' : 'text-slate-500'}`} />
        </button>
      </div>

      {open && (
        <div className="date-picker-popover">
          <div className="date-picker-header">
            <button type="button" className="date-picker-nav" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <MdChevronLeft className="h-5 w-5" />
            </button>
            <p className="date-picker-title">{monthTitle}</p>
            <button type="button" className="date-picker-nav" onClick={() => moveMonth(1)} aria-label="Next month">
              <MdChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="date-picker-week">
            {WEEK_LABELS.map((label) => (
              <span key={label} className="date-picker-week-label">
                {label}
              </span>
            ))}
          </div>

          <div className="date-picker-grid">
            {monthGrid.map((day, index) => (
              <button
                key={`${viewYear}-${viewMonth}-${index}`}
                type="button"
                className={`date-picker-day ${!day ? 'date-picker-day-empty' : ''} ${isSelectedDay(day) ? 'date-picker-day-selected' : ''} ${
                  isToday(day) ? 'date-picker-day-today' : ''
                }`}
                onClick={() => selectDay(day)}
                disabled={!day}
              >
                {day || ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
