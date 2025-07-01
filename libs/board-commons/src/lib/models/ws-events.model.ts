export interface WsEvent {
  room: string;
  event: string;
  content?: unknown;
}

export interface DeleteBoard extends WsEvent {
  room: `board:${string}`;
  event: 'deleteBoard';
  content: {
    boardId: string;
  };
}

export interface ChangeRoleBoard extends WsEvent {
  room: `board:${string}`;
  event: 'changeRoleBoard';
  content: {
    userId: string;
    role: 'admin' | 'member' | 'guest';
  };
}

export interface RenameBoard extends WsEvent {
  room: `board:${string}`;
  event: 'renameBoard';
  content: {
    name: string;
  };
}

export interface DeleteBoardMember extends WsEvent {
  room: `board:${string}`;
  event: 'deleteBoardMember';
  content: {
    userId: string;
  };
}

export interface TransferBoard extends WsEvent {
  room: `board:${string}`;
  event: 'transferBoard';
  content: {
    teamId?: string;
  };
}

export interface DeleteTeam extends WsEvent {
  room: `team:${string}`;
  event: 'deleteTeam';
  content: {
    teamId: string;
  };
}

export interface ChangeRoleTeam extends WsEvent {
  room: `team:${string}`;
  event: 'changeRoleTeam';
  content: {
    userId: string;
    role: 'admin' | 'member' | 'guest';
  };
}

export interface DeleteMemberTeam extends WsEvent {
  room: `team:${string}`;
  event: 'deleteMember';
  content: {
    userId: string;
  };
}

export interface RenameTeam extends WsEvent {
  room: `team:${string}`;
  event: 'renameTeam';
  content: {
    name: string;
  };
}

export interface CreateTeamSpace extends WsEvent {
  room: `team:${string}`;
  event: 'createSpace';
  content: {
    spaceId: string;
    name: string;
  };
}

export interface UpdateTeamSpace extends WsEvent {
  room: `team:${string}`;
  event: 'updateSpace';
  content: {
    spaceId: string;
    name: string;
  };
}

export interface DeleteSpace extends WsEvent {
  room: `team:${string}`;
  event: 'deleteSpace';
  content: {
    spaceId: string;
  };
}

export interface NewTeamBoard extends WsEvent {
  room: `team:${string}`;
  event: 'newBoard';
  content: {
    boardId: string;
    name: string;
    teamId: string;
  };
}

export interface MentionUser {
  event: 'mentionUser';
  userId: string;
  content: {
    userId: string;
    boardId: string;
    nodeId?: string;
  };
}
export interface NewUserInvitation {
  event: 'newInvitation';
  userId: string;
  content: {
    teamId: string;
    role: 'admin' | 'member';
  };
}

export type WsEvents =
  | DeleteBoard
  | ChangeRoleBoard
  | DeleteBoardMember
  | RenameBoard
  | TransferBoard
  | DeleteTeam
  | ChangeRoleTeam
  | DeleteMemberTeam
  | RenameTeam
  | CreateTeamSpace
  | UpdateTeamSpace
  | DeleteSpace
  | NewTeamBoard;

export type UserWsEvents = MentionUser | NewUserInvitation;
