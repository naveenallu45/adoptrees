import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

const CERTIFICATE_TEMPLATE_URL = 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1764149541/certificato-treedom-2023.pdf_14_-2_qziwpo.png';

// Roboto font URLs - using Google Fonts CDN (TTF format)
const ROBOTO_REGULAR_TTF = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf';
const ROBOTO_BOLD_TTF = 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf';

// Cache fonts in memory
let cachedRobotoRegularBytes: ArrayBuffer | null = null;
let cachedRobotoBoldBytes: ArrayBuffer | null = null;
let robotoRegularPromise: Promise<ArrayBuffer | null> | null = null;
let robotoBoldPromise: Promise<ArrayBuffer | null> | null = null;

async function getRobotoRegular(): Promise<ArrayBuffer | null> {
  if (cachedRobotoRegularBytes) {
    return cachedRobotoRegularBytes;
  }
  if (robotoRegularPromise) {
    return robotoRegularPromise;
  }
  
  robotoRegularPromise = fetch(ROBOTO_REGULAR_TTF)
    .then(response => {
      if (!response.ok) {
        console.warn(`Failed to fetch Roboto regular font: ${response.status}, will use fallback`);
        return null;
      }
      return response.arrayBuffer();
    })
    .then(bytes => {
      if (bytes) {
        cachedRobotoRegularBytes = bytes;
      }
      robotoRegularPromise = null;
      return bytes;
    })
    .catch(error => {
      console.warn('Error fetching Roboto regular font:', error);
      robotoRegularPromise = null;
      return null;
    });
  
  return robotoRegularPromise;
}

async function getRobotoBold(): Promise<ArrayBuffer | null> {
  if (cachedRobotoBoldBytes) {
    return cachedRobotoBoldBytes;
  }
  if (robotoBoldPromise) {
    return robotoBoldPromise;
  }
  
  robotoBoldPromise = fetch(ROBOTO_BOLD_TTF)
    .then(response => {
      if (!response.ok) {
        console.warn(`Failed to fetch Roboto bold font: ${response.status}, will use fallback`);
        return null;
      }
      return response.arrayBuffer();
    })
    .then(bytes => {
      if (bytes) {
        cachedRobotoBoldBytes = bytes;
      }
      robotoBoldPromise = null;
      return bytes;
    })
    .catch(error => {
      console.warn('Error fetching Roboto bold font:', error);
      robotoBoldPromise = null;
      return null;
    });
  
  return robotoBoldPromise;
}

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
  co2Kgs?: number; // CO2 in kg
  treeNames?: string[]; // Array of tree names
  publicId: string;
  orderId: string;
  qrCode?: string; // Existing QR code as data URL (e.g., 'data:image/png;base64,...')
}

/**
 * Generates a certificate PDF with user details
 */
