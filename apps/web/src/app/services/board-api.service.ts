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

  public fetchBoards() {
    return from(this.trpc.board.boards.query());
  }

  public fetchTeamBoards(teamId: string) {
    return from(this.trpc.board.teamBoards.query({ teamId }));
  }

  public fetchStarredBoards() {
    return from(this.trpc.board.starreds.query());
  }

  public createBoard(board: BoardUser['name'], teamId?: Team['id']) {
    return from(this.trpc.board.create.mutate({ name: board, teamId }));
  }

  public getBoard(boardId: string) {
    return from(this.trpc.board.board.query({ boardId }));
  }

  public getBoardUseres(boardId: string) {
    return from(this.trpc.board.boardUsers.query({ boardId }));
  }

  public removeBoard(boardId: BoardUser['id']) {
    return from(this.trpc.board.delete.mutate({ boardId }));
  }

  public leaveBoard(boardId: BoardUser['id']) {
    return from(this.trpc.board.leave.mutate({ boardId }));
  }

  public duplicateBoard(boardId: BoardUser['id']): Observable<BoardUser> {
    return from(this.trpc.board.duplicate.mutate({ boardId }));
  }

  public renameBoard(boardId: BoardUser['id'], name: BoardUser['name']) {
    return from(this.trpc.board.rename.mutate({ boardId, name }));
  }

  public setBoardPrivacy(boardId: BoardUser['id'], isPublic: boolean) {
    return from(this.trpc.board.changePrivacy.mutate({ boardId, isPublic }));
  }

  public addStar(boardId: BoardUser['id']) {
    return from(this.trpc.board.addStar.mutate({ boardId }));
  }

  public removeStar(boardId: BoardUser['id']) {
    return from(this.trpc.board.removeStar.mutate({ boardId }));
  }

  public transferBoard(boardId: BoardUser['id'], teamId: Team['id'] | null) {
    return from(
      this.trpc.board.transferBoard.mutate({
        boardId,
        teamId: teamId ?? undefined,
      }),
    );
  }

  public getCocomaterialTags() {
    return this.http.get<CocomaterialTag[]>(
      'https://cocomaterial.com/api/tags',
    );
  }

  public getCocomaterialVectors(page = 1, page_size = 40, tags: string[] = []) {
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
}
