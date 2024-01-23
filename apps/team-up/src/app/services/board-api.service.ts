import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  Board,
  CocomaterialApiListVectors,
  CocomaterialTag,
  Team,
} from '@team-up/board-commons';
import { Observable, from, map } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class BoardApiService {
  private configService = inject(ConfigService);
  private http = inject(HttpClient);
  private trpc = this.configService.getTrpcConfig();

  public fetchBoards() {
    return from(this.trpc.board.boards.query());
  }

  public fetchTeamBoards(teamId: string) {
    return from(this.trpc.board.teamBoards.query({ teamId }));
  }

  public fetchStarredBoards() {
    return from(this.trpc.board.starreds.query());
  }

  public createBoard(board: Board['name'], teamId?: Team['id']) {
    return from(this.trpc.board.create.mutate({ name: board, teamId }));
  }

  public getBoard(boardId: string) {
    return from(this.trpc.board.board.query({ boardId }));
  }

  public removeBoard(boardId: Board['id']) {
    return from(this.trpc.board.delete.mutate({ boardId }));
  }

  public leaveBoard(boardId: Board['id']) {
    return from(this.trpc.board.leave.mutate({ boardId }));
  }

  public duplicateBoard(boardId: Board['id']): Observable<Board> {
    return from(this.trpc.board.duplicate.mutate({ boardId }));
  }

  public renameBoard(boardId: Board['id'], name: Board['name']) {
    return from(this.trpc.board.rename.mutate({ boardId, name }));
  }

  public setBoardPrivacy(boardId: Board['id'], isPublic: boolean) {
    return from(this.trpc.board.changePrivacy.mutate({ boardId, isPublic }));
  }

  public addStar(boardId: Board['id']) {
    return from(this.trpc.board.addStar.mutate({ boardId }));
  }

  public removeStar(boardId: Board['id']) {
    return from(this.trpc.board.removeStar.mutate({ boardId }));
  }

  public transferBoard(boardId: Board['id'], teamId: Team['id'] | null) {
    return from(
      this.trpc.board.transferBoard.mutate({
        boardId,
        teamId: teamId ?? undefined,
      }),
    );
  }

  public getCocomaterialTags() {
    return this.http.get<CocomaterialTag[]>(
      `https://cocomaterial.com/api/tags`,
    );
  }

  public getCocomaterialVectors(page = 1, page_size = 40, tags: string[] = []) {
    return this.http
      .get<CocomaterialApiListVectors>(`https://cocomaterial.com/api/vectors`, {
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
