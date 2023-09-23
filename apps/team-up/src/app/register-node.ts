import { NodeConfig } from '@team-up/board-commons';

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
      component,
      config: nodeConfig.config,
    };
  });
}
