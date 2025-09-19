'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ChefHat } from 'lucide-react';
import { useI18n } from '../i18n';
import Link from 'next/link';

interface MenuData {
  date: string;
  dishCount: number;
  totalCalories: number;
  totalServings: number;
}

interface MonthlyCalendarProps {
  menuData?: MenuData[];
  onDateClick?: (date: string) => void;
}

export function MonthlyCalendar({ menuData = [], onDateClick }: MonthlyCalendarProps) {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const menuForDay = menuData.find(menu => menu.date === dateStr);
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    
    calendarDays.push({
      day,
      date: dateStr,
      hasMenu: !!menuForDay,
      menuData: menuForDay,
      isToday
    });
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {monthNames[month]} {year}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <Link
          href={`/menu/${today.toISOString().split('T')[0]}`}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t("addToday")}</span>
        </Link>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((dayData, index) => {
          if (!dayData) {
            return <div key={index} className="p-3" />;
          }

          const { day, date, hasMenu, menuData, isToday } = dayData;

          return (
            <Link
              key={`${date}-${day}`}
              href={`/menu/${date}`}
              className={`
                relative p-3 min-h-[80px] rounded-lg border-2 transition-all duration-200 hover:shadow-md group
                ${isToday 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : hasMenu 
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20 hover:border-green-300' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div className="flex flex-col h-full">
                <span className={`
                  text-sm font-medium mb-1
                  ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}
                `}>
                  {day}
                </span>

                {hasMenu && menuData && (
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                      <ChefHat className="h-3 w-3" />
                      <span>{menuData.dishCount} {menuData.dishCount === 1 ? 'dish' : 'dishes'}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {menuData.totalCalories} cal
                    </div>
                  </div>
                )}

                {!hasMenu && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400">
                      No menu
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-green-200 bg-green-50 dark:bg-green-900/20"></div>
          <span className="text-gray-600 dark:text-gray-400">{t("legend12")}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20"></div>
          <span className="text-gray-600 dark:text-gray-400">Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-gray-200 dark:border-gray-700"></div>
          <span className="text-gray-600 dark:text-gray-400">No menu</span>
        </div>
      </div>
    </div>
  );
}
