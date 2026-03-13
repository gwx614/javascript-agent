import { NextResponse } from "next/server";

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: any;
}

export function apiError(
  message: string,
  code: string = "INTERNAL_ERROR",
  status: number = 500,
  details?: any
) {
  const response: ApiErrorResponse = { error: message, code, details };
  return NextResponse.json(response, { status });
}
