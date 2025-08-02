import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";

const WalletStatus: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = React.useState<number | null>(null);

  React.useEffect(() => {
    const getBalance = async () => {
      if (publicKey) {
        try {
          const bal = await connection.getBalance(publicKey);
          setBalance(bal / 1000000000); // Convert lamports to SOL
        } catch (e) {
          console.error("Failed to get balance:", e);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    getBalance();
    // Set up an interval to refresh balance
    const intervalId = setInterval(getBalance, 5000);

    return () => clearInterval(intervalId);
  }, [publicKey, connection]);

  return (
    <div style={{ 
      padding: "20px",
      margin: "20px 0",
      borderRadius: "8px",
      backgroundColor: "#f5f5f5",
      maxWidth: "500px"
    }}>
      <h3 style={{ margin: "0 0 10px 0" }}>Wallet Status</h3>
      <p style={{ margin: "5px 0" }}>
        <strong>Connection:</strong> {connected ? "Connected" : "Disconnected"}
      </p>
      {publicKey && (
        <>
          <p style={{ margin: "5px 0", wordBreak: "break-all" }}>
            <strong>Public Key:</strong> {publicKey.toString()}
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Balance:</strong> {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
          </p>
        </>
      )}
    </div>
  );
};

export default WalletStatus;