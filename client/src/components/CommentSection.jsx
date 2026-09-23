import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Avatar, Loader, ErrorAlert } from './common';
import { ConfirmModal } from './Modals';
import { timeAgo, formatDate } from '../pipes';
import { validate, commentSchema } from '../utils/validators';

/** Interaction between users: comments on a scouting report. */
export default function CommentSection({ reportId }) {
  const { user, isLoggedIn } = useAuth();
  const { data: comments, loading, error, reload, setData } = useAsync(() => api.getComments(reportId), [reportId]);
  const [text, setText] = useState('');
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { id, text }
  const [toDelete, setToDelete] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate({ text }, commentSchema);
    if (errs.text) return setFormError(errs.text);
    setBusy(true);
    setFormError(null);
    try {
      const c = await api.addComment(reportId, text.trim());
      setData((list) => [...list, c]);
      setText('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    const errs = validate({ text: editing.text }, commentSchema);
    if (errs.text) return setFormError(errs.text);
    try {
      const c = await api.updateComment(editing.id, editing.text.trim());
      setData((list) => list.map((x) => (x._id === c._id ? c : x)));
      setEditing(null);
      setFormError(null);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const confirmDelete = async () => {
    await api.deleteComment(toDelete._id);
    setData((list) => list.filter((x) => x._id !== toDelete._id));
    setToDelete(null);
  };

  return (
    <div className="card">
      <div className="card-header"><i className="bi bi-chat-dots me-1" />Коментари ({comments?.length ?? 0})</div>
      <div className="card-body">
        <ErrorAlert error={error} onRetry={reload} />
        {loading ? <Loader /> : comments?.length === 0 && <p className="text-muted">Сè уште нема коментари.</p>}
        {comments?.map((c) => (
          <div key={c._id} className="d-flex mb-3 gap-2">
            <Avatar name={c.author?.username || '?'} admin={c.author?.role === 'admin'} />
            <div className="flex-grow-1">
              <strong>{c.author?.username || 'избришан корисник'}</strong>
              {c.author?.role === 'admin' && <span className="badge text-bg-danger ms-1">admin</span>}
              <small className="text-muted ms-2" title={formatDate(c.createdAt, 'long')}>{timeAgo(c.createdAt)}{c.edited && ' · изменет'}</small>
              {editing?.id === c._id ? (
                <div className="mt-1">
                  <textarea className="form-control form-control-sm mb-1" rows={2} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
                  <button type="button" className="btn btn-sm btn-primary me-1" onClick={saveEdit}>Зачувај</button>
                  <button type="button" className="btn btn-sm btn-link" onClick={() => setEditing(null)}>Откажи</button>
                </div>
              ) : <p className="mb-0 comment-text">{c.text}</p>}
              <div className="small">
                {user && c.author?._id === user._id && editing?.id !== c._id && (
                  <button type="button" className="btn btn-link btn-sm p-0 me-2" onClick={() => setEditing({ id: c._id, text: c.text })}>Уреди</button>
                )}
                {user && (user.role === 'admin' || c.author?._id === user._id) && (
                  <button type="button" className="btn btn-link btn-sm p-0 text-danger" onClick={() => setToDelete(c)}>Избриши</button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoggedIn ? (
          <form onSubmit={submit} noValidate className="d-print-none">
            <textarea className={`form-control mb-2${formError ? ' is-invalid' : ''}`} rows={2} placeholder="Напиши коментар..." value={text} maxLength={500}
              onChange={(e) => { setText(e.target.value); setFormError(null); }} aria-label="Коментар" />
            {formError && <div className="invalid-feedback d-block mb-2">{formError}</div>}
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">{text.length}/500</small>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>Објави</button>
            </div>
          </form>
        ) : (
          <p className="small text-muted mb-0 d-print-none"><Link to="/login">Најавете се</Link> за да коментирате.</p>
        )}
      </div>
      <ConfirmModal show={!!toDelete} title="Избриши коментар" confirmText="Избриши" onCancel={() => setToDelete(null)} onConfirm={confirmDelete}>
        Дали сте сигурни дека сакате да го избришете коментарот?
      </ConfirmModal>
    </div>
  );
}
