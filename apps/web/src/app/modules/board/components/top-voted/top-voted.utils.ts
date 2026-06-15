import {
  isGroup,
  isNote,
  isPanel,
  type Group,
  type Note,
  type Panel,
  type TuNode,
} from '@tapiz/board-commons';
import { getNodeSize } from '../../../../shared/node-size';

type VotableNode = TuNode<Note, 'note'> | TuNode<Group, 'group'>;
type PanelNode = TuNode<Panel, 'panel'>;

export type TopVotedItem = {
  id: string;
  type: 'note' | 'group' | 'panel';
  title: string;
  votes: number;
  containedItems: number;
};

export function buildTopVotedItems(
  nodes: TuNode[],
  options: {
    visibleNoteOwnerIds: Set<string>;
    limit?: number;
  },
): TopVotedItem[] {
  const limit = options.limit ?? 12;
  const votableNodes = nodes
    .filter((node): node is VotableNode => {
      if (isNote(node)) {
        return options.visibleNoteOwnerIds.has(node.content.ownerId);
      }

      return isGroup(node);
    })
    .map((node) => {
      return {
        node,
        votes: sumVotes(node.content.votes),
      };
    })
    .filter(({ votes }) => votes > 0);

  const directItems = votableNodes.map(({ node, votes }) => {
    return {
      id: node.id,
      type: node.type,
      title: getNodeTitle(node),
      votes,
      containedItems: 1,
    } satisfies TopVotedItem;
  });

  const panelItems = nodes
    .filter((node): node is PanelNode => isPanel(node))
    .map((panel) => {
      const containedNodes = votableNodes.filter(({ node }) => {
        return isNodeInsidePanel(node, panel);
      });

      return {
        id: panel.id,
        type: 'panel',
        title: getNodeTitle(panel),
        votes: containedNodes.reduce((total, item) => total + item.votes, 0),
        containedItems: containedNodes.length,
      } satisfies TopVotedItem;
    })
    .filter((item) => item.votes > 0);

  return [...directItems, ...panelItems]
    .toSorted((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

export function sumVotes(votes: { vote: number }[]) {
  return votes.reduce((total, item) => total + item.vote, 0);
}

export function cleanNodeText(text: string) {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNodeTitle(node: VotableNode | PanelNode) {
  if (isGroup(node)) {
    return node.content.title.trim() || 'Untitled group';
  }

  const text = cleanNodeText(node.content.text);

  if (text) {
    return text;
  }

  return isNote(node) ? 'Untitled note' : 'Untitled panel';
}

function isNodeInsidePanel(node: VotableNode, panel: PanelNode) {
  const nodeSize = getNodeSize(node);
  const nodeCenter = {
    x: node.content.position.x + nodeSize.width / 2,
    y: node.content.position.y + nodeSize.height / 2,
  };
  const panelSize = getNodeSize(panel);

  return (
    nodeCenter.x >= panel.content.position.x &&
    nodeCenter.x <= panel.content.position.x + panelSize.width &&
    nodeCenter.y >= panel.content.position.y &&
    nodeCenter.y <= panel.content.position.y + panelSize.height
  );
}
