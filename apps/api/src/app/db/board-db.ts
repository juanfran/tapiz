import {
  eq,
  and,
  or,
  desc,
  inArray,
  asc,
  sql,
  SQLWrapper,
  isNull,
} from 'drizzle-orm';
import { db } from './init-db.js';
import * as schema from '../schema.js';
import type {
  BoardUser,
  BoardUserInfo,
  PrivateBoardUser,
  SortBoard,
  TuNode,
  UserNode,
} from '@tapiz/board-commons';
import { SetNonNullable } from 'type-fest';
import * as team from './team-db.js';
import { getUserTeam } from './team-db.js';
import { deleteBoardFiles } from '../file-upload.js';

export async function getBoard(boardId: string) {
  const results = await db
    .select()
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId));

  return results.at(0);
}

export async function getBoardBasic(boardId: string) {
  const results = await db
    .select({
      id: schema.boards.id,
      name: schema.boards.name,
      createdAt: schema.boards.createdAt,
      teamId: schema.boards.teamId,
      public: schema.boards.public,
    })
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId));

  return results.at(0);
}

export async function updateLastAccessedAt(boardId: string, userId: string) {
  return db
    .update(schema.acountsToBoards)
    .set({ lastAccessedAt: new Date().toISOString() })
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId),
      ),
    );
}

export async function haveAccess(boardId: string, userId: string) {
  const board = await getBoardBasic(boardId);

  if (!board) {
    return false;
  }

  if (board?.public) {
    return true;
  }

  const boardUser = await getBoardUser(boardId, userId);

  if (boardUser?.role === 'admin' && !board?.teamId) {
    return true;
  }

  if (board?.teamId) {
    const teamMembers = await team.getTeamMembers(board?.teamId);
    const member = teamMembers.find((it) => it.id === userId);

    if (member) {
      return true;
    }
  }

  return false;
}

export async function setBoardPrivacy(boardId: string, isPublic: boolean) {
  return db
    .update(schema.boards)
    .set({ public: isPublic })
    .where(eq(schema.boards.id, boardId));
}

export async function getBoardAdmins(boardId: string) {
  const ids = new Set<string>();

  const boards = await db
    .select({
      accountId: schema.acountsToBoards.accountId,
    })
    .from(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.role, 'admin'),
      ),
    );

  boards.forEach((board) => {
    ids.add(board.accountId);
  });

  const resultTeam = await db
    .select({ teamId: schema.boards.teamId })
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId));

  const teamId = resultTeam.at(0)?.teamId;

  if (teamId) {
    const teamAdmins = await team.getTeamAdmins(teamId);

    teamAdmins.forEach((team) => {
      ids.add(team.accountId);
    });
  }

  return Array.from(ids);
}

export async function getBoardUser(
  boardId: string,
  userId: UserNode['id'],
): Promise<PrivateBoardUser | undefined> {
  const results = await db
    .select({
      boards: {
        id: schema.boards.id,
        name: schema.boards.name,
        createdAt: schema.boards.createdAt,
        teamId: schema.boards.teamId,
        teamName: schema.teams.name,
        role: schema.acountsToBoards.role,
        public: schema.boards.public,
      },
      starreds: schema.starreds,
      accounts_boards: {
        role: schema.acountsToBoards.role,
        lastAccessedAt: schema.acountsToBoards.lastAccessedAt,
        privateId: schema.acountsToBoards.privateId,
      },
      team_members: {
        role: schema.teamMembers.role,
      },
    })
    .from(schema.boards)
    .leftJoin(
      schema.starreds,
      and(
        eq(schema.starreds.accountId, userId),
        eq(schema.starreds.boardId, schema.boards.id),
      ),
    )
    .leftJoin(
      schema.acountsToBoards,
      and(
        eq(schema.boards.id, schema.acountsToBoards.boardId),
        eq(schema.acountsToBoards.accountId, userId),
      ),
    )
    .leftJoin(
      schema.teamMembers,
      and(
        eq(schema.teamMembers.teamId, schema.boards.teamId),
        eq(schema.teamMembers.accountId, userId),
      ),
    )
    .leftJoin(schema.teams, and(eq(schema.teams.id, schema.boards.teamId)))
    .where(eq(schema.boards.id, boardId));

  const result = results.at(0);

  if (!result) {
    return;
  }

  const accounts_boards = result.accounts_boards;

  if (!accounts_boards) {
    return;
  }

  return {
    ...result.boards,
    role: accounts_boards.role,
    starred: !!result.starreds,
    privateId: accounts_boards.privateId,
    isAdmin:
      result.team_members?.role === 'admin' || accounts_boards.role === 'admin',
    lastAccessedAt: accounts_boards.lastAccessedAt ?? result.boards.createdAt,
  };
}

