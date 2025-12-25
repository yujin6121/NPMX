import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, componentStack: '' };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Keep this console output: it helps identify the real error behind minified stacks.
        console.error('UI crashed:', error);
        console.error('Component stack:', errorInfo?.componentStack);

        this.setState({ componentStack: errorInfo?.componentStack || '' });
    }

    render() {
        if (this.state.hasError) {
            const { fallback } = this.props;
            if (fallback) return fallback;
            return (
                <div style={{ padding: 16 }}>
                    <h2 style={{ fontWeight: 700, marginBottom: 8 }}>UI Error</h2>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error || 'Unknown error')}</pre>
                    {this.state.componentStack ? (
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, opacity: 0.85 }}>
                            {this.state.componentStack}
                        </pre>
                    ) : null}
                </div>
            );
        }

        return this.props.children;
    }
}
