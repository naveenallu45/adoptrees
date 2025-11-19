import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

const CERTIFICATE_TEMPLATE_URL = 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1762341062/certificato-treedom-2023.pdf_2_hmxpsy.png';

// Cache template image in memory to avoid fetching every time
let cachedTemplateImageBytes: ArrayBuffer | null = null;
let templateCachePromise: Promise<ArrayBuffer> | null = null;

async function getTemplateImage(): Promise<ArrayBuffer> {
  // Return cached template if available
  if (cachedTemplateImageBytes) {
    return cachedTemplateImageBytes;
  }
  
  // If already fetching, wait for that promise
  if (templateCachePromise) {
    return templateCachePromise;
  }
  
  // Fetch and cache template
  templateCachePromise = fetch(CERTIFICATE_TEMPLATE_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch certificate template: ${response.status} ${response.statusText}`);
      }
      return response.arrayBuffer();
    })
    .then(bytes => {
      cachedTemplateImageBytes = bytes;
      templateCachePromise = null;
      return bytes;
    })
    .catch(error => {
      templateCachePromise = null;
      throw error;
    });
  
  return templateCachePromise;
}

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
    // Use cached template image (much faster)
    const templateImageBytes = await getTemplateImage();

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

    // Embed profile picture if available and create circular version
    // Optimize by resizing to target size before processing
    // Process profile image in parallel with PDF setup
    const targetProfileSize = 240; // Target size for PDF
    
    const profilePicPromise = data.profilePicUrl ? (async () => {
      try {
        const profilePicResponse = await fetch(data.profilePicUrl!);
        if (!profilePicResponse.ok) return null;
        
          const profilePicBytes = await profilePicResponse.arrayBuffer();
        
        // Create circular version using canvas (optimized - resize first)
        try {
          const img = await loadImage(Buffer.from(profilePicBytes));
          
          // Resize to target size for faster processing
          const canvas = createCanvas(targetProfileSize, targetProfileSize);
          const ctx = canvas.getContext('2d');
          
          // Create circular clipping path
          ctx.beginPath();
          ctx.arc(targetProfileSize / 2, targetProfileSize / 2, targetProfileSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Draw the image centered and scaled to fit
          const scale = Math.min(targetProfileSize / img.width, targetProfileSize / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = (targetProfileSize - scaledWidth) / 2;
          const offsetY = (targetProfileSize - scaledHeight) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
          
          // Convert canvas to buffer
          const circularBuffer = canvas.toBuffer('image/png');
          return await pdfDoc.embedPng(circularBuffer);
        } catch (_canvasError) {
          // Fallback to original image
          try {
            return await pdfDoc.embedPng(profilePicBytes);
          } catch {
            return await pdfDoc.embedJpg(profilePicBytes);
          }
        }
      } catch (_error) {
        return null;
      }
    })() : Promise.resolve(null);
    
    // Wait for profile pic processing
    const circularProfilePic = await profilePicPromise;

    // Draw profile picture (circular, top left area)
    const profileSize = circularProfilePic ? 240 : 200;
    const profileX = 540;
    const profileY = pageHeight - 600;
    const profileRadius = profileSize / 2;
    const profileCenterX = profileX + profileRadius;
    const profileCenterY = profileY + profileRadius;
    
    if (circularProfilePic) {
      // Draw circular profile picture with circular frame (matching the reference image)
      // The reference shows a light green circular frame around a circular profile picture
      
      // Step 1: Draw outer green circle background (like the reference image)
      page.drawCircle({
        x: profileCenterX,
        y: profileCenterY,
        size: profileRadius + 5,
        color: rgb(0.2, 0.5, 0.2), // Light green background
      });
      
      // Step 2: Draw white circle (creates the frame border)
      page.drawCircle({
        x: profileCenterX,
        y: profileCenterY,
        size: profileRadius - 1,
        color: rgb(1, 1, 1), // White
      });
      
      // Step 3: Draw the circular profile image (already clipped to circle)
      page.drawImage(circularProfilePic, {
        x: profileX,
        y: profileY,
        width: profileSize,
        height: profileSize,
      });
      
      // Step 4: Draw the light green circular border (completes the frame like in reference)
      page.drawCircle({
        x: profileCenterX,
        y: profileCenterY,
        size: profileRadius,
        borderColor: rgb(0.2, 0.5, 0.2), // Light green border
        borderWidth: 4,
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
        x: profileCenterX,
        y: profileCenterY,
        size: profileRadius,
        color: rgb(0.2, 0.5, 0.2),
      });
      
      // Draw initials
      page.drawText(initials, {
        x: profileCenterX - 10,
        y: profileCenterY - 8,
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
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
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

