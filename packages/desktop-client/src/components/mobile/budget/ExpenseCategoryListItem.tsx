import { useCallback } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useNavigate } from '#hooks/useNavigate';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { BalanceCell } from './BalanceCell';
import { BudgetCell } from './BudgetCell';
import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';
import { SpentCell } from './SpentCell';
import { useCategoryBalanceMenu } from './useCategoryActions';
import type { OnBudgetAction } from './useCategoryActions';

type ExpenseCategoryNameProps = {
  category: CategoryEntity;
  onEditCategory: (id: CategoryEntity['id']) => void;
  show3Columns: boolean;
};

function ExpenseCategoryName({
  category,
  onEditCategory,
  show3Columns,
}: ExpenseCategoryNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    show3Columns,
    isSidebar: true,
  });

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      {/* Hidden drag button */}
      <Button
        slot="drag"
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          position: 'absolute',
          overflow: 'hidden',
        }}
      />
      <Button
        variant="bare"
        style={{
          maxWidth: sidebarColumnWidth,
        }}
        onPress={() => onEditCategory?.(category.id)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Text
            style={{
              ...styles.lineClamp(2),
              width: sidebarColumnWidth,
              textAlign: 'left',
              ...styles.smallText,
            }}
            data-testid="category-name"
          >
            {category.name}
          </Text>
          <SvgCheveronRight
            style={{ flexShrink: 0, color: theme.tableTextSubdued }}
            width={14}
            height={14}
          />
        </View>
      </Button>
    </View>
  );
}

type ExpenseCategoryCellsProps = {
  category: CategoryEntity;
  month: string;
  onBudgetAction: OnBudgetAction;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onOpenBalanceMenu: () => void;
  onShowActivity: () => void;
};

function ExpenseCategoryCells({
  category,
  month,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  onOpenBalanceMenu,
  onShowActivity,
}: ExpenseCategoryCellsProps) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth({
    show3Columns,
    isSidebar: false,
  });
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const spent =
    budgetType === 'tracking'
      ? trackingBudget.catSumAmount(category.id)
      : envelopeBudget.catSumAmount(category.id);

  const balance =
    budgetType === 'tracking'
      ? trackingBudget.catBalance(category.id)
      : envelopeBudget.catBalance(category.id);

  return (
    <View
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      <View
        style={{
          ...(!show3Columns && !showBudgetedColumn && { display: 'none' }),
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BudgetCell
          binding={budgeted}
          type="financial"
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
        />
      </View>
      <View
        style={{
          ...(!show3Columns && showBudgetedColumn && { display: 'none' }),
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <SpentCell
          binding={spent}
          category={category}
          month={month}
          show3Columns={show3Columns}
          onPress={onShowActivity}
        />
      </View>
      <View
        style={{
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BalanceCell
          binding={balance}
          category={category}
          show3Columns={show3Columns}
          onPress={onOpenBalanceMenu}
          aria-label={t('Open balance menu for {{categoryName}} category', {
            categoryName: category.name,
          })}
        />
      </View>
    </View>
  );
}

type ExpenseCategoryListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryEntity>
> & {
  month: string;
  isHidden: boolean;
  style?: CSSProperties;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onEditCategory: (id: CategoryEntity['id']) => void;
  onBudgetAction: OnBudgetAction;
};

export function ExpenseCategoryListItem({
  month,
  isHidden,
  onEditCategory,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  ...props
}: ExpenseCategoryListItemProps) {
  const { value: category } = props;

  const onOpenBalanceMenu = useCategoryBalanceMenu({
    category,
    month,
    onBudgetAction,
  });

  const navigate = useNavigate();
  const onShowActivity = useCallback(() => {
    if (!category) {
      return;
    }
    void navigate(`/categories/${category.id}?month=${month}`);
  }, [category, month, navigate]);

  if (!category) {
    return null;
  }

  return (
    <GridListItem
      textValue={category.name}
      data-testid="category-row"
      {...props}
    >
      <View
        style={{
          height: ROW_HEIGHT,
          borderColor: theme.tableBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 5,
          paddingRight: 5,
          borderBottomWidth: 1,
          opacity: isHidden ? 0.5 : undefined,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
      >
        <ExpenseCategoryName
          category={category}
          onEditCategory={onEditCategory}
          show3Columns={show3Columns}
        />
        <ExpenseCategoryCells
          key={`${category.id}-${show3Columns}-${showBudgetedColumn}`}
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
          onOpenBalanceMenu={onOpenBalanceMenu}
          onShowActivity={onShowActivity}
        />
      </View>
    </GridListItem>
  );
}
