import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createRecord, listEmployeesWithoutOnboarding } from '../api/onboarding';
import type { Employee, RecordDetail } from '../api/onboarding';
import { Modal } from '../shell/Modal';

export function StartOnboardingModal({
  onClose,
  onStarted,
}: {
  onClose: () => void;
  onStarted: (record: RecordDetail) => void;
}) {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [errors, setErrors] = useState<{ employee?: string; startDate?: string }>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    listEmployeesWithoutOnboarding()
      .then(setEmployees)
      .catch(() => {
        setEmployees([]);
        setFailed(true);
      });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      employee: employeeId ? undefined : 'Choose an employee.',
      startDate: startDate ? undefined : 'Enter a start date.',
    };
    setErrors(next);
    if (next.employee || next.startDate) return;
    setPending(true);
    setFailed(false);
    try {
      onStarted(await createRecord({ employeeId, startDate }));
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <Modal titleId="start-title" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <h2 id="start-title">Start onboarding</h2>
        {failed && (
          <div className="alert alert-danger" role="alert">
            We couldn't start this onboarding. Check the details and try again.
          </div>
        )}
        <div className="field">
          <label htmlFor="f-employee">Employee</label>
          <select
            id="f-employee"
            className={`input${errors.employee ? ' is-invalid' : ''}`}
            value={employeeId}
            disabled={employees === null}
            aria-describedby={errors.employee ? 'f-employee-err' : undefined}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">{employees === null ? 'Loading employees' : 'Choose an employee'}</option>
            {employees?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.displayName}
              </option>
            ))}
          </select>
          {errors.employee && (
            <p className="field-error" id="f-employee-err" role="alert">{errors.employee}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="f-date">Start date</label>
          <input
            id="f-date"
            className={`input${errors.startDate ? ' is-invalid' : ''}`}
            type="date"
            value={startDate}
            aria-describedby={errors.startDate ? 'f-date-err' : undefined}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {errors.startDate && (
            <p className="field-error" id="f-date-err" role="alert">{errors.startDate}</p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Starting…' : 'Start onboarding'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
