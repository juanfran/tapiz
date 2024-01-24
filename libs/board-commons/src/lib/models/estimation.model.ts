import { TuNode } from './node.model.js';
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
}

export type EstimationConfigNode = TuNode<
  EstimationConfig,
  'estimation.config'
>;

export type EstimationResultNode = TuNode<
  EstimationResult,
  'estimation.result'
>;

export type EstimationNodes = EstimationConfigNode | EstimationResultNode;
