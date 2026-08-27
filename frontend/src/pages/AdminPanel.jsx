import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import axios from 'axios';
import Brand from '../components/Brand';
import AttendeeFields, { emptyAttendeeFields, attendeeFieldsValid } from '../components/AttendeeFields';
import { formatDateDMY } from '../utils/date';

function AdminPanel({ user }) {
  const { id } = useParams();
  const [sheet, setSheet] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingDates, setEditingDates] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAttendee, setNewAttendee] = useState({ name: '', email: '', dates_attended: [], ...emptyAttendeeFields });
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    fetchSheet();
  }, [id]);

  const fetchSheet = async () => {
    try {
      const res = await axios.get(`/api/sheets/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSheet(res.data.sheet);
      setAttendances(res.data.attendances);
    } catch (err) {
      setError('Failed to load sheet');
    } finally {
      setPageLoading(false);
    }
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/sheets/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleExportPDF = async () => {
    try {
      const res = await axios.get(`/api/sheets/${id}/export-pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheet.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError('Failed to export PDF');
    }
  };

  const handleVerifyGuest = async (attendanceId, verify) => {
    setLoading(true);
    try {
      await axios.patch(`/api/attendances/${attendanceId}/verify`, 
        { verified: verify },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess(`Guest ${verify ? 'approved' : 'rejected'}`);
      fetchSheet();
    } catch (err) {
      setError('Failed to verify guest');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDates = (attendance) => {
    setEditingId(attendance.id);
    setEditingDates([...attendance.dates_attended]);
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      await axios.patch(`/api/attendances/${editingId}`,
        { dates_attended: editingDates },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess('Attendance updated');
      setEditingId(null);
      fetchSheet();
    } catch (err) {
      setError('Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleDateToggle = (date, dateList, setDateList) => {
    if (dateList.includes(date)) {
      setDateList(dateList.filter(d => d !== date));
    } else {
      setDateList([...dateList, date]);
    }
  };

  const initSignaturePad = () => {
    if (canvasRef.current && !signaturePadRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255,255,255)'
      });
    }
  };

  const handleAddAttendee = async () => {
    if (!newAttendee.name || !newAttendee.email || newAttendee.dates_attended.length === 0) {
      setError('Please fill all fields and select dates');
      return;
    }

    if (!attendeeFieldsValid(newAttendee)) {
      setError('Please fill in department, organization, phone, gender, and age bracket');
      return;
    }

    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError('Please draw signature');
      return;
    }

    setLoading(true);
    try {
      const signature = signaturePadRef.current.toDataURL('image/png');
      await axios.post('/api/attendances/admin/add',
        {
          sheet_id: id,
          name: newAttendee.name,
          email: newAttendee.email,
          signature,
          dates_attended: newAttendee.dates_attended,
          department: newAttendee.department,
          organization: newAttendee.organization,
          phone: newAttendee.phone,
          gender: newAttendee.gender,
          pwd: newAttendee.pwd,
          age_bracket: newAttendee.age_bracket
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess('Attendee added');
      setShowAddModal(false);
      setNewAttendee({ name: '', email: '', dates_attended: [], ...emptyAttendeeFields });
      signaturePadRef.current.clear();
      fetchSheet();
    } catch (err) {
      setError('Failed to add attendee');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await axios.patch(`/api/sheets/${id}/finalize`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess('Sheet finalized');
      fetchSheet();
    } catch (err) {
      setError('Failed to finalize sheet');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return <div className="container">Loading...</div>;
  if (!sheet) return <div className="container error">Sheet not found</div>;

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
            <Link to="/" style={{ marginLeft: '20px', color: 'white' }}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="container">
        <h2 className="sheet-title">{sheet.title}</h2>
        <p>{sheet.location} | {sheet.dates.map(formatDateDMY).join(' - ')}</p>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleShareLink} style={{ marginRight: '10px', background: 'var(--ksb-green-600)' }}>
            {linkCopied ? 'Link Copied!' : 'Share Link'}
          </button>
          <button onClick={handleExportPDF} style={{ marginRight: '10px' }}>
            Export PDF
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ marginRight: '10px', background: '#28a745' }}
          >
            Add Attendee
          </button>
          <button
            onClick={handleFinalize}
            disabled={sheet.status === 'finalized'}
            style={{ background: sheet.status === 'finalized' ? '#ccc' : '#dc3545' }}
          >
            Finalize Sheet
          </button>
        </div>

        {showAddModal && (
          <div className="modal">
            <div className="modal-content">
              <h3>Add Attendee</h3>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newAttendee.name}
                  onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newAttendee.email}
                  onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                />
              </div>

              <AttendeeFields values={newAttendee} onChange={setNewAttendee} />

              <div className="form-group">
                <label>Dates Attended</label>
                <div className="checkbox-group">
                  {sheet.dates.map(date => (
                    <label key={date}>
                      <input
                        type="checkbox"
                        checked={newAttendee.dates_attended.includes(date)}
                        onChange={() => handleDateToggle(date, newAttendee.dates_attended, (d) => setNewAttendee({ ...newAttendee, dates_attended: d }))}
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
                    width={350}
                    height={120}
                    onMouseEnter={initSignaturePad}
                  />
                </div>
              </div>

              <button onClick={handleAddAttendee} disabled={loading}>
                {loading ? 'Adding...' : 'Add'}
              </button>
              <button onClick={() => setShowAddModal(false)} style={{ marginLeft: '10px', background: '#6c757d' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Department / Org</th>
              <th>Contacts</th>
              <th>Gender</th>
              <th>PWD?</th>
              <th>Age</th>
              {sheet.dates.map(date => <th key={date}>{formatDateDMY(date)}</th>)}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendances.map(att => (
              <tr key={att.id}>
                <td>{att.name}</td>
                <td>
                  {att.department || '—'}
                  {att.organization && <div style={{ fontSize: '12px', color: '#5b6d5e' }}>{att.organization}</div>}
                </td>
                <td>
                  {att.email}
                  {att.phone && att.phone !== att.email && (
                    <div style={{ fontSize: '12px', color: '#5b6d5e' }}>{att.phone}</div>
                  )}
                </td>
                <td>{att.gender || '—'}</td>
                <td>{att.pwd ? 'Yes' : 'No'}</td>
                <td>{att.age_bracket || '—'}</td>
                {editingId === att.id ? (
                  <>
                    {sheet.dates.map(date => (
                      <td key={date}>
                        <input
                          type="checkbox"
                          checked={editingDates.includes(date)}
                          onChange={() => handleDateToggle(date, editingDates, setEditingDates)}
                        />
                      </td>
                    ))}
                  </>
                ) : (
                  <>
                    {sheet.dates.map(date => (
                      <td key={date}>
                        {att.dates_attended.includes(date) && att.signature ? (
                          <img src={att.signature} alt="sig" style={{ height: '40px' }} />
                        ) : (
                          '—'
                        )}
                      </td>
                    ))}
                  </>
                )}
                <td>
                  {att.is_guest && att.verified_by_admin === null && 'Pending'}
                  {att.is_guest && att.verified_by_admin === 1 && 'Approved'}
                  {att.is_guest && att.verified_by_admin === 0 && 'Rejected'}
                  {!att.is_guest && 'Verified'}
                </td>
                <td>
                  {editingId === att.id ? (
                    <>
                      <button onClick={handleSaveEdit} disabled={loading}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ marginLeft: '5px', background: '#6c757d' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditDates(att)} style={{ marginRight: '5px' }}>Edit</button>
                      {att.is_guest && att.verified_by_admin === null && (
                        <>
                          <button onClick={() => handleVerifyGuest(att.id, true)} style={{ marginRight: '5px', background: '#28a745' }}>Approve</button>
                          <button onClick={() => handleVerifyGuest(att.id, false)} style={{ background: '#dc3545' }}>Reject</button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
