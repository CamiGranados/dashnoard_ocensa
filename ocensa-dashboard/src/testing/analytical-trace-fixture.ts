interface AnalyticalTraceFixture {
  datasetReleaseId?: string;
  metricId: string;
  metricVersion?: string;
  chartId: string;
  chartVersion: string;
  resultSetId: string;
  pointId: string;
  traceToken: string;
  filters?: Readonly<Record<string, string | readonly string[]>>;
}

const filterOrder = ['tank', 'from', 'to', 'source', 'drain', 'group', 'year', 'month', 'method'];

/** Server-shaped URL fixture. Production code must only consume URLs emitted by the API. */
export function analyticalTraceFixture(input: AnalyticalTraceFixture): string {
  const pairs: Array<[string, string]> = [
    ['datasetReleaseId', input.datasetReleaseId ?? 'release-1'],
    ['metricId', input.metricId],
    ['metricVersion', input.metricVersion ?? 'V1'],
    ['chartId', input.chartId],
    ['chartVersion', input.chartVersion],
    ['resultSetId', input.resultSetId],
    ['pointId', input.pointId],
    ['traceToken', input.traceToken],
  ];

  const filters = input.filters ?? {};
  for (const name of filterOrder) {
    const raw = filters[name];
    if (raw === undefined) continue;
    const queryName = name === 'year' ? 'years' : name === 'month' ? 'months' : name;
    const values = (Array.isArray(raw) ? [...raw] : [raw]).sort();
    for (const value of values) pairs.push([queryName, value]);
  }
  pairs.push(['page', '1'], ['pageSize', '50']);

  return `/api/v1/analytics/traces/V1?${pairs
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&')}`;
}
