export interface NotificationUser {
  id: string;
  type: string;
  boardId: string | null;
  nodeId: string | null;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  boardName: string | null;
}
