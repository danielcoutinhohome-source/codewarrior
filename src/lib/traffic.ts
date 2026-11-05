export type TrafficDay = { day: string; visitors: number; newVisitors: number; returningVisitors: number; pageViews: number; peakConcurrent: number };
export type TrafficReport = { generatedAt: number; activeNow: number; days: TrafficDay[] };
