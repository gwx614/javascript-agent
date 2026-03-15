-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "skill_level" TEXT NOT NULL DEFAULT 'beginner',
    "role_position" TEXT,
    "role_report" TEXT,
    "career_identity" TEXT,
    "experience_level" TEXT,
    "learning_goal" TEXT,
    "interest_areas" TEXT,
    "preferred_scenarios" TEXT,
    "target_level" TEXT,
    "tutor_style" TEXT,
    "weekly_study_time" TEXT,
    "additional_notes" TEXT,
    "survey_data" TEXT
);

-- CreateTable
CREATE TABLE "course_stages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRE_ASSESSMENT',
    "pre_questions" TEXT,
    "pre_report" TEXT,
    "learning_outline" TEXT,
    "post_questions" TEXT,
    "post_report" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "course_stages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "section_contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stage_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "section_contents_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "course_stages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "title" TEXT NOT NULL DEFAULT '新的学习会话',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT,
    CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "course_stages_user_id_course_id_key" ON "course_stages"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_contents_stage_id_section_id_key" ON "section_contents"("stage_id", "section_id");
