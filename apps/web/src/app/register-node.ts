import { NodeConfig } from '@tapiz/board-commons';
import { DynamicComponent } from './modules/board/components/node/dynamic-component';
import { Type } from '@angular/core';

const nodes = new Map<string, NodeConfig>();

export function registerNode(type: string, config: NodeConfig) {
  nodes.set(type, config);
}

export function loadNode(type: string) {
  const nodeConfig = nodes.get(type);

  if (!nodeConfig) {
    throw new Error(`Node ${type} not found`);
  }

  return nodeConfig.loadComponent().then((component) => {
    return {
      component: component as Type<DynamicComponent>,
      config: nodeConfig.config,
    };
  });
}
