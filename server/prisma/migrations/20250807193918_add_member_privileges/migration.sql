-- AlterTable
ALTER TABLE "CollectionMembership" ADD COLUMN     "canAddFeed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canComment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canRead" BOOLEAN NOT NULL DEFAULT true;
