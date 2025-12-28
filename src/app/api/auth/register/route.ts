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
    
    // If user exists and has publicId/QR code (likely created by dealer), allow them to claim the account
    // by updating their password and other details, preserving the existing publicId and QR code
    if (existing) {
      // If account has publicId and QR code, allow user to claim it by updating password
      if (existing.publicId && existing.qrCode) {
        // Update password and other details, but preserve existing publicId and QR code
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Update user details but preserve publicId and QR code
        existing.passwordHash = passwordHash;
        if (userType === 'individual' && name) {
          existing.name = sanitizeInput(name);
        }
        if ((userType === 'company' || userType === 'dealer') && companyName) {
          existing.companyName = sanitizeInput(companyName);
        }
        if (phone) {
          existing.phone = sanitizeInput(phone);
        }
        existing.userType = userType;
        
        try {
          await existing.save();
          
          // Send welcome email (don't fail if email fails)
          try {
            const userName = userType === 'individual' ? name : companyName;
            await sendWelcomeEmail(existing.email, userName || '', userType);
          } catch (emailError) {
            console.error('Error sending welcome email during registration:', emailError);
          }
          
          return NextResponse.json(
            {
              success: true,
              data: {
                id: existing._id,
                email: existing.email,
              },
              message: 'Account claimed successfully. Your existing publicId and QR code have been preserved.',
            },
            { status: 200 }
          );
        } catch (updateError) {
          console.error('Error updating existing user:', updateError);
          return NextResponse.json(
            { success: false, error: 'Registration failed. Please try again.' },
            { status: 500 }
          );
        }
      } else {
        // Account exists but doesn't have publicId/QR - this shouldn't happen, but handle it
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 409 }
        );
      }
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
    let user;
    try {
      user = await User.create({
        userType,
        name: userType === 'individual' && name ? sanitizeInput(name) : undefined,
        companyName: (userType === 'company' || userType === 'dealer') && companyName ? sanitizeInput(companyName) : undefined,
        email: email.toLowerCase(),
        phone: phone ? sanitizeInput(phone) : undefined,
        passwordHash,
        role: 'user',
        publicId, // Set manually to avoid pre-save hook
        qrCode: qrDataUrl, // Set from the start to avoid immutable field issues
      });
    } catch (createError) {
      console.error('Error creating user:', createError);
      const errorMessage = createError instanceof Error ? createError.message : 'Unknown error';
      console.error('User creation error details:', {
        userType,
        email: email.toLowerCase(),
        error: errorMessage,
        stack: createError instanceof Error ? createError.stack : undefined
      });
      throw createError; // Re-throw to be caught by outer catch
    }

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
  } catch (err) {
    // Log the actual error for debugging
    console.error('Registration error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    // Don't expose internal errors to client, but log them
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}


