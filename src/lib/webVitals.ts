import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logger } from '@/lib/logger';

function report({ name, value, rating, id }: Metric) {
  logger.info('web_vital', { name, value, rating, id });
}

export function reportWebVitals() {
  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
