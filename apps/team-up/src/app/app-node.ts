import { registerNode } from './register-node';
import { ESTIMATION_BOARD_CONFIG } from '@team-up/nodes/estimation-board';
import { TEXT_CONFIG } from '@team-up/nodes/text';
import { IMAGE_CONFIG } from '@team-up/nodes/image';
import { VECTOR_CONFIG } from '@team-up/nodes/vector';
import { PANEL_CONFIG } from '@team-up/nodes/panel';
import { POLL_BOARD_CONFIG } from '@team-up/nodes/poll-board';
import { PERSONAL_TOKEN_CONFIG } from './modules/board/components/token/register';

registerNode('token', PERSONAL_TOKEN_CONFIG);
registerNode('estimation', ESTIMATION_BOARD_CONFIG);
registerNode('text', TEXT_CONFIG);
registerNode('image', IMAGE_CONFIG);
registerNode('vector', VECTOR_CONFIG);
registerNode('panel', PANEL_CONFIG);
registerNode('poll', POLL_BOARD_CONFIG);
