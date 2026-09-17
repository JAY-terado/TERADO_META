import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong', fallbackMessage } = this.props;
      const isInitError =
        this.state.error?.message?.includes('before initialization') ||
        this.state.error?.message?.includes('Cannot access') ||
        this.state.error?.message?.includes('is not defined');

      const displayMessage =
        fallbackMessage ||
        (isInitError
          ? 'A module initialization error occurred. This is usually caused by a circular import or a missing dependency. Please reload the page — the issue often resolves itself after a hard refresh.'
          : this.state.error?.message || 'An unexpected error occurred while rendering this page.');

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '40px 32px',
                boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
                textAlign: 'center',
              }}
            >
              {/* Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.2))',
                    border: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 40px rgba(239,68,68,0.15)',
                  }}
                >
                  <AlertTriangle style={{ width: '40px', height: '40px', color: '#f87171' }} />
                </div>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#fff',
                  marginBottom: '12px',
                  letterSpacing: '-0.5px',
                }}
              >
                {fallbackTitle}
              </h1>

              {/* Message */}
              <p
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  lineHeight: 1.7,
                  marginBottom: '28px',
                  maxWidth: '380px',
                  margin: '0 auto 28px auto',
                }}
              >
                {displayMessage}
              </p>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}
              >
                <button
                  onClick={this.handleReload}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                    transition: 'all 0.2s',
                  }}
                >
                  <RefreshCw style={{ width: '16px', height: '16px' }} />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#cbd5e1',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '13px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Home style={{ width: '16px', height: '16px' }} />
                  Go to Dashboard
                </button>
              </div>

              {/* Error Details Toggle */}
              {this.state.error && (
                <div>
                  <button
                    onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#64748b',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      margin: '0 auto',
                    }}
                  >
                    {this.state.showDetails ? (
                      <><ChevronUp style={{ width: '14px', height: '14px' }} /> Hide technical details</>
                    ) : (
                      <><ChevronDown style={{ width: '14px', height: '14px' }} /> Show technical details</>
                    )}
                  </button>
                  {this.state.showDetails && (
                    <div
                      style={{
                        marginTop: '16px',
                        textAlign: 'left',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '16px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#f87171',
                          fontWeight: 700,
                          marginBottom: '8px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {this.state.error.name}: {this.state.error.message}
                      </p>
                      {this.state.error.stack && (
                        <pre
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            color: '#64748b',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            lineHeight: 1.5,
                            margin: 0,
                          }}
                        >
                          {this.state.error.stack.slice(0, 1000)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#475569', marginTop: '16px' }}>
              If this issue persists, please contact your system administrator.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline API error banner for partial UI sections.
 */
interface ApiErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ApiErrorBanner: React.FC<ApiErrorBannerProps> = ({
  title = 'Failed to load data',
  message,
  onRetry,
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '40px 24px',
      borderRadius: '16px',
      border: '1px solid #fecaca',
      background: 'rgba(254,242,242,0.6)',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AlertTriangle style={{ width: '24px', height: '24px', color: '#ef4444' }} />
    </div>
    <div>
      <p style={{ fontWeight: 700, color: '#b91c1c', fontSize: '14px', marginBottom: '4px' }}>{title}</p>
      <p style={{ fontSize: '12px', color: '#ef4444', lineHeight: 1.6, maxWidth: '360px' }}>{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: '#dc2626',
          color: '#fff',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <RefreshCw style={{ width: '14px', height: '14px' }} />
        Try Again
      </button>
    )}
  </div>
);