export async function addBoardToSpace(boardId: string, spaceId: string) {
  return db.insert(schema.spaceToBoards).values({ boardId, spaceId });
}

export async function getBoardUsers(boardId: string): Promise<BoardUserInfo[]> {
  const results = await db
    .select({
      id: schema.acountsToBoards.accountId,
      role: schema.acountsToBoards.role,
      accounts: {
        name: schema.accounts.name,
        picture: schema.accounts.picture,
      },
    })
    .from(schema.acountsToBoards)
    .leftJoin(
      schema.accounts,
      eq(schema.accounts.id, schema.acountsToBoards.accountId),
    )
    .where(eq(schema.acountsToBoards.boardId, boardId));

  return results
    .filter((it): it is SetNonNullable<typeof it> => !!it.accounts)
    .map((result) => ({
      id: result.id,
      name: result.accounts.name,
      role: result.role,
      picture: result.accounts.picture,
    }));
}

export async function getBoardsByTeam(teamId: string) {
  return await db
    .select()
    .from(schema.boards)
    .where(eq(schema.boards.teamId, teamId))
    .orderBy(desc(schema.boards.createdAt));
}

export async function getUsersBoardsByTeam(
  userId: string,
  teamId: string,
  offset = 0,
  limit = 10,
): Promise<BoardUser[]> {
  const userTeam = await getUserTeam(teamId, userId);

  if (!userTeam) {
    return [];
  }

  const results = await db
    .select({
      boards: {
        id: schema.boards.id,
        name: schema.boards.name,
        createdAt: schema.boards.createdAt,
        teamId: schema.boards.teamId,
        role: schema.acountsToBoards.role,
        public: schema.boards.public,
      },
      starreds: schema.starreds,
      accounts_boards: {
        role: schema.acountsToBoards.role,
        lastAccessedAt: schema.acountsToBoards.lastAccessedAt,
      },
    })
    .from(schema.boards)
    .leftJoin(
      schema.starreds,
      and(
        eq(schema.starreds.accountId, userId),
        eq(schema.starreds.boardId, schema.boards.id),
      ),
    )
    .leftJoin(
      schema.acountsToBoards,
      and(
        eq(schema.boards.id, schema.acountsToBoards.boardId),
        eq(schema.acountsToBoards.accountId, userId),
      ),
    )
    .where(eq(schema.boards.teamId, teamId))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(schema.boards.createdAt));

  return results.map((result) => ({
    ...result.boards,
    role: result.accounts_boards?.role ?? 'member',
    starred: !!result.starreds,
    isAdmin:
      userTeam.role === 'admin' || result.accounts_boards?.role === 'admin',
    lastAccessedAt:
      result.accounts_boards?.lastAccessedAt ?? result.boards.createdAt,
  }));
}

export async function getAllBoardAdmins(boardId: string) {
  const board = await getBoard(boardId);

  if (!board) {
    return [];
  }

  let teamAdmins: string[] = [];

  if (board.teamId) {
    teamAdmins = (await team.getTeamAdmins(board.teamId)).map(
      (it) => it.accountId,
    );
  }

  const boardAdmins = await getBoardAdmins(boardId);

  const admins = [...teamAdmins, ...boardAdmins];

  return admins;
}

export async function createBoard(
  name = 'New board',
  ownerId: string,
  board: TuNode[],
  teamId: string | null,
) {
  const result = await db
    .insert(schema.boards)
    .values({ name, board, teamId })
    .returning();

  await db
    .insert(schema.acountsToBoards)
    .values({
      accountId: ownerId,
      boardId: result[0].id,
      role: 'admin',
    })
    .returning();

  return result[0];
}

export async function getBoardFiles(boardId: string) {
  return db
    .select({
      name: schema.boardFiles.name,
    })
    .from(schema.boardFiles)
    .where(eq(schema.boardFiles.boardId, boardId));
}

export async function getFile(fileName: string) {
  const results = await db
    .select({
      name: schema.boardFiles.name,
      boardId: schema.boardFiles.boardId,
    })
    .from(schema.boardFiles)
    .where(eq(schema.boardFiles.name, fileName));

  return results.at(0);
}

