import type { ReactNode } from 'react';

// Marks every case-insensitive occurrence of `term` in `name`. Built from React nodes, so a name
// is always text and never markup.
export function highlight(name: string, term: string): ReactNode[] {
  const needle = term.trim().toLowerCase();
  if (needle === '') return [name];
  const haystack = name.toLowerCase();
  const nodes: ReactNode[] = [];
  let from = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, from)) {
    if (at > from) nodes.push(name.slice(from, at));
    from = at + needle.length;
    nodes.push(
      <mark className="hit" key={at}>
        {name.slice(at, from)}
      </mark>,
    );
  }
  if (from < name.length) nodes.push(name.slice(from));
  return nodes;
}
