import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { completeMailboxOAuth } from '../../../services/api';

export default function MailboxOAuthCallback() {
  const location = useLocation();
  const pendingRequest = useRef(null);
  const [status, setStatus] = useState('Connecting mailbox…');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(location.search);
    const finish = async () => {
      const providerError = params.get('error');
      if (providerError) {
        sessionStorage.removeItem('mailbox_oauth_pending');
        if (providerError === 'access_denied') {
          throw new Error('Google denied mailbox access (access_denied). If you approved the request, check that the selected Google account is listed under Google Auth Platform → Audience → Test users, then start a new connection.');
        }
        if (providerError === 'admin_policy_enforced') {
          throw new Error('Your Google Workspace administrator blocked mailbox access (admin_policy_enforced). Ask the administrator to allow this app, then start a new connection.');
        }
        throw new Error(`Google could not authorize the mailbox (${providerError}). Start a new connection after checking the app settings.`);
      }
      let pending;
      try { pending = JSON.parse(sessionStorage.getItem('mailbox_oauth_pending') || 'null'); } catch { /* Invalid state is rejected below. */ }
      if (!params.get('code') || !pending?.provider || !pending?.state || pending.state !== params.get('state')) {
        throw new Error('This mailbox connection has expired or belongs to another tab. Start again from Email & SMS Setup.');
      }
      if (!pendingRequest.current) pendingRequest.current = completeMailboxOAuth({
        provider: pending.provider, code: params.get('code'), state: pending.state,
      });
      await pendingRequest.current;
      sessionStorage.removeItem('mailbox_oauth_pending');
      window.history.replaceState(null, '', location.pathname);
    };
    finish().then(() => { if (active) setStatus('Mailbox connected. You can now return to the lead and send email.'); })
      .catch((err) => { if (active) setError(err?.response?.data?.detail || err.message || 'Could not connect mailbox.'); });
    return () => { active = false; };
  }, [location.search, location.pathname]);
  return <section className="max-w-lg mx-auto mt-8 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
    <h1 className="text-xl font-bold">Connect mailbox</h1>
    {error ? <p role="alert" className="text-red-700">{error}</p> : <p role="status">{status}</p>}
    <Link to="/settings/communications/setup" className="text-primary font-semibold">Return to Email & SMS Setup</Link>
  </section>;
}
