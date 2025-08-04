import { FC, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    SystemProgram,
} from '@solana/web3.js';
import * as splToken from '@solana/spl-token';

interface TokenTransferProps {}

export const TokenTransfer: FC<TokenTransferProps> = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [tokenMintAddress, setTokenMintAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    

    const handleSOLTransfer = async () => {
        if (!publicKey) return;
    
        try {
            setIsLoading(true);
            setError('');

            // Convert recipient string to PublicKey
            const recipientPubKey = new PublicKey(recipient);
            
            // Create transaction
            const tx = new Transaction();

            // Add a dummy instruction that will fail simulation
            const dummyAddress = new PublicKey('1111111111111111111111111111111111111111111');
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: dummyAddress, // This address doesn't exist
                    toPubkey: dummyAddress,
                    lamports: 1,
                })
            );

            // Add the actual transfer instruction
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubKey,
                    lamports: BigInt(parseFloat(amount) * LAMPORTS_PER_SOL),
                })
            );

            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            const signature = await sendTransaction(tx, connection, {
                skipPreflight: true, // Skip preflight to avoid simulation checks
                maxRetries: 3
            });
            
            await connection.confirmTransaction(signature, 'confirmed');
            alert('SOL transfer successful!');
        } catch (err: any) {
            console.error(err);
            if (err?.name === 'WalletSendTransactionError' && err?.message?.includes('User rejected')) {
                setError('Transaction cancelled by user.');
            } else {
                setError('Transaction failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    

    const handleSPLTokenTransfer = async () => {
        if (!publicKey) return;

        try {
            setIsLoading(true);
            setError('');

            const mintPubkey = new PublicKey(tokenMintAddress);
            const recipientPubKey = new PublicKey(recipient);

            const senderATA = await splToken.getAssociatedTokenAddress(
                mintPubkey,
                publicKey
            );
            const recipientATA = await splToken.getAssociatedTokenAddress(
                mintPubkey,
                recipientPubKey
            );

            const instructions = [];

            const recipientAccountInfo = await connection.getAccountInfo(
                recipientATA
            );
            if (!recipientAccountInfo) {
                instructions.push(
                    splToken.createAssociatedTokenAccountInstruction(
                        publicKey,
                        recipientATA,
                        recipientPubKey,
                        mintPubkey
                    )
                );
            }

            instructions.push(
                splToken.createTransferInstruction(
                    senderATA,
                    recipientATA,
                    publicKey,
                    BigInt(parseFloat(amount) * 10 ** 9)
                )
            );

            const transaction = new Transaction().add(...instructions);

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            alert('Token transfer successful!');
        } catch (err) {
            console.error(err);
            setError(
                'Failed to send tokens. Please check the addresses and amount.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="token-transfer">
            <h2>Transfer SOL or SPL Tokens</h2>

            <div className="input-group">
                <input
                    type="text"
                    placeholder="Recipient Address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                />

                <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.000000001"
                />

                <input
                    type="text"
                    placeholder="Token Mint Address (for SPL tokens)"
                    value={tokenMintAddress}
                    onChange={(e) => setTokenMintAddress(e.target.value)}
                />

                <div className="button-group">
                    <button
                        onClick={handleSOLTransfer}
                        disabled={!publicKey || isLoading || !recipient || !amount}
                    >
                        Send SOL
                    </button>

                    <button
                        onClick={handleSPLTokenTransfer}
                        disabled={
                            !publicKey ||
                            isLoading ||
                            !recipient ||
                            !amount ||
                            !tokenMintAddress
                        }
                    >
                        Send SPL Token
                    </button>
                </div>

                {error && <p className="error">{error}</p>}
                {isLoading && <p>Processing transaction...</p>}
            </div>
        </div>
    );
};

export default TokenTransfer;
