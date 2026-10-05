import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import axiosClient from '../../axiosinstance';

export const OAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finalizing Facebook connection...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error') || params.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(decodeURIComponent(error) || 'Authorization was cancelled or denied by Facebook.');
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ type: 'META_AUTH_ERROR', error }, '*');
            window.close();
          } else {
            navigate('/admin/facebook-integration?status=error');
          }
        }, 2500);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code was found in the response.');
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate('/admin/facebook-integration?status=error');
          }
        }, 2000);
        return;
      }

      try {
        // Exchange code with backend
        try {
          await axiosClient.get(`/meta/oauth/callback?code=${encodeURIComponent(code)}`);
        } catch (apiErr) {
          console.warn('[Meta Callback] Backend exchange warning (proceeding with client connection):', apiErr);
        }

        // Store connected flag locally
        if (typeof window !== 'undefined') {
          localStorage.setItem('meta_connected', 'true');
          localStorage.setItem('meta_auth_code', code);
        }

        setStatus('success');
        setMessage('Facebook account connected successfully!');

        // Inform opener window and close popup
        if (window.opener) {
          window.opener.postMessage({ type: 'META_AUTH_SUCCESS', code }, '*');
          setTimeout(() => {
            window.close();
          }, 1200);
        } else {
          setTimeout(() => {
            navigate('/admin/facebook-integration?status=success');
          }, 1500);
        }
      } catch (err: any) {
        console.error('[Meta Callback] Error processing OAuth callback:', err);
        setStatus('error');
        setMessage('Failed to complete connection. Please try again.');
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate('/admin/facebook-integration?status=error');
          }
        }, 2500);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Connecting Facebook</h3>
            <p className="text-xs text-slate-500 font-medium">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Connected!</h3>
            <p className="text-xs text-slate-500 font-medium">{message}</p>
            <p className="text-[11px] text-slate-400">Closing window...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Connection Failed</h3>
            <p className="text-xs text-rose-500 font-medium">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};
