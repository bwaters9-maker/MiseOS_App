import React from 'react';

export default function IngredientsTable({ ingredients = [] }) {
  return (
    <div className="mise-card overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="mise-table-header rounded-tl-lg">Ingredient</th>
            <th className="mise-table-header text-right">Quantity</th>
            <th className="mise-table-header text-right">Unit</th>
            <th className="mise-table-header rounded-tr-lg text-right">Line Cost</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((item, index) => (
            <tr key={index} className={index % 2 === 1 ? 'mise-table-row-alt' : ''}>
              <td className="p-3 text-sm text-foreground border-b border-border">{item.ingredient_name}</td>
              <td className="p-3 text-sm text-foreground text-right border-b border-border">{item.quantity}</td>
              <td className="p-3 text-sm text-foreground text-right border-b border-border">{item.unit}</td>
              <td className="p-3 text-sm font-bold text-primary text-right border-b border-border">
                ${item.line_cost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}