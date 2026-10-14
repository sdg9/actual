import React, { Fragment, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { AddTransactionButton } from '#components/mobile/transactions/AddTransactionButton';
import { MobilePageHeader, Page } from '#components/Page';
import { useCategory } from '#hooks/useCategory';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { CategorySummary } from './CategorySummary';
import { CategoryTransactions } from './CategoryTransactions';
import { UncategorizedTransactions } from './UncategorizedTransactions';
import { useCategoryMenu } from './useCategoryActions';

export function CategoryPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useNavigate();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const { id: categoryIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('month') || monthUtils.currentMonth();
  const isUncategorized = categoryIdParam === 'uncategorized';
  const { data: category, isSuccess } = useCategory(
    isUncategorized ? null : categoryIdParam,
  );
  const { onOpenCategoryMenu } = useCategoryMenu({ month });

  // The category was deleted (possibly from this page); go back to the budget.
  const isMissing = !isUncategorized && isSuccess && !category;
  useEffect(() => {
    if (isMissing) {
      void navigate('/budget', { replace: true });
    }
  }, [isMissing, navigate]);

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            isUncategorized ? (
              <TextOneLine>
                <Trans>Uncategorized</Trans>
              </TextOneLine>
            ) : (
              <View style={{ alignItems: 'center', minWidth: 0 }}>
                <TextOneLine>{category?.name ?? ''}</TextOneLine>
                <Text style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>
                  {monthUtils.format(month, 'MMMM yyyy', locale)}
                </Text>
              </View>
            )
          }
          leftContent={<MobileBackButton />}
          rightContent={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {category && (
                <Button
                  variant="bare"
                  aria-label={t('More actions for {{categoryName}}', {
                    categoryName: category.name,
                  })}
                  style={{ padding: 10 }}
                  onPress={() => onOpenCategoryMenu(category.id)}
                >
                  <SvgDotsHorizontalTriple width={18} height={18} />
                </Button>
              )}
              <AddTransactionButton categoryId={category?.id} />
            </View>
          }
        />
      }
      padding={0}
    >
      {/* This key forces the whole table rerender when the number format changes */}
      <Fragment key={numberFormat + hideFraction}>
        {isUncategorized ? (
          <UncategorizedTransactions />
        ) : category ? (
          <CategoryTransactions
            category={category}
            month={month}
            summary={<CategorySummary category={category} month={month} />}
          />
        ) : null}
      </Fragment>
    </Page>
  );
}
