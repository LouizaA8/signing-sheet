import { useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import axios from 'axios';
import Brand from '../components/Brand';
import AttendeeFields, { emptyAttendeeFields, attendeeFieldsValid } from '../components/AttendeeFields';

function Register({ setUser }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState(emptyAttendeeFields);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

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

    if (!attendeeFieldsValid(fields)) {
      setError('Please fill in department, organization, phone, gender, and age bracket');
      return;
    }

    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError('Please draw your signature');
      return;
    }

    setLoading(true);

    try {
      const signature = signaturePadRef.current.toDataURL('image/png');
      const res = await axios.post('/api/auth/register', {
        email,
        name,
        password,
        signature,
        ...fields
      });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      const me = await axios.get('/api/auth/me');
      setUser(me.data);
      navigate(redirect);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '50px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Brand size="large" />
      </div>
      <h2>Register</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
          <label>Password (optional)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Signature</label>
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={350}
              height={150}
              onMouseEnter={initSignaturePad}
            />
          </div>
          <button type="button" onClick={handleClearSignature} style={{ marginTop: '10px' }}>
            Clear Signature
          </button>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p style={{ marginTop: '20px' }}>
        Already have an account?{' '}
        <Link to={redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}>
          Login
        </Link>
      </p>
    </div>
  );
}

export default Register;
