'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataService } from '@/services/dataService';
import { uploadFirmImage } from '@/services/imageUploadService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FirmWithBase64 {
  id: string;
  name: string;
  headerImagePath?: string;
  signatureImagePath?: string;
  stampImagePath?: string;
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64Data] = dataUrl.split(',');
  const mimeType = header.split(':')[1].split(';')[0];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], filename, { type: mimeType });
}

async function uploadImageToStorage(
  file: File,
  firmId: string,
  imageType: 'letterhead' | 'signature' | 'stamp'
): Promise<string> {
  const result = await uploadFirmImage(file, firmId, imageType);
  return result.url;
}

export default function MigrateImagesPage() {
  const router = useRouter();
  const [firms, setFirms] = useState<FirmWithBase64[]>([]);
  const [migratedCount, setMigratedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const checkFirms = async () => {
      const allFirms = await dataService.firms.list();
      const withBase64 = allFirms.filter(firm => 
        firm.headerImagePath?.startsWith('data:') ||
        firm.signatureImagePath?.startsWith('data:') ||
        firm.stampImagePath?.startsWith('data:')
      );
      setFirms(withBase64);
      setTotalCount(withBase64.length);
    };
    checkFirms();
  }, []);

  const handleMigrate = async () => {
    if (firms.length === 0) {
      setError('No firms with Base64 images found!');
      return;
    }

    setIsMigrating(true);
    setError('');
    setSuccess('');
    setMigratedCount(0);
    setProgress(0);

    try {
      const batchSize = 5;
      
      for (let i = 0; i < firms.length; i += batchSize) {
        const batch = firms.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (firm) => {
          const updates: Partial<FirmWithBase64> = {};
          
          // Process letterhead
          if (firm.headerImagePath?.startsWith('data:')) {
            try {
              const file = dataUrlToFile(firm.headerImagePath, 'letterhead.png');
              const url = await uploadImageToStorage(file, firm.id, 'letterhead');
              updates.headerImagePath = url;
            } catch (error) {
              console.error('Failed to upload letterhead:', error);
            }
          }
          
          // Process signature
          if (firm.signatureImagePath?.startsWith('data:')) {
            try {
              const file = dataUrlToFile(firm.signatureImagePath, 'signature.png');
              const url = await uploadImageToStorage(file, firm.id, 'signature');
              updates.signatureImagePath = url;
            } catch (error) {
              console.error('Failed to upload signature:', error);
            }
          }
          
          // Process stamp
          if (firm.stampImagePath?.startsWith('data:')) {
            try {
              const file = dataUrlToFile(firm.stampImagePath, 'stamp.png');
              const url = await uploadImageToStorage(file, firm.id, 'stamp');
              updates.stampImagePath = url;
            } catch (error) {
              console.error('Failed to upload stamp:', error);
            }
          }
          
          // Update firm if any images were uploaded
          if (Object.keys(updates).length > 0) {
            await dataService.firms.update(firm.id, updates);
          }
        }));
        
        setMigratedCount(i + batch.length);
        setProgress(((i + batch.length) / firms.length) * 100);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setSuccess(`Successfully migrated ${firms.length} firms!`);
      
      // Refresh firms list
      const allFirms = await dataService.firms.list();
      const remainingBase64 = allFirms.filter(firm => 
        firm.headerImagePath?.startsWith('data:') ||
        firm.signatureImagePath?.startsWith('data:') ||
        firm.stampImagePath?.startsWith('data:')
      );
      
      if (remainingBase64.length > 0) {
        setError(`Some firms still have Base64 images: ${remainingBase64.length}`);
      }
    } catch (error) {
      setError('Migration failed. Check console for details.');
      console.error('Migration error:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleBack = () => {
    router.push('/manage-firms');
  };

  if (firms.length === 0 && !isMigrating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Base64 Images Found</CardTitle>
            <CardDescription>
              All firm images are already stored in Firebase Storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack}>Back to Manage Firms</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Migrate Images to Firebase Storage</h1>
            <p className="mt-1 text-sm text-slate-600">
              Convert Base64 images to Firebase Storage URLs
            </p>
          </div>
          <Button variant="outline" onClick={handleBack}>
            Back to Manage Firms
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Migration Status</CardTitle>
            <CardDescription>
              {isMigrating 
                ? `Migrating ${migratedCount} of ${totalCount} firms...` 
                : `${migratedCount} of ${totalCount} firms migrated`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMigrating ? (
              <div className="space-y-4">
                <Progress value={progress} className="h-2" />
                <div className="text-sm text-slate-600">
                  {Math.round(progress)}% complete
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Ready to migrate:</strong> {firms.length} firms with Base64 images
                  </p>
                  <p className="mt-2 text-xs text-blue-600">
                    This will upload all images to Firebase Storage and update Firestore with URLs.
                  </p>
                </div>
                <Button onClick={handleMigrate} disabled={isMigrating || firms.length === 0}>
                  {isMigrating ? 'Migrating...' : 'Start Migration'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {firms.length > 0 && !isMigrating && (
          <Card>
            <CardHeader>
              <CardTitle>Firms to Migrate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b p-3 text-left font-medium">Firm Name</th>
                      <th className="border-b p-3 text-left font-medium">Images</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firms.map((firm) => {
                      const images = [
                        firm.headerImagePath?.startsWith('data:') ? 'Letterhead' : null,
                        firm.signatureImagePath?.startsWith('data:') ? 'Signature' : null,
                        firm.stampImagePath?.startsWith('data:') ? 'Stamp' : null,
                      ].filter(Boolean);
                      
                      return (
                        <tr key={firm.id}>
                          <td className="border-b p-3">{firm.name}</td>
                          <td className="border-b p-3">
                            {images.join(', ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
