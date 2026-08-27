import { formatDateDMY } from '../utils/date';

function ConfirmationScreen({ name, sheetTitle, location, dates, actionLabel, onAction }) {
  return (
    <div className="confirmation">
      <div className="confirmation-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2>You're signed in!</h2>
      <p className="confirmation-name">Thanks, {name}.</p>

      <div className="confirmation-details">
        <div className="confirmation-details-title sheet-title">{sheetTitle}</div>
        <div>{location}</div>
        <div className="confirmation-details-dates">
          Signed for: {dates.map(formatDateDMY).join(', ')}
        </div>
      </div>

      {onAction && (
        <button onClick={onAction} style={{ marginTop: '20px' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default ConfirmationScreen;
