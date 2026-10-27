import { Component } from 'react';

/**
 * ErrorBoundary — Top-level render crash catcher.
 *
 * Wrap the entire app in this component so that any uncaught render error
 * is displayed as a helpful error screen with a Reload button instead of
 * a blank white page.
 *
 * Usage (in main.jsx or App.jsx):
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for developer visibility
    console.error('[ErrorBoundary] Render crash caught:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorMessage =
      this.state.error?.message || 'An unexpected error occurred.';

    return (
      <div
        id="error-boundary-screen"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'Outfit, system-ui, sans-serif',
          background: '#FAFAF9',
          gap: '1rem',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#FEF2F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            marginBottom: '0.5rem',
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1C1917',
            margin: 0,
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            color: '#78716C',
            maxWidth: 420,
            margin: 0,
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}
        >
          The app encountered an unexpected error and cannot continue. The
          error has been logged to the console.
        </p>

        {/* Error message box */}
        <pre
          id="error-boundary-message"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            borderRadius: 10,
            padding: '0.75rem 1.25rem',
            fontSize: '0.8rem',
            maxWidth: 520,
            width: '100%',
            overflowX: 'auto',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {errorMessage}
        </pre>

        <button
          id="error-boundary-reload-btn"
          onClick={this.handleReload}
          style={{
            marginTop: '0.5rem',
            padding: '0.65rem 1.75rem',
            background: '#D4A017',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#B8860B')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#D4A017')}
        >
          🔄 Reload Page
        </button>
      </div>
    );
  }
}
