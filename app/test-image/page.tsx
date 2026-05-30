'use client';

import { useState } from 'react';
import { uploadFirmImage } from '@/services/imageUploadService';

export default function TestImagePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTestUpload = async () => {
    // Create a test image file
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, 800, 200);
      ctx.fillStyle = '#ffffff';
      ctx.font = '40px Arial';
      ctx.fillText('Test Letterhead', 50, 120);
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'test-letterhead.png', { type: 'image/png' });
        uploadImage(file);
      }
    }, 'image/png');
  };

  const uploadImage = async (file: File) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await uploadFirmImage(file, 'test-firm-id', 'letterhead');
      setUrl(result.url);
      console.log('Upload successful:', result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Test Image Upload</h1>
        <p className="mt-2 text-slate-600">Test Firebase Storage image upload</p>

        {error && (
          <div className="mt-4 rounded bg-red-100 p-4 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Test Upload</h2>
          
          <button
            onClick={handleTestUpload}
            disabled={loading}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:bg-blue-400"
          >
            {loading ? 'Uploading...' : 'Upload Test Image'}
          </button>

          {url && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold">Uploaded URL:</h3>
              <div className="mt-2 rounded bg-slate-100 p-4">
                <p className="font-mono text-sm text-slate-700">{url}</p>
              </div>

              <h3 className="mt-6 text-lg font-semibold">Image Preview:</h3>
              <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-4">
                <div
                  className="h-24 w-full bg-cover bg-top"
                  style={{ backgroundImage: `url(${url})` }}
                />
              </div>

              <h3 className="mt-6 text-lg font-semibold">Direct Image Tag:</h3>
              <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-4">
                <img src={url} alt="Test" className="h-24 w-full object-cover" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Debug Info</h2>
          
          <div className="mt-4 space-y-2">
            <p><strong>URL:</strong> {url || 'Not uploaded yet'}</p>
            <p><strong>Is Firebase URL:</strong> {url?.startsWith('https://firebasestorage.googleapis.com/') ? 'Yes' : 'No'}</p>
            <p><strong>URL Length:</strong> {url ? url.length : 0} characters</p>
          </div>
        </div>
      </div>
    </div>
  );
}
