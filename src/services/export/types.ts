export interface ExportReportParams<T> {
  title: string;
  startDate: Date;
  endDate: Date;
  filters: Record<string, any>;
  data: T[];
}

export default ExportReportParams;
