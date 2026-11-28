/**
 * What an invitation link shows (the platform's bf-signup `get_invitation` says what the invitation is; the product says
 * who is signed in). Pure, so a product's page only draws the answer: no screen offers a button that cannot work.
 */
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

/** Why accepting would be refused (the platform, bf_0231). */
export type InviteBlock = "ended" | "other_organisation" | "inactive_account" | "used_login";

export type Invitation = {
  email: string;
  status: InviteStatus;
  /** The address already has a Buildframe account (a profile). */
  has_login: boolean;
  /** The inviting organisation's code. */
  tenant_code?: string;
  blocked?: InviteBlock | null;
};

export type InviteDoor =
  | "invalid"
  | "accepted"
  | "revoked"
  | "expired"
  /** Pending, but nobody could accept it: the door names why. */
  | InviteBlock
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

/**
 * `tenantCode`: pass it where every organisation has its own address (the organisation this address belongs to). Another
 * organisation's invitation, or one that does not say whose it is, then reads as an invalid link and reveals nothing.
 */
export function inviteDoor(invitation: Invitation | null, signedInEmail: string | null, tenantCode?: string): InviteDoor {
  if (!invitation) return "invalid";
  if (tenantCode !== undefined && invitation.tenant_code !== tenantCode) return "invalid";
  if (invitation.status !== "pending") return invitation.status;
  if (invitation.blocked) return invitation.blocked;
  if (signedInEmail) {
    if (signedInEmail.toLowerCase() !== invitation.email.toLowerCase()) return "wrong_account";
    return invitation.has_login ? "accept" : "no_account";
  }
  return invitation.has_login ? "sign_in" : "new";
}

export type InviteClosedDoor = "invalid" | "accepted" | "revoked" | "expired" | InviteBlock;

export const INVITE_CLOSED: Record<InviteClosedDoor, { title: string; text: string }> = {
  invalid: { title: "This link is not valid", text: "It may have been copied incompletely. Ask for a new invitation." },
  accepted: { title: "This invitation has been used", text: "If that was you, sign in." },
  revoked: { title: "This invitation was withdrawn", text: "Ask the person who invited you for a new one." },
  expired: { title: "This invitation has expired", text: "Invitations last 7 days. Ask for a new one." },
  ended: { title: "This invitation cannot be used", text: "This organisation no longer has this product. Ask the person who invited you." },
  other_organisation: {
    title: "Ask for a different email",
    text: "This email already belongs to another organisation, and one login belongs to one organisation. Ask to be invited with a different email.",
  },
  inactive_account: { title: "This account is switched off", text: "Ask an admin to switch it on, or to invite a different email." },
  used_login: { title: "Ask for a different email", text: "This email is already used to sign in on Buildframe. Ask to be invited with a different email." },
};

export const isInviteClosed = (door: InviteDoor): door is InviteClosedDoor => Object.prototype.hasOwnProperty.call(INVITE_CLOSED, door);
