import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Register, { registerSchema } from '../pages/auth/Register';
import Login from '../pages/auth/Login';
import { passwordStrength } from '../utils/format';
import { mockApi, renderApp, student } from './utils';

describe('password strength', () => {
  it('scores weak and strong passwords', () => {
    expect(passwordStrength('abc').score).toBe(0);
    expect(passwordStrength('Abcdefg1!').score).toBe(4);
  });
});

describe('registerSchema', () => {
  const ok = { name: 'Sam Student', email: 'sam@example.test', password: 'Passw0rd-ok', confirmPassword: 'Passw0rd-ok', role: 'STUDENT' as const };
  it('accepts valid input', () => expect(registerSchema.safeParse(ok).success).toBe(true));
  it('rejects mismatched passwords', () => {
    const r = registerSchema.safeParse({ ...ok, confirmPassword: 'nope' });
    expect(r.success).toBe(false);
  });
  it('rejects weak passwords and bad emails', () => {
    expect(registerSchema.safeParse({ ...ok, password: 'short', confirmPassword: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, email: 'not-an-email' }).success).toBe(false);
  });
});

describe('Register page', () => {
  it('shows validation errors and does not call the API when invalid', async () => {
    const api = mockApi({ 'GET /auth/me': () => ({ status: 401, body: { error: { message: 'Unauthorized' } } }) });
    renderApp(<Register />);
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(api.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('submits valid data, never sending confirmPassword', async () => {
    const api = mockApi({
      'GET /auth/me': () => ({ status: 401, body: { error: { message: 'Unauthorized' } } }),
      'POST /auth/register': { data: { user: student } },
    });
    renderApp(<Routes><Route path="/" element={<Register />} /><Route path="/dashboard" element={<p>student home</p>} /></Routes>);
    await userEvent.type(screen.getByLabelText(/full name/i), 'Sam Student');
    await userEvent.type(screen.getByLabelText(/^email/i), 'sam@example.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd-ok');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Passw0rd-ok');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(api.calls.find((c) => c.path === '/auth/register')).toBeDefined());
    const body = api.calls.find((c) => c.path === '/auth/register')!.body as Record<string, unknown>;
    expect(body).toMatchObject({ name: 'Sam Student', email: 'sam@example.test', role: 'STUDENT' });
    expect(body).not.toHaveProperty('confirmPassword');
    expect(await screen.findByText('student home')).toBeInTheDocument();
  });

  it('shows the server message when the email is already registered', async () => {
    mockApi({
      'GET /auth/me': () => ({ status: 401, body: { error: { message: 'Unauthorized' } } }),
      'POST /auth/register': () => ({ status: 409, body: { error: { message: 'An account with this email already exists' } } }),
    });
    renderApp(<Register />);
    await userEvent.type(screen.getByLabelText(/full name/i), 'Sam Student');
    await userEvent.type(screen.getByLabelText(/^email/i), 'sam@example.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd-ok');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Passw0rd-ok');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    mockApi({ 'GET /auth/me': () => ({ status: 401, body: { error: { message: 'x' } } }) });
    renderApp(<Login />);
    const pw = screen.getByLabelText(/^password/i);
    expect(pw).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(pw).toHaveAttribute('type', 'text');
  });
});

