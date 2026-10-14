import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { BudgetType } from '@actual-app/core/server/prefs';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import {
  useBudgetActions,
  useDeleteCategoryMutation,
  useSaveCategoryMutation,
} from '#budget';
import { useCategories, useCategoriesById } from '#hooks/useCategories';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

export type OnBudgetAction = (
  month: string,
  action: string,
  args: unknown,
) => void;

export function useOnBudgetAction(): OnBudgetAction {
  const applyBudgetAction = useBudgetActions();
  return useCallback(
    (month, type, args) => {
      applyBudgetAction.mutate({ month, type, args } as Parameters<
        typeof applyBudgetAction.mutate
      >[0]);
    },
    [applyBudgetAction],
  );
}

async function saveNotes(id: string, notes: string) {
  await send('notes-save', { id, note: notes });
}

// Opens the sheet for assigning money to a category in a month.
export function useCategoryBudgetMenu({
  category,
  month,
  onBudgetAction,
}: {
  category: CategoryEntity;
  month: string;
  onBudgetAction: OnBudgetAction;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const dispatch = useDispatch();
  const format = useFormat();
  const { showUndoNotification } = useUndo();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const categoryNotes = useNotes(category.id);

  const onEditNotes = useCallback(
    (id: string, month: string) => {
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id,
              name:
                category.name +
                ' - ' +
                monthUtils.format(month, "MMMM ''yy", locale),
              onSave: saveNotes,
            },
          },
        }),
      );
    },
    [category.name, locale, dispatch],
  );

  return useCallback(() => {
    const sharedOptions = {
      categoryId: category.id,
      month,
      onEditNotes,
      onUpdateBudget: (amount: number) => {
        onBudgetAction(month, 'budget-amount', {
          category: category.id,
          amount,
        });
        showUndoNotification({
          message: `${category.name} budget has been updated to ${format(amount, 'financial')}.`,
        });
      },
      onCopyLastMonthAverage: () => {
        onBudgetAction(month, 'copy-single-last', {
          category: category.id,
        });
        showUndoNotification({
          message: `${category.name} budget has been set to last month's budgeted amount.`,
        });
      },
      onSetMonthsAverage: (numberOfMonths: number) => {
        if (
          numberOfMonths !== 3 &&
          numberOfMonths !== 6 &&
          numberOfMonths !== 12
        ) {
          return;
        }
        onBudgetAction(month, `set-single-${numberOfMonths}-avg`, {
          category: category.id,
        });
        showUndoNotification({
          message: `${category.name} budget has been set to ${numberOfMonths === 12 ? 'yearly' : `${numberOfMonths} month`} average.`,
        });
      },
      onApplyBudgetTemplate: () => {
        onBudgetAction(month, 'apply-single-category-template', {
          category: category.id,
        });
        showUndoNotification({
          message: `${category.name} budget templates have been applied.`,
          pre: categoryNotes ?? undefined,
        });
      },
    };

    if (budgetType === 'envelope') {
      dispatch(
        pushModal({
          modal: {
            name: 'envelope-budget-menu',
            options: sharedOptions,
          },
        }),
      );
    } else {
      dispatch(
        pushModal({
          modal: {
            name: 'tracking-budget-menu',
            options: {
              ...sharedOptions,
              onCopyUntilYearEnd: () => {
                onBudgetAction(month, 'copy-until-year-end', {
                  category: category.id,
                });
                showUndoNotification({
                  message: t('{{categoryName}} budget copied until year end.', {
                    categoryName: category.name,
                  }),
                });
              },
            },
          },
        }),
      );
    }
  }, [
    budgetType,
    category.id,
    category.name,
    categoryNotes,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
    onEditNotes,
    format,
    t,
  ]);
}

