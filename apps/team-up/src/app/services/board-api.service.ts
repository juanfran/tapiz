import { ConfigService, appConfig } from '@/app/services/config.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@team-up/api/app';

import {
  Board,
  CocomaterialApiListVectors,
  CocomaterialTag,
} from '@team-up/board-commons';
import { from, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BoardApiService {
  trpc = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: appConfig.API + '/trpc',
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        },
      }),
    ],
  });

  constructor(private http: HttpClient, private configService: ConfigService) {}

  public fetchBoards() {
    return from(this.trpc.boards.query());
  }

  public createBoard(board: Board['name']) {
    return from(this.trpc.newBoard.mutate({ name: board }));
  }

  public getBoard(boardId: string) {
    return from(this.trpc.board.query({ boardId }));
  }

  public removeBoard(boardId: Board['id']) {
    return from(this.trpc.deleteBoard.mutate({ boardId }));
  }

  public leaveBoard(boardId: Board['id']) {
    return from(this.trpc.leaveBoard.mutate({ boardId }));
  }

  public duplicateBoard(boardId: Board['id']) {
    return from(this.trpc.duplicateBoard.mutate({ boardId }));
  }

  public removeAccount() {
    return from(this.trpc.removeAccount.mutate());
  }

  public login() {
    return from(this.trpc.login.query());
  }

  public getCocomaterialTags() {
    return this.http.get<CocomaterialTag[]>(
      `https://cocomaterial.com/api/tags`
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
        })
      );
  }
}
