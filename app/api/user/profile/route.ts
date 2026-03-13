import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import type { UserProfile } from "@/types";

export async function POST(req: Request) {
  try {
    const { username, rolePosition, roleReport, skillLevel, formData } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const prisma = getPrisma();

    const updateData: Partial<UserProfile> = {};
    if (rolePosition !== undefined) updateData.rolePosition = rolePosition;
    if (roleReport !== undefined) updateData.roleReport = roleReport;
    if (skillLevel !== undefined) updateData.skillLevel = skillLevel;

    const user = await prisma.user.update({
      where: { username },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        rolePosition: user.rolePosition,
        roleReport: user.roleReport,
        skillLevel: user.skillLevel,
      },
    });
  } catch (error: any) {
    console.error("Save profile error:", error);
    return NextResponse.json(
      { error: "无法保存用户设置", details: error.message },
      { status: 500 }
    );
  }
}
