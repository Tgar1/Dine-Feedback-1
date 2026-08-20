import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';

export default function QRGenerator() {
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const search = useSearch();
  const params = new URLSearchParams(search);
  const location = params.get('location') || 'rodina';

  useEffect(() => {
    const feedbackUrl = `${window.location.origin}/?location=${location}`;

    // Generate QR code using a free API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(feedbackUrl)}`;
    setQrImageUrl(qrApiUrl);
  }, [location]);

  const feedbackUrl = `${window.location.origin}/?location=${location}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `feedback-qr-${location}.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          QR Code for {location}
        </h1>

        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Print or display this code so customers can leave feedback
        </p>

        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          display: 'inline-block',
          border: '1px solid #ddd'
        }}>
          {qrImageUrl && (
            <img src={qrImageUrl} alt="QR Code" style={{ maxWidth: '300px' }} />
          )}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleDownload}
            style={{
              background: '#0F6E56',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Download PNG
          </button>
          <button
            onClick={handlePrint}
            style={{
              background: '#666',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Print
          </button>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '14px', color: '#999' }}>
          URL: {feedbackUrl}
        </p>
      </div>
    </div>
  );
}