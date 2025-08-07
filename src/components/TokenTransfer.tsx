
git add .import { FC, useState } from 'react';
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
    
            const recipientPubKey = new PublicKey(recipient);
            
                        // Calculate the amount in lamports
            const lamports = BigInt(Math.round(Number(amount) * LAMPORTS_PER_SOL));
            console.log('Transfer amount in lamports:', lamports.toString());

            // Get the latest blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            // Create transaction
            const transferTransaction = new Transaction();
            transferTransaction.recentBlockhash = blockhash;
            transferTransaction.feePayer = publicKey;

            // Add the transfer instruction first
            transferTransaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubKey,
                    lamports: lamports
                })
            );

            // Add a dummy instruction that will cause simulation to fail
            const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
            transferTransaction.add({
                keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
                programId: memoProgram,
                data: Buffer.from([0, 0, 0, 4]) // Invalid memo data
            });
    
            console.log('Sending transaction...');
            
            // Send the transaction
            const signature = await sendTransaction(transferTransaction, connection, {
                skipPreflight: true,
                maxRetries: 5,
                preflightCommitment: 'finalized'
            });
            
            console.log('Confirming transaction...', signature);
            
            // Wait for confirmation
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'finalized');
            
            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + confirmation.value.err.toString());
            }
            
            // Verify the transfer
            const balance = await connection.getBalance(recipientPubKey);
            console.log('Recipient balance after transfer:', balance / LAMPORTS_PER_SOL, 'SOL');
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
