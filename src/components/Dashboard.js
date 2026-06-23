import React from 'react';
import StationMatrix from './widgets/StationMatrix';
import DishDevelopment from './widgets/DishDevelopment';
import OrderSheets from './widgets/OrderSheets';
import InsightRail from './widgets/InsightRail';

// A placeholder for user settings until fetched from Firestore.
// NOTE: The schema for `users.user_settings.ui_toggles` must be updated
// to include these new widget toggles.
const placeholderUserSettings = {
  ui_toggles: {
    station_matrix: true,
    dish_development: true,
    order_sheets: false,
    intelligent_insight_rail: true,
  }
};

const widgetMap = {
  station_matrix: StationMatrix,
  dish_development: DishDevelopment,
  order_sheets: OrderSheets,
  intelligent_insight_rail: InsightRail,
};

/**
 * The main dashboard view. It dynamically renders widgets based on user preferences.
 * @param {object} props
 * @param {object} [props.userSettings=placeholderUserSettings] - The user's settings object from Firestore.
 */
const Dashboard = ({ userSettings = placeholderUserSettings }) => {
  const { ui_toggles } = userSettings;

  return (
    <div className="p-4 grid gap-4 grid-cols-1 lg:grid-cols-3">
      {Object.entries(widgetMap).map(([key, Component]) => {
        return ui_toggles[key] ? <Component key={key} /> : null;
      })}
    </div>
  );
};

export default Dashboard;