import { dateKeyAt } from "./index";

/**
 * The calendar day it is right now in `timeZone`. Server code only: call it
 * after `await connection()`, so it runs for a real request.
 */
export function todayIn(timeZone: string): string {
  return dateKeyAt(Date.now(), timeZone);
}
