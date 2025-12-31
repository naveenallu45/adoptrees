import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

const CERTIFICATE_TEMPLATE_URL = 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1764239375/adoptrees2025-2_cm79e2.png';
const DEALER_CERTIFICATE_TEMPLATE_URL = 'https://res.cloudinary.com/dpepzphqf/image/upload/v1767113253/Adoptrees_Dealer_Certificate_fkwhuv.png';

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

// Cache template images in memory to avoid fetching every time
let cachedTemplateImageBytes: ArrayBuffer | null = null;
let cachedDealerTemplateImageBytes: ArrayBuffer | null = null;
let templateCachePromise: Promise<ArrayBuffer> | null = null;
let dealerTemplateCachePromise: Promise<ArrayBuffer> | null = null;

async function getTemplateImage(isDealer: boolean = false): Promise<ArrayBuffer> {
  const templateUrl = isDealer ? DEALER_CERTIFICATE_TEMPLATE_URL : CERTIFICATE_TEMPLATE_URL;
  const cachedBytes = isDealer ? cachedDealerTemplateImageBytes : cachedTemplateImageBytes;
  const cachePromise = isDealer ? dealerTemplateCachePromise : templateCachePromise;
  
  // Return cached template if available
  if (cachedBytes) {
    return cachedBytes;
  }
  
  // If already fetching, wait for that promise
  if (cachePromise) {
    return cachePromise;
  }
  
  // Fetch and cache template
  const promise = fetch(templateUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch certificate template: ${response.status} ${response.statusText}`);
      }
      return response.arrayBuffer();
    })
    .then(bytes => {
      if (isDealer) {
        cachedDealerTemplateImageBytes = bytes;
        dealerTemplateCachePromise = null;
      } else {
      cachedTemplateImageBytes = bytes;
      templateCachePromise = null;
      }
      return bytes;
    })
    .catch(error => {
      if (isDealer) {
        dealerTemplateCachePromise = null;
      } else {
      templateCachePromise = null;
      }
      throw error;
    });
  
  if (isDealer) {
    dealerTemplateCachePromise = promise;
  } else {
    templateCachePromise = promise;
  }
  
  return promise;
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
  dealerName?: string; // Dealer name for dealer orders
  vehicleName?: string; // Vehicle name for dealer orders
  dealerImageUrl?: string; // Dealer profile image URL for dealer orders
}

/**
 * Converts text to title case (capitalizes first letter of each word)
 * Example: "allu naveen" -> "Allu Naveen"
 */
function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generates a certificate PDF with user details
 */
export async function generateCertificate(data: CertificateData): Promise<Buffer> {
  try {
    // Determine if this is a dealer order
    const isDealerOrder = !!data.dealerName;
    
    // Debug logging
    console.log('[CERTIFICATE] Generating certificate with data:', {
      userName: data.userName,
      hasProfilePicUrl: !!data.profilePicUrl,
      profilePicUrl: data.profilePicUrl ? data.profilePicUrl.substring(0, 80) + '...' : 'none',
      treesCount: data.treesCount,
      oxygenKgs: data.oxygenKgs,
      co2Kgs: data.co2Kgs,
      treeNamesCount: data.treeNames?.length || 0,
      treeNames: data.treeNames?.slice(0, 3),
      isDealerOrder,
      dealerName: data.dealerName
    });
    
    // Use cached template image (much faster) - use dealer template for dealer orders
    const templateImageBytes = await getTemplateImage(isDealerOrder);

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
    
    // Log template dimensions for debugging
    console.log('[CERTIFICATE] Template dimensions:', {
      isDealerOrder,
      pageWidth,
      pageHeight,
      treesCount: data.treesCount,
      treeNames: data.treeNames,
      hasTreeNames: !!(data.treeNames && data.treeNames.length > 0)
    });
    
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
    // Bottom padding: only change for dealer certificates, keep original for regular certificates
    const bottomPadding = isDealerOrder 
      ? pageHeight * 0.28 // 28% padding from bottom (moved down 8% from 36%) for dealer certificates
      : pageHeight * 0.36; // Original 36% padding from bottom for regular certificates
    
    // Calculate positions to ensure proper bottom padding below name
    // Text baseline is at nameY, text extends upward, so bottom of text ≈ nameY - (fontSize * 0.7)
    const nameY = bottomPadding + (nameFontSize * 0.7); // Position name based on bottom padding
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
    // Capitalize first letter of each word (title case)
    const capitalizedUserName = toTitleCase(data.userName);
    
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
    
    // Position stats - adjust positions based on template type (dealer vs regular)
    // For dealer certificates, positions may need adjustment based on template dimensions
    let statsStartY: number;
    let gapBetweenStats: number;
    let fixedProfileSizeForStats: number;
    let originalProfileX: number;
    let statsCenterX: number;
    
    if (isDealerOrder) {
      // Dealer certificate template - adjust positions for dealer template layout
      // Use center-based positioning that should work with most template layouts
      statsStartY = pageHeight * 0.11; // Position stats at 11% from bottom (moved down 7% from 18%)
      gapBetweenStats = pageWidth * 0.072; // Equal gap between all four columns
      fixedProfileSizeForStats = 328; // Same profile size
      // Center the stats area on the page, then move 30% to the left
      originalProfileX = pageWidth * 0.50 - fixedProfileSizeForStats / 2; // Center profile
      const centerX = originalProfileX + fixedProfileSizeForStats / 2;
      statsCenterX = centerX - (pageWidth * 0.30); // Move stats 30% to the left from center
    } else {
      // Regular certificate template - use ORIGINAL fixed positions (unchanged)
      statsStartY = 280; // Fixed Y position for all stats (never changes)
      gapBetweenStats = pageWidth * 0.13; // ORIGINAL gap between stat columns (13% of page width)
      fixedProfileSizeForStats = 328; // Always use this fixed value
      originalProfileX = 540; // Fixed X position
      const centerX = originalProfileX + fixedProfileSizeForStats / 2;
      statsCenterX = centerX - (pageWidth * 0.05); // Fixed stats center
    }
    
    console.log('[CERTIFICATE] Stats positioning:', {
      isDealerOrder,
      statsStartY,
      statsCenterX,
      pageWidth,
      pageHeight
    });
    
    // Column 1: Tree name (first field) - FIXED position (moved 4.5% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    // Always show tree name - use first tree name or fallback, with title case
    const treeNameText = (data.treeNames && data.treeNames.length > 0) 
      ? toTitleCase(data.treeNames[0])
      : 'Tree'; // Fallback if no tree names provided
      const treeNameFontSize = 27;
    
    // Adjust column 1 X position for dealer vs regular template
    let col1X: number;
    if (isDealerOrder) {
      // For dealer template, moved 48% total to the left from original position (1.5 + 0.3 + 0.18 = 1.98)
      col1X = statsCenterX - gapBetweenStats * 1.98;
    } else {
      // Regular template - use original complex positioning
      col1X = statsCenterX - gapBetweenStats * 1.5 - (pageWidth * 0.005) - (pageWidth * 0.01) - (pageWidth * 0.025) - (pageWidth * 0.005) - (pageWidth * 0.005);
    }
      
      page.drawText(treeNameText, {
      x: col1X,
        y: statsStartY,
        size: treeNameFontSize,
        font: robotoBoldFont,
        color: rgb(0, 0, 0),
      });
    
    // Column 2: Trees count - FIXED position (moved 2% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    // Always show trees count
    const treesCountText = `${data.treesCount}`;
    const treesCountFontSize = 30;
    
    // Adjust column 2 X position for dealer vs regular template
    let col2X: number;
    if (isDealerOrder) {
      // For dealer template, increased gap by 30% total (10% + 20%) between Tree name and Planted trees
      // Move Column 2 right by 30% of gap to increase spacing (0.5 - 0.3 = 0.2)
      col2X = statsCenterX - gapBetweenStats * 0.2;
    } else {
      // Regular template - use original complex positioning
      col2X = statsCenterX - gapBetweenStats * 0.5 - (pageWidth * 0.015) - (pageWidth * 0.01) - (pageWidth * 0.025) + (pageWidth * 0.01) + (pageWidth * 0.005);
    }
    
    page.drawText(treesCountText, {
      x: col2X,
      y: statsStartY,
      size: treesCountFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Column 3: O2 total value - FIXED position (moved 4% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    const o2ValueText = `${data.oxygenKgs.toFixed(1)} /Year`;
    const o2ValueFontSize = 30;
    
    // Adjust column 3 X position for dealer vs regular template
    let col3X: number;
    if (isDealerOrder) {
      // For dealer template, moved 45% total to the right from original position (0.5 + 0.3 + 0.15 = 0.95)
      col3X = statsCenterX + gapBetweenStats * 0.95;
    } else {
      // Regular template - use original complex positioning
      col3X = statsCenterX + gapBetweenStats * 0.5 - (pageWidth * 0.015) - (pageWidth * 0.01) - (pageWidth * 0.025) - (pageWidth * 0.005);
    }
    
    page.drawText(o2ValueText, {
      x: col3X,
      y: statsStartY,
      size: o2ValueFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Column 4: CO2 total value - FIXED position (moved 4% to the left total, left-aligned)
    // Use absolute fixed X position - no centering to prevent position shifts
    const co2ValueText = `${co2Value.toFixed(1)} /Year`;
    const co2ValueFontSize = 30;
    
    // Adjust column 4 X position for dealer vs regular template
    let col4X: number;
    if (isDealerOrder) {
      // For dealer template, moved 63% total to the right from original position (1.5 + 0.3 + 0.15 + 0.18 = 2.13)
      col4X = statsCenterX + gapBetweenStats * 2.13;
    } else {
      // Regular template - use original complex positioning
      col4X = statsCenterX + gapBetweenStats * 1.5 - (pageWidth * 0.025) - (pageWidth * 0.01) - (pageWidth * 0.025) - (pageWidth * 0.005);
    }
    
    page.drawText(co2ValueText, {
      x: col4X,
      y: statsStartY,
      size: co2ValueFontSize,
      font: robotoBoldFont,
      color: rgb(0, 0, 0),
    });

    // Draw QR code (bottom right area) with green border matching profile picture style
    // QR code size: increase by 15% for dealer certificates, keep original for regular certificates
    const qrSize = isDealerOrder
      ? 250 * 1.15 // Increased by 15% for dealer certificates (250 * 1.15 = 287.5, rounded to 288)
      : 250; // Original size for regular certificates
    // QR code X position: move 10% total to the left for dealer certificates (5% + 5% = 10%)
    const qrX = isDealerOrder
      ? (pageWidth - qrSize - 250) - (pageWidth * 0.10) // Moved 10% total to the left for dealer certificates
      : pageWidth - qrSize - 250; // Original position for regular certificates
    // QR code Y position: move down 36% then up 10% total for dealer certificates (5% + 5% = 10%), keep original for regular certificates
    const qrY = isDealerOrder 
      ? (1000 - (1000 * 0.36)) + ((1000 - (1000 * 0.36)) * 0.10) // Moved 36% down then 10% total up (toward top) for dealer certificates
      : 1000; // Original position for regular certificates
    const borderWidth = 4;
    const borderPadding = 5;
    const borderRadius = 12; // Rounded corners radius
    
    // Helper function to create rounded rectangle image using canvas
    const createRoundedRectImage = async (
      width: number,
      height: number,
      radius: number,
      fillColor: { r: number; g: number; b: number } | null,
      borderColor?: { r: number; g: number; b: number },
      borderWidth?: number
    ): Promise<PDFImage> => {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, width, height);
      
      // Reset any default styles to avoid black borders
      ctx.strokeStyle = 'transparent';
      ctx.fillStyle = 'transparent';
      
      // Draw rounded rectangle path
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(width - radius, 0);
      ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, height - radius);
      ctx.quadraticCurveTo(width, height, width - radius, height);
      ctx.lineTo(radius, height);
      ctx.quadraticCurveTo(0, height, 0, height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      
      // Fill if color provided
      if (fillColor) {
        ctx.fillStyle = `rgb(${Math.round(fillColor.r * 255)}, ${Math.round(fillColor.g * 255)}, ${Math.round(fillColor.b * 255)})`;
        ctx.fill();
      }
      
      // Stroke if border specified - explicitly set to green
      if (borderColor && borderWidth) {
        // Explicitly set green border color (same as profile picture: rgb(0.2, 0.5, 0.2))
        const r = Math.round(borderColor.r * 255);
        const g = Math.round(borderColor.g * 255);
        const b = Math.round(borderColor.b * 255);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`; // Green color
        ctx.lineWidth = borderWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      
      const buffer = canvas.toBuffer('image/png');
      return await pdfDoc.embedPng(buffer);
    };
    
    // Step 1: Draw outer green rounded rectangle background (like profile picture)
    const outerWidth = qrSize + (borderPadding * 2);
    const outerHeight = qrSize + (borderPadding * 2);
    const outerRadius = borderRadius + borderPadding;
    const outerGreenRect = await createRoundedRectImage(
      outerWidth,
      outerHeight,
      outerRadius,
      { r: 0.2, g: 0.5, b: 0.2 } // Light green background (same as profile)
    );
    page.drawImage(outerGreenRect, {
      x: qrX - borderPadding,
      y: qrY - borderPadding,
      width: outerWidth,
      height: outerHeight,
    });
    
    // Step 2: Draw white rounded rectangle (creates the frame border)
    const whiteWidth = qrSize + 2;
    const whiteHeight = qrSize + 2;
    const whiteRadius = borderRadius + 1;
    const whiteRect = await createRoundedRectImage(
      whiteWidth,
      whiteHeight,
      whiteRadius,
      { r: 1, g: 1, b: 1 } // White
    );
    page.drawImage(whiteRect, {
      x: qrX - 1,
      y: qrY - 1,
      width: whiteWidth,
      height: whiteHeight,
    });
    
    // Step 3: Draw the QR code image
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });
    
    // Step 4: Draw the light green rounded border (completes the frame like profile picture)
    // Use transparent fill so QR code shows through
    const borderRect = await createRoundedRectImage(
      qrSize,
      qrSize,
      borderRadius,
      null, // No fill - transparent
      { r: 0.2, g: 0.5, b: 0.2 }, // Light green border (same as profile)
      borderWidth
    );
    page.drawImage(borderRect, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Draw dealer profile to the right of Column 4 (CO2) for dealer orders
    if (data.dealerName) {
      const dealerProfileSize = 315; // Increased by 10% from 286 (286 * 1.10 = 314.6, rounded to 315)
      const dealerProfileGap = pageWidth * 0.05; // Gap between Column 4 and dealer profile (5% of page width)
      
      // Calculate the right edge of Column 4 (CO2) text (reuse co2ValueText and co2ValueFontSize defined earlier)
      const co2TextWidth = robotoBoldFont.widthOfTextAtSize(co2ValueText, co2ValueFontSize);
      const col4RightEdge = col4X + co2TextWidth;
      
      // Position dealer profile to the right of Column 4 with gap
      const dealerProfileX = col4RightEdge + dealerProfileGap;
      
      // Vertically center dealer profile with the stats row, then move 15% upward
      // In PDF coordinates, Y increases upward, so we ADD to move up (toward top)
      const dealerProfileY = statsStartY - (dealerProfileSize / 2) + (co2ValueFontSize / 2) + (dealerProfileSize * 0.15);
      
      // Embed dealer profile picture if available
      let dealerProfilePic: PDFImage | null = null;
      if (data.dealerImageUrl) {
        try {
          console.log('[CERTIFICATE] Fetching dealer profile image from URL:', data.dealerImageUrl.substring(0, 80) + '...');
          const dealerPicResponse = await fetch(data.dealerImageUrl);
          if (dealerPicResponse.ok) {
            const dealerPicBytes = await dealerPicResponse.arrayBuffer();
            const dealerImg = await loadImage(Buffer.from(dealerPicBytes));
            
            // Create circular version
            const dealerCanvas = createCanvas(dealerProfileSize, dealerProfileSize);
            const dealerCtx = dealerCanvas.getContext('2d');
            
            // Create circular clipping path
            dealerCtx.beginPath();
            dealerCtx.arc(dealerProfileSize / 2, dealerProfileSize / 2, dealerProfileSize / 2, 0, Math.PI * 2);
            dealerCtx.closePath();
            dealerCtx.clip();
            
            // Draw the image centered and scaled to fit
            const dealerScale = Math.min(dealerProfileSize / dealerImg.width, dealerProfileSize / dealerImg.height);
            const dealerScaledWidth = dealerImg.width * dealerScale;
            const dealerScaledHeight = dealerImg.height * dealerScale;
            const dealerOffsetX = (dealerProfileSize - dealerScaledWidth) / 2;
            const dealerOffsetY = (dealerProfileSize - dealerScaledHeight) / 2;
            
            dealerCtx.drawImage(dealerImg, dealerOffsetX, dealerOffsetY, dealerScaledWidth, dealerScaledHeight);
            
            const dealerCircularBuffer = dealerCanvas.toBuffer('image/png');
            dealerProfilePic = await pdfDoc.embedPng(dealerCircularBuffer);
            console.log('[CERTIFICATE] Dealer profile image created successfully');
          }
        } catch (dealerPicError) {
          console.warn('[CERTIFICATE] Error fetching dealer profile image:', dealerPicError);
        }
      }
      
      const dealerProfileRadius = dealerProfileSize / 2;
      const dealerProfileCenterX = dealerProfileX + dealerProfileRadius;
      const dealerProfileCenterY = dealerProfileY + dealerProfileRadius;
      
      if (dealerProfilePic) {
        // Draw circular dealer profile picture with circular frame
        // Step 1: Draw outer green circle background
        page.drawCircle({
          x: dealerProfileCenterX,
          y: dealerProfileCenterY,
          size: dealerProfileRadius + 3,
          color: rgb(0.2, 0.5, 0.2), // Light green background
        });
        
        // Step 2: Draw white circle (creates the frame border)
        page.drawCircle({
          x: dealerProfileCenterX,
          y: dealerProfileCenterY,
          size: dealerProfileRadius - 1,
          color: rgb(1, 1, 1), // White
        });
        
        // Step 3: Draw the circular dealer profile image
        page.drawImage(dealerProfilePic, {
          x: dealerProfileX,
          y: dealerProfileY,
          width: dealerProfileSize,
          height: dealerProfileSize,
        });
        
        // Step 4: Draw the light green circular border
        page.drawCircle({
          x: dealerProfileCenterX,
          y: dealerProfileCenterY,
          size: dealerProfileRadius,
          borderColor: rgb(0.2, 0.5, 0.2), // Light green border
          borderWidth: 3,
        });
      } else {
        // Draw placeholder circle with initials
        const dealerInitials = data.dealerName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        
        // Draw circle background
        page.drawCircle({
          x: dealerProfileCenterX,
          y: dealerProfileCenterY,
          size: dealerProfileRadius,
          color: rgb(0.2, 0.5, 0.2),
        });
        
        // Draw initials (font size doubled proportionally: 42 * 2 = 84)
        page.drawText(dealerInitials, {
          x: dealerProfileCenterX - 22,
          y: dealerProfileCenterY - 16,
          size: 84,
          font: robotoBoldFont,
          color: rgb(1, 1, 1),
        });
      }
      
      // Draw vehicle name below QR code with gap (for dealer orders)
      if (data.vehicleName) {
        const vehicleNameGap = 40; // Gap between QR code and vehicle name
        // Position vehicle name below QR code
        // In PDF coordinates, Y=0 is at bottom, so subtracting moves down
        // qrY is the bottom of QR code, so subtract gap to position text below
        // Then move 29% total further down (toward bottom) from original position (10% + 19% = 29%)
        // Then move 1% up (toward top) from current position, then move 8% total down (toward bottom) (3% + 5% = 8%)
        const baseVehicleTextY = (qrY - vehicleNameGap) - ((qrY - vehicleNameGap) * 0.29);
        const vehicleTextY = baseVehicleTextY + (baseVehicleTextY * 0.01) - (baseVehicleTextY * 0.08);
        // Center vehicle name horizontally with QR code (use original QR size 250 for positioning, not the larger size)
        // This keeps vehicle name position unchanged when QR code size increases
        const originalQrSize = 250;
        const qrCenterX = qrX + (originalQrSize / 2);
        
        // Black color for text
        const textColor = rgb(0, 0, 0);
        const vehicleNameFontSize = 40; // Font size for vehicle name
        
        const vehicleNameText = toTitleCase(data.vehicleName);
        const vehicleNameWidth = robotoBoldFont.widthOfTextAtSize(vehicleNameText, vehicleNameFontSize);
        
        // Calculate X position: center below QR code, then move 10% to the left, then move 15% to the right, then move 3% to the left (2% + 1% = 3%)
        const vehicleTextX = (qrCenterX - vehicleNameWidth / 2) - (pageWidth * 0.10) + (pageWidth * 0.15) - (pageWidth * 0.02) - (pageWidth * 0.01);
        
        // Draw vehicle name below QR code, moved 1% more to the left from previous position
        page.drawText(vehicleNameText, {
          x: vehicleTextX,
          y: vehicleTextY,
          size: vehicleNameFontSize,
          font: robotoBoldFont,
          color: textColor,
        });
        
        // Draw dealer name below vehicle name with 30% gap
        if (data.dealerName) {
          const dealerNameGap = vehicleNameFontSize * 0.30; // 30% gap based on vehicle name font size
          const dealerNameFontSize = vehicleNameFontSize; // Same font size as vehicle name (40)
          // Capitalize first letter of each word (title case)
          const dealerNameText = toTitleCase(data.dealerName);
          
          // Position dealer name below vehicle name
          // In PDF coordinates, Y=0 is at bottom, so subtracting moves down
          // Then move 71% total further down (toward bottom) from original position (30% + 28% + 5% + 5% + 3% = 71%)
          const dealerNameY = (vehicleTextY - dealerNameGap - dealerNameFontSize) - ((vehicleTextY - dealerNameGap - dealerNameFontSize) * 0.71);
          
          // Move dealer name 9% to the right from vehicle name position (10% + 15% - 8% - 15% + 4% + 2% + 1% = 9%)
          const dealerNameX = vehicleTextX + (pageWidth * 0.10) + (pageWidth * 0.15) - (pageWidth * 0.08) - (pageWidth * 0.15) + (pageWidth * 0.04) + (pageWidth * 0.02) + (pageWidth * 0.01);
          
          // Draw dealer name below vehicle name, moved 1% more to the right from previous position
          page.drawText(dealerNameText, {
            x: dealerNameX,
            y: dealerNameY,
            size: dealerNameFontSize,
          font: robotoBoldFont,
          color: textColor,
        });
        }
      }
    }

    // Dealer gift message removed - not needed for customer certificates

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

