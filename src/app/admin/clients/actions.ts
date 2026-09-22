"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { saveProfilePhoto } from "@/lib/profilePhotos";
import { saveHostifyCoverPhoto } from "@/lib/uploads";
import { encrypt } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import {
  buildHostifyAddress,
  mapHostifyPropertyType,
  fetchHostifyCoverPhotoUrl,
  type HostifyListing,
} from "@/lib/hostifyListings";
import { syncHostifyListing } from "@/lib/hostifySync";

// Trims and turns blank strings into null, so an untouched optional input
// stores NULL rather than "".
function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function file(formData: FormData, key: string): File | null {
  const raw = formData.get(key);
  return raw instanceof File && raw.size > 0 ? raw : null;
}

export async function createClient(formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const hostifyApiKey = str(formData, "hostifyApiKey");

  const client = await prisma.client.create({
    data: {
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      notes: str(formData, "notes"),
      hostifyApiKey: hostifyApiKey ? encrypt(hostifyApiKey) : null,
    },
  });

  const photo = file(formData, "photo");
  if (photo) {
    const photoPath = await saveProfilePhoto(client.id, photo);
    await prisma.client.update({ where: { id: client.id }, data: { photoPath } });
  }

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const session = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const photo = file(formData, "photo");
  const photoPath = photo ? await saveProfilePhoto(id, photo) : undefined;

  // Left blank, the Hostify key field means "no change" rather than "clear
  // it" -- a decrypted secret is never sent back into the form to prefill
  // (see ClientForm), so blank can't be distinguished from "unchanged" any
  // other way. Clearing it entirely is a dedicated action, same reasoning
  // as photoPath being left alone below.
  const hostifyApiKey = str(formData, "hostifyApiKey");

  await prisma.client.update({
    where: { id },
    data: {
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      notes: str(formData, "notes"),
      // Left alone when no new file was chosen, so editing other fields
      // doesn't wipe an existing photo.
      ...(photoPath ? { photoPath } : {}),
      ...(hostifyApiKey ? { hostifyApiKey: encrypt(hostifyApiKey) } : {}),
    },
  });

  await logAudit({
    actorId: session.user.id,
    entityType: "Client",
    entityId: id,
    summary: "Details updated",
  });
  // Its own row -- never worth burying "a secret changed" inside the same
  // generic "Details updated" line, or logging the key itself.
  if (hostifyApiKey) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Client",
      entityId: id,
      summary: "Hostify API key updated",
    });
  }

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}`);
}

// Dedicated action so disconnecting Hostify is explicit -- the edit form's
// key field can't double as "clear it" once it's left blank meaning
// "unchanged" (see updateClient).
export async function removeClientHostifyApiKey(id: string) {
  const session = await requireStaff();

  await prisma.client.update({ where: { id }, data: { hostifyApiKey: null } });

  await logAudit({
    actorId: session.user.id,
    entityType: "Client",
    entityId: id,
    summary: "Hostify API key removed",
  });

  revalidatePath(`/admin/clients/${id}`);
  revalidatePath(`/admin/clients/${id}/edit`);
}

// Creates a Property per selected Hostify listing (see the "Import from
// Hostify" page) rather than staff typing each one in by hand -- address,
// bed/bath counts, and the correct listing id (never the easily-confused
// channel_listing_id -- see hostifyListingId's comment in schema.prisma)
// all come straight from Hostify. listingsJson carries the data already
// fetched for the picker page, so this doesn't need a second round-trip to
// Hostify just to re-fetch what was already on screen.
export async function importHostifyListings(clientId: string, formData: FormData) {
  const session = await requireStaff();

  const selectedIds = new Set(formData.getAll("selectedIds").map(String));
  if (selectedIds.size === 0) throw new Error("Select at least one listing to import");

  // For the cover-photo fetch below -- listingsJson already covers
  // everything else, but photos are a separate Hostify endpoint (see
  // fetchHostifyCoverPhotoUrl) not worth calling for every listing shown in
  // the picker, only the ones actually selected.
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { hostifyApiKey: true },
  });

  const listingsJson = str(formData, "listingsJson");
  const listings = (listingsJson ? JSON.parse(listingsJson) : []) as HostifyListing[];
  const toImport = listings.filter((listing) => selectedIds.has(String(listing.id)));

  // Hostify's bathrooms count can be fractional (a real listing came back
  // with 2.5, presumably a half bath/en-suite toilet) -- our column is an
  // Int, same as every other property in this app, so this rounds rather
  // than letting Prisma reject the whole create over a decimal.
  const toInt = (n: number | null) => (n === null ? null : Math.round(n));

  for (const listing of toImport) {
    let property;
    try {
      property = await prisma.property.create({
        data: {
          clientId,
          name: listing.name,
          address: buildHostifyAddress(listing),
          latitude: listing.lat,
          longitude: listing.lng,
          type: mapHostifyPropertyType(listing.property_type),
          bedrooms: toInt(listing.bedrooms),
          bathrooms: toInt(listing.bathrooms),
          maxOccupancy: toInt(listing.person_capacity),
          hostifyListingId: String(listing.id),
        },
      });
    } catch (err) {
      // Already linked to a property somewhere -- most likely a concurrent
      // import of the same listing. Skip it rather than fail the whole
      // batch over one already-handled row.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }

    await logAudit({
      actorId: session.user.id,
      entityType: "Property",
      entityId: property.id,
      summary: `Imported from Hostify -- listing #${listing.id}`,
    });

    // Best-effort cover photo -- only the main one, not the full gallery
    // (see fetchHostifyCoverPhotoUrl). A download hiccup here shouldn't
    // stop the property itself, or its reservations, from importing.
    if (client.hostifyApiKey) {
      try {
        const photoUrl = await fetchHostifyCoverPhotoUrl(client.hostifyApiKey, listing.id);
        if (photoUrl) {
          const photoPath = await saveHostifyCoverPhoto(property.id, photoUrl);
          await prisma.propertyImage.create({
            data: { propertyId: property.id, path: photoPath, isPrimary: true },
          });
        }
      } catch {
        // No cover photo this time -- the property still imported fine.
      }
    }

    // Pulls in this property's reservations immediately, so importing
    // actually means cleans start appearing, not just the property record
    // existing. Never throws -- a failure here just leaves
    // hostifyLastSyncError set for the property page to show, same
    // contract as any other sync.
    await syncHostifyListing(property.id, session.user.id);
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/properties");
  redirect(`/admin/clients/${clientId}`);
}

export async function deleteClient(id: string) {
  const session = await requireStaff();

  const client = await prisma.client.findUniqueOrThrow({ where: { id }, select: { name: true } });

  // Cascades to this client's properties and their images (see the
  // onDelete rules in schema.prisma).
  await prisma.client.delete({ where: { id } });

  await logAudit({
    actorId: session.user.id,
    entityType: "Client",
    entityId: id,
    summary: `Deleted -- ${client.name}`,
  });

  revalidatePath("/admin/clients");
  revalidatePath("/admin/properties");
  redirect("/admin/clients");
}
