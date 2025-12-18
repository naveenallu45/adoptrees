import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations/auth';
import { sanitizeInput } from '@/lib/security';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting disabled - removed for easier registration

    // Parse and validate request body
    const body = await req.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => ({
        field: String(err.path.join('.')),
        message: err.message,
      }));
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { userType, name, companyName, email, phone, password } = validationResult.data;

    await connectDB();

    // Check for existing user (case-insensitive)
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Hash password with appropriate cost factor
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate publicId manually (same logic as pre-save hook)
    // This allows us to generate QR code before saving user
    const generatePublicId = () => {
      const random = Math.random().toString(36).slice(2, 8);
      const timestamp = Date.now().toString(36).slice(-4);
      return `${random}${timestamp}`.toLowerCase();
    };
    
    // Ensure unique publicId
    let publicId = generatePublicId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await User.findOne({ publicId });
      if (!existing) break;
      publicId = generatePublicId();
      attempts++;
    }
    
    if (attempts >= 10) {
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    // Generate QR code BEFORE creating user (so we can set it in initial create)
    // QR code generation is MANDATORY for every user
    // ALWAYS use adoptrees.com for QR codes (never localhost)
    let qrDataUrl: string;
    try {
      // Always use production URL for QR codes (they're immutable and must work in production)
      const origin = 'https://adoptrees.com';
      const qrUrl = `${origin}/u/${publicId.toLowerCase()}`;
      // Use same settings as modal (width: 320 for better quality)
      qrDataUrl = await QRCode.toDataURL(qrUrl, { 
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
      
      // Validate QR code was generated
      if (!qrDataUrl || qrDataUrl.trim() === '') {
        throw new Error('QR code generation returned empty result');
      }
    } catch (qrError) {
      // QR code generation failure MUST fail registration since it's mandatory
      console.error('Error generating QR code during registration:', qrError);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    // Create user with publicId and qrCode set from the start
    // This avoids issues with immutable fields
    const user = await User.create({
      userType,
      name: userType === 'individual' && name ? sanitizeInput(name) : undefined,
      companyName: userType === 'company' && companyName ? sanitizeInput(companyName) : undefined,
      email: email.toLowerCase(),
      phone: phone ? sanitizeInput(phone) : undefined,
      passwordHash,
      role: 'user',
      publicId, // Set manually to avoid pre-save hook
      qrCode: qrDataUrl, // Set from the start to avoid immutable field issues
    });

    // Final verification: Ensure QR code and publicId were saved
    const savedUser = await User.findById(user._id).select('qrCode publicId').lean() as { qrCode?: string; publicId?: string } | null;
    if (!savedUser || !savedUser.qrCode || savedUser.qrCode.trim() === '') {
      console.error('Error: QR code was not saved to database');
      await User.findByIdAndDelete(user._id);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }
    if (!savedUser.publicId || savedUser.publicId !== publicId) {
      console.error('Error: publicId mismatch after save');
      await User.findByIdAndDelete(user._id);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    // Send welcome email (don't fail registration if email fails)
    try {
      const userName = userType === 'individual' ? name : companyName;
      await sendWelcomeEmail(user.email, userName || '', userType);
    } catch (emailError) {
      // Log error but don't fail registration if email sending fails
      console.error('Error sending welcome email during registration:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user._id,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (_err) {
    
    // Don't expose internal errors
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}


