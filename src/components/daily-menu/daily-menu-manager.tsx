'use client';

import React, { useState } from 'react';
import { ArrowLeft, Calendar, Utensils, Package, Plus } from 'lucide-react';
import { useI18n } from '../i18n';
import Link from 'next/link';
import { MenuProvider, useMenu } from '@/contexts/menu-context';
import TodaysMenuTab from './todays-menu-tab';
import InventoryTab from './inventory-tab';
import AddDishTab from './add-dish-tab';
import ErrorDisplay from '../error-display';

interface DailyMenuManagerProps {
  selectedDate: string;
}

type TabType = 'menu' | 'inventory' | 'add-dish';

function DailyMenuContent({ selectedDate }: DailyMenuManagerProps) {
  const { t } = useI18n();
  const { error } = useMenu();
  const [activeTab, setActiveTab] = useState<TabType>('menu');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'menu' as TabType, label: t("todaysMenuTab"), icon: Utensils },
    { id: 'inventory' as TabType, label: t("inventoryTab"), icon: Package },
    { id: 'add-dish' as TabType, label: t("addNewDishTab"), icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Error Display */}
      <ErrorDisplay error={error} />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("backToCalendar")}</span>
                </Link>
                
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {formatDate(selectedDate)}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'menu' && <TodaysMenuTab onAddDish={() => setActiveTab('add-dish')} />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'add-dish' && <AddDishTab onDishAdded={() => setActiveTab('menu')} />}
        </div>
      </div>
    </div>
  );
}

export function DailyMenuManager({ selectedDate }: DailyMenuManagerProps) {
  return (
    <MenuProvider selectedDate={selectedDate}>
      <DailyMenuContent selectedDate={selectedDate} />
    </MenuProvider>
  );
}
