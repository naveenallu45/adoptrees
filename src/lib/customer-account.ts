import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Create or update customer account for dealer orders
 * 
 * IMPORTANT: This function ALWAYS uses customer data (customerName, customerEmail, customerProfilePicture)
 * NEVER uses dealer data. The customer account is created/updated with customer information only.
 * 
 * For certificates: Always uses customer's publicId and QR code (never dealer's)
 * 
 * Returns the customer user ID
 */
export async function createOrUpdateCustomerAccount(
  customerName: string,
  customerEmail: string,
  customerProfilePicture?: string,
  customerPhone?: string
): Promise<string> {
  // Ensure database connection
  await connectDB();
  
  // Check if customer account already exists
  // If exists: use existing account's publicId and QR code (preserve them)
  // If not exists: create new account with publicId and QR code
  let customer = await User.findOne({ email: customerEmail.toLowerCase() });

  if (customer) {
    // Update existing customer account
    // Update name if provided (dealer can update customer name)
    if (customerName && customerName.trim()) {
      customer.name = customerName.trim();
    }
    // Update phone number if provided (dealer can update customer phone)
    if (customerPhone && customerPhone.trim()) {
      customer.phone = customerPhone.trim();
    }
    // Update profile picture if provided (dealer can update customer profile)
    if (customerProfilePicture && customerProfilePicture.trim()) {
      customer.image = customerProfilePicture.trim();
    }
    // Always preserve existing publicId and QR code - never change them
    // This ensures certificates always use the customer's original publicId and QR
    
    // Ensure customer has publicId and QR code (for existing accounts that might not have them)
    // This is critical for certificates - publicId and QR code must exist
    if (!customer.publicId || !customer.qrCode) {
      const generatePublicId = () => {
        const random = Math.random().toString(36).slice(2, 8);
        const timestamp = Date.now().toString(36).slice(-4);
        return `${random}${timestamp}`.toLowerCase();
      };
      
      // If publicId doesn't exist, generate a new one
      // If publicId exists but QR code doesn't, use existing publicId
      let publicId = customer.publicId || generatePublicId();
      
      if (!customer.publicId) {
        // Generate unique publicId
        let attempts = 0;
        while (attempts < 10) {
          const existing = await User.findOne({ publicId });
          if (!existing) break;
          publicId = generatePublicId();
          attempts++;
        }
        
        if (attempts >= 10) {
          throw new Error('Failed to generate unique public ID for customer');
        }
        
        customer.publicId = publicId;
      }
      
      // Generate QR code if it doesn't exist (using existing or new publicId)
      if (!customer.qrCode) {
        const origin = 'https://adoptrees.com';
        const qrUrl = `${origin}/u/${customer.publicId.toLowerCase()}`;
        try {
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
            width: 320,
            margin: 1,
            errorCorrectionLevel: 'M'
          });
          
          if (!qrDataUrl || qrDataUrl.trim() === '') {
            // Retry with simpler options
            const retryQrDataUrl = await QRCode.toDataURL(qrUrl, { 
              width: 200,
              margin: 1,
              errorCorrectionLevel: 'L'
            });
            customer.qrCode = retryQrDataUrl || '';
          } else {
            customer.qrCode = qrDataUrl;
          }
        } catch (qrError) {
          console.error('Error generating QR code for existing customer:', qrError);
          // Try one more time with simpler options
          try {
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
              width: 200,
              margin: 1,
              errorCorrectionLevel: 'L'
            });
            customer.qrCode = qrDataUrl || '';
          } catch (retryError) {
            console.error('QR code retry also failed:', retryError);
            throw new Error('Failed to generate QR code for customer - required for certificates');
          }
        }
      }
    }
    
    await customer.save();
    return String(customer._id);
  }

  // Create new customer account
  // Generate unique publicId
  const generatePublicId = () => {
    const random = Math.random().toString(36).slice(2, 8);
    const timestamp = Date.now().toString(36).slice(-4);
    return `${random}${timestamp}`.toLowerCase();
  };
  
  let publicId = generatePublicId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await User.findOne({ publicId });
    if (!existing) break;
    publicId = generatePublicId();
    attempts++;
  }
  
  if (attempts >= 10) {
    throw new Error('Failed to generate unique public ID for customer');
  }

  // Generate QR code - REQUIRED for certificates
  // QR code generation is mandatory for dealer-created customer accounts
  let qrDataUrl: string;
  try {
    const origin = 'https://adoptrees.com';
    const qrUrl = `${origin}/u/${publicId.toLowerCase()}`;
    qrDataUrl = await QRCode.toDataURL(qrUrl, { 
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
    
    if (!qrDataUrl || qrDataUrl.trim() === '') {
      console.warn('QR code generation returned empty result, retrying with simpler options');
      // Retry once with simpler options
      try {
        qrDataUrl = await QRCode.toDataURL(qrUrl, { 
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'L'
        });
      } catch (retryError) {
        console.error('QR code retry also failed:', retryError);
        throw new Error('Failed to generate QR code for customer - required for certificates');
      }
    }
  } catch (qrError) {
    console.error('Error generating QR code for customer:', qrError);
    // QR code is required for certificates, so we must throw an error
    throw new Error('Failed to generate QR code for customer - required for certificates');
  }

  // Use customer email as default password for dealer-created accounts
  // This makes it easy for dealers to tell customers their login credentials
  const defaultPassword = customerEmail.toLowerCase();
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // Create customer account
  // QR code is required and must be included
  const customerData: {
    name: string;
    email: string;
    passwordHash: string;
    userType: string;
    role: string;
    publicId: string;
    qrCode: string; // Required for certificates
    phone?: string;
    image?: string;
  } = {
    name: customerName.trim(),
    email: customerEmail.toLowerCase(),
    passwordHash,
    userType: 'individual', // Customers are treated as individuals
    role: 'user',
    publicId,
    qrCode: qrDataUrl, // Always include QR code - it's required for certificates
    phone: customerPhone?.trim() || undefined,
    image: customerProfilePicture || undefined,
  };
  
  customer = await User.create(customerData);

  return String(customer._id);
}

