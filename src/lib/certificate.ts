import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

const CERTIFICATE_TEMPLATE_URL = 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1764239375/adoptrees2025-2_cm79e2.png';

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
      hasProfilePicUrl: !!data.profilePicUrl,
      profilePicUrl: data.profilePicUrl ? data.profilePicUrl.substring(0, 80) + '...' : 'none',
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
      // Always use adoptrees.com for QR codes (never localhost)
      const origin = 'https://adoptrees.com';
      const publicIdLower = (data.publicId || '').toLowerCase().trim();
      const qrUrl = `${origin}/u/${publicIdLower}`;
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
    const targetProfileSize = 328; // Target size for PDF (increased by 30% from 252)
    
    // Store profilePicUrl in a variable to avoid TypeScript narrowing issues
    const profilePicUrl = data.profilePicUrl;
    const profilePicPromise = profilePicUrl ? (async () => {
      try {
        console.log('[CERTIFICATE] Fetching profile image from URL:', profilePicUrl.substring(0, 80) + '...');
        const profilePicResponse = await fetch(profilePicUrl);
        if (!profilePicResponse.ok) {
          console.warn('[CERTIFICATE] Profile image fetch failed:', profilePicResponse.status, profilePicResponse.statusText);
          return null;
        }
        
        const profilePicBytes = await profilePicResponse.arrayBuffer();
        const contentType = profilePicResponse.headers.get('content-type') || '';
        const imageSizeMB = (profilePicBytes.byteLength / (1024 * 1024)).toFixed(2);
        console.log('[CERTIFICATE] Profile image fetched successfully, size:', imageSizeMB, 'MB, type:', contentType);
        
        // Create circular version using canvas (supports all image formats: JPEG, PNG, WebP, GIF, etc.)
        // The loadImage function from 'canvas' package supports all common image formats
        // Images of any size are automatically resized to targetProfileSize (328x328) for optimal PDF rendering
        try {
          const img = await loadImage(Buffer.from(profilePicBytes));
          console.log('[CERTIFICATE] Image loaded, original dimensions:', img.width, 'x', img.height, 'format:', contentType);
          
          // Resize to target size for faster processing and consistent PDF output
          // Large images are automatically scaled down, maintaining aspect ratio
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
          
          // Convert canvas to PNG buffer (PNG supports transparency and works for all image types)
          const circularBuffer = canvas.toBuffer('image/png');
          console.log('[CERTIFICATE] Circular profile image created successfully from', contentType);
          return await pdfDoc.embedPng(circularBuffer);
        } catch (canvasError) {
          console.warn('[CERTIFICATE] Canvas processing failed, trying direct embedding:', canvasError);
          // Fallback: Try to embed the image directly in various formats
          // Try PNG first (works for PNG, WebP converted to PNG, etc.)
          try {
            return await pdfDoc.embedPng(profilePicBytes);
          } catch (_pngError) {
            console.log('[CERTIFICATE] PNG embedding failed, trying JPEG...');
            // Try JPEG (works for JPEG, JPG)
            try {
              return await pdfDoc.embedJpg(profilePicBytes);
            } catch (_jpgError) {
              // If both fail, try converting via canvas as last resort
              console.log('[CERTIFICATE] JPEG embedding failed, trying canvas conversion...');
              try {
                // Force load and convert to PNG via canvas
                const img = await loadImage(Buffer.from(profilePicBytes));
                const canvas = createCanvas(img.width, img.height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const pngBuffer = canvas.toBuffer('image/png');
                return await pdfDoc.embedPng(pngBuffer);
              } catch (finalError) {
                console.error('[CERTIFICATE] All embedding methods failed for image type:', contentType, finalError);
                return null;
              }
            }
          }
        }
      } catch (error) {
        console.error('[CERTIFICATE] Error fetching profile image:', error);
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
    const profileSize = circularProfilePic ? 328 : 273; // Increased by 30% (252->328, 210->273)
    const profileX = 540 - (pageWidth * 0.10); // Shift 10% to the left (decreased by 2%)
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
    // Use FIXED position - don't calculate based on name length to prevent position shifts
    // Capitalize first letter of user name
    const capitalizedUserName = data.userName.charAt(0).toUpperCase() + data.userName.slice(1).toLowerCase();
    
    // Fixed center position for name (profile center X) - prevents position shifts
    const nameCenterX = profileCenterX;
    const nameX = nameCenterX; // Will be centered using text width calculation in drawText
    // nameY is already calculated above to ensure 36% bottom padding
    
    // Calculate actual text width for proper centering (but use fixed center point)
    const estimatedCharWidth = nameFontSize * 0.5; // More accurate width calculation
    const nameTextWidth = capitalizedUserName.length * estimatedCharWidth;
    const nameDrawX = nameX - nameTextWidth / 2; // Center the text at fixed position
    
    page.drawText(capitalizedUserName, {
      x: nameDrawX,
      y: nameY,
      size: nameFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0), // Black color
    });

    // Draw trees count, oxygen, CO2, and tree names (4-column layout matching screenshot)
    const regularFont = robotoRegularFont;
    
    // Use the tree's actual CO2 value directly from database (should be provided from order items)
    // Use the value as-is (can be negative, zero, or positive)
    const co2Value = data.co2Kgs !== undefined && data.co2Kgs !== null ? data.co2Kgs : 0;
    
    // Debug logging to verify CO2 value
    console.log('[CERTIFICATE] CO2 value:', {
      co2Kgs: data.co2Kgs,
      co2Value,
      oxygenKgs: data.oxygenKgs,
      treesCount: data.treesCount
    });
    
    // Position stats - use COMPLETELY FIXED positions to prevent any shifts
    // All positions are hardcoded and independent of dynamic values
    const statsStartY = 280; // Fixed Y position for all stats (never changes)
    const gapBetweenStats = pageWidth * 0.13; // 13% gap between stat columns (fixed)
    
    // Fixed stats center X - use FIXED profileSize value (328) for calculation to prevent shifts
    // Don't use actual profileSize variable which can vary (328 vs 273)
    const fixedProfileSizeForStats = 328; // Always use this fixed value
    const originalProfileX = 540; // Fixed X position
    const centerX = originalProfileX + fixedProfileSizeForStats / 2; // Fixed calculation
    const statsCenterX = centerX - (pageWidth * 0.05); // Fixed stats center
    
    // Column 1: Tree name (first field) - FIXED position (moved 4% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    if (data.treeNames && data.treeNames.length > 0) {
      // Fixed X position - doesn't depend on profileSize or any dynamic values
      // Left-aligned at fixed position to prevent shifts when text length changes
      const col1X = statsCenterX - gapBetweenStats * 1.5 - (pageWidth * 0.005) - (pageWidth * 0.01) - (pageWidth * 0.025) - (pageWidth * 0.005);
      const treeNameText = data.treeNames[0];
      const treeNameFontSize = 27;
      
      page.drawText(treeNameText, {
        x: col1X, // Fixed left-aligned position (same X for every certificate)
        y: statsStartY,
        size: treeNameFontSize,
        font: robotoBoldFont,
        color: rgb(0, 0, 0),
      });
    }
    
    // Column 2: Trees count - FIXED position (moved 2.5% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    const col2X = statsCenterX - gapBetweenStats * 0.5 - (pageWidth * 0.015) - (pageWidth * 0.01) - (pageWidth * 0.025) + (pageWidth * 0.01);
    const treesCountText = `${data.treesCount}`;
    const treesCountFontSize = 30;
    page.drawText(treesCountText, {
      x: col2X, // Fixed left-aligned position (same X for every certificate)
      y: statsStartY,
      size: treesCountFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Column 3: O2 total value - FIXED position (moved 4% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    const col3X = statsCenterX + gapBetweenStats * 0.5 - (pageWidth * 0.015) - (pageWidth * 0.01) - (pageWidth * 0.025) - (pageWidth * 0.005);
    const o2ValueText = `${data.oxygenKgs.toFixed(1)} /year`;
    const o2ValueFontSize = 30;
    page.drawText(o2ValueText, {
      x: col3X, // Fixed left-aligned position (same X for every certificate)
      y: statsStartY,
      size: o2ValueFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Column 4: CO2 total value - FIXED position (moved 4% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    const col4X = statsCenterX + gapBetweenStats * 1.5 - (pageWidth * 0.025) - (pageWidth * 0.01) - (pageWidth * 0.025) - (pageWidth * 0.005);
    const co2ValueText = `${co2Value.toFixed(1)} /year`;
    const co2ValueFontSize = 30;
    page.drawText(co2ValueText, {
      x: col4X, // Fixed left-aligned position (same X for every certificate)
      y: statsStartY,
      size: co2ValueFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0),
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

