import { registerNode } from './register-node';
import { ESTIMATION_BOARD_CONFIG } from '@team-up/nodes/estimation-board';
import { PERSONAL_TOKEN_CONFIG } from './modules/board/components/token/register';

registerNode('token', PERSONAL_TOKEN_CONFIG);
registerNode('estimation', ESTIMATION_BOARD_CONFIG);
