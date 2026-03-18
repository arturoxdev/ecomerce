-- CreateEnum
CREATE TYPE "content_locale" AS ENUM ('en', 'es');

-- CreateEnum
CREATE TYPE "about_page_slug" AS ENUM ('about');

-- CreateEnum
CREATE TYPE "contact_page_slug" AS ENUM ('contact');

-- CreateEnum
CREATE TYPE "legal_page_slug" AS ENUM ('terms', 'privacy', 'refund-policy');

-- CreateTable
CREATE TABLE "about_page_contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" "about_page_slug" NOT NULL DEFAULT 'about',
    "locale" "content_locale" NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "story_title" TEXT NOT NULL,
    "story_body" TEXT NOT NULL,
    "values_title" TEXT NOT NULL,
    "values_body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_page_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_page_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" "legal_page_slug" NOT NULL,
    "locale" "content_locale" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_page_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_page_contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" "contact_page_slug" NOT NULL DEFAULT 'contact',
    "locale" "content_locale" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "business_hours" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_page_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "locale" "content_locale" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_about_page_locale" ON "about_page_contents"("slug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "idx_legal_page_locale" ON "legal_page_documents"("slug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "idx_contact_page_locale" ON "contact_page_contents"("slug", "locale");

-- CreateIndex
CREATE INDEX "idx_faq_locale_order" ON "faq_entries"("locale", "sort_order");
