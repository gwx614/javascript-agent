import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, rolePosition, roleReport, formData } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const prisma = getPrisma();

    const user = await prisma.user.update({
      where: { username },
      data: {
        rolePosition: rolePosition,
        roleReport: roleReport,
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        username: user.username,
        rolePosition: user.rolePosition,
        roleReport: user.roleReport
      }
    });

  } catch (error: any) {
    console.error("Save profile error:", error);
    return NextResponse.json(
      { error: "无法保存用户设置", details: error.message },
      { status: 500 }
    );
  }
}
