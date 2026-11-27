import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DefectPage from './DefectPage';

describe('DefectPage', () => {
  it('shows the defect id as the heading with a breadcrumb back to My work', () => {
    render(<DefectPage id="d1" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('d1');
    expect(screen.getByRole('link', { name: 'My work' })).toHaveAttribute('href', '#/');
  });
});
