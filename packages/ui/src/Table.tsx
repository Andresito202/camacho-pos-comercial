import type { ReactNode } from "react";
import { cn } from "./cn";

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export function Table<T extends { id: string }>({
  columns,
  rows,
  caption,
  className,
  empty = "Sin registros.",
}: {
  columns: TableColumn<T>[];
  rows: T[];
  caption?: string;
  className?: string;
  empty?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full border-collapse text-left text-sm">
        {caption ? <caption className="mb-3 text-left text-[var(--muted)]">{caption}</caption> : null}
        <thead className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--ivory)_70%,white)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn("px-3 py-2 font-semibold text-[var(--navy)]", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-[var(--muted)]" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)]">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 py-3 text-[var(--steel)]", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