export async function deleteBoard(boardId: string) {
  deleteBoardFiles(boardId);

  return db.delete(schema.boards).where(eq(schema.boards.id, boardId));
}

export async function deleteUserBoards(userId: string) {
  const boards = await db
    .select({
      id: schema.boards.id,
    })
    .from(schema.boards)
    .leftJoin(
      schema.acountsToBoards,
      and(
        eq(schema.boards.id, schema.acountsToBoards.boardId),
        eq(schema.acountsToBoards.accountId, userId),
      ),
    )
    .where(eq(schema.acountsToBoards.accountId, userId));

  await Promise.all(boards.map((board) => deleteBoard(board.id)));
}

export async function leaveBoard(userId: string, boardId: string) {
  return db
    .delete(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId),
      ),
    );
}

export async function joinBoard(
  userId: string,
  boardId: string,
): Promise<void> {
  await db
    .insert(schema.acountsToBoards)
    .values({
      accountId: userId,
      boardId,
    })
    .onConflictDoNothing();
}

export async function updateBoard(id: string, board: TuNode[]) {
  if (!board) {
    console.trace();
  }

  return db
    .update(schema.boards)
    .set({ board })
    .where(eq(schema.boards.id, id));
}

export async function rename(id: string, name: string) {
  return db.update(schema.boards).set({ name }).where(eq(schema.boards.id, id));
}

export async function changeRole(
  boardId: string,
  userId: string,
  role: 'admin' | 'member',
) {
  return db
    .update(schema.acountsToBoards)
    .set({ role })
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.accountId, userId),
      ),
    );
}

export async function deleteMember(boardId: string, userId: string) {
  return db
    .delete(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.accountId, userId),
      ),
    );
}

export async function updateBoardName(boardId: string, name: string) {
  return db
    .update(schema.boards)
    .set({ name })
    .where(eq(schema.boards.id, boardId));
}

export async function addStarredBoard(userId: string, boardId: string) {
  return db.insert(schema.starreds).values({
    accountId: userId,
    boardId,
  });
}

export async function removeStarredBoard(userId: string, boardId: string) {
  return db
    .delete(schema.starreds)
    .where(
      and(
        eq(schema.starreds.accountId, userId),
        eq(schema.starreds.boardId, boardId),
      ),
    );
}

export async function transferBoard(boardId: string, teamId: string | null) {
  return db
    .update(schema.boards)
    .set({ teamId })
    .where(eq(schema.boards.id, boardId));
}

export async function addFileToBoard(boardId: string, name: string) {
  return (
    await db.insert(schema.boardFiles).values({ boardId, name }).returning()
  ).at(0);
}

export async function getUsersToMention(
  boardId: string,
  exclude: string[] = [],
) {
  const board = await getBoardBasic(boardId);

  if (!board) {
    return [];
  }

  const usersDB = await getBoardUsers(boardId);

  const users = usersDB.map((user) => ({
    id: user.id,
    name: user.name,
  }));

  if (board.teamId) {
    const teamMembers = await team.getTeamMembers(board.teamId);
    const teamUsers = teamMembers.map((member) => ({
      id: member.id,
      name: member.name,
    }));

    users.push(...teamUsers);
  }

  const uniqueUsers = users.reduce(
    (acc, user) => {
      if (!acc.some((it) => it.id === user.id)) {
        acc.push(user);
      }

      return acc;
    },
    [] as { id: string; name: string }[],
  );

  return uniqueUsers.filter((user) => !exclude.includes(user.id));
}

interface GetBoardsOptions {
  offset?: number;
  limit?: number;
  sortBy?: SortBoard;
  starred?: boolean;
  teamId?: string;
  spaceId?: string;
}

