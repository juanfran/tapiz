import * as changeBoardNameValidators from './change-board-name.validator';
import * as panelValidators from './panel.validator';
import * as groupValidators from './group.validator';
import * as imageValidators from './image.validator';
import * as textValidators from './text.validator';
import * as vectorValidators from './vector.validator';
import * as userValidators from './user.validator';
import * as stateActionValidators from './state-action.validator';

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
