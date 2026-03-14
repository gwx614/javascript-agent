import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "用户名必须至少为3位" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码必须至少为6位" }, { status: 400 });
    }

    // 延迟获取 prisma 实例并捕获初始化错误
    const prisma = getPrisma();

    // 检查用户名是否存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "该用户名已被注册" }, { status: 400 });
    }

    // 为了简单系统，直接存储明文密码
    const user = await prisma.user.create({
      data: {
        username,
        password,
      },
    });

    return NextResponse.json(
      { message: "注册成功", user: { username: user.username } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error details:", error);
    return NextResponse.json(
      {
        error: "服务器内部错误，请稍后重试",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
