import { useState } from 'react';
import { logAction, notify, useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { FilePicker, PageHeader, StatusBadge } from '../../components/common';
import { ConfirmModal, Modal } from '../../components/modals/Modal';
import { addYears, daysUntil, fmtDate, fmtDateTime, fmtMoney } from '../../utils/format';

export const RENEWAL_FEE = 3500;
export const RENEWAL_FLOW = ['Not Yet Submitted', 'Pending Review', 'Pending Payment', 'Payment Verification', 'Approved'];

export default function Renewal() {
  const { state, mutate, user } = useStore();
  const toast = useToast();
  const agent = user.agent;
  const requests = state.renewals.filter((r) => r.agentId === agent.id).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  const active = requests.find((r) => !['Approved', 'Rejected'].includes(r.status));
  const last = requests[0];
  const left = daysUntil(agent.membershipExpiry);
  const eligible = left <= 90 && !['Suspended', 'Resigned'].includes(agent.status);
  const status = active?.status || 'Not Yet Submitted';

  const [form, setForm] = useState({ period: '1 year', doc: null, note: '', confirm: false });
  const [errors, setErrors] = useState({});
  const [review, setReview] = useState(false);
  const [pay, setPay] = useState(false);
  const [payForm, setPayForm] = useState({ method: 'Bank transfer', slip: null });
  const [infoReply, setInfoReply] = useState({ text: '', doc: null });

  const fee = form.period === '2 years' ? RENEWAL_FEE * 2 - 500 : RENEWAL_FEE;

  const openReview = () => {
    const e = {};
    if (!form.doc) e.doc = 'Upload your PDPA refresher training certificate.';
    if (!form.confirm) e.confirm = 'Please confirm your details are up to date.';
    setErrors(e);
    if (!Object.keys(e).length) setReview(true);
  };
  const submit = () => {
    const id = `REN-${String(state.counters.ren).padStart(4, '0')}`;
    const now = new Date().toISOString();
    mutate((d) => {
      d.counters.ren++;
      d.renewals.unshift({ id, agentId: agent.id, requestedAt: now, period: form.period, fee, paymentStatus: 'Unpaid', paymentRef: '', status: 'Pending Review', note: form.note.trim(),
        documents: [{ id: 'RD1', type: 'PDPA training certificate', fileName: form.doc.fileName, size: form.doc.size, uploadedAt: now, status: 'Pending' }],
        infoRequest: null, rejectionReason: '', history: [{ at: now, text: 'Renewal request submitted' }] });
      d.agents.find((a) => a.id === agent.id).activity.unshift({ at: now, text: `Submitted membership renewal request ${id}` });
      notify(d, ['role:agentManager', 'role:agentManager'], { category: 'Membership renewal reminders', title: `Renewal request: ${user.name}`, body: `${id} · ${form.period} · waiting for document review`, link: `/renewals?open=${id}` });
      logAction(d, user, 'Submitted membership renewal', id);
    });
    setReview(false);
    setForm({ period: '1 year', doc: null, note: '', confirm: false });
    toast(`Renewal request ${id} submitted. Status: Pending Review.`);
  };
  const submitPayment = () => {
    if (!payForm.slip && payForm.method === 'Bank transfer') { setErrors({ slip: 'Upload your transfer slip.' }); return; }
    const ref = `TRF-${Math.floor(10000 + Math.random() * 89999)}`;
    mutate((d) => {
      const r = d.renewals.find((x) => x.id === active.id);
      r.paymentStatus = 'Paid'; r.paymentRef = ref; r.paymentMethod = payForm.method; r.status = 'Payment Verification'; r.slip = payForm.slip?.fileName || null;
      r.history.push({ at: new Date().toISOString(), text: `Payment submitted via ${payForm.method} (${ref})` });
      notify(d, ['role:agentManager', 'role:agentManager'], { category: 'Membership renewal reminders', title: `Renewal payment submitted: ${user.name}`, body: `${r.id} is ready for payment verification.`, link: `/renewals?open=${r.id}` });
      logAction(d, user, 'Submitted renewal payment (simulated)', `${r.id} / ${ref}`);
    });
    setPay(false); setErrors({});
    toast(`Payment of ${fmtMoney(active.fee)} recorded (ref ${ref}). Awaiting verification.`, 'success', 'Simulated payment');
  };
  const answerInfo = () => {
    if (infoReply.text.trim().length < 5) { setErrors({ info: 'Please respond to the request.' }); return; }
    mutate((d) => {
      const r = d.renewals.find((x) => x.id === active.id);
      r.infoRequest.response = infoReply.text.trim(); r.infoRequest.respondedAt = new Date().toISOString();
      if (infoReply.doc) r.documents.push({ id: `RD${r.documents.length + 1}`, type: 'Additional document', fileName: infoReply.doc.fileName, size: infoReply.doc.size, uploadedAt: new Date().toISOString(), status: 'Pending' });
      r.history.push({ at: new Date().toISOString(), text: 'Agent responded to information request' });
      notify(d, ['role:agentManager', 'role:agentManager'], { category: 'Membership renewal reminders', title: `${user.name} responded on ${r.id}`, body: infoReply.text.trim().slice(0, 80), link: `/renewals?open=${r.id}` });
    });
    setInfoReply({ text: '', doc: null }); setErrors({});
    toast('Response sent to the back office.');
  };

  const stepIdx = RENEWAL_FLOW.indexOf(status);

  return (
    <>
      <PageHeader title="Membership Renewal" subtitle="Renew your VBEYOND agent membership before it expires." crumbs={[{ label: 'My Account' }, { label: 'Membership Renewal' }]} />
      <div className="row g-3 mb-3">
        <div className="col-md-3 col-6"><div className="card h-100"><div className="card-body"><div className="small text-muted">Membership status</div><div className="mt-1"><StatusBadge status={agent.status} /></div></div></div></div>
        <div className="col-md-3 col-6"><div className="card h-100"><div className="card-body"><div className="small text-muted">Start date</div><div className="fw-semibold mt-1">{fmtDate(agent.membershipStart)}</div></div></div></div>
        <div className="col-md-3 col-6"><div className="card h-100"><div className="card-body"><div className="small text-muted">Expiration date</div><div className={`fw-semibold mt-1 ${left < 60 ? 'text-danger' : ''}`}>{fmtDate(agent.membershipExpiry)}</div><small className="text-muted">{left > 0 ? `${left} days left` : `Expired ${-left} days ago`}</small></div></div></div>
        <div className="col-md-3 col-6"><div className="card h-100"><div className="card-body"><div className="small text-muted">Renewal eligibility</div>
          <div className="mt-1">{eligible ? <span className="status-badge sb-green">Eligible</span> : <span className="status-badge sb-gray">Not yet eligible</span>}</div>
          <small className="text-muted">{['Suspended', 'Resigned'].includes(agent.status) ? `Not available while ${agent.status.toLowerCase()}` : eligible ? 'Window open' : `Opens ${fmtDate(new Date(new Date(agent.membershipExpiry) - 90 * 86400000).toISOString())}`}</small></div></div></div>
      </div>

      <div className="card mb-3"><div className="card-body">
        <div className="d-flex justify-content-between flex-wrap gap-2 mb-3"><h2 className="h6 mb-0">Renewal status</h2><StatusBadge status={last && !active ? last.status : status} /></div>
        <div className="stepper">
          {RENEWAL_FLOW.map((s, i) => <div key={s} className={`step ${stepIdx > i || (last?.status === 'Approved' && !active) ? 'done' : stepIdx === i ? 'active' : ''}`}><span className="num">{stepIdx > i ? <i className="bi bi-check" /> : i + 1}</span>{s}</div>)}
        </div>
      </div></div>

      <div className="row g-3">
        <div className="col-lg-7">
          {!active && (
            <div className="card">
              <div className="card-header">Submit a renewal request</div>
              <div className="card-body">
                {!eligible ? (
                  <div className="alert alert-light border mb-0">
                    {['Suspended', 'Resigned'].includes(agent.status) ? `Renewal is not available while your status is ${agent.status}. Contact your Agent Manager.` : `Your renewal window opens 90 days before expiry. You have ${left} days left on your current membership.`}
                  </div>
                ) : (
                  <div className="d-grid gap-3">
                    {last?.status === 'Rejected' && <div className="alert alert-danger small mb-0"><strong>Previous request {last.id} was rejected:</strong> {last.rejectionReason}</div>}
                    <div>
                      <label className="form-label required">Renewal period</label>
                      <div className="d-flex gap-2 flex-wrap">
                        {['1 year', '2 years'].map((p) => (
                          <label key={p} className={`border rounded p-3 flex-fill ${form.period === p ? 'border-primary bg-brand-soft' : ''}`} style={{ cursor: 'pointer', minWidth: 160 }}>
                            <input type="radio" className="form-check-input me-2" name="period" checked={form.period === p} onChange={() => setForm({ ...form, period: p })} />
                            <strong>{p}</strong><div className="small text-muted">{fmtMoney(p === '2 years' ? RENEWAL_FEE * 2 - 500 : RENEWAL_FEE)}{p === '2 years' ? ' · save ฿500' : ''}</div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <FilePicker id="rn-doc" label="PDPA refresher training certificate" required current={form.doc} error={errors.doc} onSelect={(f) => setForm({ ...form, doc: f })} />
                    <div><label className="form-label" htmlFor="rn-n">Note to back office (optional)</label><textarea id="rn-n" rows={2} className="form-control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
                    <div className="form-check">
                      <input id="rn-c" type="checkbox" className={`form-check-input ${errors.confirm ? 'is-invalid' : ''}`} checked={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.checked })} />
                      <label className="form-check-label" htmlFor="rn-c">My contact details and license information in My Profile are up to date.</label>
                      {errors.confirm && <div className="invalid-feedback d-block">{errors.confirm}</div>}
                    </div>
                    <div className="text-end"><button className="btn btn-primary" onClick={openReview}>Review renewal details</button></div>
                  </div>
                )}
              </div>
            </div>
          )}
          {active && (
            <div className="card">
              <div className="card-header d-flex justify-content-between"><span>Request {active.id}</span><small className="text-muted fw-normal">Submitted {fmtDateTime(active.requestedAt)}</small></div>
              <div className="card-body d-grid gap-3">
                <dl className="dl-grid mb-0">
                  <div><dt>Period</dt><dd>{active.period}</dd></div>
                  <div><dt>Fee</dt><dd>{fmtMoney(active.fee)}</dd></div>
                  <div><dt>Payment</dt><dd><StatusBadge status={active.paymentStatus} /></dd></div>
                  <div><dt>New expiry (if approved)</dt><dd>{fmtDate(addYears(new Date(agent.membershipExpiry) > new Date() ? agent.membershipExpiry : new Date().toISOString(), active.period === '2 years' ? 2 : 1))}</dd></div>
                </dl>
                <div>
                  <div className="small text-muted mb-1">Supporting documents</div>
                  {active.documents.map((d) => <div key={d.id} className="doc-tile mb-2"><div className="doc-icon"><i className="bi bi-file-earmark-text" /></div><div className="flex-grow-1"><div className="small text-muted">{d.type}</div><div className="fw-medium">{d.fileName}</div></div><StatusBadge status={d.status} /></div>)}
                </div>
                {active.status === 'Pending Review' && !active.infoRequest?.message && <div className="alert alert-brand small mb-0"><i className="bi bi-hourglass-split me-1" />The back office is reviewing your documents. You'll be asked to pay once they're verified.</div>}
                {active.infoRequest && !active.infoRequest.response && (
                  <div className="border border-warning rounded p-3">
                    <div className="fw-semibold mb-1"><i className="bi bi-question-diamond me-1 text-warning" />Additional information requested</div>
                    <p className="small">{active.infoRequest.message}</p>
                    <textarea aria-label="Response" className={`form-control mb-2 ${errors.info ? 'is-invalid' : ''}`} rows={2} value={infoReply.text} onChange={(e) => setInfoReply({ ...infoReply, text: e.target.value })} placeholder="Your response" />
                    {errors.info && <div className="invalid-feedback d-block mb-2">{errors.info}</div>}
                    <FilePicker id="rn-info" label="Additional document (optional)" current={infoReply.doc} onSelect={(f) => setInfoReply({ ...infoReply, doc: f })} />
                    <button className="btn btn-primary btn-sm mt-2" onClick={answerInfo}>Send response</button>
                  </div>
                )}
                {active.status === 'Pending Payment' && (
                  <div className="border rounded p-3 bg-brand-soft d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div><div className="fw-semibold">Documents verified — payment required</div><small className="text-muted">Pay {fmtMoney(active.fee)} to continue.</small></div>
                    <button className="btn btn-success" onClick={() => setPay(true)}><i className="bi bi-credit-card me-1" />Pay renewal fee</button>
                  </div>
                )}
                {active.status === 'Payment Verification' && <div className="alert alert-brand small mb-0"><i className="bi bi-shield-check me-1" />Payment {active.paymentRef} received. The back office is verifying it.</div>}
              </div>
            </div>
          )}
          {!active && last?.status === 'Approved' && <div className="alert alert-success mt-3"><i className="bi bi-patch-check-fill me-1" />Your last renewal ({last.id}) was approved. Membership valid until {fmtDate(agent.membershipExpiry)}.</div>}
        </div>
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-header">Renewal instructions</div>
            <div className="card-body small">
              <ol className="ps-3 mb-0 d-grid gap-1">
                <li>Renewal opens 90 days before your membership expires.</li>
                <li>Complete the PDPA refresher training and upload the certificate.</li>
                <li>The back office verifies your documents (1–2 business days).</li>
                <li>Pay the membership fee ({fmtMoney(RENEWAL_FEE)} per year).</li>
                <li>Once payment is verified, your expiry date is extended automatically.</li>
              </ol>
            </div>
          </div>
          <div className="card">
            <div className="card-header">Renewal history</div>
            <div className="list-group list-group-flush">
              {requests.map((r) => (
                <div key={r.id} className="list-group-item">
                  <div className="d-flex justify-content-between"><strong>{r.id}</strong><StatusBadge status={r.status} /></div>
                  <small className="text-muted">{fmtDate(r.requestedAt)} · {r.period} · {fmtMoney(r.fee)}</small>
                  <ul className="small text-muted mb-0 mt-1 ps-3">{r.history.slice(-3).map((h, i) => <li key={i}>{h.text}</li>)}</ul>
                </div>
              ))}
              {!requests.length && <div className="list-group-item small text-muted">No renewal requests yet.</div>}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal open={review} onClose={() => setReview(false)} onConfirm={submit} title="Review renewal details" confirmLabel="Submit renewal request">
        <dl className="d-grid gap-2 mb-0 small">
          <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Agent</dt><dd className="mb-0">{user.name} ({agent.id})</dd></div>
          <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Period</dt><dd className="mb-0">{form.period}</dd></div>
          <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Fee</dt><dd className="mb-0">{fmtMoney(fee)}</dd></div>
          <div className="d-flex justify-content-between"><dt className="fw-normal text-muted">Document</dt><dd className="mb-0">{form.doc?.fileName}</dd></div>
        </dl>
        <p className="small text-muted mt-3 mb-0">Payment is requested after your documents are verified.</p>
      </ConfirmModal>

      <Modal open={pay} onClose={() => setPay(false)} title="Pay renewal fee (simulated)" footer={<><button className="btn btn-light" onClick={() => setPay(false)}>Cancel</button><button className="btn btn-success" onClick={submitPayment}>Confirm payment of {fmtMoney(active?.fee)}</button></>}>
        <div className="alert alert-warning small"><i className="bi bi-info-circle me-1" />This is a simulated payment — no money is charged.</div>
        <label className="form-label">Payment method</label>
        <div className="d-grid gap-2 mb-3">
          {['Bank transfer', 'PromptPay QR', 'Credit card'].map((m) => (
            <label key={m} className={`border rounded p-2 ${payForm.method === m ? 'border-primary bg-brand-soft' : ''}`} style={{ cursor: 'pointer' }}>
              <input type="radio" className="form-check-input me-2" name="pm" checked={payForm.method === m} onChange={() => setPayForm({ ...payForm, method: m })} />{m}
            </label>
          ))}
        </div>
        {payForm.method === 'Bank transfer' && <>
          <div className="small border rounded p-2 mb-2 bg-light">VBEYOND Development Co., Ltd. · Kasikornbank · 123-4-56789-0</div>
          <FilePicker id="slip" label="Transfer slip" required current={payForm.slip} error={errors.slip} onSelect={(f) => setPayForm({ ...payForm, slip: f })} />
        </>}
        {payForm.method === 'PromptPay QR' && <div className="text-center border rounded p-3"><i className="bi bi-qr-code display-3" /><div className="small text-muted">Scan with any banking app (demo)</div></div>}
        {payForm.method === 'Credit card' && <div className="row g-2"><div className="col-12"><input className="form-control" placeholder="4111 1111 1111 1111" aria-label="Card number" /></div><div className="col-6"><input className="form-control" placeholder="MM/YY" aria-label="Expiry" /></div><div className="col-6"><input className="form-control" placeholder="CVC" aria-label="CVC" /></div></div>}
      </Modal>
    </>
  );
}
