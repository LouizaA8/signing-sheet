function AttendeeFields({ values, onChange, disabled = false }) {
  const set = (field) => (value) => onChange({ ...values, [field]: value });

  return (
    <>
      <div className="form-group">
        <label>Department</label>
        <input
          type="text"
          name="department"
          autoComplete="off"
          value={values.department}
          onChange={(e) => set('department')(e.target.value)}
          placeholder="e.g., ICT"
          disabled={disabled}
          required
        />
      </div>

      <div className="form-group">
        <label>Organization</label>
        <input
          type="text"
          name="organization"
          autoComplete="organization"
          value={values.organization}
          onChange={(e) => set('organization')(e.target.value)}
          placeholder="e.g., KSB"
          disabled={disabled}
          required
        />
      </div>

      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => set('phone')(e.target.value)}
          placeholder="e.g., 0712345678"
          disabled={disabled}
          required
        />
      </div>

      <div className="form-group">
        <label>Gender</label>
        <div className="radio-group">
          <label>
            <input type="radio" checked={values.gender === 'M'} onChange={() => set('gender')('M')} disabled={disabled} />
            Male
          </label>
          <label>
            <input type="radio" checked={values.gender === 'F'} onChange={() => set('gender')('F')} disabled={disabled} />
            Female
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Living with disability?</label>
        <div className="radio-group">
          <label>
            <input type="radio" checked={values.pwd === false} onChange={() => set('pwd')(false)} disabled={disabled} />
            No
          </label>
          <label>
            <input type="radio" checked={values.pwd === true} onChange={() => set('pwd')(true)} disabled={disabled} />
            Yes
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Age Bracket</label>
        <div className="radio-group">
          <label>
            <input type="radio" checked={values.age_bracket === '<35'} onChange={() => set('age_bracket')('<35')} disabled={disabled} />
            Under 35
          </label>
          <label>
            <input type="radio" checked={values.age_bracket === '35-59'} onChange={() => set('age_bracket')('35-59')} disabled={disabled} />
            35 – 59
          </label>
          <label>
            <input type="radio" checked={values.age_bracket === '59>'} onChange={() => set('age_bracket')('59>')} disabled={disabled} />
            60 and above
          </label>
        </div>
      </div>
    </>
  );
}

export const emptyAttendeeFields = {
  department: '',
  organization: '',
  phone: '',
  gender: '',
  pwd: false,
  age_bracket: ''
};

export function attendeeFieldsValid(values) {
  return Boolean(values.department && values.organization && values.phone && values.gender && values.age_bracket);
}

export function attendeeFieldsFromProfile(profile) {
  return {
    department: profile.department || '',
    organization: profile.organization || '',
    phone: profile.phone || '',
    gender: profile.gender || '',
    pwd: !!profile.pwd,
    age_bracket: profile.age_bracket || ''
  };
}

export default AttendeeFields;
