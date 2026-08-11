import type { ProductSpec } from '@/types/catalog'

interface SpecTableProps {
  specsGrouped: Record<string, ProductSpec[]>
}

export default function SpecTable({ specsGrouped }: SpecTableProps) {
  const groups = Object.entries(specsGrouped)
  if (!groups.length) return null

  return (
    <div className="spec-table-wrap">
      {groups.map(([group, specs]) => (
        <div key={group} className="spec-group">
          <div className="spec-group-title">{group}</div>
          <table className="spec-table">
            <tbody>
              {specs.map((s) => (
                <tr key={s.id}>
                  <td className="spec-label">{s.spec_label}</td>
                  <td className="spec-value">
                    {s.spec_value}
                    {s.spec_unit && <span className="spec-unit"> {s.spec_unit}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
