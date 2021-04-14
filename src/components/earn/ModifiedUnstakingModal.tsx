import React, { useState, useCallback } from 'react'
import Modal from '../Modal'
import { AutoColumn } from '../Column'
import styled from 'styled-components'
import { RowBetween } from '../Row'
import { TYPE, CloseIcon, ExternalLink } from '../../theme'
import { ButtonError } from '../Button'
import CurrencyInputPanel from '../CurrencyInputPanel'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { TokenAmount, Pair, Blockchain } from '@venomswap/sdk'
import { useActiveWeb3React } from '../../hooks'
import { StakingInfo, useDerivedUnstakeInfo } from '../../state/stake/hooks'
//import { wrappedCurrencyAmount } from '../../utils/wrappedCurrency'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { LoadingView, SubmittedView } from '../ModalViews'
import { ZERO_ADDRESS } from '../../constants'
import usePlatformName from '../../hooks/usePlatformName'
import { BlueCard } from '../Card'
import { ColumnCenter } from '../Column'
import { calculateGasMargin } from '../../utils'
import { useMasterBreederContract } from '../../hooks/useContract'
import useCalculateWithdrawalFee from '../../hooks/useCalculateWithdrawalFee'
import useBlockchain from '../../hooks/useBlockchain'

/*const HypotheticalRewardRate = styled.div<{ dim: boolean }>`
  display: flex;
  justify-content: space-between;
  padding-right: 20px;
  padding-left: 20px;

  opacity: ${({ dim }) => (dim ? 0.5 : 1)};
`*/

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background-color: ${({ theme }) => theme.bg2};
  margin: 10px 0px;
`

const WithdrawalFee = styled.div`
  margin: 10px 0px 0px 0px;
  text-align: center;
  font-size: 40px;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: StakingInfo
}

