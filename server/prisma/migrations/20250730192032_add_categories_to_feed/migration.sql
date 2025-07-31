-- DropForeignKey
ALTER TABLE "CollectionMembership" DROP CONSTRAINT "CollectionMembership_collectionId_fkey";

-- AlterTable
ALTER TABLE "Feed" ADD COLUMN     "categories" TEXT[],
ALTER COLUMN "tags" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "CollectionMembership" ADD CONSTRAINT "CollectionMembership_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
