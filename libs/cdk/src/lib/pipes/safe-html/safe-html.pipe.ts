import { Pipe, PipeTransform } from '@angular/core';
import DOMPurify from 'dompurify';

@Pipe({
  name: 'safeHtml',
})
export class SafeHtmlPipe implements PipeTransform {
  public transform(html: string): string {
    return DOMPurify.sanitize(html);
  }
}