export default function ModifiedStakingModal({ isOpen, onDismiss, stakingInfo }: StakingModalProps) {
  const { account } = useActiveWeb3React()
  const blockchain = useBlockchain()

  // track and parse user input
  const [typedValue, setTypedValue] = useState('')
  const { parsedAmount, error } = useDerivedUnstakeInfo(typedValue, stakingInfo.stakedAmount)
  /*const parsedAmountWrapped = wrappedCurrencyAmount(parsedAmount, chainId)

  let hypotheticalRewardRate: TokenAmount = new TokenAmount(stakingInfo.rewardRate.token, '0')
  if (parsedAmountWrapped?.greaterThan('0')) {
    hypotheticalRewardRate = stakingInfo.getHypotheticalRewardRate(
      stakingInfo.stakedAmount.add(parsedAmountWrapped),
      stakingInfo.totalStakedAmount.add(parsedAmountWrapped),
      stakingInfo.totalRewardRate
    )
  }*/

  // state for pending and submitted txn views
  const addTransaction = useTransactionAdder()
  const [attempting, setAttempting] = useState<boolean>(false)
  const [hash, setHash] = useState<string | undefined>()
  const [failed, setFailed] = useState<boolean>(false)
  const wrappedOnDismiss = useCallback(() => {
    setHash(undefined)
    setAttempting(false)
    setFailed(false)
    onDismiss()
  }, [onDismiss])

  const platformName = usePlatformName()
  const masterBreeder = useMasterBreederContract()
  const referral = ZERO_ADDRESS

  // pair contract for this token to be staked
  const dummyPair = new Pair(new TokenAmount(stakingInfo.tokens[0], '0'), new TokenAmount(stakingInfo.tokens[1], '0'))

  const { lastActionBlock, withdrawalFee } = useCalculateWithdrawalFee(stakingInfo.pid, account)

  let feeInfoUrl = ''
  if (blockchain == Blockchain.HARMONY) {
    feeInfoUrl = 'https://docs.lootswap.org/lootswap/fees'
  }

  async function onWithdraw() {
    if (masterBreeder && stakingInfo?.stakedAmount) {
      setAttempting(true)

      const formattedAmount = `0x${parsedAmount?.raw.toString(16)}`
      const estimatedGas = await masterBreeder.estimateGas.withdraw(stakingInfo.pid, formattedAmount, referral)

      await masterBreeder
        .withdraw(stakingInfo.pid, formattedAmount, referral, {
          gasLimit: calculateGasMargin(estimatedGas)
        })
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            summary: `Withdraw deposited liquidity`
          })
          setHash(response.hash)
        })
        .catch((error: any) => {
          setAttempting(false)
          if (error?.code === -32603) {
            setFailed(true)
          }
          console.log(error)
        })
    }
  }

  // wrapped onUserInput to clear signatures
  const onUserInput = useCallback((typedValue: string) => {
    setTypedValue(typedValue)
  }, [])

  // used for max input button
  const maxAmountInput = maxAmountSpend(stakingInfo.stakedAmount)
  const atMaxAmount = Boolean(maxAmountInput && parsedAmount?.equalTo(maxAmountInput))

  const handleMax = useCallback(() => {
    maxAmountInput && onUserInput(maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !hash && !failed && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <TYPE.mediumHeader>Withdraw</TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOnDismiss} />
          </RowBetween>

          <RowBetween>
            <ColumnCenter>
              <BlueCard>
                <AutoColumn gap="10px">
                  <TYPE.link fontWeight={400} color={'primaryText1'}>
                    <b>Important:</b> {platformName} utilizes LP withdrawal fees to disincentivize short term farming
                    and selling.
                  </TYPE.link>
                  {feeInfoUrl && (
                    <TYPE.link fontWeight={400} fontSize={12} color={'primaryText1'}>
                      <ExternalLink href={feeInfoUrl}>Read more about the fees here.</ExternalLink>
                    </TYPE.link>
                  )}
                  {withdrawalFee && (
                    <>
                      <Separator />
                      <TYPE.link fontWeight={400} color={'primaryText1'}>
                        <b>Your current withdrawal fee:</b>
                        <br />
                        <WithdrawalFee>{withdrawalFee}%</WithdrawalFee>
                      </TYPE.link>
                    </>
                  )}
                  {lastActionBlock && (
                    <TYPE.link fontWeight={400} fontSize={12} color={'primaryText1'}>
                      <em>
                        You last deposited or withdrew funds at block <b>{lastActionBlock?.toString()}</b>.
                      </em>
                    </TYPE.link>
                  )}
                </AutoColumn>
              </BlueCard>
            </ColumnCenter>
          </RowBetween>

          <CurrencyInputPanel
            value={typedValue}
            onUserInput={onUserInput}
            onMax={handleMax}
            showMaxButton={!atMaxAmount}
            currency={stakingInfo.stakedAmount.token}
            pair={dummyPair}
            label={''}
            disableCurrencySelect={true}
            overrideSelectedCurrencyBalance={stakingInfo.stakedAmount}
            customBalanceText={'Available to withdraw: '}
            id="stake-liquidity-token"
          />

          <RowBetween>
            <ButtonError disabled={!!error} error={!!error && !!parsedAmount} onClick={onWithdraw}>
              {error ?? 'Withdraw'}
            </ButtonError>
          </RowBetween>
        </ContentWrapper>
      )}
      {attempting && !hash && !failed && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>Withdrawing Liquidity</TYPE.largeHeader>
            <TYPE.body fontSize={20}>{parsedAmount?.toSignificant(4)} VENOM-LP</TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {attempting && hash && !failed && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>Transaction Submitted</TYPE.largeHeader>
            <TYPE.body fontSize={20}>Withdraw {parsedAmount?.toSignificant(4)} VENOM-LP</TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
      {!attempting && !hash && failed && (
        <ContentWrapper gap="sm">
          <RowBetween>
            <TYPE.mediumHeader>
              <span role="img" aria-label="wizard-icon" style={{ marginRight: '0.5rem' }}>
                ⚠️
              </span>
              Error!
            </TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOnDismiss} />
          </RowBetween>
          <TYPE.subHeader style={{ textAlign: 'center' }}>
            Your transaction couldn&apos;t be submitted.
            <br />
            You may have to increase your Gas Price (GWEI) settings!
          </TYPE.subHeader>
        </ContentWrapper>
      )}
    </Modal>
  )
}
