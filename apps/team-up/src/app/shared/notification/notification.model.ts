export interface NotificationData {
  message: string;
  action?: string;
  type: 'info' | 'error';
  durantion?: number;
}
