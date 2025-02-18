import { ConnectButton } from "@rainbow-me/rainbowkit"

export function Header() {

  return (
    <header className="w-full py-3">
      <div className="max-w-7xl mx-auto flex justify-end px-6">
        <div className="flex items-center space-x-2 md:space-x-6">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" label="Connect"/>
        </div>
      </div>
    </header>
  )
}
