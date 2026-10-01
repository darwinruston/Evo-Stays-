"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type PmsProvider } from "@prisma/client";
import { requireStaff } from "@/lib/authz";
import { saveProfilePhoto } from "@/lib/profilePhotos";
import { savePmsCoverPhoto } from "@/lib/uploads";
import { encrypt } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import { getPmsAdapter } from "@/lib/pms/registry";
import { decryptPmsCredentials } from "@/lib/pms/credentials";
import { syncPmsListing } from "@/lib/pms/sync";
import type { PmsCredentials, PmsListing } from "@/lib/pms/types";

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

// formData's pmsProvider field is whatever value PmsCredentialFields.tsx's
// <select> was given, which is always one of the registry's own provider
// ids or blank for "not connecting a PMS" -- getPmsAdapter throws on
// anything else, so a tampered/bogus value fails loudly rather than being
// silently accepted.
function selectedProvider(formData: FormData): PmsProvider | null {
  const raw = str(formData, "pmsProvider");
  return raw === null ? null : (raw as PmsProvider);
}

// Reads every cred_<key> field this provider's adapter declares. Throws
// naming the first missing one by its label -- used both when connecting a
// PMS for the first time (every field required) and when switching to a
// different provider on an already-connected client (nothing to "leave
// unchanged" across a shape change, so every field is required there too).
function collectCredentials(formData: FormData, provider: PmsProvider): PmsCredentials {
  const adapter = getPmsAdapter(provider);
  const values: PmsCredentials = {};
  for (const field of adapter.credentialFields) {
    const value = str(formData, `cred_${field.key}`);
    if (!value) throw new Error(`${field.label} is required to connect ${adapter.displayName}.`);
    values[field.key] = value;
  }
  return values;
}

