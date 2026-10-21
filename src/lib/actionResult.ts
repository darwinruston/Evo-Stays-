// What a server action hands back when it turns a request down for a reason
// the person can fix ("That email address already has a login"). Returned,
// not thrown: a production build replaces the message of anything thrown out
// of a server action with a generic one (React error #441), so a thrown
// reason never reaches the screen. This is the same convention
// IssueFormState and LaundryLoadFormState follow, for the actions that
// aren't driven by useActionState.
//
// Nothing (void) means it went through.
export type ActionResult = { error: string } | void;
