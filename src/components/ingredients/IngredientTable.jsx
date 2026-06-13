/**
 * src/components/ingredients/IngredientTable.jsx
 * Displays the pantry inventory with financial and yield data.
 */

export default function IngredientTable({ ingredients = [] }) {
  return (
    <div className="mise-card overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-[var(--row)] uppercase tracking-widest text-[var(--muted)]">
          <tr>
            <th className="p-3">Ingredient</th>
            <th className="p-3">Cost/Unit</th>
            <th className="p-3">Yield %</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((item) => (
            <tr key={item.name} className="border-t border-[var(--border)] hover:bg-[var(--row)]/50">
              <td className="p-3 font-bold">{item.name}</td>
              <td className="p-3">${item.costPerUnit.toFixed(2)}</td>
              <td className="p-3">{item.yieldPercent}%</td>
              <td className="p-3">
                <span className={item.yieldPercent < 80 ? "text-red-500" : "text-green-500"}>
                  {item.yieldPercent < 80 ? 'Low Yield' : 'Optimal'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}