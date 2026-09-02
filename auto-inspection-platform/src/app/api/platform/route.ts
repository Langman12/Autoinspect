import { NextResponse } from "next/server";

import { getPlatformData } from "@/lib/platform-data";

export async function GET() {
  return NextResponse.json(getPlatformData());
}
