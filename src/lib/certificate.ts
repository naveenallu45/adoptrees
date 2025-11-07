import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

const CERTIFICATE_TEMPLATE_URL = 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762341062/certificato-treedom-2023.pdf_2_hmxpsy.png';

interface CertificateData {
  userName: string;
  profilePicUrl?: string;
  treesCount: number;
  oxygenKgs: number;
  publicId: string;
  orderId: string;
  qrCode?: string; // Existing QR code as data URL (e.g., 'data:image/png;base64,...')
}

/**
 * Generates a certificate PDF with user details
 */
export async function generateCertificate(data: CertificateData): Promise<Buffer> {
  try {
    console.log('Starting certificate generation for:', data.orderId);
    
    // Download the template image from Cloudinary
    console.log('Fetching template from:', CERTIFICATE_TEMPLATE_URL);
    const templateResponse = await fetch(CERTIFICATE_TEMPLATE_URL);
    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch certificate template: ${templateResponse.status} ${templateResponse.statusText}`);
    }
    const templateImageBytes = await templateResponse.arrayBuffer();
    console.log('Template downloaded, size:', templateImageBytes.byteLength, 'bytes');

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed the template image (try PNG first, then JPG)
    let templateImage: PDFImage;
    try {
      templateImage = await pdfDoc.embedPng(templateImageBytes);
    } catch {
      templateImage = await pdfDoc.embedJpg(templateImageBytes);
    }
    
    // Get template dimensions - use original template size
    const templateWidth = templateImage.width;
    const templateHeight = templateImage.height;
    
    // Use the template's original dimensions for the PDF page
    const pageWidth = templateWidth;
    const pageHeight = templateHeight;
    
    // Create a page with the template image as background at full size
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(templateImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });

    // Use existing QR code if provided, otherwise generate one
    let qrImage: PDFImage;
    if (data.qrCode) {
      // Use existing QR code (data URL)
      const qrImageBytes = data.qrCode.split(',')[1] 
        ? Buffer.from(data.qrCode.split(',')[1], 'base64')
        : Buffer.from(data.qrCode, 'base64');
      qrImage = await pdfDoc.embedPng(qrImageBytes);
    } else {
      // Generate QR code only if not provided
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
      const qrUrl = `${origin}/u/${data.publicId}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
        width: 150,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
      
      // Convert QR code data URL to image bytes
      const qrImageBytes = qrDataUrl.split(',')[1] 
        ? Buffer.from(qrDataUrl.split(',')[1], 'base64')
        : Buffer.from(qrDataUrl, 'base64');
      qrImage = await pdfDoc.embedPng(qrImageBytes);
    }

    // Embed profile picture if available
    let profilePic: PDFImage | null = null;
    if (data.profilePicUrl) {
      try {
        const profilePicResponse = await fetch(data.profilePicUrl);
        if (profilePicResponse.ok) {
          const profilePicBytes = await profilePicResponse.arrayBuffer();
          // Try to embed as PNG, fallback to JPG if needed
          try {
            profilePic = await pdfDoc.embedPng(profilePicBytes);
          } catch {
            profilePic = await pdfDoc.embedJpg(profilePicBytes);
          }
        }
      } catch (error) {
        console.error('Failed to load profile picture:', error);
      }
    }

    // Draw profile picture (circular, top left area)
    const profileSize = profilePic ? 240 : 200;
    const profileX = 540;
    const profileY = pageHeight - 600;
    
    if (profilePic) {
      // Draw circular profile picture (using a mask approach)
      page.drawImage(profilePic, {
        x: profileX,
        y: profileY,
        width: profileSize,
        height: profileSize,
      });
    } else {
      // Draw placeholder circle with initials
      const initials = data.userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      // Draw circle background
      page.drawCircle({
        x: profileX + profileSize / 2,
        y: profileY + profileSize / 2,
        size: profileSize / 2,
        color: rgb(0.2, 0.5, 0.2),
      });
      
      // Draw initials
      page.drawText(initials, {
        x: profileX + profileSize / 2 - 10,
        y: profileY + profileSize / 2 - 8,
        size: 60,
        color: rgb(1, 1, 1),
      });
    }

    // Draw user name (centered below profile picture)
    const nameFont = await pdfDoc.embedFont('Helvetica-Bold');
    const nameFontSize = 50; // Increased from 28
    const nameSpacing = 180; // Space below profile picture
    
    // Capitalize first letter of user name
    const capitalizedUserName = data.userName.charAt(0).toUpperCase() + data.userName.slice(1).toLowerCase();
    
    const estimatedCharWidth = 20; // Approximate character width for font size 40
    const nameTextWidth = capitalizedUserName.length * estimatedCharWidth;
    const nameX = profileX + profileSize / 2 - nameTextWidth / 2; // Center relative to profile picture
    const nameY = profileY - nameSpacing; // Position below profile picture
    
    page.drawText(capitalizedUserName, {
      x: nameX,
      y: nameY,
      size: nameFontSize,
      font: nameFont,
      color: rgb(0.1, 0.3, 0.1),
    });

    // Draw trees count and oxygen amount (row-wise below user name)
    const statsFont = await pdfDoc.embedFont('Helvetica-Bold');
    const regularFont = await pdfDoc.embedFont('Helvetica');
    
    const treesText = `${data.treesCount}`;
    const oxygenText = `${data.oxygenKgs.toFixed(1)} /year`;
    
    // Position values below user name
    const valuesY = nameY - 360; // Space below user name
    const gapBetweenValues = 150; // Gap between trees and oxygen values
    
    // Calculate positions to center them as a group relative to profile picture
    const treesTextWidth = treesText.length * 24; // Approximate width for trees value (size 48)
    const oxygenTextWidth = oxygenText.length * 24; // Approximate width for oxygen value (size 48, same as trees)
    const totalWidth = treesTextWidth + gapBetweenValues + oxygenTextWidth;
    const centerX = profileX + profileSize / 2;
    
    // Trees value (left side)
    const treesX = centerX - totalWidth / 2;
    page.drawText(treesText, {
      x: treesX,
      y: valuesY,
      size: 35,
      font: statsFont,
      color: rgb(0.1, 0.5, 0.1),
    });
    
    // Oxygen value (right side) - same font and size as trees value
    // Move 7% to the right (7% of page width)
    const rightOffset = pageWidth * 0.07;
    const oxygenX = centerX - totalWidth / 2 + treesTextWidth + gapBetweenValues + rightOffset;
    page.drawText(oxygenText, {
      x: oxygenX,
      y: valuesY,
      size: 30,
      font: statsFont,
      color: rgb(0.1, 0.5, 0.1),
    });

    // Draw QR code (bottom right area)
    const qrSize = 250;
    const qrX = pageWidth - qrSize - 250;
    const qrY = 1000;
    
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Draw order ID (small text at bottom)
    const orderIdText = `Order: ${data.orderId}`;
    page.drawText(orderIdText, {
      x: 50,
      y: 30,
      size: 10,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF
    console.log('Serializing PDF...');
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    console.log('Certificate generated successfully, PDF size:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating certificate:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to generate certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

