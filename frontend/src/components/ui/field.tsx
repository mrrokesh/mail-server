import type { ErrorCode } from '@mrrokesh/shared';
import { ERROR_CODES } from '@mrrokesh/shared';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';

interface ErrorProps {
  error?: string;
  code?: ErrorCode;
}

export function ErrorNote({ code, detail }: { code: ErrorCode; detail?: string }) {
  const spec = ERROR_CODES[code];
  return (
    <p className="field-error" role="alert">
      {detail ?? (spec.message || spec.meaning)} <span className="code">{code}</span>
      {spec.action ? <span className="muted"> {spec.action}</span> : null}
    </p>
  );
}

export function Field({
  label,
  error,
  code,
  ...props
}: { label: string } & ErrorProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="field">
      <label className="caption" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        aria-invalid={Boolean(error || code)}
        aria-describedby={error || code ? `${id}-error` : undefined}
        {...props}
      />
      {code ? (
        <div id={`${id}-error`}>
          <ErrorNote code={code} detail={error} />
        </div>
      ) : error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  error,
  code,
  ...props
}: { label: string } & ErrorProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="field">
      <label className="caption" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="textarea"
        aria-invalid={Boolean(error || code)}
        aria-describedby={error || code ? `${id}-error` : undefined}
        {...props}
      />
      {code ? (
        <div id={`${id}-error`}>
          <ErrorNote code={code} detail={error} />
        </div>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="field">
      <label className="caption" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="select" {...props}>
        {children}
      </select>
    </div>
  );
}
