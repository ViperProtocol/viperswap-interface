import { Blockchain } from '@venomswap/sdk'
import useBlockchain from './useBlockchain'

export default function usePlatformName(): string {
  const blockchain = useBlockchain()
  switch (blockchain) {
    case Blockchain.BINANCE_SMART_CHAIN:
      return 'LootSwap'
    case Blockchain.HARMONY:
      return 'LootSwap'
    case Blockchain.ETHEREUM:
      return 'Lootswap'
    default:
      return 'LootSwap'
  }
}
