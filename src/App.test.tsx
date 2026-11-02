import { render, screen } from '@testing-library/react';
import { App } from '@/App';

describe('App', () => {
  it('renders the dashboard title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Inventory Dashboard' })).toBeInTheDocument();
  });
});
