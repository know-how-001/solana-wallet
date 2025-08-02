import SolanaWalletProvider from "./utils/SolanaWalletProvider";
import SolanaConnectButton from "./utils/SolanaConnectButton";
import WalletStatus from "./utils/WalletStatus";
import TokenTransfer from "./components/TokenTransfer";
import "./components/TokenTransfer.css";
import "./App.css";

function App() {
  return (
    <SolanaWalletProvider>
      <div className="container">
        <header>
          <div className="wallet-container">
            <SolanaConnectButton />
          </div>
        </header>
        <main>
          <WalletStatus />
          <TokenTransfer />
        </main>
      </div>
    </SolanaWalletProvider>
  );
}

export default App;
