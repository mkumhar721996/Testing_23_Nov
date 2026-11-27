import { describe, expect, it } from 'vitest';
import { defectHref, parseRoute } from './routes';

describe('parseRoute', () => {
  it.each(['', '#', '#/', '#/unknown'])('maps %j to My work', (hash) => {
    expect(parseRoute(hash)).toEqual({ name: 'my-work' });
  });

  it('maps the create-defect form', () => {
    expect(parseRoute('#/defects/new')).toEqual({ name: 'create-defect' });
  });

  it('maps a defect page and decodes its id', () => {
    expect(parseRoute('#/defects/d1')).toEqual({ name: 'defect', id: 'd1' });
    expect(parseRoute('#/defects/a%2Fb')).toEqual({ name: 'defect', id: 'a/b' });
  });
});

describe('defectHref', () => {
  it('builds a hash link to the defect page', () => {
    expect(defectHref('d1')).toBe('#/defects/d1');
    expect(defectHref('a/b')).toBe('#/defects/a%2Fb');
  });
});
