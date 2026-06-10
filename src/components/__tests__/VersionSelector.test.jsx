import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VersionSelector from '../VersionSelector';

describe('VersionSelector', () => {
  it('marks v1 as active by default', () => {
    render(<VersionSelector />);

    expect(screen.getByRole('button', { name: 'V1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'V2' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'V3' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the selected version', () => {
    const onChange = vi.fn();
    render(<VersionSelector value="v1" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'V2' }));

    expect(onChange).toHaveBeenCalledWith('v2');
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<VersionSelector value="v1" onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole('button', { name: 'V3' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
