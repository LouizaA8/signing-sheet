import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import axios from 'axios';
import Brand from '../components/Brand';
import AttendeeFields, { emptyAttendeeFields, attendeeFieldsValid, attendeeFieldsFromProfile } from '../components/AttendeeFields';

function authHeaders() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

function EditProfile({ user, setUser }) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState(emptyAttendeeFields);
  const [existingSignature, setExistingSignature] = useState(user.signature || '');
  const [redrawing, setRedrawing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setFields(attendeeFieldsFromProfile(user));
  }, [user]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name) {
      setError('Name is required');
      return;
    }

    if (!attendeeFieldsValid(fields)) {
      setError('Please fill in department, organization, phone, gender, and age bracket');
      return;
    }

    if (redrawing && (!signaturePadRef.current || signaturePadRef.current.isEmpty())) {
      setError('Please draw your new signature, or cancel redrawing');
      return;
    }

    setLoading(true);

    try {
      const signature = redrawing ? signaturePadRef.current.toDataURL('image/png') : undefined;

      const res = await axios.patch('/api/auth/me', {
        name,
        password: password || undefined,
        signature,
        ...fields
      }, authHeaders());

      setUser(res.data);
      setExistingSignature(res.data.signature);
      setRedrawing(false);
      setPassword('');
      setSuccess('Profile updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div className="nav">
          <Brand />
          <span>{user.name}</span>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '500px' }}>
        <h2>Edit Profile</h2>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled />
          </div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <AttendeeFields values={fields} onChange={setFields} />

          <div className="form-group">
            <label>New Password (leave blank to keep current)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Signature</label>
            {!redrawing ? (
              <>
                {existingSignature && (
                  <div className="canvas-container">
                    <img src={existingSignature} alt="Current signature" style={{ maxHeight: '100px' }} />
                  </div>
                )}
                <button type="button" onClick={() => setRedrawing(true)} style={{ marginTop: '10px' }}>
                  Redraw Signature
                </button>
              </>
            ) : (
              <>
                <div className="canvas-container">
                  <canvas
                    ref={canvasRef}
                    width={430}
                    height={150}
                    onMouseEnter={initSignaturePad}
                  />
                </div>
                <button type="button" onClick={handleClearSignature} style={{ marginTop: '10px' }}>
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => { setRedrawing(false); signaturePadRef.current = null; }}
                  style={{ marginTop: '10px', marginLeft: '10px', background: '#6c757d' }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <p style={{ marginTop: '20px' }}>
          <Link to="/">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}

export default EditProfile;
