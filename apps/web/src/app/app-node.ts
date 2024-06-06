import { registerNode } from './register-node';
import { ESTIMATION_BOARD_CONFIG } from '@tapiz/nodes/estimation-board';
import { TEXT_CONFIG } from '@tapiz/nodes/text';
import { IMAGE_CONFIG } from '@tapiz/nodes/image';
import { VECTOR_CONFIG } from '@tapiz/nodes/vector';
import { PANEL_CONFIG } from '@tapiz/nodes/panel';
import { POLL_BOARD_CONFIG } from '@tapiz/nodes/poll-board';
import { PERSONAL_TOKEN_CONFIG } from './modules/board/components/token/register';
import { NOTE_CONFIG } from '@tapiz/nodes/note';
import { GROUP_CONFIG } from '@tapiz/nodes/group';

registerNode('token', PERSONAL_TOKEN_CONFIG);
registerNode('estimation', ESTIMATION_BOARD_CONFIG);
registerNode('text', TEXT_CONFIG);
registerNode('image', IMAGE_CONFIG);
registerNode('vector', VECTOR_CONFIG);
registerNode('panel', PANEL_CONFIG);
registerNode('poll', POLL_BOARD_CONFIG);
registerNode('note', NOTE_CONFIG);
registerNode('group', GROUP_CONFIG);