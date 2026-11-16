import { describe, expect, it } from 'vitest';
import { invitationMatchesEmail } from './invitation-email.js';

describe('invitation recipient authorization', () => {
  it('recognizes a legacy mixed-case email invitation for cancellation', () => {
    expect(
      invitationMatchesEmail('Person@Example.test', 'person@example.test'),
    ).toBe(true);
    expect(
      invitationMatchesEmail('other@example.test', 'person@example.test'),
    ).toBe(false);
    expect(invitationMatchesEmail(null, 'person@example.test')).toBe(false);
  });
});
