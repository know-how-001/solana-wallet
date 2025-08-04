import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PhantomWalletName } from "@solana/wallet-adapter-phantom";

const SolanaConnectButton: React.FC = () => {
  const { wallet, connect, disconnect, connected, select } = useWallet();

  const handleClick = async () => {
    if (connected) {
      disconnect();
    } else {
      if (!wallet) {
        select(PhantomWalletName);
      }
      try {
        // Add a small delay after selecting the wallet
        if (!wallet) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await connect();
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    }
  };

  return (
    <button 
      onClick={handleClick}
      style={{
        padding: "10px 20px",
        borderRadius: "6px",
        backgroundColor: "#512da8",
        color: "white",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}
    >
      {wallet && (
        <img 
          src="https://www.phantom.app/img/logo.png" 
          alt="Phantom" 
          style={{ width: "20px", height: "20px" }} 
        />
      )}
      {connected ? "Disconnect" : "Connect Phantom"}
    </button>
  );
};

export default SolanaConnectButton;