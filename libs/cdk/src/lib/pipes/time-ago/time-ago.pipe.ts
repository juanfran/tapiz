import { Pipe, PipeTransform } from '@angular/core';
import {
  differenceInDays,
  differenceInSeconds,
  differenceInYears,
  format,
  formatDistanceToNowStrict,
} from 'date-fns';

@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(date: number) {
    const createdAt = new Date(date);
    const secondsDistance = Math.abs(
      differenceInSeconds(createdAt, new Date()),
    );
    const daysDistance = Math.abs(differenceInDays(createdAt, new Date()));
    const yearsDistance = Math.abs(differenceInYears(createdAt, new Date()));

    if (!yearsDistance) {
      if (daysDistance > 6) {
        return format(createdAt, 'MMM d');
      } else {
        if (secondsDistance <= 60) {
          return 'Now';
        }
        const distance = formatDistanceToNowStrict(createdAt);
        const agoString = 'ago';
        return `${distance} ${agoString}`;
      }
    } else {
      return format(createdAt, 'MMM d, yyyy');
    }
  }
}
