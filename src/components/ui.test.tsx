import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from './ui';

describe('ProgressRing', () => {
  it('renders children and clamps progress', () => {
    render(
      <ProgressRing pct={2} size={100} stroke={10}>
        <span>تم</span>
      </ProgressRing>,
    );
    expect(screen.getByText('تم')).toBeInTheDocument();
    const circle = screen.getByTestId('ring-progress');
    // نسبة أكبر من 100% تُقيَّد إلى 1 فيكون الإزاحة صفراً
    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
  });

  it('shows no progress at 0', () => {
    render(<ProgressRing pct={0} size={100} stroke={10} />);
    const circle = screen.getByTestId('ring-progress');
    const dash = Number(circle.getAttribute('stroke-dasharray'));
    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(dash);
  });
});
