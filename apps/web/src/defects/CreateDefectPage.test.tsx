import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreateDefectPage from './CreateDefectPage';

const projects = [
  { id: 'p1', name: 'Payments portal' },
  { id: 'p2', name: 'Field service app' },
];

describe('CreateDefectPage', () => {
  it('shows the form with Medium as the default severity and a Cancel link to My work', () => {
    render(<CreateDefectPage projects={projects} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Create defect' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toHaveDisplayValue('Payments portal');
    expect(screen.getByLabelText('Severity')).toHaveDisplayValue('Medium');
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '#/');
  });

  it('asks for a title next to the field when it is empty', () => {
    render(<CreateDefectPage projects={projects} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create defect' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a title so others can recognise this defect.',
    );
    expect(screen.getByLabelText('Title')).toBeInvalid();
  });

  it('says creating defects is coming soon once the title is filled in', () => {
    render(<CreateDefectPage projects={projects} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Broken login' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create defect' }));
    expect(screen.getByRole('status')).toHaveTextContent('Creating defects is coming soon.');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
