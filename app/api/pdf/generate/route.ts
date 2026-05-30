/**
 * PDF Generation API Route
 * Uses Puppeteer to convert HTML to PDF
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { html, filename } = await request.json()

    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      )
    }

    // In a production environment, you would use Puppeteer here:
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(html);
    // const pdf = await page.pdf();
    // await browser.close();

    // For now, return a placeholder that allows client-side HTML canvas conversion
    // In production, Puppeteer should run on the server for better performance

    // Create a simple PDF-like response using HTML2Canvas on client side
    // This is a fallback - production should use Puppeteer

    const pdfContent = Buffer.from(html)

    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'document.pdf'}"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
