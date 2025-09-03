-- 1) cria a coluna permitindo NULL
ALTER TABLE "public"."User"
  ADD COLUMN "updatedAt" TIMESTAMP(3);

-- 2) preenche as linhas já existentes
UPDATE "public"."User"
SET "updatedAt" = NOW()
WHERE "updatedAt" IS NULL;

-- 3) define DEFAULT para novos inserts e trava NOT NULL
ALTER TABLE "public"."User"
  ALTER COLUMN "updatedAt" SET DEFAULT NOW(),
  ALTER COLUMN "updatedAt" SET NOT NULL;
