import * as changeBoardNameValidators from './change-board-name.validator.js';
import * as panelValidators from './panel.validator.js';
import * as groupValidators from './group.validator.js';
import * as imageValidators from './image.validator.js';
import * as textValidators from './text.validator.js';
import * as vectorValidators from './vector.validator.js';
import * as userValidators from './user.validator.js';
import * as stateActionValidators from './state-action.validator.js';

export const Validators = {
  ...changeBoardNameValidators,
  ...panelValidators,
  ...groupValidators,
  ...imageValidators,
  ...textValidators,
  ...vectorValidators,
  ...userValidators,
  ...stateActionValidators,
};
