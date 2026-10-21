-- The van now visits AFTER the cleaner arrives, within a window, rather than
-- delivering before they do. The old "buffer before the cleaner" becomes the
-- earliest the van may arrive after them, and a latest is added.
ALTER TABLE "LaundryFacility" RENAME COLUMN "dropBufferMinutes" TO "handoverMinutes";
ALTER TABLE "LaundryFacility" ADD COLUMN "needByMinutes" INTEGER NOT NULL DEFAULT 90;
