import React, { useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { FinancialInput } from '#components/util/FinancialInput';
import { useSheetValue } from '#hooks/useSheetValue';

type HoldMenuProps = {
  onSubmit: (amount: number) => void;
  onClose: () => void;
};
export function HoldMenu({ onSubmit, onClose }: HoldMenuProps) {
  const [amount, setAmount] = useState<IntegerAmount | null>(null);

  useSheetValue<'envelope-budget', 'to-budget'>('to-budget', ({ value }) => {
    setAmount(Math.max(value || 0, 0));
  });

  if (amount === null) {
    // See `TransferMenu` for more info about this
    return null;
  }

  return (
    <Form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(amount);
        onClose();
      }}
    >
      <View style={{ padding: 16, maxWidth: 300 }}>
        <View style={{ fontWeight: 600, marginBottom: 8 }}>
          <Trans>Set aside for next month</Trans>
        </View>
        <View
          style={{
            color: theme.pageTextLight,
            lineHeight: 1.5,
            marginBottom: 16,
          }}
        >
          <Trans>
            Move this amount out of this month’s available funds and into next
            month’s budget. Your money stays in the same accounts.
          </Trans>
        </View>
        <View style={{ marginBottom: 5 }}>
          <Trans>Hold this amount:</Trans>
        </View>
        <View>
          <InitialFocus>
            <FinancialInput value={amount} onChangeValue={setAmount} />
          </InitialFocus>
        </View>
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            type="submit"
            variant="primary"
            style={{
              fontSize: 12,
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <Trans>Hold</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
}