export async function createClient(formData: FormData) {
  const { session, db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  // Connecting a PMS is optional at creation time, same as the old
  // single-field Hostify key was -- a client can be added with no PMS and
  // connected later from the edit page.
  const pmsProvider = selectedProvider(formData);
  const pmsCredentials = pmsProvider ? encrypt(JSON.stringify(collectCredentials(formData, pmsProvider))) : null;

  const client = await db.client.create({
    data: {
      organizationId: session.user.organizationId,
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      notes: str(formData, "notes"),
      pmsProvider,
      pmsCredentials,
    },
  });

  const photo = file(formData, "photo");
  if (photo) {
    const photoPath = await saveProfilePhoto(client.id, photo);
    await db.client.update({ where: { id: client.id }, data: { photoPath } });
  }

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const { session, db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const photo = file(formData, "photo");
  const photoPath = photo ? await saveProfilePhoto(id, photo) : undefined;

  // Left blank (same provider, no cred_* fields filled), the credential
  // fields mean "no change" rather than "clear them" -- a decrypted secret
  // is never sent back into the form to prefill (see PmsCredentialFields),
  // so blank can't be distinguished from "unchanged" any other way.
  // Switching to a different provider always requires every one of its
  // fields -- there's nothing to "leave unchanged" across a shape change.
  // Selecting "not connected" while a PMS is already connected is also
  // treated as leaving it alone: clearing it entirely is a dedicated
  // action (removeClientPmsCredentials), same reasoning as photoPath being
  // left alone below when no new file was chosen.
  const current = await db.client.findUniqueOrThrow({ where: { id }, select: { pmsProvider: true } });
  const selected = selectedProvider(formData);
  let pmsUpdate: { pmsProvider: PmsProvider; pmsCredentials: string } | undefined;
  if (selected) {
    const providerChanged = current.pmsProvider !== selected;
    const adapter = getPmsAdapter(selected);
    const anyFieldFilled = adapter.credentialFields.some((f) => str(formData, `cred_${f.key}`) !== null);
    if (providerChanged || anyFieldFilled) {
      pmsUpdate = { pmsProvider: selected, pmsCredentials: encrypt(JSON.stringify(collectCredentials(formData, selected))) };
    }
  }

  await db.client.update({
    where: { id },
    data: {
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      notes: str(formData, "notes"),
      // Left alone when no new file was chosen, so editing other fields
      // doesn't wipe an existing photo.
      ...(photoPath ? { photoPath } : {}),
      ...(pmsUpdate ?? {}),
    },
  });

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Client",
    entityId: id,
    summary: "Details updated",
  });
  // Its own row -- never worth burying "a secret changed" inside the same
  // generic "Details updated" line, or logging the credentials themselves.
  if (pmsUpdate) {
    await logAudit(db, {
      actorId: session.user.id,
      entityType: "Client",
      entityId: id,
      summary: "PMS credentials updated",
    });
  }

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}`);
}

// Dedicated action so disconnecting a PMS is explicit -- the edit form's
// credential fields can't double as "clear it" once they're left blank
// meaning "unchanged" (see updateClient).
export async function removeClientPmsCredentials(id: string) {
  const { session, db } = await requireStaff();

  await db.client.update({ where: { id }, data: { pmsProvider: null, pmsCredentials: null } });

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Client",
    entityId: id,
    summary: "PMS credentials removed",
  });

  revalidatePath(`/admin/clients/${id}`);
  revalidatePath(`/admin/clients/${id}/edit`);
}

// Creates a Property per selected PMS listing (see the "Import from
// <provider>" page) rather than staff typing each one in by hand -- address,
// bed/bath counts, and the correct listing id (never the easily-confused
// channel_listing_id Hostify also exposes -- see pmsListingId's comment in
// schema.prisma) all come straight from the provider. listingsJson carries
// the data already fetched for the picker page, so this doesn't need a
// second round-trip to the PMS just to re-fetch what was already on screen.
export async function importPmsListings(clientId: string, formData: FormData) {
  const { session, db } = await requireStaff();

  const selectedIds = new Set(formData.getAll("selectedIds").map(String));
  if (selectedIds.size === 0) throw new Error("Select at least one listing to import");

  // For the cover-photo fetch below -- listingsJson already covers
  // everything else, but photos are a separate endpoint (see
  // PmsAdapter.fetchCoverPhotoUrl) not worth calling for every listing shown
  // in the picker, only the ones actually selected.
  const client = await db.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { pmsProvider: true, pmsCredentials: true },
  });
  if (!client.pmsProvider || !client.pmsCredentials) throw new Error("No PMS connected on this client.");
  const adapter = getPmsAdapter(client.pmsProvider);
  const credentials = decryptPmsCredentials(client.pmsCredentials);

  const listingsJson = str(formData, "listingsJson");
  const listings = (listingsJson ? JSON.parse(listingsJson) : []) as PmsListing[];
  const toImport = listings.filter((listing) => selectedIds.has(listing.externalId));

  for (const listing of toImport) {
    let property;
    try {
      property = await db.property.create({
        data: {
          organizationId: session.user.organizationId,
          clientId,
          name: listing.name,
          address: listing.address,
          latitude: listing.latitude,
          longitude: listing.longitude,
          type: listing.propertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          maxOccupancy: listing.maxOccupancy,
          pmsProvider: client.pmsProvider,
          pmsListingId: listing.externalId,
        },
      });
    } catch (err) {
      // Already linked to a property somewhere -- most likely a concurrent
      // import of the same listing. Skip it rather than fail the whole
      // batch over one already-handled row.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }

    await logAudit(db, {
      actorId: session.user.id,
      entityType: "Property",
      entityId: property.id,
      summary: `Imported from ${adapter.displayName} — listing #${listing.externalId}`,
    });

    // Best-effort cover photo -- only the main one, not the full gallery
    // (see PmsAdapter.fetchCoverPhotoUrl). A download hiccup here shouldn't
    // stop the property itself, or its reservations, from importing. Not
    // every provider supports this yet (see the optional field on
    // PmsAdapter) -- skipped entirely rather than erroring when it doesn't.
    if (adapter.fetchCoverPhotoUrl) {
      try {
        const photoUrl = await adapter.fetchCoverPhotoUrl(credentials, listing.externalId);
        if (photoUrl) {
          const photoPath = await savePmsCoverPhoto(property.id, photoUrl);
          await db.propertyImage.create({
            data: { organizationId: session.user.organizationId, propertyId: property.id, path: photoPath, isPrimary: true },
          });
        }
      } catch {
        // No cover photo this time -- the property still imported fine.
      }
    }

    // Pulls in this property's reservations immediately, so importing
    // actually means cleans start appearing, not just the property record
    // existing. Never throws -- a failure here just leaves pmsLastSyncError
    // set for the property page to show, same contract as any other sync.
    await syncPmsListing(db, property.id, session.user.id);
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/properties");
  redirect(`/admin/clients/${clientId}`);
}

export async function deleteClient(id: string) {
  const { session, db } = await requireStaff();

  const client = await db.client.findUniqueOrThrow({ where: { id }, select: { name: true } });

  // Cascades to this client's properties and their images (see the
  // onDelete rules in schema.prisma).
  await db.client.delete({ where: { id } });

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Client",
    entityId: id,
    summary: `Deleted — ${client.name}`,
  });

  revalidatePath("/admin/clients");
  revalidatePath("/admin/properties");
  redirect("/admin/clients");
}
