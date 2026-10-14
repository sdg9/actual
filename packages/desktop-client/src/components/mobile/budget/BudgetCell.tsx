import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { AutoTextSize } from 'auto-text-size';

import { makeAmountGrey } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import type { SheetFields } from '#spreadsheet';

import { getColumnWidth, PLAIN_AMOUNT_STYLE } from './BudgetTable';
import { useCategoryBudgetMenu } from './useCategoryActions';
import type { OnBudgetAction } from './useCategoryActions';

type BudgetCellProps<
  SheetFieldName extends SheetFields<'envelope-budget' | 'tracking-budget'>,
> = ComponentPropsWithoutRef<
  typeof CellValue<'envelope-budget' | 'tracking-budget', SheetFieldName>
> & {
  category: CategoryEntity;
  month: string;
  onBudgetAction: OnBudgetAction;
};

export function BudgetCell<
  SheetFieldName extends SheetFields<'envelope-budget' | 'tracking-budget'>,
>({
  binding,
  category,
  month,
  onBudgetAction,
  children,
  ...props
}: BudgetCellProps<SheetFieldName>) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth();
  const format = useFormat();
  const onOpenCategoryBudgetMenu = useCategoryBudgetMenu({
    category,
    month,
    onBudgetAction,
  });

  return (
    <CellValue
      binding={binding}
      type="financial"
      aria-label={t('Budgeted amount for {{categoryName}} category', {
        categoryName: category.name,
      })}
      {...props}
    >
      {({ type, name, value }) =>
        children?.({
          type,
          name,
          value,
        }) || (
          <Button
            variant="bare"
            style={{
              ...PLAIN_AMOUNT_STYLE,
              maxWidth: columnWidth,
              ...makeAmountGrey(value),
            }}
            onPress={onOpenCategoryBudgetMenu}
            aria-label={t('Open budget menu for {{categoryName}} category', {
              categoryName: category.name,
            })}
          >
            <PrivacyFilter>
              <AutoTextSize
                key={value}
                as={Text}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                style={{
                  ...styles.tnum,
                  maxWidth: columnWidth,
                  textAlign: 'right',
                  fontSize: 12,
                }}
              >
                {format(value, type)}
              </AutoTextSize>
            </PrivacyFilter>
          </Button>
        )
      }
    </CellValue>
  );
}
