import { useState, useRef, useEffect } from 'react';
import { formatDateDMY } from '../utils/date';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

// Booking.com-style calendar: two-month popover, arrow navigation, click to
// toggle dates on/off. Unlike a check-in/check-out range picker, meeting
// dates can be non-consecutive, so selection here is multi-select rather
// than a single contiguous range.
function DatePicker({ value = [], onChange, minDate }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDate = (date) => {
    const iso = toISODate(date);
    if (value.includes(iso)) {
      onChange(value.filter(d => d !== iso));
    } else {
      onChange([...value, iso].sort());
    }
  };

  const isDisabled = (date) => {
    if (!minDate) return false;
    return toISODate(date) < toISODate(minDate);
  };

  const renderMonth = (monthOffset) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1);
    const cells = buildMonthGrid(d.getFullYear(), d.getMonth());
    const todayIso = toISODate(new Date());

    return (
      <div className="dp-month" key={monthOffset}>
        <div className="dp-month-title">{MONTH_NAMES[d.getMonth()]} {d.getFullYear()}</div>
        <div className="dp-weekdays">
          {WEEKDAYS.map(w => <div key={w} className="dp-weekday">{w}</div>)}
        </div>
        <div className="dp-days">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="dp-day dp-day-empty" />;
            const iso = toISODate(date);
            const selected = value.includes(iso);
            const disabled = isDisabled(date);
            const isToday = iso === todayIso;
            return (
              <button
                type="button"
                key={i}
                className={`dp-day${selected ? ' dp-day-selected' : ''}${isToday ? ' dp-day-today' : ''}`}
                disabled={disabled}
                onClick={() => toggleDate(date)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const label = value.length === 0
    ? 'Select meeting dates'
    : `${value.length} date${value.length > 1 ? 's' : ''} selected`;

  return (
    <div className="dp-wrapper" ref={wrapperRef}>
      <button type="button" className="dp-trigger" onClick={() => setOpen(o => !o)}>
        <span>{label}</span>
        <span className="dp-trigger-icon">📅</span>
      </button>

      {value.length > 0 && (
        <div className="dp-chips">
          {[...value].sort().map(d => (
            <span key={d} className="dp-chip">
              {formatDateDMY(d)}
              <button type="button" onClick={() => onChange(value.filter(v => v !== d))}>×</button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="dp-popover">
          <div className="dp-nav">
            <button
              type="button"
              className="dp-nav-btn"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <div className="dp-nav-spacer" />
            <button
              type="button"
              className="dp-nav-btn"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>
          <div className="dp-months">
            {renderMonth(0)}
            {renderMonth(1)}
          </div>
          <div className="dp-footer">
            <button type="button" className="dp-clear" onClick={() => onChange([])}>Clear</button>
            <button type="button" className="dp-done" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
