"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/loginRateLimit";
import { contactLimited } from "@/lib/contactRateLimit";
import { emailConfigured, sendEmail } from "@/lib/email";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/site";

export type ContactState = { error: string } | { success: true } | undefined;

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 3000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

// A message from the public Contact page. Stored for the platform owner to
// read (see /owner/messages) and, when email and CONTACT_NOTIFY_EMAIL are set,
// also sent on by email. Goes through the unscoped client on purpose: the
// sender isn't a customer, so there's no company to scope into (see
// UNSCOPED_MODELS in src/lib/prisma.ts).
export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // A real person never sees or fills this field, so anything in it is a bot.
  // The reply looks like a success so it learns nothing.
  if (str(formData, "website") !== "") return { success: true };

  const name = str(formData, "name");
  const email = str(formData, "email");
  const company = str(formData, "company");
  const message = str(formData, "message");
  const topicRaw = str(formData, "topic");
  const topic: ContactTopic = CONTACT_TOPICS.some((t) => t.value === topicRaw)
    ? (topicRaw as ContactTopic)
    : "other";

  if (!name || !email || !message) return { error: "Please fill in your name, email and message." };
  if (name.length > 100 || company.length > 150) return { error: "That name or company is too long." };
  if (!EMAIL_PATTERN.test(email) || email.length > 200) return { error: "That email address doesn't look right." };
  if (message.length < MESSAGE_MIN) return { error: "Tell us a little more so we can help." };
  if (message.length > MESSAGE_MAX) return { error: `Please keep your message under ${MESSAGE_MAX} characters.` };

  const ip = clientIp(await headers());
  if (contactLimited(ip, email)) {
    return { error: "You've sent a few messages already. Please wait a while before sending another." };
  }

  await prisma.contactMessage.create({
    data: { name, email, company: company || null, topic, message },
  });

  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL;
  if (notifyTo && emailConfigured()) {
    const topicLabel = CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? topic;
    // Fire and forget: the message is already saved, and an email problem
    // shouldn't turn into the sender seeing an error.
    sendEmail({
      to: notifyTo,
      subject: `Evo Stays contact: ${topicLabel}`,
      text: `${name}${company ? ` (${company})` : ""} <${email}>\n\n${message}`,
    }).catch((err) => console.error("[contact] couldn't email the message on:", err));
  }

  return { success: true };
}
