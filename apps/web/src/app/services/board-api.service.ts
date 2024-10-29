import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  BoardUser,
  CocomaterialApiListVectors,
  CocomaterialTag,
  Team,
} from '@tapiz/board-commons';
import { Observable, from, map } from 'rxjs';
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

  fetchBoards() {
    return from(this.trpc.board.boards.query());
  }

  fetchTeamBoards(teamId: string) {
    return from(this.trpc.board.teamBoards.query({ teamId }));
  }

  fetchStarredBoards() {
    return from(this.trpc.board.starreds.query());
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

  getCocomaterialVectors(page = 1, page_size = 40, tags: string[] = []) {
    return this.http
      .get<CocomaterialApiListVectors>('https://cocomaterial.com/api/vectors', {
        params: {
          page,
          page_size,
          tags,
        },
      })
      .pipe(
        map((result) => {
          return {
            ...result,
            results: result.results.map((vector) => {
              return {
                ...vector,
                svgContent: '',
              };
            }),
          };
        }),
      );
  }

  getBoardMentions(boardId: BoardUser['id']) {
    return from(this.trpc.board.boardMentions.query({ boardId }));
  }

  mentionBoardUser(boardId: BoardUser['id'], userId: string, nodeId?: string) {
    return from(
      this.trpc.board.mentionBoardUser.mutate({ boardId, userId, nodeId }),
    );
  }
}
