/**
 * What an invitation link shows (the platform's bf-signup `get_invitation` says what the invitation is; the product says
 * who is signed in). Pure, so a product's page only draws the answer: no screen offers a button that cannot work.
 */
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type Invitation = {
  email: string;
  status: InviteStatus;
  /** The address already has a Buildframe account (a profile). */
  has_login: boolean;
};

export type InviteDoor =
  | "invalid"
  | "accepted"
  | "revoked"
  | "expired"
  /** No account yet and nobody signed in: choose a name and password. */
  | "new"
  /** Has an account: sign in, then come back. */
  | "sign_in"
  /** Signed in as the invited address, with an account: one button. */
  | "accept"
  /** Signed in as the invited address but with no account: cannot accept; ask for another address. */
  | "no_account"
  /** Signed in as somebody else: sign out first. */
  | "wrong_account";

export function inviteDoor(invitation: Invitation | null, signedInEmail: string | null): InviteDoor {
  if (!invitation) return "invalid";
  if (invitation.status !== "pending") return invitation.status;
  if (signedInEmail) {
    if (signedInEmail.toLowerCase() !== invitation.email.toLowerCase()) return "wrong_account";
    return invitation.has_login ? "accept" : "no_account";
  }
  return invitation.has_login ? "sign_in" : "new";
}

export const INVITE_CLOSED: Record<"invalid" | "accepted" | "revoked" | "expired", { title: string; text: string }> = {
  invalid: { title: "This link is not valid", text: "It may have been copied incompletely. Ask for a new invitation." },
  accepted: { title: "This invitation has been used", text: "If that was you, sign in." },
  revoked: { title: "This invitation was withdrawn", text: "Ask the person who invited you for a new one." },
  expired: { title: "This invitation has expired", text: "Invitations last 7 days. Ask for a new one." },
};