export async function getBoards(
  userId: string,
  options: GetBoardsOptions = {},
): Promise<BoardUser[]> {
  const {
    offset = 0,
    limit = 10,
    sortBy = 'createdAt',
    starred,
    teamId,
    spaceId,
  } = options;

  let teamIds: string[] = [];
  let whereClauses: (SQLWrapper | undefined)[] = [];
  const teamRoles: Record<string, string> = {};

  if (teamId && spaceId) {
    const spaceResult = await db
      .select()
      .from(schema.spaces)
      .where(eq(schema.spaces.id, spaceId))
      .limit(1);

    const space = spaceResult[0];

    if (!space) {
      return [];
    }

    const spaceTeamId = space.teamId;

    const userTeam = await getUserTeam(spaceTeamId, userId);
    if (!userTeam) {
      return [];
    }

    teamRoles[spaceTeamId] = userTeam.role;

    whereClauses = [
      eq(schema.spaceToBoards.spaceId, spaceId),
      eq(schema.boards.teamId, spaceTeamId),
    ];
  } else if (teamId) {
    const userTeam = await getUserTeam(teamId, userId);
    if (!userTeam) {
      return [];
    }
    teamRoles[teamId] = userTeam.role;

    whereClauses = [eq(schema.boards.teamId, teamId)];
  } else {
    const teams = await team.getUserTeams(userId);
    teamIds = teams.map((team) => team.id);

    for (const team of teams) {
      teamRoles[team.id] = team.teamMember.role;
    }

    const accessConditions = [
      or(
        and(
          eq(schema.acountsToBoards.accountId, userId),
          eq(schema.acountsToBoards.role, 'admin'),
          isNull(schema.boards.teamId),
        ),
        and(
          eq(schema.acountsToBoards.accountId, userId),
          eq(schema.boards.public, true),
        ),
      ),
    ];

    if (teamIds.length > 0) {
      accessConditions.push(inArray(schema.boards.teamId, teamIds));
    }

    whereClauses = [or(...accessConditions)];
  }

  if (starred !== undefined) {
    if (starred) {
      whereClauses.push(sql`${schema.starreds.boardId} IS NOT NULL`);
    } else {
      whereClauses.push(sql`${schema.starreds.boardId} IS NULL`);
    }
  }

  const query = db
    .selectDistinct({
      boards: {
        id: schema.boards.id,
        name: schema.boards.name,
        createdAt: schema.boards.createdAt,
        teamId: schema.boards.teamId,
        public: schema.boards.public,
      },
      starreds: schema.starreds,
      accounts_boards: {
        role: schema.acountsToBoards.role,
        lastAccessedAt: schema.acountsToBoards.lastAccessedAt,
      },
    })
    .from(schema.boards)
    .leftJoin(
      schema.acountsToBoards,
      and(
        eq(schema.boards.id, schema.acountsToBoards.boardId),
        eq(schema.acountsToBoards.accountId, userId),
      ),
    )
    .leftJoin(
      schema.starreds,
      and(
        eq(schema.starreds.accountId, userId),
        eq(schema.starreds.boardId, schema.boards.id),
      ),
    )
    .where(and(...whereClauses));

  if (spaceId) {
    query.innerJoin(
      schema.spaceToBoards,
      eq(schema.boards.id, schema.spaceToBoards.boardId),
    );
  }

  let sortField;
  switch (sortBy) {
    case 'name':
    case '-name':
      sortField = schema.boards.name;
      break;
    case 'lastAccess':
    case '-lastAccess':
      sortField = schema.acountsToBoards.lastAccessedAt;
      break;
    case 'createdAt':
    default:
      sortField = schema.boards.createdAt;
      break;
  }

  const sortDirectionClause = sortBy.includes('-')
    ? desc(sortField)
    : asc(sortField);

  query.orderBy(sortDirectionClause).limit(limit).offset(offset);

  const results = await query;

  const boards = results.map((result) => {
    let teamRole = null;

    if (result.boards.teamId) {
      teamRole = teamRoles[result.boards.teamId] ?? 'member';
    }

    let role: 'admin' | 'member' | 'guest' = 'member';

    if (teamRole) {
      role = result.accounts_boards?.role ?? 'member';
    } else if (
      result.boards.public &&
      result.accounts_boards?.role !== 'admin'
    ) {
      // If the board is public and the user is not an admin or team member, they are a guest
      role = 'guest';
    }

    return {
      ...result.boards,
      role,
      starred: !!result.starreds,
      isAdmin: teamRole === 'admin' || result.accounts_boards?.role === 'admin',
      lastAccessedAt: result.accounts_boards?.lastAccessedAt ?? '',
    };
  });

  return boards;
}

export function getAllTeamBoards(teamId: string) {
  return db
    .select({
      id: schema.boards.id,
      name: schema.boards.name,
    })
    .from(schema.boards)
    .orderBy(desc(schema.boards.name))
    .where(eq(schema.boards.teamId, teamId));
}
