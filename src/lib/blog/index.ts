import type { Post } from "./types";
import { cleaningChecklistPost } from "./cleaningChecklist";
import { sameDayTurnoverPost } from "./sameDayTurnovers";
import { safetyCertificatesPost } from "./safetyCertificates";
import { managingCleanersPost } from "./managingCleaners";
import { linenPost } from "./linen";
import { suppliesPost } from "./supplies";
import { payingCleanersPost } from "./payingCleaners";

export type { Post };

export const POSTS: Post[] = [
  cleaningChecklistPost,
  safetyCertificatesPost,
  managingCleanersPost,
  sameDayTurnoverPost,
  payingCleanersPost,
  linenPost,
  suppliesPost,
];

export function postBySlug(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

// Roughly how long it takes to read, at an easy pace.
export function readingMinutes(post: Post): number {
  return Math.max(2, Math.round(post.body.split(/\s+/).length / 220));
}
