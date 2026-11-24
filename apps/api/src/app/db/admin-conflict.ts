/**
 * The change would leave a team or board without an admin (or a team without
 * members). Routes map it to a CONFLICT response.
 */
export class AdminRequiredConflict extends Error {
  constructor() {
    super('At least one admin must remain');
  }
}
