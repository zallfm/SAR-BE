import { timingSafeEqual, createHash } from 'crypto';
export function safeCompare(a, b) {
    const ah = createHash('sha256').update(a).digest();
    const bh = createHash('sha256').update(b).digest();
    return timingSafeEqual(ah, bh);
}
