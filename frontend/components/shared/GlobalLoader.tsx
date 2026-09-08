'use client';

export default function GlobalLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999,
      }}
    >
      {/* Brand Spinner Container */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer Pulsing Ring */}
        <div
          style={{
            position: 'absolute',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 198, 58, 0.4)',
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          }}
        />
        {/* Rotating Spinner Ring */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid #e2e8f0',
            borderTopColor: '#ffc63a',
            borderRightColor: '#ffc63a',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>

      {/* Keyframe Animations */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
