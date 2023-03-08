import * as changeBoardNameValidators from './change-board-name.validator';
import * as noteValidators from './note.validator';
import * as panelValidators from './panel.validator';
import * as groupValidators from './group.validator';
import * as imageValidators from './image.validator';
import * as cursorValidators from './cursor.validator';
import * as textValidators from './text.validator';

export const Validators = {
  ...changeBoardNameValidators,
  ...noteValidators,
  ...panelValidators,
  ...groupValidators,
  ...imageValidators,
  ...cursorValidators,
  ...textValidators,
};
