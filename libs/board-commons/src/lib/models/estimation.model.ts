import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface EstimationStory {
  id: string;
  title: string;
  description: string;
  show: boolean;
}

export interface EstimationConfig {
  scale: 'fibonacci' | 't-shirt';
  stories: EstimationStory[];
  step: number;
}

export interface EstimationResult {
  results: {
    storyId: string;
    selection: string;
  }[];
  userId: string;
}

export interface EstimationBoard {
  position: Point;
  layer: number;
}

export interface EstimationConfigNode
  extends BaseNode<'estimation.config', EstimationConfig> {}

export interface EstimationResultNode
  extends BaseNode<'estimation.result', EstimationResult> {}

export type EstimationNodes = EstimationConfigNode | EstimationResultNode;
export interface EstimationBoardNode
  extends BaseNode<'estimation', EstimationBoard, EstimationNodes[]> {}
