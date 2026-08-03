import type { PlatformAnalyticsRow } from '../types';

interface PlatformAnalyticsProps {
  rows: readonly PlatformAnalyticsRow[];
}

export function PlatformAnalytics({ rows }: PlatformAnalyticsProps) {
  return (
    <div className="table-surface table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Площадка</th>
            <th scope="col">Отклики</th>
            <th scope="col">Ответы</th>
            <th scope="col">Интервью</th>
            <th scope="col">Конверсия</th>
            <th scope="col">Вывод</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.platform}>
              <td>
                <span className="platform-name">
                  <span className="platform-monogram" aria-hidden="true">
                    {row.monogram}
                  </span>
                  {row.name}
                </span>
              </td>
              <td>{row.applications}</td>
              <td>{row.responses}</td>
              <td>{row.interviews}</td>
              <td>{row.conversion}</td>
              <td className={`conclusion${row.positive ? '' : ' neutral'}`}>
                {row.conclusion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
