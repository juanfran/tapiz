import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Auth } from '@team-up/board-commons';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  public getUser() {
    return this.http.get<Auth>(`http://localhost:8000/user`);
  }
}
