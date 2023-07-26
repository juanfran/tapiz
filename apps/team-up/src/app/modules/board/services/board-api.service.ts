import { ConfigService } from '@/app/services/config.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Board,
  CocomaterialApiListVectors,
  CocomaterialTag,
} from '@team-up/board-commons';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BoardApiService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  public fetchBoards() {
    return this.http.get<Board[]>(`${this.configService.config.API}/boards`);
  }

  public createBoard(board: Board['name']) {
    return this.http.post<{ id: string }>(
      `${this.configService.config.API}/new`,
      {
        name: board,
      }
    );
  }

  public getBoard(boardId: string) {
    return this.http.get<{
      id: string;
      owners: string[];
      name: string;
    }>(`${this.configService.config.API}/board/${boardId}`);
  }

  public removeBoard(boardId: Board['id']) {
    return this.http.delete(
      `${this.configService.config.API}/delete/${boardId}`
    );
  }

  public leaveBoard(boardId: Board['id']) {
    return this.http.delete(
      `${this.configService.config.API}/leave/${boardId}`
    );
  }

  public duplicateBoard(boardId: Board['id']) {
    return this.http.post(`${this.configService.config.API}/duplicate`, {
      boardId,
    });
  }

  public removeAccount() {
    return this.http.delete(`${this.configService.config.API}/remove-account`);
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
