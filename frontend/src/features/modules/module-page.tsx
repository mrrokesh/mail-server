import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ErrorNote, Field } from '../../components/ui/field';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

export interface ModuleField {
  name: string;
  label: string;
  type?: 'text' | 'number';
}

export function ModulePage<T extends { id: string }>({
  title,
  blurb,
  queryKey,
  listPath,
  createPath,
  createLabel,
  sheetTitle,
  empty,
  fields,
  parseList,
  parseItem,
  titleOf,
  linesOf,
  bodyOf,
  SelectedExtra,
}: {
  title: string;
  blurb: string;
  queryKey: string[];
  listPath: string;
  createPath: string;
  createLabel: string;
  sheetTitle: string;
  empty: string;
  fields: ModuleField[];
  parseList: (input: unknown) => T[] | null;
  parseItem: (input: unknown) => T | null;
  titleOf: (item: T) => string;
  linesOf: (item: T) => string[];
  bodyOf: (values: Record<string, string>) => unknown | null;
  SelectedExtra?: (props: { item: T }) => ReactNode;
}) {
  useDocumentTitle(title);
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey,
    queryFn: () => readOrFallback(listPath, parseList, [] as T[]),
    staleTime: 30 * 1000,
  });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<'list' | 'read'>('list');
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (list.data ?? []).filter((item) => {
      if (!needle) return true;
      return `${titleOf(item)} ${linesOf(item).join(' ')}`.toLowerCase().includes(needle);
    });
  }, [linesOf, list.data, query, titleOf]);
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const body = bodyOf(values);
    if (!body) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    try {
      const result = await writeOrFallback(
        createPath,
        { method: 'POST', body: JSON.stringify(body) },
        parseItem,
        () => null as unknown as T,
      );
      if (!result.data?.id) {
        setCode('API-SRV-500');
        return;
      }
      queryClient.setQueryData<T[]>(queryKey, (current = []) => [...current, result.data]);
      setSelectedId(result.data.id);
      setOpen(false);
      setValues({});
      setPane('read');
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">{title}</h1>
      <section className="pane pane-nav">
        <div className="pane-head">
          <p className="strong">{title}</p>
        </div>
        <p className="pane-note muted">{blurb}</p>
      </section>
      <section className="pane pane-list" aria-label={title}>
        <div className="pane-head">
          <label className="visually-hidden" htmlFor={`${title}-search`}>
            Search {title}
          </label>
          <input
            id={`${title}-search`}
            className="input"
            type="search"
            placeholder={`Search ${title.toLowerCase()}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            {createLabel}
          </button>
        </div>
        {list.isPending ? <SkeletonLines /> : null}
        {list.isError ? (
          <div className="read">
            <ErrorNote code={list.error instanceof ApiProblem ? list.error.code : 'API-SRV-500'} />
          </div>
        ) : null}
        {visible.length === 0 && !list.isPending && !list.isError ? (
          <p className="read muted">{empty}</p>
        ) : null}
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            className="person"
            aria-selected={item.id === selected?.id}
            onClick={() => {
              setSelectedId(item.id);
              setPane('read');
            }}
          >
            <span>{titleOf(item)}</span>
          </button>
        ))}
      </section>
      <article className="pane pane-read">
        {selected ? (
          <div className="read">
            <button
              type="button"
              className="btn btn-text mobile-only"
              onClick={() => setPane('list')}
            >
              Back
            </button>
            <h2 className="h3">{titleOf(selected)}</h2>
            {linesOf(selected).map((line) => (
              <p key={line} className="break">
                {line}
              </p>
            ))}
            {SelectedExtra ? <SelectedExtra item={selected} /> : null}
          </div>
        ) : (
          <p className="read muted">Nothing selected.</p>
        )}
      </article>
      <Sheet open={open} title={sheetTitle} onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={onCreate} noValidate>
          {fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              type={field.type ?? 'text'}
              value={values[field.name] ?? ''}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.name]: event.target.value }))
              }
            />
          ))}
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Saving' : createLabel}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
