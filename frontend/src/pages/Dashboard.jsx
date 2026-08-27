import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Brand from '../components/Brand';
import DatePicker from '../components/DatePicker';
import { formatDateDMY } from '../utils/date';

function authHeaders() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

function Dashboard({ user }) {
  const [sheets, setSheets] = useState([]);
  const [signedSheets, setSignedSheets] = useState([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [dates, setDates] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    setSheetsLoading(true);
    try {
      const [ownedRes, signedRes] = await Promise.all([
        axios.get('/api/sheets', authHeaders()),
        axios.get('/api/sheets/signed', authHeaders())
      ]);
      setSheets(ownedRes.data);
      setSignedSheets(signedRes.data);
    } catch (err) {
      // ignore — lists stay empty
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleDownloadPDF = async (sheetId, sheetTitle) => {
    try {
      const res = await axios.get(`/api/sheets/${sheetId}/export-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheetTitle}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !location || dates.length === 0 || !deadline) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('/api/sheets', {
        title,
        location,
        dates,
        submission_deadline: deadline
      }, authHeaders());

      setSuccess(`Sheet created! Share this link: /sheets/${res.data.id}`);
      setTimeout(() => {
        navigate(`/admin/sheets/${res.data.id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (sheetId) => {
    const link = `${window.location.origin}/sheets/${sheetId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(sheetId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div>
      <div className="header">
        <div className="nav">
          <Brand />
          <div>
            <span>{user.name}</span>
            <Link to="/profile" style={{ marginLeft: '20px', color: 'white' }}>
              Edit Profile
            </Link>
            <button onClick={handleLogout} style={{ marginLeft: '20px' }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Active Signing Sheets</h2>
          <button onClick={() => setShowCreateForm(s => !s)}>
            {showCreateForm ? 'Cancel' : '+ New Sheet'}
          </button>
        </div>

        {sheetsLoading ? (
          <div className="empty-state">Loading sheets...</div>
        ) : sheets.length === 0 ? (
          <div className="empty-state">
            No signing sheets yet. Click "+ New Sheet" to create your first one.
          </div>
        ) : (
          <div style={{ marginBottom: '30px' }}>
            {sheets.map(sheet => (
              <div
                key={sheet.id}
                className={`sheet-card${sheet.status === 'finalized' ? ' sheet-card-finalized' : ''}`}
              >
                <div className="sheet-card-info">
                  <h3 className="sheet-title">{sheet.title}</h3>
                  <div className="sheet-card-meta">
                    {sheet.location} · {sheet.dates.map(formatDateDMY).join(', ')}
                  </div>
                  <div className="sheet-card-meta">
                    <span className={`badge ${sheet.status === 'finalized' ? 'badge-finalized' : 'badge-open'}`}>
                      {sheet.status === 'finalized' ? 'Finalized' : 'Open'}
                    </span>
                    {' '}
                    {sheet.attendee_count} attendee{sheet.attendee_count === 1 ? '' : 's'}
                    {sheet.pending_count > 0 && (
                      <>
                        {' '}
                        <span className="badge badge-pending">{sheet.pending_count} pending</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="sheet-card-actions">
                  <button className="btn-secondary" onClick={() => handleCopyLink(sheet.id)}>
                    {copiedId === sheet.id ? 'Copied!' : 'Share Link'}
                  </button>
                  {sheet.status === 'finalized' && (
                    <button
                      className="btn-secondary"
                      onClick={() => handleDownloadPDF(sheet.id, sheet.title)}
                    >
                      Download PDF
                    </button>
                  )}
                  <Link to={`/admin/sheets/${sheet.id}`}>
                    <button>Open</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!sheetsLoading && signedSheets.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ marginBottom: '16px' }}>Sheets You've Signed</h2>
            {signedSheets.map(sheet => (
              <div
                key={sheet.id}
                className={`sheet-card${sheet.status === 'finalized' ? ' sheet-card-finalized' : ''}`}
              >
                <div className="sheet-card-info">
                  <h3 className="sheet-title">{sheet.title}</h3>
                  <div className="sheet-card-meta">
                    {sheet.location} · {sheet.dates.map(formatDateDMY).join(', ')}
                  </div>
                  <div className="sheet-card-meta">
                    <span className={`badge ${sheet.status === 'finalized' ? 'badge-finalized' : 'badge-open'}`}>
                      {sheet.status === 'finalized' ? 'Finalized' : 'Open'}
                    </span>
                    {' '}
                    <span className="badge">Owned by {sheet.owner_name}</span>
                  </div>
                </div>
                <div className="sheet-card-actions">
                  {sheet.status === 'finalized' && (
                    <button
                      className="btn-secondary"
                      onClick={() => handleDownloadPDF(sheet.id, sheet.title)}
                    >
                      Download PDF
                    </button>
                  )}
                  <Link to={`/sheets/${sheet.id}`}>
                    <button>View</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateForm && (
          <div style={{ maxWidth: '600px' }}>
            <h2>Create Signing Sheet</h2>

            {success && <div className="success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Sugar Board Strategy Meeting"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Nairobi HQ"
                />
              </div>

              <div className="form-group">
                <label>Meeting Dates</label>
                <DatePicker value={dates} onChange={setDates} minDate={new Date()} />
              </div>

              <div className="form-group">
                <label>Submission Deadline</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Sheet'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