export async function generateCertificate(data: CertificateData): Promise<Buffer> {
  try {
    // Debug logging
    console.log('[CERTIFICATE] Generating certificate with data:', {
      userName: data.userName,
      treesCount: data.treesCount,
      oxygenKgs: data.oxygenKgs,
      co2Kgs: data.co2Kgs,
      treeNamesCount: data.treeNames?.length || 0,
      treeNames: data.treeNames?.slice(0, 3)
    });
    
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
    const targetProfileSize = 252; // Target size for PDF (increased by 5% from 240)
    
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

    // Use built-in PDF fonts - these are guaranteed to work and look professional
    // Times-Roman is an elegant serif font that looks great on certificates
    // Other options: 'Helvetica-Bold'/'Helvetica' (sans-serif), 'Courier-Bold'/'Courier' (monospace)
    // Embed Roboto fonts with fallback to Helvetica
    let robotoBoldFont;
    let robotoRegularFont;
    
    try {
      const robotoBoldBytes = await getRobotoBold();
      const robotoRegularBytes = await getRobotoRegular();
      
      if (robotoBoldBytes) {
        try {
          robotoBoldFont = await pdfDoc.embedFont(robotoBoldBytes);
        } catch (embedError) {
          console.warn('Failed to embed Roboto bold font, using Helvetica fallback:', embedError);
          robotoBoldFont = await pdfDoc.embedFont('Helvetica-Bold');
        }
      } else {
        robotoBoldFont = await pdfDoc.embedFont('Helvetica-Bold');
      }
      
      if (robotoRegularBytes) {
        try {
          robotoRegularFont = await pdfDoc.embedFont(robotoRegularBytes);
        } catch (embedError) {
          console.warn('Failed to embed Roboto regular font, using Helvetica fallback:', embedError);
          robotoRegularFont = await pdfDoc.embedFont('Helvetica');
        }
      } else {
        robotoRegularFont = await pdfDoc.embedFont('Helvetica');
      }
    } catch (error) {
      console.warn('Error loading Roboto fonts, using Helvetica fallback:', error);
      robotoBoldFont = await pdfDoc.embedFont('Helvetica-Bold');
      robotoRegularFont = await pdfDoc.embedFont('Helvetica');
    }

    // Draw profile picture (circular, positioned at bottom with 3% padding)
    const profileSize = circularProfilePic ? 252 : 210; // Increased by 5% (240->252, 200->210)
    const profileX = 540 - (pageWidth * 0.065); // Shift 6.5% to the left
    const nameFontSize = 50; // Font size for name (needed for calculation)
    const nameSpacing = 180; // Space below profile picture
    const bottomPadding = pageHeight * 0.36; // 36% padding from bottom
    
    // Calculate positions to ensure 36% bottom padding below name
    // Text baseline is at nameY, text extends upward, so bottom of text ≈ nameY - (fontSize * 0.7)
    const nameY = bottomPadding + (nameFontSize * 0.7); // Position name so bottom has 36% padding
    const profileY = nameY + nameSpacing; // Profile is above the name
    
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
        font: robotoBoldFont,
        color: rgb(1, 1, 1),
      });
    }

    // Draw user name (centered below profile picture)
    // nameFontSize, nameSpacing, and nameY already defined above
    
    // Capitalize first letter of user name
    const capitalizedUserName = data.userName.charAt(0).toUpperCase() + data.userName.slice(1).toLowerCase();
    
    const estimatedCharWidth = 20; // Approximate character width for font size 40
    const nameTextWidth = capitalizedUserName.length * estimatedCharWidth;
    const nameX = profileX + profileSize / 2 - nameTextWidth / 2; // Center relative to profile picture
    // nameY is already calculated above to ensure 36% bottom padding
    
    page.drawText(capitalizedUserName, {
      x: nameX,
      y: nameY,
      size: nameFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0), // Black color
    });

    // Draw trees count, oxygen, CO2, and tree names (4-column layout matching screenshot)
    const regularFont = robotoRegularFont;
    
    // Calculate CO2 from oxygen if not provided (1 kg O2 ≈ 0.715 kg CO2)
    const co2Value = data.co2Kgs || (data.oxygenKgs * 0.715);
    
    // Position stats below user name
    const statsStartY = Math.max(nameY - 400, 280); // Space below user name (reduced padding)
    const gapBetweenStats = pageWidth * 0.13; // 13% gap between stat columns (increased by 3%)
    // Use original profileX (540) for stats center, not the shifted profileX
    const originalProfileX = 540;
    const centerX = originalProfileX + profileSize / 2;
    const statsCenterX = centerX - (pageWidth * 0.05); // Shift 5% to the left
    
    // Column 1: Tree name (first field)
    if (data.treeNames && data.treeNames.length > 0) {
      const col1X = statsCenterX - gapBetweenStats * 1.5;
      const treeNameY = statsStartY;
      const treeNameText = data.treeNames[0]; // Show first tree name
      const treeNameFontSize = 20;
      const treeNameWidth = treeNameText.length * 11; // Approximate width
      
      page.drawText(treeNameText, {
        x: col1X - treeNameWidth / 2,
        y: treeNameY,
        size: treeNameFontSize,
        font: regularFont, // Same font as other values
        color: rgb(0, 0, 0), // Black color
      });
    }
    
    // Column 2: Trees count only
    const col2X = statsCenterX - gapBetweenStats * 0.5 - (pageWidth * 0.01); // Shift 1% to the left
    const treesLabelY = statsStartY;
    
    // Center trees count number
    const treesCountText = `${data.treesCount}`;
    const treesCountFontSize = 22; // Reduced by 20% from 28 (originally 40)
    const treesCountWidth = treesCountText.length * (treesCountFontSize * 0.625); // Approximate width for new size
    page.drawText(treesCountText, {
      x: col2X - treesCountWidth / 2,
      y: treesLabelY,
      size: treesCountFontSize,
      font: regularFont, // Same font as other values
      color: rgb(0, 0, 0), // Black color
    });
    
    // Column 3: O2 total value
    const col3X = statsCenterX + gapBetweenStats * 0.5;
    const o2ValueY = statsStartY;
    const o2ValueText = `${data.oxygenKgs.toFixed(1)} /year`;
    
    const o2ValueWidth = o2ValueText.length * 10;
    page.drawText(o2ValueText, {
      x: col3X - o2ValueWidth / 2,
      y: o2ValueY,
      size: 22,
      font: regularFont, // Same font as other values
      color: rgb(0, 0, 0), // Black color
    });
    
    // Column 4: CO2 total value
    const col4X = statsCenterX + gapBetweenStats * 1.5 - (pageWidth * 0.01); // Shift 1% to the left
    const co2ValueY = statsStartY;
    const co2ValueText = `${co2Value.toFixed(1)} /year`;
    
    const co2ValueWidth = co2ValueText.length * 10;
    page.drawText(co2ValueText, {
      x: col4X - co2ValueWidth / 2,
      y: co2ValueY,
      size: 22,
      font: regularFont, // Same font as other values
      color: rgb(0, 0, 0), // Black color
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

