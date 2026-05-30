/**
 * PDF Generation Service
 * Converts HTML templates to PDF using Puppeteer
 */

export const pdfService = {
  /**
   * Generate PDF from HTML content
   * In production, this would call an API endpoint that runs Puppeteer on the server
   */
  async generatePDF(htmlContent: string, filename: string): Promise<Blob> {
    try {
      // Call server API to generate PDF
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          filename,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  },

  /**
   * Preview PDF as data URL
   */
  async previewPDF(htmlContent: string): Promise<string> {
    const blob = await this.generatePDF(htmlContent, 'preview');
    return URL.createObjectURL(blob);
  },

  /**
   * Download PDF directly
   */
  async downloadPDF(htmlContent: string, filename: string): Promise<void> {
    const blob = await this.generatePDF(htmlContent, filename);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Print HTML content directly
   */
  printHTML(htmlContent: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  },

  /**
   * Wraps HTML content in a printable page structure
   */
  wrapHTMLForPrint(content: string, title: string = ''): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
          
          .page {
            width: 210mm;
            height: 297mm;
            margin: 20px auto;
            padding: 20mm;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          
          @page {
            margin: 20mm;
            size: A4;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #000;
          }
          
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .content {
            font-size: 14px;
            line-height: 1.8;
            text-align: justify;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 12px;
            text-align: center;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .signature-block {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          
          .signature-item {
            flex: 1;
            text-align: center;
          }
          
          .signature-line {
            margin-top: 40px;
            border-top: 1px solid #000;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${content}
        </div>
      </body>
      </html>
    `;
  },
};
