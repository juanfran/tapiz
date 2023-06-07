import { FirebaseOptions } from 'firebase/app';

export interface Config {
  API: string;
  WS: string;
  firebaseConfig: FirebaseOptions;
}
