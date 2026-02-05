import { onCLS, onFID, onLCP } from 'web-vitals';

const reportHandler = (metric) => {
  // In a real production app, you would send this to an analytics endpoint
  // console.log(metric); 
};

export function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onLCP(onPerfEntry);
  } else {
    onCLS(reportHandler);
    onFID(reportHandler);
    onLCP(reportHandler);
  }
}