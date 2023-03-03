import { ConfigService } from '@/app/services/config.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Board } from '@team-up/board-commons';

@Injectable({
  providedIn: 'root',
})
export class BoardApiService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  public fetchBoards() {
    return this.http.get<Board[]>(`${this.configService.config.api}/boards`);
  }

  public createBoard(board: Board['name']) {
    return this.http.post<{ id: string }>(
      `${this.configService.config.api}/new`,
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
    }>(`${this.configService.config.api}/board/${boardId}`);
  }

  public removeBoard(boardId: Board['id']) {
    return this.http.delete(
      `${this.configService.config.api}/delete/${boardId}`
    );
  }

  public leaveBoard(boardId: Board['id']) {
    return this.http.delete(
      `${this.configService.config.api}/leave/${boardId}`
    );
  }

  public removeAccount() {
    return this.http.delete(`${this.configService.config.api}/remove-account`);
  }
}
