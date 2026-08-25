'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentVersion, Firm, Tender, VersioningSettings } from '@/types';

interface DocumentViewerProps {
  content: string;
  docType: string;
  tender?: Tender;
  mainFirm?: Firm;
  targetFirm?: Firm;
  tenderLanguage?: 'hindi' | 'english';
  onLanguageChange?: (language: 'hindi' | 'english') => void;
  versioningSettings?: VersioningSettings;
  versions?: DocumentVersion[];
  onManualSave?: () => void;
  /** Called with the full updated document HTML whenever the user edits directly in the preview. */
  onContentChange?: (html: string) => void;
}

// Layout layers that must survive editing untouched (letterhead art, signature/stamp
// overlays, layout guides) — made non-editable "islands" inside the editable body.
const NON_EDITABLE_LAYER_SELECTOR =
  '.letterhead-layer, .signature-layer, .stamp-layer, .safe-zone-guide, .page-boundary-guide, .print-bleed-guide';

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  content,
  docType,
  tenderLanguage = 'hindi',
  onLanguageChange,
  versioningSettings,
  versions = [],
  onManualSave,
  onContentChange,
}) => {
  const [previewLanguage, setPreviewLanguage] = useState<'hindi' | 'english'>(tenderLanguage);
  const [previewContent, setPreviewContent] = useState(content);
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;
  const totalHistoryPages = Math.max(1, Math.ceil(versions.length / pageSize));
  const visibleVersions = versions.slice((historyPage - 1) * pageSize, historyPage * pageSize);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  useEffect(() => {
    setPreviewLanguage(tenderLanguage);
  }, [tenderLanguage]);

  useEffect(() => {
    setPreviewContent(content);
    const iframe = iframeRef.current;
    if (iframe?.contentDocument) {
      try {
        const doc = iframe.contentDocument;
        doc.open();
        doc.write(content);
        doc.close();
        handleIframeLoad();
      } catch {
        // Ignore fallback
      }
    }
  }, [content]);

  const handleLanguageChange = (newLanguage: 'hindi' | 'english') => {
    setPreviewLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
  };

  const handleIframeLoad = () => {
    if (!onContentChangeRef.current) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;

    doc.body.contentEditable = 'true';
    doc.body.spellcheck = false;
    doc.querySelectorAll(NON_EDITABLE_LAYER_SELECTOR).forEach((el) => {
      (el as HTMLElement).setAttribute('contenteditable', 'false');
    });

    const handleInput = () => {
      if (!doc.documentElement) return;
      onContentChangeRef.current?.(`<!DOCTYPE html>\n${doc.documentElement.outerHTML}`);
    };
    doc.addEventListener('input', handleInput);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-slate-700">Preview Language</h3>
            {versioningSettings && (
              <p className="mt-1 text-xs text-slate-500">
                Versioning is {versioningSettings.enabled ? 'enabled' : 'disabled'} ·{' '}
                {versioningSettings.autoSaveEnabled ? 'auto-save enabled' : 'manual save mode'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onManualSave && (
              <Button type="button" size="sm" variant="outline" onClick={onManualSave}>
                Save Version
              </Button>
            )}
            <select
              value={previewLanguage}
              onChange={(event) => handleLanguageChange(event.target.value as 'hindi' | 'english')}
              className="h-9 rounded-md border border-slate-300 px-3 py-1 text-sm"
            >
              <option value="hindi">Hindi</option>
              <option value="english">English</option>
            </select>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Note: Document content is regenerated in the selected language using MappingService. Falls back to English
          when no Hindi mapping exists.
          {onContentChange && ' Click into the preview below to edit it directly — tables and layout stay intact.'}
        </p>
        {versions.length > 0 && (
          <div className="mt-3 rounded border border-slate-200 bg-white p-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-slate-500">Version History</p>
              <p className="text-xs text-slate-400">{versions.length} versions</p>
            </div>
            <div className="grid gap-1 text-xs sm:grid-cols-2">
              {visibleVersions.map((version) => (
                <div key={version.id} className="rounded bg-slate-50 px-2 py-1">
                  <span className="font-medium">v{version.versionNumber}</span>
                  <span className="ml-2 text-slate-500">{new Date(version.createdAt).toLocaleString('en-IN')}</span>
                  {version.changeNote && <p className="truncate text-slate-500">{version.changeNote}</p>}
                </div>
              ))}
            </div>
            {totalHistoryPages > 1 && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <iframe
        ref={iframeRef}
        title={`document-preview-${docType}`}
        srcDoc={previewContent}
        className="h-[640px] w-full"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

export default DocumentViewer;
