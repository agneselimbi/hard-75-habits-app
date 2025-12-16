-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),
    "password" VARCHAR(50) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" SERIAL NOT NULL,
    "challenge_name" VARCHAR(200) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_day" INTEGER NOT NULL DEFAULT 1,
    "total_habits" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "previous_challenge_id" INTEGER NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_habits" (
    "id" SERIAL NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "habit_name" VARCHAR(200) NOT NULL,
    "habit_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checkins" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "checkin_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day_number" INTEGER NOT NULL,
    "completed_habit_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "all_habits_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "stage" INTEGER,
    "stage_name" VARCHAR(50) NOT NULL,
    "icon_path" VARCHAR(100),

    CONSTRAINT "pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pet" (
    "id" SERIAL NOT NULL,
    "user_id" SERIAL NOT NULL,
    "current_stage" VARCHAR(50),
    "selected_pet" INTEGER NOT NULL,
    "last_checkin" DATE DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "challenges_user_id_status_idx" ON "challenges"("user_id", "status");

-- CreateIndex
CREATE INDEX "challenges_previous_challenge_id_idx" ON "challenges"("previous_challenge_id");

-- CreateIndex
CREATE INDEX "challenge_habits_challenge_id_idx" ON "challenge_habits"("challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_habits_challenge_id_habit_order_key" ON "challenge_habits"("challenge_id", "habit_order");

-- CreateIndex
CREATE INDEX "daily_checkins_user_id_checkin_date_idx" ON "daily_checkins"("user_id", "checkin_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkins_challenge_id_checkin_date_key" ON "daily_checkins"("challenge_id", "checkin_date");

-- CreateIndex
CREATE UNIQUE INDEX "pet_name_key" ON "pet"("name");

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_previous_challenge_id_fkey" FOREIGN KEY ("previous_challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_habits" ADD CONSTRAINT "challenge_habits_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pet" ADD CONSTRAINT "user_pet_selected_pet_fkey" FOREIGN KEY ("selected_pet") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pet" ADD CONSTRAINT "user_pet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
