import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DuplicateMeasuresModal } from './DuplicateMeasuresModal';

describe('DuplicateMeasuresModal Component', () => {
  it('renders modal when open and triggers onDuplicate on confirm', () => {
    const handleDuplicate = vi.fn();
    const handleClose = vi.fn();

    const { getByText, getByRole } = render(
      <DuplicateMeasuresModal
        isOpen={true}
        onClose={handleClose}
        totalMeasures={8}
        onDuplicate={handleDuplicate}
      />
    );

    expect(getByText('Duplicate Range of Measures')).not.toBeNull();
    expect(getByText('Duplicate & Append')).not.toBeNull();

    // Submit form
    const submitBtn = getByRole('button', { name: /Duplicate & Append/i });
    fireEvent.click(submitBtn);

    expect(handleDuplicate).toHaveBeenCalledWith(1, 8);
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DuplicateMeasuresModal
        isOpen={false}
        onClose={() => {}}
        totalMeasures={4}
        onDuplicate={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
