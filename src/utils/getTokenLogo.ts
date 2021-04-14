import { Blockchain } from '@venomswap/sdk'
import { BLOCKCHAIN } from '../connectors'
import lootSwapTokenLogo from '../assets/images/lootswap-token-logo.png'

export default function getTokenLogo(): string {
  switch (BLOCKCHAIN) {
    case Blockchain.BINANCE_SMART_CHAIN:
      return lootSwapTokenLogo
    case Blockchain.HARMONY:
      return lootSwapTokenLogo
    default:
      return lootSwapTokenLogo
  }
}
