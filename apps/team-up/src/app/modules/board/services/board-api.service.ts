import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Board } from '@team-up/board-commons';

@Injectable({
  providedIn: 'root',
})
export class BoardApiService {
  constructor(private http: HttpClient) {}

  public fetchBoards() {
    return this.http.get<Board[]>(`http://localhost:8000/boards`);
  }

  public createBoard(board: Board['name']) {
    return this.http.post<{ id: string }>(`http://localhost:8000/new`, {
      name: board,
    });
  }

  public getBoard(boardId: string) {
    return this.http.get<{
      id: string;
      owners: string[];
      name: string;
    }>(`http://localhost:8000/board/${boardId}`);
  }

  public removeBoard(boardId: Board['id']) {
    return this.http.delete(`http://localhost:8000/delete/${boardId}`);
  }
}
