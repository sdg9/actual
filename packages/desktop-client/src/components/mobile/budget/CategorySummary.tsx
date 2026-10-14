import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgNotesPaper } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';

import { BalanceWithCarryover } from '#components/budget/BalanceWithCarryover';
import { makeAmountGrey } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import { useNotes } from '#hooks/useNotes';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import {
  useCategoryBalanceMenu,
  useCategoryBudgetMenu,
  useCategoryMenu,
  useOnBudgetAction,
} from './useCategoryActions';

const amountStyle = {
  ...styles.tnum,
  fontSize: 18,
  fontWeight: 600,
};

function SummaryItem({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const summaryButtonStyle = {
  minHeight: styles.mobileMinHeight,
  padding: '4px 10px',
  borderRadius: 16,
  maxWidth: '100%',
};

type CategorySummaryProps = {
  category: CategoryEntity;
  month: string;
};

// The category's money for the month: what was budgeted, spent and is left.
export function CategorySummary({ category, month }: CategorySummaryProps) {
  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
      <CategorySummaryContent category={category} month={month} />
    </SheetNameProvider>
  );
}

function CategorySummaryContent({ category, month }: CategorySummaryProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const onBudgetAction = useOnBudgetAction();
  const onOpenBudgetMenu = useCategoryBudgetMenu({
    category,
    month,
    onBudgetAction,
  });
  const onOpenBalanceMenu = useCategoryBalanceMenu({
    category,
    month,
    onBudgetAction,
  });
  const { onOpenCategoryNotesModal } = useCategoryMenu({ month });
  const notes = useNotes(category.id);

  const isTracking = budgetType === 'tracking';
  const budgeted = isTracking
    ? trackingBudget.catBudgeted(category.id)
    : envelopeBudget.catBudgeted(category.id);
  const spent = isTracking
    ? trackingBudget.catSumAmount(category.id)
    : envelopeBudget.catSumAmount(category.id);
  const balance = isTracking
    ? trackingBudget.catBalance(category.id)
    : envelopeBudget.catBalance(category.id);
  const carryover = isTracking
    ? trackingBudget.catCarryover(category.id)
    : envelopeBudget.catCarryover(category.id);
  const goal = isTracking
    ? trackingBudget.catGoal(category.id)
    : envelopeBudget.catGoal(category.id);
  const longGoal = isTracking
    ? trackingBudget.catLongGoal(category.id)
    : envelopeBudget.catLongGoal(category.id);
  // Envelope income has no budgeted amount or balance; show what came in.
  const isEnvelopeIncome = category.is_income && !isTracking;

  return (
    <View
      style={{
        backgroundColor: theme.tableBackground,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        padding: '12px 10px 10px',
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {!isEnvelopeIncome && (
          <SummaryItem label={<Trans>Budgeted</Trans>}>
            <CellValue<'envelope-budget' | 'tracking-budget', 'budget'>
              binding={budgeted}
              type="financial"
            >
              {({ type, value }) => (
                <Button
                  variant="bare"
                  style={{
                    ...summaryButtonStyle,
                    backgroundColor: theme.pillBackgroundLight,
                  }}
                  onPress={onOpenBudgetMenu}
                  aria-label={t(
                    'Edit budgeted amount for {{categoryName}} category',
                    { categoryName: category.name },
                  )}
                >
                  <PrivacyFilter>
                    <Text style={{ ...amountStyle, ...makeAmountGrey(value) }}>
                      {format(value, type)}
                    </Text>
                  </PrivacyFilter>
                </Button>
              )}
            </CellValue>
          </SummaryItem>
        )}
        <SummaryItem
          label={
            isEnvelopeIncome ? <Trans>Received</Trans> : <Trans>Spent</Trans>
          }
        >
          <CellValue<'envelope-budget' | 'tracking-budget', 'sum-amount'>
            binding={spent}
            type="financial"
          >
            {({ type, value }) => (
              <View style={{ ...summaryButtonStyle, justifyContent: 'center' }}>
                <PrivacyFilter>
                  <Text style={{ ...amountStyle, ...makeAmountGrey(value) }}>
                    {format(value, type)}
                  </Text>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </SummaryItem>
        {!isEnvelopeIncome && (
          <SummaryItem label={<Trans>Balance</Trans>}>
            <BalanceWithCarryover
              type="financial"
              carryover={carryover}
              balance={balance}
              goal={goal}
              budgeted={budgeted}
              longGoal={longGoal}
            >
              {({ type, value, className }) => (
                <Button
                  variant="bare"
                  style={{
                    ...summaryButtonStyle,
                    backgroundColor: theme.pillBackgroundLight,
                  }}
                  onPress={onOpenBalanceMenu}
                  aria-label={t(
                    'Move or cover money for {{categoryName}} category',
                    { categoryName: category.name },
                  )}
                >
                  <PrivacyFilter>
                    <Text className={cx(className, css(amountStyle))}>
                      {format(value, type)}
                    </Text>
                  </PrivacyFilter>
                </Button>
              )}
            </BalanceWithCarryover>
          </SummaryItem>
        )}
      </View>
      <Button
        variant="bare"
        style={{
          minHeight: styles.mobileMinHeight,
          justifyContent: 'flex-start',
          gap: 8,
          padding: '6px 8px',
          color: notes ? theme.pageText : theme.pageTextLink,
        }}
        onPress={() => onOpenCategoryNotesModal(category.id)}
        aria-label={
          notes
            ? t('Edit notes for {{categoryName}}', {
                categoryName: category.name,
              })
            : t('Add notes for {{categoryName}}', {
                categoryName: category.name,
              })
        }
      >
        <SvgNotesPaper
          width={16}
          height={16}
          style={{ flexShrink: 0, color: theme.pageTextSubdued }}
        />
        <Text
          style={{
            ...styles.lineClamp(2),
            textAlign: 'left',
            fontSize: 13,
            whiteSpace: 'pre-wrap',
          }}
        >
          {notes || <Trans>Add notes</Trans>}
        </Text>
      </Button>
    </View>
  );
}
