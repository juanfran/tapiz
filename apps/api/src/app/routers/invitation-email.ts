export function invitationMatchesEmail(
  invitationEmail: string | null,
  accountEmail: string,
) {
  return invitationEmail?.toLowerCase() === accountEmail.toLowerCase();
}