// Opens the sheet for moving money, covering overspending and rollover.
export function useCategoryBalanceMenu({
  category,
  month,
  onBudgetAction,
}: {
  category: CategoryEntity | undefined;
  month: string;
  onBudgetAction: OnBudgetAction;
}) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const format = useFormat();
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const {
    data: { list: categoriesById } = {
      list: {} as Record<string, CategoryEntity>,
    },
  } = useCategoriesById();

  const balanceMenuModalName =
    `${budgetType as BudgetType}-balance-menu` as const;

  const catBalance = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'leftover'
  >(
    budgetType === 'envelope'
      ? envelopeBudget.catBalance(category?.id)
      : trackingBudget.catBalance(category?.id),
  );

  const onCarryover = useCallback(
    (carryover: boolean) => {
      if (!category) {
        return;
      }
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
      dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
    },
    [category, onBudgetAction, month, dispatch, balanceMenuModalName],
  );

  const onTransfer = useCallback(() => {
    if (!category) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'transfer',
          options: {
            title: category.name,
            categoryId: category.id,
            month,
            amount: catBalance || 0,
            onSubmit: (amount, toCategoryId) => {
              onBudgetAction(month, 'transfer-category', {
                amount,
                from: category.id,
                to: toCategoryId,
                currencyCode: format.currency.code,
              });
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
              showUndoNotification({
                message: t(
                  'Transferred {{amount}} from {{fromCategoryName}} to {{toCategoryName}}.',
                  {
                    amount: format(amount, 'financial'),
                    fromCategoryName: category.name,
                    toCategoryName: categoriesById[toCategoryId].name,
                  },
                ),
              });
            },
            showToBeBudgeted: true,
          },
        },
      }),
    );
  }, [
    category,
    dispatch,
    month,
    catBalance,
    onBudgetAction,
    balanceMenuModalName,
    showUndoNotification,
    categoriesById,
    format,
    t,
  ]);

  const onCover = useCallback(() => {
    if (!category) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: category.name,
            month,
            amount: catBalance,
            categoryId: category.id,
            onSubmit: (amount, fromCategoryId) => {
              onBudgetAction(month, 'cover-overspending', {
                to: category.id,
                from: fromCategoryId,
                amount,
                currencyCode: format.currency.code,
              });
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
              showUndoNotification({
                message: t(
                  `Covered {{amount}} {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                  {
                    amount: format(amount, 'financial'),
                    toCategoryName: category.name,
                    fromCategoryName: categoriesById[fromCategoryId].name,
                  },
                ),
              });
            },
          },
        },
      }),
    );
  }, [
    category,
    dispatch,
    month,
    catBalance,
    onBudgetAction,
    balanceMenuModalName,
    showUndoNotification,
    t,
    categoriesById,
    format,
  ]);

  return useCallback(() => {
    if (!category) {
      return;
    }
    if (balanceMenuModalName === 'envelope-balance-menu') {
      dispatch(
        pushModal({
          modal: {
            name: balanceMenuModalName,
            options: {
              month,
              categoryId: category.id,
              onCarryover,
              onTransfer,
              onCover,
            },
          },
        }),
      );
    } else {
      dispatch(
        pushModal({
          modal: {
            name: balanceMenuModalName,
            options: {
              month,
              categoryId: category.id,
              onCarryover,
            },
          },
        }),
      );
    }
  }, [
    category,
    balanceMenuModalName,
    dispatch,
    month,
    onCarryover,
    onTransfer,
    onCover,
  ]);
}

// Opens a category's notes, visibility, rename, automations and delete menu.
export function useCategoryMenu({ month }: { month: string }) {
  const dispatch = useDispatch();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = budgetTypePref === 'tracking' ? 'tracking' : 'envelope';
  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const { data: { list: categories } = { list: [] } } = useCategories();
  const saveCategory = useSaveCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();

  const onSaveCategory = useCallback(
    (category: CategoryEntity) => {
      saveCategory.mutate({ category });
    },
    [saveCategory],
  );

  const onDeleteCategory = useCallback(
    (categoryId: CategoryEntity['id']) => {
      dispatch(collapseModals({ rootModalName: 'category-menu' }));
      deleteCategory.mutate({ id: categoryId });
    },
    [deleteCategory, dispatch],
  );

  const onToggleCategoryVisibility = useCallback(
    (categoryId: CategoryEntity['id']) => {
      const category = categories.find(c => c.id === categoryId);
      if (!category) {
        return;
      }
      onSaveCategory({
        ...category,
        hidden: !category.hidden,
      });
      dispatch(collapseModals({ rootModalName: 'category-menu' }));
    },
    [categories, dispatch, onSaveCategory],
  );

  const onOpenCategoryNotesModal = useCallback(
    (id: CategoryEntity['id']) => {
      const category = categories.find(c => c.id === id);
      if (!category) {
        return;
      }
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id,
              name: category.name,
              onSave: saveNotes,
            },
          },
        }),
      );
    },
    [categories, dispatch],
  );

  const onOpenCategoryMenu = useCallback(
    (id: CategoryEntity['id']) => {
      const category = categories.find(c => c.id === id);
      if (!category) {
        return;
      }
      const canEditAutomations =
        goalTemplatesEnabled &&
        goalTemplatesUIEnabled &&
        !(category.is_income && budgetType !== 'tracking');
      dispatch(
        pushModal({
          modal: {
            name: 'category-menu',
            options: {
              categoryId: category.id,
              onSave: onSaveCategory,
              onEditNotes: onOpenCategoryNotesModal,
              onDelete: onDeleteCategory,
              onToggleVisibility: onToggleCategoryVisibility,
              ...(canEditAutomations && {
                onEditAutomations: (categoryId: string) => {
                  dispatch(collapseModals({ rootModalName: 'category-menu' }));
                  dispatch(
                    pushModal({
                      modal: {
                        name: 'category-automations-edit',
                        options: { categoryId, month },
                      },
                    }),
                  );
                },
              }),
            },
          },
        }),
      );
    },
    [
      budgetType,
      categories,
      dispatch,
      goalTemplatesEnabled,
      goalTemplatesUIEnabled,
      onDeleteCategory,
      onOpenCategoryNotesModal,
      onSaveCategory,
      onToggleCategoryVisibility,
      month,
    ],
  );

  return { onOpenCategoryMenu, onOpenCategoryNotesModal };
}
