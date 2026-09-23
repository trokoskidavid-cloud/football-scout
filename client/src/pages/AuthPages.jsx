import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import { validate, loginSchema, registerSchema, COUNTRIES } from '../utils/validators';

function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const onChange = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  return { values, setValues, errors, setErrors, serverError, setServerError, busy, setBusy, onChange };
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const f = useForm({ email: '', password: '' });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f.values, loginSchema);
    f.setErrors(errs);
    if (Object.keys(errs).length) return;
    f.setBusy(true);
    f.setServerError(null);
    try {
      await login(f.values.email.trim(), f.values.password);
      navigate(location.state?.from || '/players', { replace: true });
    } catch (err) {
      f.setServerError(err.message);
      f.setErrors(err.errors || {});
    } finally {
      f.setBusy(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h3 mb-3 text-center"><i className="bi bi-box-arrow-in-right" /> Најава</h1>
            {location.state?.from && <div className="alert alert-info small">Најавете се за да продолжите.</div>}
            {f.serverError && <div className="alert alert-danger">{f.serverError}</div>}
            <form onSubmit={submit} noValidate className="row g-3">
              <FormField label="Е-пошта" name="email" type="email" value={f.values.email} onChange={f.onChange} error={f.errors.email} autoComplete="email" required />
              <FormField label="Лозинка" name="password" type="password" value={f.values.password} onChange={f.onChange} error={f.errors.password} autoComplete="current-password" required />
              <div className="col-12">
                <button type="submit" className="btn btn-primary w-100" disabled={f.busy}>
                  {f.busy && <span className="spinner-border spinner-border-sm me-2" />}Најави се
                </button>
              </div>
            </form>
            <p className="text-center mt-3 mb-0">Немаш профил? <Link to="/register">Регистрирај се</Link></p>
            <details className="small text-muted mt-3">
              <summary>Тест сметки</summary>
              admin@footballscout.mk / Admin1234 (администратор)<br />troko@footballscout.mk / Scout1234 (скаут)
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const f = useForm({ username: '', fullName: '', email: '', password: '', confirmPassword: '', country: 'North Macedonia', emailNotifications: true });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f.values, registerSchema);
    f.setErrors(errs);
    if (Object.keys(errs).length) return;
    f.setBusy(true);
    f.setServerError(null);
    try {
      const { confirmPassword, ...data } = f.values;
      await register({ ...data, username: data.username.trim(), email: data.email.trim(), fullName: data.fullName.trim() || undefined });
      navigate('/players', { replace: true, state: { welcome: true } });
    } catch (err) {
      f.setServerError(err.message);
      f.setErrors(err.errors || {});
    } finally {
      f.setBusy(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-9 col-lg-7">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h3 mb-3"><i className="bi bi-person-plus" /> Регистрација на скаут</h1>
            {f.serverError && <div className="alert alert-danger">{f.serverError}</div>}
            <form onSubmit={submit} noValidate className="row g-3">
              <FormField className="col-md-6" label="Корисничко име" name="username" value={f.values.username} onChange={f.onChange} error={f.errors.username} help="3–20 знаци: букви, бројки, точка и _" required />
              <FormField className="col-md-6" label="Име и презиме" name="fullName" value={f.values.fullName} onChange={f.onChange} error={f.errors.fullName} />
              <FormField label="Е-пошта" name="email" type="email" value={f.values.email} onChange={f.onChange} error={f.errors.email} required />
              <FormField className="col-md-6" label="Лозинка" name="password" type="password" value={f.values.password} onChange={f.onChange} error={f.errors.password} help="Мин. 8 знаци, буква и бројка" autoComplete="new-password" required />
              <FormField className="col-md-6" label="Потврди лозинка" name="confirmPassword" type="password" value={f.values.confirmPassword} onChange={f.onChange} error={f.errors.confirmPassword} autoComplete="new-password" required />
              <FormField className="col-md-6" label="Држава" name="country" type="select" value={f.values.country} onChange={f.onChange} error={f.errors.country} options={COUNTRIES.map((c) => [c, c])} />
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="notif" checked={f.values.emailNotifications} onChange={(e) => f.onChange('emailNotifications', e.target.checked)} />
                  <label className="form-check-label" htmlFor="notif">Сакам известувања по е-пошта</label>
                </div>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-success w-100" disabled={f.busy}>
                  {f.busy && <span className="spinner-border spinner-border-sm me-2" />}Креирај профил
                </button>
              </div>
            </form>
            <p className="text-center mt-3 mb-0">Веќе имаш профил? <Link to="/login">Најави се</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
