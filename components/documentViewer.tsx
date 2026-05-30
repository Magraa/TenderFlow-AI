import React from 'react';

interface DocumentViewerProps {
  content: string;
  docType: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ content, docType }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <iframe
        title={`document-preview-${docType}`}
        srcDoc={content}
        className="h-[640px] w-full"
      />
    </div>
  );
};

export default DocumentViewer;
