import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  BoardUser,
  CocomaterialApiListVectors,
  CocomaterialTag,
  SortBoard,
  Team,
} from '@tapiz/board-commons';
import { Observable, from } from 'rxjs';
import { APIConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class BoardApiService {
  private apiConfigService = inject(APIConfigService);
  private http = inject(HttpClient);
  get trpc() {
    return this.apiConfigService.trpc();
  }

  fetchBoards(options?: {
    spaceId?: string;
    teamId?: string;
    starred?: boolean;
    offset?: number;
    limit?: number;
    sortBy?: SortBoard;
  }) {
    return from(
      this.trpc.board.boards.query({
        spaceId: options?.spaceId,
        teamId: options?.teamId,
        starred: options?.starred,
        offset: options?.offset,
        limit: options?.limit,
        sortBy: options?.sortBy,
      }),
    );
  }

  createBoard(board: BoardUser['name'], teamId?: Team['id']) {
    return from(this.trpc.board.create.mutate({ name: board, teamId }));
  }

  getBoard(boardId: string) {
    return from(this.trpc.board.board.query({ boardId }));
  }

  getBoardUseres(boardId: string) {
    return from(this.trpc.board.boardUsers.query({ boardId }));
  }

  removeBoard(boardId: BoardUser['id']) {
    return from(this.trpc.board.delete.mutate({ boardId }));
  }

  leaveBoard(boardId: BoardUser['id']) {
    return from(this.trpc.board.leave.mutate({ boardId }));
  }

  duplicateBoard(boardId: BoardUser['id']): Observable<BoardUser> {
    return from(this.trpc.board.duplicate.mutate({ boardId }));
  }

  renameBoard(boardId: BoardUser['id'], name: BoardUser['name']) {
    return from(this.trpc.board.rename.mutate({ boardId, name }));
  }

  setBoardPrivacy(boardId: BoardUser['id'], isPublic: boolean) {
    return from(this.trpc.board.changePrivacy.mutate({ boardId, isPublic }));
  }

  addStar(boardId: BoardUser['id']) {
    return from(this.trpc.board.addStar.mutate({ boardId }));
  }

  removeStar(boardId: BoardUser['id']) {
    return from(this.trpc.board.removeStar.mutate({ boardId }));
  }

  transferBoard(boardId: BoardUser['id'], teamId: Team['id'] | null) {
    return from(
      this.trpc.board.transferBoard.mutate({
        boardId,
        teamId: teamId ?? undefined,
      }),
    );
  }

  getCocomaterialTags() {
    return this.http.get<CocomaterialTag[]>(
      'https://cocomaterial.com/api/tags',
    );
  }

  async getCocomaterialVectors(
    page = 1,
    page_size = 40,
    tags: string[] = [],
  ): Promise<CocomaterialApiListVectors> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
      ...(tags.length ? { tags: tags.join(',') } : {}),
    });

    const response = await fetch(
      `https://cocomaterial.com/api/vectors?${params.toString()}`,
    );
    const result: CocomaterialApiListVectors = await response.json();

    return {
      ...result,
      results: result.results.map((vector) => ({
        ...vector,
        svgContent: '',
      })),
    };
  }

  getBoardMentions(boardId: BoardUser['id']) {
    return from(this.trpc.board.boardMentions.query({ boardId }));
  }

  mentionBoardUser(boardId: BoardUser['id'], userId: string, nodeId?: string) {
    return from(
      this.trpc.board.mentionBoardUser.mutate({ boardId, userId, nodeId }),
    );
  }

  fetchAllTeamBoards(teamId: Team['id']) {
    return this.trpc.board.allTeamBoards.query({ teamId });
  }

  changeRole(
    boardId: BoardUser['id'],
    userId: BoardUser['id'],
    role: BoardUser['role'],
  ) {
    return from(this.trpc.board.changeRole.mutate({ boardId, userId, role }));
  }

  deleteMember(boardId: BoardUser['id'], userId: BoardUser['id']) {
    return from(this.trpc.board.deleteMember.mutate({ boardId, userId }));
  }
}
