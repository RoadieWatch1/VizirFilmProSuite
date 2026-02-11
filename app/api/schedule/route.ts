import { NextRequest, NextResponse } from 'next/server';
import { generateSchedule } from '@/lib/generators';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

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

    const result = await generateSchedule(script, scriptLength);
    const schedule = result?.schedule;

    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate a valid schedule.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedule });

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

