import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import axios from 'axios';
import Brand from '../components/Brand';
import ConfirmationScreen from '../components/ConfirmationScreen';
import AttendeeFields, { emptyAttendeeFields, attendeeFieldsValid, attendeeFieldsFromProfile } from '../components/AttendeeFields';
import { formatDateDMY } from '../utils/date';

function SigningSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fields, setFields] = useState(emptyAttendeeFields);
  const [selectedDates, setSelectedDates] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [confirmation, setConfirmation] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [redrawingSignature, setRedrawingSignature] = useState(false);
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchSheet = async () => {
      try {
        const res = await axios.get(`/api/sheets/${id}`);
        setSheet(res.data.sheet);

        if (token) {
          const userRes = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(userRes.data);
          setName(userRes.data.name);
          setEmail(userRes.data.email);
          const profileFields = attendeeFieldsFromProfile(userRes.data);
          setFields(profileFields);
          setProfileComplete(attendeeFieldsValid(profileFields));
          setIsGuest(false);
        }
      } catch (err) {
        setError('Failed to load sheet');
      } finally {
        setPageLoading(false);
      }
    };

    fetchSheet();
  }, [id]);

  const initSignaturePad = () => {
    if (canvasRef.current && !signaturePadRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255,255,255)'
      });
    }
  };

  const handleClearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleDateToggle = (date) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter(d => d !== date));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email) {
      setError('Name and email are required');
      return;
    }

    if (!attendeeFieldsValid(fields)) {
      setError('Please fill in department, organization, phone, gender, and age bracket');
      return;
    }

    if (selectedDates.length === 0) {
      setError('Please select at least one date');
      return;
    }

    const usingStoredSignature = user && !redrawingSignature;

    if (!usingStoredSignature && (!signaturePadRef.current || signaturePadRef.current.isEmpty())) {
      setError('Please draw your signature');
      return;
    }

    setLoading(true);

    try {
      const signature = usingStoredSignature ? user.signature : signaturePadRef.current.toDataURL('image/png');
      await axios.post('/api/attendances', {
        sheet_id: id,
        name,
        email,
        signature,
        dates_attended: selectedDates,
        user_id: user?.id || null,
        ...fields
      });

      setConfirmation({ name, dates: selectedDates });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit signature');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await axios.get(`/api/sheets/${id}/export-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheet.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const handleSignAnother = () => {
    setConfirmation(null);
    setError('');
    setSelectedDates([]);
    setName('');
    setEmail('');
    setFields(emptyAttendeeFields);
    setRedrawingSignature(false);
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  if (pageLoading) return <div className="container">Loading...</div>;
  if (!sheet) return <div className="container error">Sheet not found</div>;

  return (
    <div>
      <div className="header">
        <div className="nav">
          <Brand />
        </div>
      </div>

      <div className="container" style={{ maxWidth: '600px' }}>
        {!confirmation && (
          <>
            <h1 className="sheet-title">{sheet.title}</h1>
            <p>{sheet.location}</p>
            <p>{sheet.dates.map(formatDateDMY).join(' - ')}</p>
          </>
        )}

        {sheet.status === 'finalized' && (
          <button
            onClick={handleDownloadPDF}
            style={{ marginBottom: '20px', background: 'var(--ksb-green-600)' }}
          >
            Download Attendance Sheet (PDF)
          </button>
        )}

        {error && <div className="error">{error}</div>}

        {confirmation ? (
          <ConfirmationScreen
            name={confirmation.name}
            sheetTitle={sheet.title}
            location={sheet.location}
            dates={confirmation.dates}
            actionLabel={user ? 'Back to Dashboard' : 'Sign Another Person'}
            onAction={user ? () => navigate('/') : handleSignAnother}
          />
        ) : sheet.status === 'finalized' ? (
          <div className="success">
            This attendance sheet has been finalized. New signatures are no longer accepted, but the
            final PDF is available above.
          </div>
        ) : !isGuest && user ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} disabled />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} disabled />
            </div>

            {profileComplete && (
              <p style={{ fontSize: '13px', color: '#5b6d5e', marginTop: '-12px', marginBottom: '20px' }}>
                Auto-filled from your profile.
              </p>
            )}

            <AttendeeFields values={fields} onChange={setFields} disabled={profileComplete} />

            <div className="form-group">
              <label>Dates Attended</label>
              <div className="checkbox-group">
                {sheet.dates.map(date => (
                  <label key={date}>
                    <input
                      type="checkbox"
                      checked={selectedDates.includes(date)}
                      onChange={() => handleDateToggle(date)}
                    />
                    {formatDateDMY(date)}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Signature</label>
              {!redrawingSignature ? (
                <>
                  {user.signature && (
                    <div className="canvas-container">
                      <img src={user.signature} alt="Your signature" style={{ maxHeight: '100px' }} />
                    </div>
                  )}
                  <p style={{ fontSize: '13px', color: '#5b6d5e', margin: '8px 0' }}>
                    Auto-filled from your profile.
                  </p>
                  <button type="button" onClick={() => setRedrawingSignature(true)}>
                    Redraw Signature
                  </button>
                </>
              ) : (
                <>
                  <div className="canvas-container">
                    <canvas
                      ref={canvasRef}
                      width={550}
                      height={150}
                      onMouseEnter={initSignaturePad}
                    />
                  </div>
                  <button type="button" onClick={handleClearSignature} style={{ marginTop: '10px' }}>
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRedrawingSignature(false); signaturePadRef.current = null; }}
                    style={{ marginTop: '10px', marginLeft: '10px', background: '#6c757d' }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Signature'}
            </button>
          </form>
        ) : (
          <>
            {!isGuest && !user && (
              <div style={{ marginBottom: '20px' }}>
                <p>Do you have a KSB account?</p>
                <button onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/sheets/${id}`)}`)}>
                  Yes, Login
                </button>
                <button
                  onClick={() => setIsGuest(true)}
                  style={{ marginLeft: '10px', background: '#6c757d' }}
                >
                  No, Sign as Guest
                </button>
                <p style={{ marginTop: '10px', fontSize: '14px' }}>
                  New here?{' '}
                  <Link to={`/register?redirect=${encodeURIComponent(`/sheets/${id}`)}`}>
                    Create an account
                  </Link>
                </p>
              </div>
            )}

            {isGuest && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <AttendeeFields values={fields} onChange={setFields} />

                <div className="form-group">
                  <label>Dates Attended</label>
                  <div className="checkbox-group">
                    {sheet.dates.map(date => (
                      <label key={date}>
                        <input
                          type="checkbox"
                          checked={selectedDates.includes(date)}
                          onChange={() => handleDateToggle(date)}
                        />
                        {formatDateDMY(date)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Signature</label>
                  <div className="canvas-container">
                    <canvas
                      ref={canvasRef}
                      width={550}
                      height={150}
                      onMouseEnter={initSignaturePad}
                    />
                  </div>
                  <button type="button" onClick={handleClearSignature} style={{ marginTop: '10px' }}>
                    Clear Signature
                  </button>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Signature'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SigningSheet;
