import React from 'react';
import { useOrientation } from '../hooks/useOrientation';

function OrientationBanner() {
  const orientation = useOrientation();

  // Only show on mobile portrait
  if (orientation === 'landscape') {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '16px',
        margin: '16px',
        background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(138, 43, 226, 0.15) 100%)',
        border: '2px solid rgba(0, 217, 255, 0.4)',
        borderRadius: '12px',
        color: '#00d9ff',
        fontSize: '14px',
        fontWeight: '600',
        textAlign: 'center',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    >
      <span style={{ fontSize: '24px' }}>📱</span>
      <span>
        <strong>Tip:</strong> Rotate your device to landscape for better chart visibility!
      </span>
      <span style={{ fontSize: '24px' }}>↔️</span>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @media (max-width: 768px) {
          @media (orientation: portrait) {
            [role="banner"] {
              margin: 12px;
              padding: 12px;
              font-size: 12px;
            }
          }
        }
      `}</style>
    </div>
  );
}

export default OrientationBanner;

