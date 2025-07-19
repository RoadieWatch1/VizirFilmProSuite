import { NextRequest, NextResponse } from 'next/server';
import { generateSchedule } from '@/lib/generators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const script = body?.script ?? '';
    const scriptLength = body?.scriptLength ?? '';

    if (!script || !scriptLength) {
      return NextResponse.json(
        { error: 'Script and script length are required.' },
        { status: 400 }
      );
    }

    // Call your generator
    const schedule = await generateSchedule(script, scriptLength);

    if (!schedule || !Array.isArray(schedule)) {
      return NextResponse.json(
        { error: 'Failed to generate a valid schedule.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule generated successfully.',
      schedule
    });

  } catch (error: any) {
    console.error('[API] Schedule generation error:', error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to generate schedule. Please try again later.'
      },
      { status: 500 }
    );
  }
}

