import { Observable } from 'rxjs';

export function getImageDimensions(url: string) {
  return new Observable<{ width: number; height: number }>((observer) => {
    const img = new Image();
    img.onload = () => {
      observer.next({
        width: img.width,
        height: img.height,
      });
      observer.complete();
    };
    img.src = url;
  });
}
