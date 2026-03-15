// ***********************************************************
// Support file: runs before every test file
// ***********************************************************

import './commands';

// Silence known Angular hydration warnings in E2E logs
Cypress.on('uncaught:exception', (err) => {
  // Angular ExpressionChangedAfterItHasBeenCheckedError during tests is expected
  if (err.message.includes('ExpressionChangedAfterItHasBeenChecked')) {
    return false;
  }
  // Socket.IO disconnects during navigation are expected
  if (err.message.includes('socket hang up') || err.message.includes('disconnected')) {
    return false;
  }
  return true;
});
