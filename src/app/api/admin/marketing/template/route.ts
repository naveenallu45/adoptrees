import { NextRequest, NextResponse } from 'next/server';
import { getMarketingEmailTemplate } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const userType = searchParams.get('userType') as 'individual' | 'company' | null;
    const displayName = searchParams.get('displayName') || 'John Doe';
    
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!userType || (userType !== 'individual' && userType !== 'company')) {
      return NextResponse.json(
        { success: false, error: 'Valid userType (individual or company) is required' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://www.adoptrees.com';
    const template = getMarketingEmailTemplate(templateId, displayName, userType, appUrl);

    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[MarketingTemplateAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

