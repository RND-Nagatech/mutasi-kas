export interface ExportReportParams<T> {
  title: string;
  startDate: Date;
  endDate: Date;
  filters: Record<string, any>;
  data: T[];
  // optional lookup of rekening records (frontend normalized shape)
  rekeningList?: Array<Record<string, any>>;
}

export default ExportReportParams;
