import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { GEOIP_MAP_URL } from './constants';

// Lazy-load map pieces to avoid build/runtime issues causing whole app to crash
const ComposableMap = React.lazy(() => import('react-simple-maps').then(m => ({ default: m.ComposableMap })));
const Geographies = React.lazy(() => import('react-simple-maps').then(m => ({ default: m.Geographies })));
const Geography = React.lazy(() => import('react-simple-maps').then(m => ({ default: m.Geography })));

export default function GeoMap({ blockedCountries = [], isDark = false, className = '' }) {
    // Simple guard: if no map URL, render placeholder
    if (!GEOIP_MAP_URL) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${className}`}>
                <div className="text-center text-sm">Map data not available</div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading map...</div>}>
                <ComposableMap projectionConfig={{ scale: 135 }} width={760} height={360} className={`w-full h-full ${className}`}>
                    <Geographies geography={GEOIP_MAP_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                try {
                                    const code = geo.properties?.ISO_A2;
                                    const isBlocked = code && blockedCountries.includes(code);
                                    const fill = isBlocked ? '#ef4444' : isDark ? '#0f172a' : '#e2e8f0';

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill={fill}
                                            stroke={isDark ? '#1f2937' : '#94a3b8'}
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: 'none' },
                                                hover: { outline: 'none', fill: isBlocked ? '#b91c1c' : (isDark ? '#1f2937' : '#cbd5e1') },
                                                pressed: { outline: 'none' },
                                            }}
                                        />
                                    );
                                } catch (e) {
                                    // If a single geography fails, skip it instead of crashing the whole map
                                    console.error('Geo rendering error:', e);
                                    return null;
                                }
                            })
                        }
                    </Geographies>
                </ComposableMap>
            </Suspense>
        </ErrorBoundary>
    );
}
